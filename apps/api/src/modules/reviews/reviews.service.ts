import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Public — ambil review yang sudah diapprove
  async findApproved(productId?: string) {
    return this.prisma.review.findMany({
      where: {
        isApproved: true,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Public — customer submit review
  async create(dto: CreateReviewDto) {
    return this.prisma.review.create({
      data: {
        ...dto,
        isApproved: false, // harus diapprove admin dulu
      },
    });
  }

  // Admin — ambil semua review
  async findAll(params: { approved?: boolean; page?: number; limit?: number }) {
    const { approved, page = 1, limit = 20 } = params;
    const where: any = {};
    if (approved !== undefined) where.isApproved = approved;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { product: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  // Admin — approve/reject review
  async updateApproval(id: string, isApproved: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({
      where: { id },
      data: { isApproved },
    });
  }

  // Admin — manual input review
  async adminCreate(dto: CreateReviewDto) {
    return this.prisma.review.create({
      data: {
        ...dto,
        isApproved: true, // admin input langsung approved
      },
    });
  }

  async remove(id: string) {
    return this.prisma.review.delete({ where: { id } });
  }

  // Stats untuk homepage
  async getStats() {
    const [totalReviews, avgRating] = await Promise.all([
      this.prisma.review.count({ where: { isApproved: true } }),
      this.prisma.review.aggregate({
        where: { isApproved: true },
        _avg: { rating: true },
      }),
    ]);
    return {
      totalReviews,
      avgRating: avgRating._avg.rating ?? 0,
    };
  }
}
