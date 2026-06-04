import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { MidtransWebhookDto } from './dto/midtrans-webhook.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Custom request interface to safely access request identifiers
 * added by logging middleware/interceptors without triggering lint warnings.
 */
interface CustomRequest extends Request {
  id: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ──────────────────────────────────────────
  // CREATE PAYMENT LINK (Admin only)
  // ──────────────────────────────────────────

  // 5 requests/minute per IP — prevents payment link spam
  @Post('orders/:orderId/create-link')
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  createPaymentLink(@Param('orderId') orderId: string) {
    return this.paymentsService.createPaymentLink(orderId);
  }

  // Public endpoint for customer to generate/retrieve their payment link
  @Post('orders/track/:orderNumber/create-link')
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  createPublicPaymentLink(@Param('orderNumber') orderNumber: string) {
    return this.paymentsService.createPublicPaymentLink(orderNumber);
  }


  // ──────────────────────────────────────────
  // MIDTRANS WEBHOOK (No auth — called by Midtrans servers)
  // ──────────────────────────────────────────

  /**
   * Receives payment status notifications from Midtrans.
   * No authentication guard — Midtrans doesn't send our JWT.
   * Security is handled by HMAC SHA-512 signature validation inside the service.
   */
  // 120 requests/minute — generous to avoid blocking legitimate Midtrans traffic
  @Post('webhook')
  @Throttle({ webhook: { ttl: 60_000, limit: 120 } })
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Body() payload: MidtransWebhookDto,
    @Headers('x-signature-key') signature: string,
    @Req() req: CustomRequest,
  ) {
    const correlationId =
      (req.headers?.['x-correlation-id'] as string) || req.id;
    return this.paymentsService.handleWebhook(
      payload,
      JSON.stringify(payload),
      signature,
      correlationId,
    );
  }

  // ──────────────────────────────────────────
  // MANUAL RECONCILIATION (Admin only)
  // ──────────────────────────────────────────

  /**
   * Triggers a payment reconciliation run immediately on demand.
   *
   * USE CASES:
   * - After a server outage, to immediately recover missed webhook statuses
   * - When an admin suspects a payment is stuck in PENDING state
   * - Debugging and testing the reconciliation logic in staging
   *
   * The reconciliation is idempotent — safe to call multiple times.
   * It only updates payments whose Midtrans status differs from our DB.
   *
   * @param batchSize - Optional. Max payments to check. Defaults to env var
   *                    PAYMENT_RECONCILIATION_BATCH_SIZE (fallback: 50).
   *
   * @returns ReconciliationSummary with: totalChecked, totalUpdated,
   *          totalSkipped, totalErrors, executionTimeMs, and per-payment results.
   */
  // 3 requests/minute — heavy operation, protect against accidental hammering
  @Post('reconcile')
  @Throttle({ strict: { ttl: 60_000, limit: 3 } })
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  manualReconcile(
    @Query('batchSize') batchSize?: string,
    @Req() req?: CustomRequest,
  ) {
    const correlationId =
      (req?.headers?.['x-correlation-id'] as string) || req?.id;
    const limit = batchSize ? Math.max(1, parseInt(batchSize, 10)) : 50;
    return this.paymentsService.runReconciliation(
      limit,
      'manual',
      correlationId,
    );
  }

  // ──────────────────────────────────────────
  // GET PAYMENTS BY INVOICE (Admin only)
  // ──────────────────────────────────────────

  @Get('invoices/:invoiceId')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  getPaymentsByInvoice(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.getPaymentsByInvoice(invoiceId);
  }
}
