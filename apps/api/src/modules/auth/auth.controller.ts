import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sync')
  @UseGuards(AuthGuard('supabase-jwt'))
  async syncUser(@Body() dto: { supabaseId: string; email: string; fullName?: string }) {
    return this.authService.syncUser(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('supabase-jwt'))
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }
}