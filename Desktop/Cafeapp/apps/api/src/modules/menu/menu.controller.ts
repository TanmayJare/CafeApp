import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ===== Public Endpoints (No Auth) =====

  @Get('categories')
  findAllCategories() {
    return this.menuService.findAllCategories();
  }

  @Get('categories/:id')
  findCategoryById(@Param('id') id: string) {
    return this.menuService.findCategoryById(id);
  }

  @Get('items')
  findAllMenuItems(@Query('categoryId') categoryId?: string) {
    return this.menuService.findAllMenuItems(categoryId);
  }

  @Get('items/:id')
  findMenuItemById(@Param('id') id: string) {
    return this.menuService.findMenuItemById(id);
  }

  @Get('daily-specials')
  findDailySpecials(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : undefined;
    return this.menuService.findDailySpecials(targetDate);
  }

  // ===== Staff-Only Endpoints =====

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.menuService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  updateMenuItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.updateMenuItem(id, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  deleteMenuItem(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id);
  }

  @Patch('items/:id/toggle-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  toggleItemAvailability(@Param('id') id: string) {
    return this.menuService.toggleItemAvailability(id);
  }

  @Post('daily-specials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  createDailySpecial(@Body() dto: any) {
    return this.menuService.createDailySpecial(dto);
  }

  @Put('daily-specials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  updateDailySpecial(@Param('id') id: string, @Body() dto: any) {
    return this.menuService.updateDailySpecial(id, dto);
  }

  @Delete('daily-specials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  deleteDailySpecial(@Param('id') id: string) {
    return this.menuService.deleteDailySpecial(id);
  }
}

// Made with Bob
