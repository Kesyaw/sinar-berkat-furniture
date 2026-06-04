import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: { include: { items: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async findByOrderId(orderId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: {
        order: { include: { items: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async findAll(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        include: {
          order: { select: { orderNumber: true, customerName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count(),
    ]);
    return { items, total, page, limit };
  }
}
