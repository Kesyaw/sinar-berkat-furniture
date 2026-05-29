import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: 'authenticated',
      issuer: `${supabaseUrl}/auth/v1`,
      algorithms: ['ES256'], // ← ganti dari RS256 ke ES256
    });
  }

  async validate(payload: { sub: string; email: string }) {
    console.log('✅ JWT validate called:', payload.sub); // tambah baris ini
    const user = await this.prisma.user.findUnique({
      where: { supabaseId: payload.sub },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }
    return { id: user.id, supabaseId: user.supabaseId, email: user.email, role: user.role };
  }
}