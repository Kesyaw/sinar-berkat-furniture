import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';

/**
 * PaymentsScheduler — Automatic Payment Reconciliation
 */
@Injectable()
export class PaymentsScheduler {
  /**
   * Concurrency lock: prevents a new cron run from starting while
   * a previous run is still processing.
   */
  private isRunning = false;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectPinoLogger(PaymentsScheduler.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Runs every 15 minutes.
   * Cron pattern is: every 15 minutes
   */
  @Cron('*/15 * * * *', {
    name: 'payment-reconciliation',
    timeZone: 'Asia/Jakarta',
  })
  async reconcileExpiredPayments(): Promise<void> {
    const jobStart = Date.now();
    // Generate a unique correlation ID for this scheduler execution path
    const correlationId = crypto.randomUUID();

    // Concurrency guard
    if (this.isRunning) {
      this.logger.warn(
        { correlationId },
        '[Scheduler] Skipping reconciliation run — previous run is still in progress.',
      );
      return;
    }

    this.isRunning = true;

    try {
      const batchSize = this.getBatchSize();

      this.logger.info(
        { correlationId, batchSize },
        '[Scheduler] Reconciliation triggered',
      );

      const summary = await this.paymentsService.runReconciliation(
        batchSize,
        'scheduler',
        correlationId,
      );

      const executionTimeMs = Date.now() - jobStart;
      this.logger.info(
        {
          correlationId,
          checkedCount: summary.totalChecked,
          updatedCount: summary.totalUpdated,
          skippedCount: summary.totalSkipped,
          errorCount: summary.totalErrors,
          executionTimeMs,
        },
        '[Scheduler] Reconciliation job completed successfully',
      );

      if (summary.totalErrors > 0) {
        this.logger.warn(
          { correlationId, errorCount: summary.totalErrors },
          '[Scheduler] Some payments failed to reconcile. Check logs for details.',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { correlationId, error: message },
        '[Scheduler] Reconciliation run failed with unexpected error',
      );
    } finally {
      this.isRunning = false;
    }
  }

  private getBatchSize(): number {
    const raw = this.config.get<string>('PAYMENT_RECONCILIATION_BATCH_SIZE');
    const parsed = parseInt(raw ?? '50', 10);

    if (isNaN(parsed) || parsed <= 0) {
      this.logger.warn(
        { raw },
        'Invalid PAYMENT_RECONCILIATION_BATCH_SIZE value. Falling back to 50.',
      );
      return 50;
    }

    return parsed;
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }
}
