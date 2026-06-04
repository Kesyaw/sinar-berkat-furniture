import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductsService {
  private supabase;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async findAll(params: {
    categoryId?: string;
    status?: ProductStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { categoryId, status, search, page = 1, limit = 20 } = params;

    const where: any = { deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Slug already exists');

    return this.prisma.product.create({
      data: {
        ...dto,
        basePrice: dto.basePrice,
        status: dto.status ?? ProductStatus.READY_STOCK,
      },
      include: { category: true, images: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Slug already exists');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, images: true },
    });
  }

  // Soft delete
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async uploadImage(
    productId: string,
    file: Express.Multer.File,
    isPrimary: boolean,
  ) {
    await this.findOne(productId);

    const ext = file.originalname.split('.').pop();
    const fileName = `${productId}/${Date.now()}.${ext}`;

    const { error } = await this.supabase.storage
      .from('product-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);

    const { data: urlData } = this.supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // Kalau isPrimary, reset semua image lain
    if (isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        storagePath: fileName,
        isPrimary,
        sortOrder: 0,
      },
    });

    return { ...image, publicUrl: urlData.publicUrl };
  }

  async deleteImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    await this.supabase.storage
      .from('product-images')
      .remove([image.storagePath]);

    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async getProductStats(productId: string) {
    const sold = await this.prisma.orderItem.aggregate({
      where: {
        productId,
        order: { status: 'COMPLETED' },
      },
      _sum: { quantity: true },
    });
    return { soldCount: sold._sum.quantity ?? 0 };
  }
}
