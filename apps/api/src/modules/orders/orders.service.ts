import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    status?: OrderStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, page = 1, limit = 20 } = params;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          invoice: { select: { paymentStatus: true, invoiceNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, images: true } } },
        },
        invoice: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(dto: CreateOrderDto) {
    // Hitung subtotal dari items
    const subtotal = dto.items.reduce((sum, item) => {
      return sum + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    const total = subtotal; // shipping cost ditambah admin nanti

    // Generate order number: SBF-YYYYMMDD-XXXX
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `SBF-${datePart}-${randomPart}`;

    return this.prisma.order.create({
      data: {
        orderNumber,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        shippingAddress: dto.shippingAddress,
        notes: dto.notes,
        subtotal,
        total,
        status: OrderStatus.PENDING_REVIEW,
        items: {
          create: dto.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: parseFloat(item.unitPrice) * item.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes,
      },
      include: { items: true, invoice: true },
    });
  }

  async updateShipping(id: string, shippingCost: number) {
    const order = await this.findOne(id);
    const newTotal = parseFloat(order.subtotal.toString()) + shippingCost;
    return this.prisma.order.update({
      where: { id },
      data: {
        shippingCost,
        total: newTotal,
      },
    });
  }

  // === METHOD BARU TAMBAHAN DI SINI ===

  generateWhatsappMessage(order: any): string {
    const items = order.items
      .map((item: any) => `• ${item.productName} x${item.quantity} = Rp ${this.formatPrice(item.subtotal)}`)
      .join('\n');

    const statusLabel: Record<string, string> = {
      PENDING_REVIEW: 'Menunggu Konfirmasi',
      WAITING_PAYMENT: 'Menunggu Pembayaran',
      PROCESSING: 'Sedang Diproses',
      PRODUCTION: 'Dalam Produksi',
      SHIPPED: 'Sedang Dikirim',
      COMPLETED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    };

    return `Halo ${order.customerName},

Berikut update pesanan Anda di *Sinar Berkat Furniture*:

*No. Order:* ${order.orderNumber}
*Status:* ${statusLabel[order.status] ?? order.status}

*Detail Pesanan:*
${items}

*Subtotal:* Rp ${this.formatPrice(order.subtotal)}
*Ongkir:* Rp ${this.formatPrice(order.shippingCost)}
*Total:* Rp ${this.formatPrice(order.total)}

*Alamat Pengiriman:*
${order.shippingAddress}

${order.adminNotes ? `*Catatan:* ${order.adminNotes}\n` : ''}Terima kasih telah berbelanja di Sinar Berkat Furniture! 🪑

Ada pertanyaan? Balas pesan ini.`;
  }

  private formatPrice(value: any): string {
    const num = parseFloat(value?.toString() ?? '0');
    return num.toLocaleString('id-ID');
  }
}
