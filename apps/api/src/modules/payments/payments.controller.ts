import {
  Controller, Post, Get, Param,
  Body, Headers, UseGuards, RawBodyRequest, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Admin generate payment link untuk order
  @Post('orders/:orderId/create-link')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  createPaymentLink(@Param('orderId') orderId: string) {
    return this.paymentsService.createPaymentLink(orderId);
  }

  // Webhook dari Midtrans — tidak butuh auth
  @Post('webhook')
  handleWebhook(
    @Body() payload: any,
    @Headers('x-signature-key') signature: string,
  ) {
    return this.paymentsService.handleWebhook(
      payload,
      JSON.stringify(payload),
      signature,
    );
  }

  // Get payments by invoice
  @Get('invoices/:invoiceId')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  getPaymentsByInvoice(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.getPaymentsByInvoice(invoiceId);
  }
}
