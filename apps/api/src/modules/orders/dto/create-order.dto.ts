import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsDecimal,
  IsEmail,
  Min,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  ArrayMinSize,
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
  @MinLength(5, { message: 'customerPhone must be at least 5 characters' })
  @MaxLength(20, { message: 'customerPhone must be at most 20 characters' })
  @Matches(/^[0-9+\-\s()]{5,20}$/, {
    message: 'customerPhone must contain only digits, spaces, +, -, (, )',
  })
  customerPhone: string;

  @IsOptional()
  @IsEmail({}, { message: 'customerEmail must be a valid email address' })
  customerEmail?: string;

  @IsString()
  shippingAddress: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
