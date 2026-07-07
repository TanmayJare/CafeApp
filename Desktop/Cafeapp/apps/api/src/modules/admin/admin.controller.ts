import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@cafeconnect/database';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- Users ---
  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  createUser(@Body() body: any) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // --- Customers ---
  @Get('customers')
  getCustomers() {
    return this.adminService.getCustomers();
  }

  @Get('customers/:id/orders')
  getCustomerOrders(@Param('id') id: string) {
    return this.adminService.getCustomerOrders(id);
  }

  // --- Orders ---
  @Get('orders')
  getOrders() {
    return this.adminService.getOrders();
  }

  @Patch('orders/:id')
  updateOrder(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateOrder(id, body);
  }

  @Delete('orders/:id')
  deleteOrder(@Param('id') id: string) {
    return this.adminService.deleteOrder(id);
  }

  // --- Bills ---
  @Get('bills')
  getBills() {
    return this.adminService.getBills();
  }

  @Patch('bills/:id')
  updateBill(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateBill(id, body);
  }

  @Delete('bills/:id')
  deleteBill(@Param('id') id: string) {
    return this.adminService.deleteBill(id);
  }
}
