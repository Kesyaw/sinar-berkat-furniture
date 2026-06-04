import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsScheduler } from './payments.scheduler';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsScheduler, // Registers the cron job for automatic reconciliation
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
