import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ZoneType } from '@cafeconnect/database';

@Injectable()
export class AddressService {
  // Cafe location (hardcoded for MVP)
  private readonly CAFE_LAT = 19.0760; // Mumbai coordinates
  private readonly CAFE_LNG = 72.8777;
  
  // Zone boundaries in kilometers
  private readonly PRIMARY_ZONE_RADIUS = 3; // 3km
  private readonly SECONDARY_ZONE_RADIUS = 7; // 7km

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Determine delivery zone based on distance
   */
  determineZone(distance: number): ZoneType | null {
    if (distance <= this.PRIMARY_ZONE_RADIUS) {
      return ZoneType.PRIMARY;
    } else if (distance <= this.SECONDARY_ZONE_RADIUS) {
      return ZoneType.SECONDARY;
    }
    return null; // Out of delivery range
  }

  async create(userId: string, createAddressDto: CreateAddressDto) {
    const { latitude, longitude, ...addressData } = createAddressDto;

    // For EXTERNAL addresses, validate coordinates and check delivery range
    if (createAddressDto.type === 'EXTERNAL') {
      if (!latitude || !longitude) {
        throw new BadRequestException('Latitude and longitude are required for external addresses');
      }

      const distance = this.calculateDistance(
        this.CAFE_LAT,
        this.CAFE_LNG,
        latitude,
        longitude
      );

      const zone = this.determineZone(distance);

      if (!zone) {
        throw new BadRequestException(
          `Address is outside delivery range. Maximum distance is ${this.SECONDARY_ZONE_RADIUS}km`
        );
      }
    }

    // Check if user already has 5 addresses
    const existingCount = await this.prisma.address.count({
      where: { userId }
    });

    if (existingCount >= 5) {
      throw new BadRequestException('Maximum 5 addresses allowed per user');
    }

    // If this is the first address, make it default
    const isFirstAddress = existingCount === 0;

    return this.prisma.address.create({
      data: {
        ...addressData,
        latitude,
        longitude,
        isDefault: isFirstAddress,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: {
        userId,
      },
      orderBy: [
        { isDefault: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(id: string, userId: string, updateAddressDto: UpdateAddressDto) {
    // Verify address exists and belongs to user
    const existingAddress = await this.findOne(id, userId);

    const { latitude, longitude, type, ...addressData } = updateAddressDto;

    // If updating to EXTERNAL or updating coordinates, validate
    const finalType = type || existingAddress.type;
    if (finalType === 'EXTERNAL') {
      const finalLat = latitude !== undefined ? latitude : existingAddress.latitude;
      const finalLng = longitude !== undefined ? longitude : existingAddress.longitude;

      if (!finalLat || !finalLng) {
        throw new BadRequestException('Latitude and longitude are required for external addresses');
      }

      const distance = this.calculateDistance(
        this.CAFE_LAT,
        this.CAFE_LNG,
        finalLat,
        finalLng
      );

      const zone = this.determineZone(distance);

      if (!zone) {
        throw new BadRequestException(
          `Address is outside delivery range. Maximum distance is ${this.SECONDARY_ZONE_RADIUS}km`
        );
      }
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        ...addressData,
        ...(type !== undefined && { type }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
      },
    });
  }

  async setDefault(id: string, userId: string) {
    // Verify address exists and belongs to user
    await this.findOne(id, userId);

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Unset all other default addresses
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: { isDefault: false },
      });

      // Set this address as default
      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async remove(id: string, userId: string) {
    // Verify address exists and belongs to user
    const address = await this.findOne(id, userId);

    // Hard delete (no soft delete in schema)
    await this.prisma.address.delete({
      where: { id },
    });

    // If this was the default address, set another as default
    if (address.isDefault) {
      const nextAddress = await this.prisma.address.findFirst({
        where: {
          userId,
          id: { not: id },
        },
        orderBy: { id: 'desc' },
      });

      if (nextAddress) {
        await this.prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted successfully' };
  }
}

// Made with Bob