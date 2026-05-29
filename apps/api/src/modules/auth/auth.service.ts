import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async syncUser(dto: { supabaseId: string; email: string; fullName?: string }) {
    return this.prisma.user.upsert({
      where: { supabaseId: dto.supabaseId },
      update: { email: dto.email },
      create: {
        supabaseId: dto.supabaseId,
        email: dto.email,
        fullName: dto.fullName ?? dto.email.split('@')[0],
        role: UserRole.CUSTOMER,
      },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }
}