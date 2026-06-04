import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getSupabaseJwtOptions } from './supabase-jwt-config.helper';

@Injectable()
export class SupabaseRegistrationStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt-registration',
) {
  constructor(private configService: ConfigService) {
    super(getSupabaseJwtOptions(configService));
  }

  validate(payload: { sub: string; email: string }) {
    // This strategy is dedicated to POST /auth/sync.
    // It verifies JWT validity and scopes, but does NOT query the database
    // for user existence since the user is in the process of registering.
    return {
      supabaseId: payload.sub,
      email: payload.email,
    };
  }
}
