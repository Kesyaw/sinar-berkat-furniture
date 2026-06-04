import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseJwtOptions } from './supabase-jwt-config.helper';

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super(getSupabaseJwtOptions(configService));
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId: payload.sub },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      role: user.role,
    };
  }
}
