import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: { order: Record<string, jest.Mock> };

  const mockOrder = {
    id: 'order-uuid-1',
    orderNumber: 'SBF-20260604-1234',
    userId: null,
    customerName: 'Budi Santoso',
    customerPhone: '08123456789',
    customerEmail: null,
    shippingAddress: 'Jl. Merdeka No. 1, Jakarta',
    notes: null,
    subtotal: '500000',
    total: '500000',
    shippingCost: '0',
    status: OrderStatus.PENDING_REVIEW,
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-uuid-1',
        productName: 'Kursi Kayu',
        unitPrice: '500000',
        quantity: 1,
        subtotal: '500000',
      },
    ],
  };

  const createOrderDto = {
    customerName: 'Budi Santoso',
    customerPhone: '08123456789',
    shippingAddress: 'Jl. Merdeka No. 1, Jakarta',
    notes: null,
    customerEmail: null,
    items: [
      {
        productId: null,
        productName: 'Kursi Kayu',
        unitPrice: '500000',
        quantity: 1,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService) as any;
  });

  // ================================================================
  // create
  // ================================================================

  describe('create', () => {
    it('creates an order with userId = null for guest checkout', async () => {
      prisma.order.create.mockResolvedValue(mockOrder);

      await service.create(createOrderDto as any);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null }),
        }),
      );
    });

    it('links userId for an authenticated checkout', async () => {
      const authOrder = { ...mockOrder, userId: 'user-uuid-1' };
      prisma.order.create.mockResolvedValue(authOrder);

      await service.create(createOrderDto as any, 'user-uuid-1');

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-uuid-1' }),
        }),
      );
    });

    it('calculates correct subtotal and total from items', async () => {
      prisma.order.create.mockResolvedValue(mockOrder);

      await service.create(createOrderDto as any);

      // unitPrice '500000' × quantity 1 = 500000
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 500000,
            total: 500000,
          }),
        }),
      );
    });

    it('starts with PENDING_REVIEW status', async () => {
      prisma.order.create.mockResolvedValue(mockOrder);

      await service.create(createOrderDto as any);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.PENDING_REVIEW,
          }),
        }),
      );
    });

    it('generates an order number matching the SBF-YYYYMMDD-XXXX pattern', async () => {
      prisma.order.create.mockResolvedValue(mockOrder);

      await service.create(createOrderDto as any);

      const callArg = prisma.order.create.mock.calls[0][0];
      expect(callArg.data.orderNumber).toMatch(/^SBF-\d{8}-\d{4}$/);
    });

    it('retries on P2002 orderNumber collision and succeeds', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed.',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['orderNumber'] },
        },
      );

      // First call throws a collision; second call succeeds
      prisma.order.create
        .mockRejectedValueOnce(p2002Error)
        .mockResolvedValueOnce(mockOrder);

      const result = await service.create(createOrderDto as any);

      expect(prisma.order.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockOrder);
    });

    it('propagates non-collision errors immediately', async () => {
      const genericError = new Error('Database connection lost');
      prisma.order.create.mockRejectedValue(genericError);

      await expect(service.create(createOrderDto as any)).rejects.toThrow(
        'Database connection lost',
      );
    });
  });

  // ================================================================
  // findByUser — GET /orders/my
  // ================================================================

  describe('findByUser', () => {
    it('queries orders scoped only to the authenticated userId', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder]);
      prisma.order.count.mockResolvedValue(1);

      await service.findByUser('user-uuid-1');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid-1' },
        }),
      );
    });

    it('does not expose orders from other users', async () => {
      const otherUserOrder = { ...mockOrder, userId: 'user-uuid-999' };
      prisma.order.findMany.mockResolvedValue([otherUserOrder]);
      prisma.order.count.mockResolvedValue(1);

      await service.findByUser('user-uuid-1');

      // The where clause must use the provided userId, not any other
      const callArg = prisma.order.findMany.mock.calls[0][0];
      expect(callArg.where.userId).toBe('user-uuid-1');
      expect(callArg.where.userId).not.toBe('user-uuid-999');
    });

    it('returns paginated result with metadata', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.findByUser('user-uuid-1', 1, 20);

      expect(result).toEqual({
        items: [mockOrder],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  // ================================================================
  // findByOrderNumber — GET /orders/track/:orderNumber
  // ================================================================

  describe('findByOrderNumber', () => {
    it('returns the correct order when the order number exists', async () => {
      const orderWithInvoice = { ...mockOrder, invoice: null };
      prisma.order.findUnique.mockResolvedValue(orderWithInvoice);

      const result = await service.findByOrderNumber('SBF-20260604-1234');

      expect(prisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderNumber: 'SBF-20260604-1234' },
        }),
      );
      expect(result.orderNumber).toBe('SBF-20260604-1234');
    });

    it('throws NotFoundException for an invalid order number', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findByOrderNumber('SBF-99999999-9999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('includes items and invoice in the returned order', async () => {
      const orderWithInvoice = {
        ...mockOrder,
        invoice: { id: 'inv-1', paymentStatus: 'PENDING' },
      };
      prisma.order.findUnique.mockResolvedValue(orderWithInvoice);

      const result = await service.findByOrderNumber('SBF-20260604-1234');

      expect(result.items).toBeDefined();
      expect(result.invoice).toBeDefined();
    });
  });
});
