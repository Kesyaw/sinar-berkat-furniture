/**
 * jest.mock MUST appear before any import that transitively loads jwks-rsa,
 * because jest.mock calls are hoisted to the top of the file by Babel/ts-jest.
 * This prevents the ESM SyntaxError from jwks-rsa → jose.
 */
jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn().mockReturnValue(
    jest.fn().mockResolvedValue('mock-public-key'),
  ),
}));

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('SupabaseJwtStrategy', () => {
  let strategy: SupabaseJwtStrategy;
  let prisma: { user: Record<string, jest.Mock> };

  const mockUser = {
    id: 'user-uuid-1',
    supabaseId: 'supabase-uid-1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.CUSTOMER,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseJwtStrategy,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest
              .fn()
              .mockReturnValue('https://mock.supabase.co'),
          },
        },
      ],
    }).compile();

    strategy = module.get<SupabaseJwtStrategy>(SupabaseJwtStrategy);
    prisma = module.get<PrismaService>(PrismaService) as any;
  });

  describe('validate', () => {
    it('returns the full user object when JWT is valid and user exists in DB', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate({
        sub: 'supabase-uid-1',
        email: 'test@example.com',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { supabaseId: 'supabase-uid-1' },
      });
      expect(result).toEqual({
        id: mockUser.id,
        supabaseId: mockUser.supabaseId,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('throws UnauthorizedException when user is not found in DB (unsynced user denied access)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'unknown-uid', email: 'nobody@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for soft-deleted users (deleted user denied access)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date('2024-01-01'),
      });

      await expect(
        strategy.validate({
          sub: 'supabase-uid-1',
          email: 'test@example.com',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not allow role elevation — role is always sourced from DB, never JWT', async () => {
      // Even if the JWT payload had a role claim, it would be ignored.
      // The returned role must come from the database record.
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.CUSTOMER,
      });

      const result = await strategy.validate({
        sub: 'supabase-uid-1',
        email: 'test@example.com',
        role: 'ADMIN', // malicious claim in JWT payload — must be ignored
      } as any);

      expect(result.role).toBe(UserRole.CUSTOMER);
    });
  });
});
