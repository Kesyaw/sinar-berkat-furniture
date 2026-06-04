import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { SupabaseRegistrationGuard } from '../../common/guards/supabase-registration.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/sync
   *
   * Upserts the caller's profile in the Prisma DB after Supabase authentication.
   * supabaseId and email are sourced exclusively from the verified JWT payload
   * (via @CurrentUser) — never from the request body — so a user cannot sync
   * another user's record.
   */
  @Post('sync')
  @UseGuards(SupabaseRegistrationGuard)
  async syncUser(
    @CurrentUser() user: { supabaseId: string; email: string },
    @Body() dto: SyncUserDto,
  ) {
    return this.authService.syncUser({
      supabaseId: user.supabaseId, // from verified JWT — cannot be forged
      email: user.email, // from verified JWT — cannot be forged
      fullName: dto.fullName, // optional display name from body
    });
  }

  @Get('me')
  @UseGuards(AuthGuard('supabase-jwt'))
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('supabase-jwt'))
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }
}
