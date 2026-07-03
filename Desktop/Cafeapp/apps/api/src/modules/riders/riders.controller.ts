import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RidersService } from './riders.service';
import { PostLocationDto } from './dto/post-location.dto';
import { UpdateOnlineDto } from './dto/update-online.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  // GET /riders/available-orders
  @Get('riders/available-orders')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  getAvailableOrders(@Request() req) {
    return this.ridersService.getAvailableOrders(req.user.id);
  }

  // PATCH /riders/online
  @Patch('riders/online')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  setOnline(@Request() req, @Body() dto: UpdateOnlineDto) {
    return this.ridersService.setOnline(req.user.id, dto.isOnline);
  }

  // POST /riders/location
  @Post('riders/location')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  postLocation(@Request() req, @Body() dto: PostLocationDto) {
    return this.ridersService.postLocation(req.user.id, dto);
  }

  // GET /riders/earnings
  @Get('riders/earnings')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  getEarnings(@Request() req) {
    return this.ridersService.getEarnings(req.user.id);
  }

  // PATCH /orders/:id/assign  (rider-specific action)
  @Patch('orders/:id/assign')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  assignOrder(@Request() req, @Param('id') id: string) {
    return this.ridersService.assignOrder(req.user.id, id);
  }

  // PATCH /orders/:id/pickup
  @Patch('orders/:id/pickup')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  pickupOrder(@Request() req, @Param('id') id: string) {
    return this.ridersService.pickupOrder(req.user.id, id);
  }

  // PATCH /orders/:id/deliver
  @Patch('orders/:id/deliver')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  deliverOrder(@Request() req, @Param('id') id: string) {
    return this.ridersService.deliverOrder(req.user.id, id);
  }
}

// Made with Bob
