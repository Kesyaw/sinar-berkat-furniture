import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as midtransClient from 'midtrans-client';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { MidtransWebhookDto } from './dto/midtrans-webhook.dto';

// ============================================================
// TYPES
// ============================================================

/**
 * Full payment shape with invoice + order, used by reconciliation
 * and webhook handler.
 */
type PaymentFull = Prisma.PaymentGetPayload<{
  include: { invoice: { include: { order: true } } };
}>;

/**
 * Result of a single payment reconciliation attempt.
 */
export interface ReconcileResult {
  paymentId: string;
  midtransOrderId: string;
  orderId: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus | null;
  updated: boolean;
  source: 'scheduler' | 'manual' | 'webhook';
  skippedReason?: string;
  error?: string;
}

/**
 * Aggregated summary returned by runReconciliation().
 */
export interface ReconciliationSummary {
  totalChecked: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  executionTimeMs: number;
  results: ReconcileResult[];
}

/**
 * Shape of Midtrans API status responses and webhook payloads.
 */
export interface MidtransStatusResponse {
  transaction_status: string;
  transaction_id?: string;
  payment_type?: string;
  order_id: string;
  gross_amount: string;
  status_code: string;
  [key: string]: any;
}

/**
 * Type-safe wrapper interface to access transaction.status which is missing
 * from the official @types/midtrans-client declaration.
 */
export interface MidtransCoreApiWithTransaction {
  transaction: {
    status(orderId: string): Promise<MidtransStatusResponse>;
  };
}

/**
 * Options for the executeWithRetry helper.
 */
interface RetryOptions {
  /** Label used in log messages (e.g. 'createTransaction', 'transaction.status') */
  operationName: string;
  /** Maximum number of attempts including the initial try. Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms before the first retry; doubles each attempt. Default: 400 */
  baseDelayMs?: number;
  /** Optional correlation ID for traceability across retries */
  correlationId?: string;
}

// ============================================================
// SERVICE
// ============================================================

@Injectable()
export class PaymentsService {
  /** Midtrans Snap — used for creating new payment transactions */
  private snap: midtransClient.Snap;

