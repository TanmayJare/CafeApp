import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateDailySpecialDto } from './dto/create-daily-special.dto';
import { UpdateDailySpecialDto } from './dto/update-daily-special.dto';
import { ReorderSpecialsDto } from './dto/reorder-specials.dto';

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
  ) {}

  // ===== Categories =====

  async findAllCategories() {
    // Only return category metadata — NOT nested items.
    // The frontend fetches /menu/items separately, so including items here
    // means every item is fetched twice. Removed to halve DB work.
    return this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { items: { include: { options: true } } },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    // Skip the pre-fetch — let the DB throw if the record doesn't exist
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  // ===== Menu Items =====

  async findAllMenuItems(categoryId?: string) {
    // Select only what the frontend actually needs — drop heavy nested options
    // on the list endpoint (options are only needed on the detail page).
    return this.prisma.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        isAvailable: true,
        sortOrder: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findMenuItemById(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: true, options: true },
    });
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return item;
  }

  async createMenuItem(dto: CreateMenuItemDto) {
    const { options, ...itemData } = dto;
    return this.prisma.menuItem.create({
      data: {
        ...itemData,
        options: options ? { create: options } : undefined,
      },
      include: { category: true, options: true },
    });
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    // Removed the pre-fetch findMenuItemById round-trip.
    // Delete options first if provided, then update in one query.
    const { options, ...itemData } = dto;
    if (options) {
      await this.prisma.menuItemOption.deleteMany({ where: { menuItemId: id } });
    }
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...itemData,
        options: options ? { create: options } : undefined,
      },
      include: { category: true, options: true },
    });
  }

  async deleteMenuItem(id: string) {
    // Removed the pre-fetch — Prisma throws RecordNotFound automatically.
    return this.prisma.menuItem.delete({ where: { id } });
  }

  async toggleItemAvailability(id: string) {
    // Atomic: single query using SQL NOT instead of read-then-write (2 queries → 1).
    await this.prisma.$executeRaw`
      UPDATE "MenuItem" SET "isAvailable" = NOT "isAvailable" WHERE id = ${id}
    `;
    const updated = await this.prisma.menuItem.findUnique({
      where: { id },
      select: { id: true, isAvailable: true },
    });
    // 34A.1 — push availability change to all staff in the menu room
    if (updated) {
      this.ordersGateway.emitMenuItemUpdated(updated.id, updated.isAvailable);
    }
    return updated;
  }

  // ===== Daily Specials =====

  /** 35B.1 — GET /menu/specials/today: filter by availableFrom <= now <= availableUntil, ordered by sortOrder */
  async findDailySpecials() {
    const now = new Date();
    return this.prisma.dailySpecial.findMany({
      where: {
        availableFrom: { lte: now },
        availableUntil: { gte: now },
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        badgeText: true,
        originalPrice: true,
        discountedPrice: true,
        linkedMenuItemId: true,
        availableFrom: true,
        availableUntil: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  /** 35B.1 — GET /menu/specials (staff): all specials, no time filter */
  async findAllSpecials() {
    return this.prisma.dailySpecial.findMany({
      orderBy: [{ availableFrom: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  /** 35B.2 — POST /menu/specials */
  async createDailySpecial(dto: CreateDailySpecialDto) {
    const from = new Date(dto.availableFrom);
    const until = new Date(dto.availableUntil);
    if (from >= until) {
      throw new BadRequestException('availableFrom must be before availableUntil');
    }

    // If linked to a menu item, inherit imageUrl if not overridden
    let imageUrl = dto.imageUrl;
    if (dto.linkedMenuItemId && !imageUrl) {
      const mi = await this.prisma.menuItem.findUnique({
        where: { id: dto.linkedMenuItemId },
        select: { imageUrl: true },
      });
      imageUrl = mi?.imageUrl ?? undefined;
    }

    const special = await this.prisma.dailySpecial.create({
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl,
        badgeText: dto.badgeText,
        originalPrice: dto.originalPrice,
        discountedPrice: dto.discountedPrice,
        price: dto.discountedPrice, // keep legacy column in sync
        linkedMenuItemId: dto.linkedMenuItemId,
        availableFrom: from,
        availableUntil: until,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    // 34A.2
    this.ordersGateway.emitSpecialsUpdated('created', special);
    return special;
  }

  /** 35B.3 — PATCH /menu/specials/:id */
  async updateDailySpecial(id: string, dto: UpdateDailySpecialDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.availableFrom) data.availableFrom = new Date(dto.availableFrom);
    if (dto.availableUntil) data.availableUntil = new Date(dto.availableUntil);
    if (dto.discountedPrice !== undefined) data.price = dto.discountedPrice;
    const special = await this.prisma.dailySpecial.update({ where: { id }, data });
    // 34A.2
    this.ordersGateway.emitSpecialsUpdated('updated', special);
    return special;
  }

  /** 35B.4 — DELETE /menu/specials/:id */
  async deleteDailySpecial(id: string) {
    const special = await this.prisma.dailySpecial.delete({ where: { id } });
    // 34A.2
    this.ordersGateway.emitSpecialsUpdated('deleted', special);
    return special;
  }

  /** 35B.5 — PATCH /menu/specials/reorder */
  async reorderSpecials(dto: ReorderSpecialsDto) {
    // Bulk update sortOrder in a transaction
    await this.prisma.$transaction(
      dto.items.map(({ id, sortOrder }) =>
        this.prisma.dailySpecial.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    const updatedList = await this.findAllSpecials();
    // 34A.2
    this.ordersGateway.emitSpecialsUpdated('updated', updatedList[0] ?? null);
    return updatedList;
  }
}

// Made with Bob
