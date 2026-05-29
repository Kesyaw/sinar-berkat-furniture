import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as midtransClient from 'midtrans-client';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private snap: midtransClient.Snap;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.snap = new midtransClient.Snap({
      isProduction: this.config.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.config.getOrThrow('MIDTRANS_SERVER_KEY'),
      clientKey: this.config.getOrThrow('MIDTRANS_CLIENT_KEY'),
    });
  }

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
      item_details: order.items.map(item => ({
        id: item.id,
        name: item.productName.substring(0, 50),
        price: Math.round(parseFloat(item.unitPrice.toString())),
        quantity: item.quantity,
      })),
      expiry: {
        unit: 'hours',
        duration: 24,
      },
    };

    const transaction = await this.snap.createTransaction(parameter);

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

    return {
      paymentUrl: transaction.redirect_url,
      token: transaction.token,
      midtransOrderId,
      invoiceId: invoice.id,
      paymentId: payment.id,
    };
  }

  async handleWebhook(payload: any, rawBody: string, signature: string) {
    // Validasi HMAC signature
    const serverKey = this.config.getOrThrow('MIDTRANS_SERVER_KEY');
    const expectedSignature = crypto
      .createHash('sha512')
      .update(
        `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`,
      )
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    // Cari payment berdasarkan midtrans order ID
    const payment = await this.prisma.payment.findUnique({
      where: { midtransOrderId: payload.order_id },
      include: { invoice: { include: { order: true } } },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // Map Midtrans status ke internal status
    let newStatus: PaymentStatus;
    switch (payload.transaction_status) {
      case 'capture':
      case 'settlement':
        newStatus = PaymentStatus.PAID;
        break;
      case 'expire':
        newStatus = PaymentStatus.EXPIRED;
        break;
      case 'cancel':
      case 'deny':
        newStatus = PaymentStatus.FAILED;
        break;
      default:
        newStatus = PaymentStatus.PENDING;
    }

    // Update payment dan log — idempotent check
    if (payment.status !== newStatus) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: newStatus,
            midtransTransactionId: payload.transaction_id,
            paymentMethod: payload.payment_type,
          },
        }),
        this.prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paymentStatus: newStatus,
            paidAt: newStatus === PaymentStatus.PAID ? new Date() : undefined,
          },
        }),
        // Update order status kalau sudah bayar
        ...(newStatus === PaymentStatus.PAID
          ? [
              this.prisma.order.update({
                where: { id: payment.invoice.orderId },
                data: { status: 'PROCESSING' },
              }),
            ]
          : []),
      ]);
    }

    // Simpan raw log
    await this.prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        eventType: payload.transaction_status,
        rawPayload: payload,
        hmacValid: true,
      },
    });

    return { status: 'ok' };
  }

  async getPaymentsByInvoice(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}