  /** Midtrans Core API — used for status checks */
  private coreApi: midtransClient.CoreApi;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectPinoLogger(PaymentsService.name)
    private readonly logger: PinoLogger,
  ) {
    const midtransConfig = {
      isProduction:
        this.config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.config.getOrThrow<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.config.getOrThrow<string>('MIDTRANS_CLIENT_KEY'),
    };

    this.snap = new midtransClient.Snap(midtransConfig);
    this.coreApi = new midtransClient.CoreApi(midtransConfig);
  }

  // ============================================================
  // RETRY HELPER
  // ============================================================

  /**
   * Executes an async operation with exponential backoff retry.
   *
   * RETRYABLE errors (network/server-side, may resolve on retry):
   *   - ECONNRESET, ECONNREFUSED, ETIMEDOUT, ENOTFOUND
   *   - HTTP 500, 502, 503, 504 (Midtrans server errors)
   *   - Errors with no HTTP status (network-level failures)
   *
   * NON-RETRYABLE errors (permanent failures, do not waste retries):
   *   - HTTP 400 Bad Request (our payload is wrong)
   *   - HTTP 401 / 403 Unauthorized (invalid API keys)
   *   - HTTP 404 Not Found (transaction does not exist in Midtrans)
   *   - HTTP 406 Not Acceptable (duplicate order ID)
   *
   * @param fn          - The async factory function to execute
   * @param options     - Retry configuration and logging context
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T> {
    const {
      operationName,
      maxAttempts = 3,
      baseDelayMs = 400,
      correlationId,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStart = Date.now();
      try {
        const result = await fn();
        if (attempt > 1) {
          this.logger.info(
            {
              correlationId,
              operationName,
              attempt,
              durationMs: Date.now() - attemptStart,
            },
            'Midtrans API call succeeded after retry',
          );
        }
        return result;
      } catch (err: unknown) {
        lastError = err;
        const durationMs = Date.now() - attemptStart;
        const statusCode: number | undefined = (err as any)?.ApiResponse
          ?.status_code
          ? parseInt((err as any).ApiResponse.status_code, 10)
          : ((err as any)?.status ?? (err as any)?.statusCode);
        const errorCode: string | undefined = (err as any)?.code;
        const message = err instanceof Error ? err.message : String(err);

        // Classify: is this error worth retrying?
        const isNonRetryable =
          statusCode === 400 ||
          statusCode === 401 ||
          statusCode === 403 ||
          statusCode === 404 ||
          statusCode === 406;

        if (isNonRetryable) {
          this.logger.warn(
            {
              correlationId,
              operationName,
              attempt,
              statusCode,
              durationMs,
              error: message,
            },
            'Midtrans API call failed with non-retryable error — aborting',
          );
          throw err;
        }

        if (attempt < maxAttempts) {
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1); // 400, 800, 1600...
          this.logger.warn(
            {
              correlationId,
              operationName,
              attempt,
              nextAttempt: attempt + 1,
              maxAttempts,
              statusCode,
              errorCode,
              durationMs,
              retryInMs: delayMs,
              error: message,
            },
            'Midtrans API call failed — retrying with backoff',
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          this.logger.error(
            {
              correlationId,
              operationName,
              attempt,
              maxAttempts,
              statusCode,
              errorCode,
              durationMs,
              error: message,
            },
            'Midtrans API call failed after all retry attempts exhausted',
          );
        }
      }
    }

    throw lastError;
  }

  // ============================================================
  // CREATE PAYMENT LINK
  // ============================================================

  async createPaymentLink(orderId: string) {
    // Ambil order dengan invoice
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Buat invoice kalau belum ada
    let invoice = order.invoice;
    if (!invoice) {
      const invoiceNumber = `INV-${order.orderNumber}`;
      invoice = await this.prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          paymentStatus: PaymentStatus.PENDING,
          amountDue: order.total,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam
        },
      });
    }

    // Midtrans order ID unik per transaksi
    const midtransOrderId = `${order.orderNumber}-${Date.now()}`;

    // Buat Snap transaction
    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Math.round(parseFloat(order.total.toString())),
      },
      customer_details: {
        first_name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail ?? undefined,
      },
      item_details: order.items.map((item) => ({
        id: item.id,
        name: item.productName.substring(0, 50),
        price: Math.round(parseFloat(item.unitPrice.toString())),
        quantity: item.quantity,
      })),
      expiry: {
        // Expiry length set to 24 hours
        unit: 'hours',
        duration: 24,
      },
    };

    const transaction = await this.executeWithRetry(
      () => this.snap.createTransaction(parameter),
      { operationName: 'snap.createTransaction', correlationId: undefined },
    );

    // Simpan payment record
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        midtransOrderId,
        status: PaymentStatus.PENDING,
        amount: order.total,
        paymentUrl: transaction.redirect_url,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    this.logger.info(
      {
        paymentId: payment.id,
        orderId: order.id,
        midtransOrderId,
      },
      'Payment link created',
    );

    return {
      paymentUrl: transaction.redirect_url,
      token: transaction.token,
      midtransOrderId,
      invoiceId: invoice.id,
      paymentId: payment.id,
    };
  }

  async createPublicPaymentLink(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.WAITING_PAYMENT) {
      throw new BadRequestException(
        'Order is not waiting for payment. Current status: ' + order.status,
      );
    }

    return this.createPaymentLink(order.id);
  }


  // ============================================================
  // WEBHOOK HANDLER
  // ============================================================

  async handleWebhook(
    payload: MidtransWebhookDto,
    rawBody: string,
    signature: string,
    correlationId?: string,
  ) {
    const webhookStart = Date.now();
    const serverKey = this.config.getOrThrow<string>('MIDTRANS_SERVER_KEY');

    // Validate HMAC signature using timing-safe comparison
    const expectedSignature = crypto
      .createHash('sha512')
      .update(
        `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`,
      )
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(signature ?? '', 'utf8');

    let isSignatureValid = false;
    if (expectedBuf.length === signatureBuf.length) {
      isSignatureValid = crypto.timingSafeEqual(expectedBuf, signatureBuf);
    }

    if (!isSignatureValid) {
      this.logger.warn(
        {
          correlationId,
          orderId: payload.order_id,
          signaturePresent: !!signature,
        },
        'Webhook signature invalid',
      );
      throw new BadRequestException('Invalid signature');
    }

    // Cari payment berdasarkan midtrans order ID
    const payment = await this.prisma.payment.findUnique({
      where: { midtransOrderId: payload.order_id },
      include: { invoice: { include: { order: true } } },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    const newStatus = this.mapMidtransStatus(payload.transaction_status);

    // Log webhook event (only non-sensitive information, no full payloads)
    this.logger.info(
      {
        correlationId,
        paymentId: payment.id,
        orderId: payment.invoice.orderId,
        transactionId: payload.transaction_id,
        transactionStatus: payload.transaction_status,
        paymentType: payload.payment_type,
        previousStatus: payment.status,
        newStatus: newStatus ?? 'no-action',
      },
      'Webhook received',
    );

    // Update hanya jika status berubah (idempotency check)
    if (newStatus && payment.status !== newStatus) {
      await this.applyStatusUpdate(
        payment,
        newStatus,
        payload,
        'webhook',
        correlationId,
      );
    }

    // Simpan non-sensitive payload untuk audit log
    await this.prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        eventType: payload.transaction_status,
        rawPayload: {
          order_id: payload.order_id,
          transaction_id: payload.transaction_id,
          transaction_status: payload.transaction_status,
          payment_type: payload.payment_type,
          _correlationId: correlationId,
        },
        hmacValid: true,
      },
    });

    const executionTimeMs = Date.now() - webhookStart;
    this.logger.info(
      {
        correlationId,
        paymentId: payment.id,
        orderId: payment.invoice.orderId,
        executionTimeMs,
      },
      'Webhook processing completed successfully',
    );

    return { status: 'ok' };
  }

  // ============================================================
  // RECONCILIATION — PUBLIC METHODS
  // ============================================================

  async getExpiredPendingPayments(limit: number): Promise<PaymentFull[]> {
    return this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      include: {
        invoice: { include: { order: true } },
      },
      orderBy: { expiresAt: 'asc' },
      take: limit,
    });
  }

  async reconcilePayment(
    payment: PaymentFull,
    source: 'scheduler' | 'manual',
    correlationId?: string,
  ): Promise<ReconcileResult> {
    const result: ReconcileResult = {
      paymentId: payment.id,
      midtransOrderId: payment.midtransOrderId,
      orderId: payment.invoice.orderId,
      previousStatus: payment.status,
      newStatus: null,
      updated: false,
      source,
    };

    try {
      const apiStart = Date.now();

      // Query actual status from Midtrans Core API (with retry)
      const midtransResponse = await this.executeWithRetry(
        () =>
          (
            this.coreApi as unknown as MidtransCoreApiWithTransaction
          ).transaction.status(payment.midtransOrderId),
        {
          operationName: 'coreApi.transaction.status',
          correlationId,
        },
      );

      const apiDurationMs = Date.now() - apiStart;
      this.logger.info(
        {
          correlationId,
          paymentId: payment.id,
          orderId: payment.invoice.orderId,
          apiDurationMs,
        },
        'Midtrans status API query completed',
      );

      const newStatus = this.mapMidtransStatus(
        midtransResponse.transaction_status,
      );
      result.newStatus = newStatus;

      // Idempotency: skip if no actionable status change
      if (!newStatus) {
        result.skippedReason = `Midtrans status '${midtransResponse.transaction_status}' requires no action`;
        this.logger.info(
          {
            correlationId,
            paymentId: payment.id,
            orderId: payment.invoice.orderId,
            skippedReason: result.skippedReason,
          },
          'Reconciliation skipped: status requires no action',
        );
        return result;
      }

      if (payment.status === newStatus) {
        result.skippedReason = `Status already '${newStatus}' — no update needed`;
        this.logger.info(
          {
            correlationId,
            paymentId: payment.id,
            orderId: payment.invoice.orderId,
            skippedReason: result.skippedReason,
          },
          'Reconciliation skipped: status already current',
        );
        return result;
      }

      // Apply atomic DB update using shared helper
      await this.applyStatusUpdate(
        payment,
        newStatus,
        midtransResponse,
        source,
        correlationId,
      );

      // Save reconciliation audit log (strictly non-sensitive)
      await this.prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          eventType: `reconciliation:${midtransResponse.transaction_status}`,
          rawPayload: {
            order_id: midtransResponse.order_id,
            transaction_id: midtransResponse.transaction_id,
            transaction_status: midtransResponse.transaction_status,
            payment_type: midtransResponse.payment_type,
            _reconciliationSource: source,
            _reconciledAt: new Date().toISOString(),
            _correlationId: correlationId,
          },
          hmacValid: false,
        },
      });

      result.updated = true;

      this.logger.info(
        {
          correlationId,
          paymentId: payment.id,
          orderId: payment.invoice.orderId,
          previousStatus: payment.status,
          newStatus,
          source,
        },
        'Payment reconciled and updated successfully',
      );

      if (
        newStatus === PaymentStatus.EXPIRED ||
        newStatus === PaymentStatus.FAILED
      ) {
        this.logger.warn(
          {
            correlationId,
            paymentId: payment.id,
            orderId: payment.invoice.orderId,
            newStatus,
          },
          'Payment reconciled with failure/expiry status; action required',
        );
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      this.logger.error(
        {
          correlationId,
          paymentId: payment.id,
          orderId: payment.invoice.orderId,
          error: result.error,
        },
        'Reconciliation check failed with error',
      );
    }

    return result;
  }

  async runReconciliation(
    batchSize: number,
    source: 'scheduler' | 'manual',
    correlationId?: string,
  ): Promise<ReconciliationSummary> {
    const startTime = Date.now();
    const CONCURRENCY = 5;
    const activeCorrelationId = correlationId || crypto.randomUUID();

    this.logger.info(
      {
        correlationId: activeCorrelationId,
        source,
        batchSize,
      },
      'Reconciliation batch run started',
    );

    const candidates = await this.getExpiredPendingPayments(batchSize);

    if (candidates.length === 0) {
      const summary: ReconciliationSummary = {
        totalChecked: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        totalErrors: 0,
        executionTimeMs: Date.now() - startTime,
        results: [],
      };
      this.logger.info(
        {
          correlationId: activeCorrelationId,
          source,
          executionTimeMs: summary.executionTimeMs,
        },
        'Reconciliation batch finished: no candidates found',
      );
      return summary;
    }

    this.logger.info(
      {
        correlationId: activeCorrelationId,
        source,
        candidatesCount: candidates.length,
      },
      'Reconciliation batch found candidates to process',
    );

    const results: ReconcileResult[] = [];

    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const chunk = candidates.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map((payment) =>
          this.reconcilePayment(payment, source, activeCorrelationId),
        ),
      );
      results.push(...chunkResults);
    }

    const summary: ReconciliationSummary = {
      totalChecked: results.length,
      totalUpdated: results.filter((r) => r.updated).length,
      totalSkipped: results.filter((r) => !r.updated && !r.error).length,
      totalErrors: results.filter((r) => !!r.error).length,
      executionTimeMs: Date.now() - startTime,
      results,
    };

    this.logger.info(
      {
        correlationId: activeCorrelationId,
        source,
        checkedCount: summary.totalChecked,
        updatedCount: summary.totalUpdated,
        skippedCount: summary.totalSkipped,
        errorCount: summary.totalErrors,
        executionTimeMs: summary.executionTimeMs,
      },
      'Reconciliation batch run completed',
    );

    return summary;
  }

  // ============================================================
  // EXISTING QUERY
  // ============================================================

  async getPaymentsByInvoice(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // PRIVATE HELPERS — SINGLE SOURCE OF TRUTH
  // ============================================================

  private mapMidtransStatus(transactionStatus: string): PaymentStatus | null {
    switch (transactionStatus) {
      case 'capture':
      case 'settlement':
        return PaymentStatus.PAID;
      case 'expire':
        return PaymentStatus.EXPIRED;
      case 'cancel':
      case 'deny':
        return PaymentStatus.FAILED;
      case 'pending':
        return null;
      default:
        this.logger.warn(
          { transactionStatus },
          'Unknown Midtrans transaction_status — no action taken',
        );
        return null;
    }
  }

  private async applyStatusUpdate(
    payment: PaymentFull,
    newStatus: PaymentStatus,
    midtransData: MidtransStatusResponse,
    source: string,
    correlationId?: string,
  ): Promise<void> {
    // Prevent state regression: once a payment is marked as PAID or REFUNDED, it is in a terminal state
    // and cannot be modified to other statuses like EXPIRED, FAILED, or PENDING.
    if (
      payment.status === PaymentStatus.PAID ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      this.logger.warn(
        {
          correlationId,
          paymentId: payment.id,
          orderId: payment.invoice.orderId,
          currentStatus: payment.status,
          requestedStatus: newStatus,
        },
        'Prevented state regression: payment is already in terminal state',
      );
      return;
    }

    const updates: Prisma.PrismaPromise<any>[] = [
      this.prisma.payment.update({
        where: {
          id: payment.id,
          status: {
            notIn: [PaymentStatus.PAID, PaymentStatus.REFUNDED],
          },
        },
        data: {
          status: newStatus,
          midtransTransactionId:
            midtransData.transaction_id ?? payment.midtransTransactionId,
          paymentMethod: midtransData.payment_type ?? payment.paymentMethod,
        },
      }),
      this.prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paymentStatus: newStatus,
          paidAt: newStatus === PaymentStatus.PAID ? new Date() : undefined,
        },
      }),
    ];

    if (newStatus === PaymentStatus.PAID) {
      updates.push(
        this.prisma.order.update({
          where: { id: payment.invoice.orderId },
          data: { status: OrderStatus.PROCESSING },
        }),
      );
    }

    try {
      await this.prisma.$transaction(updates);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          {
            correlationId,
            paymentId: payment.id,
            orderId: payment.invoice.orderId,
            requestedStatus: newStatus,
          },
          'Prevented state regression: payment is already in terminal state (PAID/REFUNDED) in database',
        );
        return;
      }
      throw error;
    }

    this.logger.info(
      {
        correlationId,
        paymentId: payment.id,
        orderId: payment.invoice.orderId,
        newStatus,
        source,
      },
      'Database status updated atomically',
    );
  }
}
