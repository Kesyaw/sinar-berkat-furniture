import { IsString, IsOptional, IsEmail } from 'class-validator';

/**
 * SyncUserDto — body accepted by POST /auth/sync.
 *
 * NOTE: supabaseId is intentionally NOT a field here.
 * It is extracted exclusively from the verified JWT payload (@CurrentUser)
 * to guarantee a user can only sync their own record.
 */
export class SyncUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
