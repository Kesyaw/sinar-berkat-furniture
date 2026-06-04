import { IsNumber, Min } from 'class-validator';

export class UpdateShippingDto {
  @IsNumber({}, { message: 'shippingCost must be a number' })
  @Min(0, { message: 'shippingCost must be zero or positive' })
  shippingCost: number;
}
