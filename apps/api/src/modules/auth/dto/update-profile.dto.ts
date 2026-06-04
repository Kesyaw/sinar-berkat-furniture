import { IsString, IsOptional, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100, {
    message: 'Nama lengkap harus antara 2 hingga 100 karakter',
  })
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{5,20}$/, {
    message: 'Format nomor telepon tidak valid',
  })
  phone?: string;
}
