/**
 * jest.mock calls are hoisted above imports by ts-jest/babel.
 * Mock midtrans-client to prevent real network calls in the constructor.
 * Mock nestjs-pino to satisfy the @InjectPinoLogger decorator DI token.
 */
jest.mock('midtrans-client', () => ({
  Snap: jest.fn().mockImplementation(() => ({
    createTransaction: jest.fn(),
  })),
  CoreApi: jest.fn().mockImplementation(() => ({
    transaction: { status: jest.fn() },
  })),
}));

import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, Prisma, OrderStatus } from '@prisma/client';

// ================================================================
// Helpers
// ================================================================

const SERVER_KEY = 'test-server-key-12345';
const ORDER_ID = 'SBF-20260604-1234-1717500000000';
const STATUS_CODE = '200';
const GROSS_AMOUNT = '500000.00';

/** Build a valid Midtrans HMAC-SHA512 signature for the given order_id/status_code/gross_amount. */
function buildSignature(
  orderId = ORDER_ID,
  statusCode = STATUS_CODE,
  grossAmount = GROSS_AMOUNT,
  key = SERVER_KEY,
): string {
  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${key}`)
    .digest('hex');
}

/** Build a settlement webhook payload (maps to PAID). */
function settlementPayload(overrides: Record<string, string> = {}) {
  return {
    order_id: ORDER_ID,
    status_code: STATUS_CODE,
    gross_amount: GROSS_AMOUNT,
    transaction_status: 'settlement',
    transaction_id: 'txn-id-001',
    payment_type: 'bank_transfer',
    ...overrides,
  };
}

// ================================================================
// Test suite
// ================================================================

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: Record<string, jest.Mock | any>;

  /**
   * A payment record in PENDING state with its invoice and order,
   * matching ORDER_ID for webhook routing.
   */
  const pendingPayment = {
    id: 'payment-uuid-1',
    invoiceId: 'invoice-uuid-1',
    midtransOrderId: ORDER_ID,
    status: PaymentStatus.PENDING,
    midtransTransactionId: null,
    paymentMethod: null,
    invoice: {
      id: 'invoice-uuid-1',
      orderId: 'order-uuid-1',
      paymentStatus: PaymentStatus.PENDING,
      order: {
        id: 'order-uuid-1',
        status: OrderStatus.WAITING_PAYMENT,
      },
    },
  };

  /** Same payment but already in terminal PAID state. */
  const paidPayment = {
    ...pendingPayment,
    status: PaymentStatus.PAID,
    invoice: {
      ...pendingPayment.invoice,
      paymentStatus: PaymentStatus.PAID,
    },
  };

  beforeEach(async () => {
    const mockPrisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      invoice: { update: jest.fn(), create: jest.fn() },
      order: { update: jest.fn(), findUnique: jest.fn() },
      paymentLog: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };

    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            // Called in the constructor to validate midtrans config
            get: jest.fn().mockReturnValue('false'),
            getOrThrow: jest.fn().mockImplementation((key: string) => {
              if (key === 'MIDTRANS_SERVER_KEY') return SERVER_KEY;
              if (key === 'MIDTRANS_CLIENT_KEY') return 'client-key-test';
              if (key === 'MIDTRANS_IS_PRODUCTION') return 'false';
              throw new Error(`Unexpected key: ${key}`);
            }),
          },
        },
        {
          // Satisfy the @InjectPinoLogger(PaymentsService.name) DI token
          provide: getLoggerToken(PaymentsService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService) as any;
  });

  // ================================================================
  // Webhook — HMAC signature validation
  // ================================================================

  describe('handleWebhook — HMAC signature validation', () => {
    it('accepts a webhook with a valid HMAC-SHA512 signature', async () => {
      const payload = settlementPayload();
      const signature = buildSignature();

      prisma.payment.findUnique.mockResolvedValue(pendingPayment);
      prisma.paymentLog.create.mockResolvedValue({});

      await expect(
        service.handleWebhook(payload as any, JSON.stringify(payload), signature),
      ).resolves.toEqual({ status: 'ok' });
    });

    it('rejects a webhook with a wrong HMAC signature → throws BadRequestException', async () => {
      const payload = settlementPayload();

      await expect(
        service.handleWebhook(
          payload as any,
          JSON.stringify(payload),
          'completely-wrong-signature',
        ),
      ).rejects.toThrow(BadRequestException);

      // Must never reach the database lookup
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a webhook with an empty signature → throws BadRequestException', async () => {
      const payload = settlementPayload();

      await expect(
        service.handleWebhook(
          payload as any,
          JSON.stringify(payload),
          '' as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a webhook with an undefined signature → throws BadRequestException', async () => {
      const payload = settlementPayload();

      await expect(
        service.handleWebhook(
          payload as any,
          JSON.stringify(payload),
          undefined as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a signature built from a different server key', async () => {
      const payload = settlementPayload();
      const wrongKeySignature = buildSignature(
        ORDER_ID,
        STATUS_CODE,
        GROSS_AMOUNT,
        'wrong-server-key',
      );

      await expect(
        service.handleWebhook(
          payload as any,
          JSON.stringify(payload),
          wrongKeySignature,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ================================================================
  // State regression protection
  // ================================================================

  describe('state regression protection', () => {
    it('skips applyStatusUpdate when payment is already PAID (idempotency check in handleWebhook)', async () => {
      /**
       * The handleWebhook flow checks: payment.status !== newStatus
       * If the payment is already PAID and the webhook says 'settlement' (→ PAID),
       * the statuses are equal, so applyStatusUpdate is never called.
       */
      const payload = settlementPayload(); // settlement → PAID
      const signature = buildSignature();

      prisma.payment.findUnique.mockResolvedValue(paidPayment);
      prisma.paymentLog.create.mockResolvedValue({});

      await service.handleWebhook(
        payload as any,
        JSON.stringify(payload),
        signature,
      );

      // $transaction should never be called — status is already PAID
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('in-memory guard prevents PAID → EXPIRED regression in applyStatusUpdate', async () => {
      /**
       * Scenario: payment is PAID in memory, webhook says 'expire' (→ EXPIRED).
       * payment.status !== newStatus (PAID ≠ EXPIRED), so handleWebhook DOES call
       * applyStatusUpdate — but applyStatusUpdate's in-memory guard fires and returns
       * immediately without calling $transaction.
       */
      const expirePayload = settlementPayload({
        transaction_status: 'expire',
      });
      const signature = buildSignature();

      // Payment is PAID in memory
      prisma.payment.findUnique.mockResolvedValue(paidPayment);
      prisma.paymentLog.create.mockResolvedValue({});

      await service.handleWebhook(
        expirePayload as any,
        JSON.stringify(expirePayload),
        signature,
      );

      // applyStatusUpdate's in-memory guard must have fired — no DB $transaction
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('in-memory guard prevents PAID → FAILED regression in applyStatusUpdate', async () => {
      const cancelPayload = settlementPayload({
        transaction_status: 'cancel',
      });
      const signature = buildSignature();

      prisma.payment.findUnique.mockResolvedValue(paidPayment);
      prisma.paymentLog.create.mockResolvedValue({});

      await service.handleWebhook(
        cancelPayload as any,
        JSON.stringify(cancelPayload),
        signature,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('handles concurrent P2025 gracefully — DB already shows PAID while memory shows PENDING', async () => {
      /**
       * Race condition: two webhook requests arrive simultaneously.
       * The first updates the DB to PAID. The second (this test) still sees
       * payment as PENDING in memory, so passes the in-memory guard, but
       * the DB-level `notIn: [PAID, REFUNDED]` guard rejects the update
       * with P2025. handleWebhook must absorb this and return { status: 'ok' }.
       */
      const expirePayload = settlementPayload({
        transaction_status: 'expire',
      });
      const signature = buildSignature();

      // In-memory state shows PENDING (stale snapshot)
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);
      prisma.paymentLog.create.mockResolvedValue({});

      // DB rejects the update: payment is already in terminal state
      const p2025 = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found.',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      prisma.$transaction.mockRejectedValue(p2025);

      // Must NOT throw — the concurrent-update scenario is swallowed gracefully
      await expect(
        service.handleWebhook(
          expirePayload as any,
          JSON.stringify(expirePayload),
          signature,
        ),
      ).resolves.toEqual({ status: 'ok' });
    });

    it('propagates non-P2025 DB errors from applyStatusUpdate', async () => {
      const payload = settlementPayload();
      const signature = buildSignature();

      prisma.payment.findUnique.mockResolvedValue(pendingPayment);
      prisma.paymentLog.create.mockResolvedValue({});

      const connectionError = new Error('Connection to database lost');
      prisma.$transaction.mockRejectedValue(connectionError);

      await expect(
        service.handleWebhook(payload as any, JSON.stringify(payload), signature),
      ).rejects.toThrow('Connection to database lost');
    });
  });

  // ================================================================
  // createPublicPaymentLink
  // ================================================================

  describe('createPublicPaymentLink', () => {
    const mockOrderForLink = {
      id: 'order-uuid-1',
      orderNumber: 'SBF-20260604-1234',
      status: OrderStatus.WAITING_PAYMENT,
      customerName: 'Budi Santoso',
      customerPhone: '08123456789',
      customerEmail: null,
      total: '500000',
      items: [
        {
          id: 'item-uuid-1',
          productName: 'Kursi Jati',
          unitPrice: '500000',
          quantity: 1,
        },
      ],
      invoice: null,
    };

    it('throws NotFoundException if the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createPublicPaymentLink('SBF-99999999-9999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if the order is not in WAITING_PAYMENT status', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrderForLink,
        status: OrderStatus.PENDING_REVIEW,
      });

      await expect(
        service.createPublicPaymentLink('SBF-20260604-1234'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a public payment link successfully when status is WAITING_PAYMENT', async () => {
      // Stub the internal createPaymentLink call dependencies:
      // 1. First findUnique in createPublicPaymentLink
      prisma.order.findUnique.mockResolvedValueOnce(mockOrderForLink);
      // 2. Second findUnique inside createPaymentLink call
      prisma.order.findUnique.mockResolvedValueOnce(mockOrderForLink);
      
      const mockInvoice = { id: 'invoice-uuid-1' };
      prisma.invoice.create.mockResolvedValue(mockInvoice);

      const mockSnapInstance = new (require('midtrans-client').Snap)();
      mockSnapInstance.createTransaction = jest.fn().mockResolvedValue({
        redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/token123',
        token: 'token123',
      });
      service['snap'] = mockSnapInstance;

      const mockPayment = {
        id: 'payment-uuid-1',
        paymentUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/token123',
      };
      prisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.createPublicPaymentLink('SBF-20260604-1234');

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { orderNumber: 'SBF-20260604-1234' },
      });
      expect(result.paymentUrl).toBe('https://app.sandbox.midtrans.com/snap/v2/vtweb/token123');
    });
  });
});
