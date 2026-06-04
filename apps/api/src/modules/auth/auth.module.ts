import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';
import { SupabaseRegistrationStrategy } from './supabase-registration.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'supabase-jwt' })],
  providers: [SupabaseJwtStrategy, SupabaseRegistrationStrategy, AuthService],
  controllers: [AuthController],
  exports: [SupabaseJwtStrategy, SupabaseRegistrationStrategy],
})
export class AuthModule {}
