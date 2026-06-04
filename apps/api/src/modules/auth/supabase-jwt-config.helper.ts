import { ConfigService } from '@nestjs/config';
import { ExtractJwt, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

export function getSupabaseJwtOptions(
  configService: ConfigService,
): StrategyOptionsWithoutRequest {
  const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
  return {
    secretOrKeyProvider: passportJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    }),
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    audience: 'authenticated',
    issuer: `${supabaseUrl}/auth/v1`,
    algorithms: ['ES256'],
  };
}
