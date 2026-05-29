import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvoicesService } from './invoices.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('order/:orderId')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.invoicesService.findByOrderId(orderId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }
}
