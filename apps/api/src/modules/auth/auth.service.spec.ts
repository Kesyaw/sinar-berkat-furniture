import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: Record<string, jest.Mock> };

  const mockUser = {
    id: 'user-uuid-1',
    supabaseId: 'supabase-uid-1',
    email: 'test@example.com',
    fullName: 'Test User',
    phone: null,
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService) as any;
  });

  describe('syncUser', () => {
    it('creates a new user (upsert with create data) when one does not exist', async () => {
      prisma.user.upsert.mockResolvedValue(mockUser);

      const result = await service.syncUser({
        supabaseId: 'supabase-uid-1',
        email: 'test@example.com',
        fullName: 'Test User',
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { supabaseId: 'supabase-uid-1' },
        update: { email: 'test@example.com' },
        create: {
          supabaseId: 'supabase-uid-1',
          email: 'test@example.com',
          fullName: 'Test User',
          role: UserRole.CUSTOMER,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('updates email for an existing user (upsert update path)', async () => {
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      prisma.user.upsert.mockResolvedValue(updatedUser);

      const result = await service.syncUser({
        supabaseId: 'supabase-uid-1',
        email: 'newemail@example.com',
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { supabaseId: 'supabase-uid-1' },
        update: { email: 'newemail@example.com' },
        create: expect.objectContaining({
          supabaseId: 'supabase-uid-1',
          email: 'newemail@example.com',
          role: UserRole.CUSTOMER,
        }),
      });
      expect(result.email).toBe('newemail@example.com');
    });

    it('derives fullName from email prefix when fullName is not provided', async () => {
      prisma.user.upsert.mockResolvedValue({ ...mockUser, fullName: 'jane' });

      await service.syncUser({
        supabaseId: 'supabase-uid-2',
        email: 'jane@example.com',
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ fullName: 'jane' }),
        }),
      );
    });

    it('always uses CUSTOMER as the default role', async () => {
      prisma.user.upsert.mockResolvedValue(mockUser);

      await service.syncUser({
        supabaseId: 'supabase-uid-1',
        email: 'test@example.com',
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ role: UserRole.CUSTOMER }),
        }),
      );
    });
  });
});
