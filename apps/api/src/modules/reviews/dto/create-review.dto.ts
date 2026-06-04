import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ReviewSource } from '@prisma/client';

export class CreateReviewDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @MinLength(2)
  customerName: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(5)
  comment: string;

  @IsOptional()
  @IsEnum(ReviewSource)
  source?: ReviewSource;
}
