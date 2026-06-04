import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SupabaseRegistrationGuard extends AuthGuard(
  'supabase-jwt-registration',
) {}
