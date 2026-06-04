import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDecimal,
  MinLength,
  Min,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  slug: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => value?.toString())
  @IsDecimal()
  basePrice: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  stockQty?: number;
}
