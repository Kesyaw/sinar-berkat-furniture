import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Public — 10 requests/minute per IP to prevent order spam
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: { id: string }) {
    return this.ordersService.create(dto, user?.id);
  }

  // Admin only
  @Get()
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll({
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('my')
  @UseGuards(AuthGuard('supabase-jwt'))
  getMyOrders(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findByUser(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // Public order tracking by order number — 10 requests/minute per IP
  @Get('track/:orderNumber')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @Get(':id')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Patch(':id/shipping')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  updateShipping(@Param('id') id: string, @Body() dto: UpdateShippingDto) {
    return this.ordersService.updateShipping(id, dto.shippingCost);
  }

  @Get(':id/whatsapp-message')
  @UseGuards(AuthGuard('supabase-jwt'), RolesGuard)
  @Roles('ADMIN')
  async getWhatsappMessage(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    const message = this.ordersService.generateWhatsappMessage(order);
    const phone = order.customerPhone.replace(/^0/, '62').replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    return {
      message,
      phone,
      whatsappUrl: `https://wa.me/${phone}?text=${encoded}`,
    };
  }
}
