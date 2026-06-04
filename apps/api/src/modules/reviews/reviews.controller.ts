import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Public
  @Get()
  findApproved(@Query('productId') productId?: string) {
    return this.reviewsService.findApproved(productId);
  }

  @Get('stats')
  getStats() {
    return this.reviewsService.getStats();
  }

  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  // Admin
  @Get('admin/all')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  findAll(@Query('approved') approved?: string, @Query('page') page?: string) {
    return this.reviewsService.findAll({
      approved: approved !== undefined ? approved === 'true' : undefined,
      page: page ? parseInt(page) : 1,
    });
  }

  @Post('admin')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  adminCreate(@Body() dto: CreateReviewDto) {
    return this.reviewsService.adminCreate(dto);
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  approve(@Param('id') id: string) {
    return this.reviewsService.updateApproval(id, true);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  reject(@Param('id') id: string) {
    return this.reviewsService.updateApproval(id, false);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
