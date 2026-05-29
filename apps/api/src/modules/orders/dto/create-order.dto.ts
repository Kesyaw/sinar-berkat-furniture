import {
  IsString, IsOptional, IsArray,
  IsInt, IsDecimal, Min, ValidateNested, MinLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class OrderItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @MinLength(1)
  productName: string;

  @Transform(({ value }) => value?.toString())
  @IsDecimal()
  unitPrice: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsString()
  shippingAddress: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
