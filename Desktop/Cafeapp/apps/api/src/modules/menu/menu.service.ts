import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // ===== Categories =====
  async findAllCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isAvailable: true },
          include: { options: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        items: {
          include: { options: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: dto,
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.findCategoryById(id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    await this.findCategoryById(id);
    return this.prisma.category.delete({
      where: { id },
    });
  }

  // ===== Menu Items =====
  async findAllMenuItems(categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        options: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findMenuItemById(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        options: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return item;
  }

  async createMenuItem(dto: CreateMenuItemDto) {
    const { options, ...itemData } = dto;

    return this.prisma.menuItem.create({
      data: {
        ...itemData,
        options: options
          ? {
              create: options,
            }
          : undefined,
      },
      include: {
        category: true,
        options: true,
      },
    });
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    await this.findMenuItemById(id);
    const { options, ...itemData } = dto;

    // If options are provided, delete existing and create new ones
    if (options) {
      await this.prisma.menuItemOption.deleteMany({
        where: { menuItemId: id },
      });
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...itemData,
        options: options
          ? {
              create: options,
            }
          : undefined,
      },
      include: {
        category: true,
        options: true,
      },
    });
  }

  async deleteMenuItem(id: string) {
    await this.findMenuItemById(id);
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }

  async toggleItemAvailability(id: string) {
    const item = await this.findMenuItemById(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  // ===== Daily Specials =====
  async findDailySpecials(date?: Date) {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    return this.prisma.dailySpecial.findMany({
      where: {
        availableOn: targetDate,
        isActive: true,
      },
    });
  }

  async createDailySpecial(dto: any) {
    return this.prisma.dailySpecial.create({
      data: dto,
    });
  }

  async updateDailySpecial(id: string, dto: any) {
    return this.prisma.dailySpecial.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDailySpecial(id: string) {
    return this.prisma.dailySpecial.delete({
      where: { id },
    });
  }
}

// Made with Bob
