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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateDailySpecialDto } from './dto/create-daily-special.dto';
import { UpdateDailySpecialDto } from './dto/update-daily-special.dto';
import { ReorderSpecialsDto } from './dto/reorder-specials.dto';
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

  // Customer-facing: today's active specials filtered by current time
  @Get('daily-specials')
  findDailySpecials() {
    return this.menuService.findDailySpecials();
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

  // Staff: all specials (no time filter) — for the management panel
  @Get('specials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  findAllSpecials() {
    return this.menuService.findAllSpecials();
  }

  // 35B.5 — reorder must be BEFORE :id route to avoid param collision
  @Patch('specials/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  reorderSpecials(@Body() dto: ReorderSpecialsDto) {
    return this.menuService.reorderSpecials(dto);
  }

  @Post('specials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  createSpecial(@Body() dto: CreateDailySpecialDto) {
    return this.menuService.createDailySpecial(dto);
  }

  @Patch('specials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  updateSpecial(@Param('id') id: string, @Body() dto: UpdateDailySpecialDto) {
    return this.menuService.updateDailySpecial(id, dto);
  }

  @Delete('specials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSpecial(@Param('id') id: string) {
    return this.menuService.deleteDailySpecial(id);
  }

  // Legacy daily-specials endpoints — keep for backwards compat
  @Post('daily-specials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  createDailySpecial(@Body() dto: CreateDailySpecialDto) {
    return this.menuService.createDailySpecial(dto);
  }

  @Put('daily-specials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  updateDailySpecialLegacy(@Param('id') id: string, @Body() dto: UpdateDailySpecialDto) {
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
