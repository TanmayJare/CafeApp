import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
                options: true,
              },
            },
            options: true,
          },
        },
      },
    });

    if (!cart) {
      // Create empty cart if doesn't exist
      return this.prisma.cart.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: {
              menuItem: {
                include: {
                  category: true,
                  options: true,
                },
              },
              options: true,
            },
          },
        },
      });
    }

    return cart;
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    // Verify menu item exists and is available
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
      include: {
        options: true,
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    if (!menuItem.isAvailable) {
      throw new BadRequestException('Menu item is not available');
    }

    // Validate selected options if provided
    const selectedOptionNames: string[] = [];
    let totalPriceDelta = 0;

    if (dto.selectedOptions && dto.selectedOptions.length > 0) {
      for (const selectedOption of dto.selectedOptions) {
        const option = menuItem.options.find(
          (o) => o.id === selectedOption.optionId,
        );
        if (!option) {
          throw new BadRequestException(
            `Invalid option: ${selectedOption.optionId}`,
          );
        }
        selectedOptionNames.push(option.name);
        totalPriceDelta += option.priceDelta;
      }
    }

    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Check if item with same options already exists
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_menuItemId: {
          cartId: cart.id,
          menuItemId: dto.menuItemId,
        },
      },
      include: {
        options: true,
      },
    });

    if (existingItem) {
      // Check if options match
      const existingOptionNames = existingItem.options
        .map((o) => o.optionName)
        .sort();
      const newOptionNames = selectedOptionNames.sort();

      if (
        JSON.stringify(existingOptionNames) === JSON.stringify(newOptionNames)
      ) {
        // Same item with same options, just update quantity
        return this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + dto.quantity,
          },
          include: {
            menuItem: {
              include: {
                category: true,
                options: true,
              },
            },
            options: true,
          },
        });
      }
    }

    // Add new item to cart
    const cartItem = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: dto.menuItemId,
        quantity: dto.quantity,
        options: {
          create:
            dto.selectedOptions?.map((opt) => {
              const option = menuItem.options.find(
                (o) => o.id === opt.optionId,
              );
              return {
                optionName: option!.name,
                priceDelta: option!.priceDelta,
              };
            }) || [],
        },
      },
      include: {
        menuItem: {
          include: {
            category: true,
            options: true,
          },
        },
        options: true,
      },
    });

    return cartItem;
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to user');
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity: dto.quantity,
      },
      include: {
        menuItem: {
          include: {
            category: true,
            options: true,
          },
        },
        options: true,
      },
    });
  }

  async removeFromCart(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to user');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { message: 'Cart cleared' };
  }

  async getCartSummary(userId: string) {
    const cart = await this.getCart(userId);

    const subtotal = cart.items.reduce((sum, item) => {
      const itemPrice = item.menuItem.price;
      const optionsPrice = item.options.reduce(
        (optSum, opt) => optSum + opt.priceDelta,
        0,
      );
      return sum + (itemPrice + optionsPrice) * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      cartId: cart.id,
      itemCount,
      subtotal,
      items: cart.items.map((item) => ({
        id: item.id,
        menuItem: item.menuItem,
        quantity: item.quantity,
        options: item.options,
        itemPrice: item.menuItem.price,
        optionsPrice: item.options.reduce(
          (sum, opt) => sum + opt.priceDelta,
          0,
        ),
        totalPrice:
          (item.menuItem.price +
            item.options.reduce((sum, opt) => sum + opt.priceDelta, 0)) *
          item.quantity,
      })),
    };
  }
}

// Made with Bob
