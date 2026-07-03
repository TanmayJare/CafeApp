import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ZoneType } from '@cafeconnect/database';

@Injectable()
export class AddressService {
  // Café location — read from CafeConfig at runtime; fallback to seed coords
  private readonly CAFE_LAT = 19.0760;
  private readonly CAFE_LNG = 72.8777;
  private readonly PRIMARY_ZONE_RADIUS = 3;   // km
  private readonly SECONDARY_ZONE_RADIUS = 7; // km

  constructor(private prisma: PrismaService) {}

  async getSocietyOptions() {
    return this.prisma.societyTower.findMany({ orderBy: { name: 'asc' } });
  }

  /** Haversine distance in km */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number) { return deg * (Math.PI / 180); }

  determineZone(distance: number): ZoneType | null {
    if (distance <= this.PRIMARY_ZONE_RADIUS) return ZoneType.PRIMARY;
    if (distance <= this.SECONDARY_ZONE_RADIUS) return ZoneType.SECONDARY;
    return null;
  }

  // ─── 36A.2 — atomically un-default all other addresses for user ────────────
  private async unDefaultOthers(tx: any, userId: string) {
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // ─── CREATE ────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateAddressDto) {
    const { latitude, longitude, isDefault, ...rest } = dto;

    if (dto.type === 'EXTERNAL') {
      if (!latitude || !longitude) {
        throw new BadRequestException('Latitude and longitude are required for external addresses');
      }
      const distance = this.calculateDistance(this.CAFE_LAT, this.CAFE_LNG, latitude, longitude);
      if (!this.determineZone(distance)) {
        throw new BadRequestException(
          `Address is outside delivery range. Maximum distance is ${this.SECONDARY_ZONE_RADIUS}km`,
        );
      }
    }

    const existingCount = await this.prisma.address.count({ where: { userId } });
    if (existingCount >= 5) {
      throw new BadRequestException('Maximum 5 addresses allowed per user');
    }

    // First address is always default; explicit isDefault:true triggers un-default
    const makeDefault = isDefault === true || existingCount === 0;

    if (makeDefault) {
      return this.prisma.$transaction(async (tx) => {
        await this.unDefaultOthers(tx, userId);
        return tx.address.create({
          data: { ...rest, latitude, longitude, isDefault: true, userId },
        });
      });
    }

    return this.prisma.address.create({
      data: { ...rest, latitude, longitude, isDefault: false, userId },
    });
  }

  // ─── READ ──────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  // ─── UPDATE (36A.3) ────────────────────────────────────────────────────────

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    const existing = await this.findOne(id, userId);
    const { latitude, longitude, type, isDefault, ...rest } = dto;

    const finalType = type ?? existing.type;
    if (finalType === 'EXTERNAL') {
      const finalLat = latitude ?? existing.latitude;
      const finalLng = longitude ?? existing.longitude;
      if (!finalLat || !finalLng) {
        throw new BadRequestException('Latitude and longitude are required for external addresses');
      }
      const distance = this.calculateDistance(this.CAFE_LAT, this.CAFE_LNG, finalLat, finalLng);
      if (!this.determineZone(distance)) {
        throw new BadRequestException(
          `Address is outside delivery range. Maximum distance is ${this.SECONDARY_ZONE_RADIUS}km`,
        );
      }
    }

    if (isDefault === true) {
      return this.prisma.$transaction(async (tx) => {
        await this.unDefaultOthers(tx, userId);
        return tx.address.update({
          where: { id },
          data: {
            ...rest,
            ...(type !== undefined && { type }),
            ...(latitude !== undefined && { latitude }),
            ...(longitude !== undefined && { longitude }),
            isDefault: true,
          },
        });
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        ...rest,
        ...(type !== undefined && { type }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });
  }

  // ─── SET DEFAULT shortcut (36A.4) ─────────────────────────────────────────

  async setDefault(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.$transaction(async (tx) => {
      await this.unDefaultOthers(tx, userId);
      await tx.address.update({ where: { id }, data: { isDefault: true } });
    });
    // Return full updated list so client can replace cache in one shot
    return this.findAll(userId);
  }

  // ─── DELETE (36A spec: no auto re-default) ─────────────────────────────────

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.address.delete({ where: { id } });
    // Per spec: deleting the default does NOT automatically promote another address.
    // User must manually set a new default.
    return { message: 'Address deleted successfully' };
  }

  // ─── VALIDATE (37A — enriched) ─────────────────────────────────────────────

  async validateLocation(lat: number, lng: number, userLat?: number, userLng?: number) {
    const cafeConfig = await this.prisma.cafeConfig.findUnique({ where: { id: 'default' } });
    const cafeLat = cafeConfig?.latitude ?? this.CAFE_LAT;
    const cafeLng = cafeConfig?.longitude ?? this.CAFE_LNG;
    const primaryFee = cafeConfig?.primaryDeliveryFee ?? 20;
    const secondaryFee = cafeConfig?.secondaryDeliveryFee ?? 40;

    const distFromCafe = this.calculateDistance(cafeLat, cafeLng, lat, lng);
    const zone = this.determineZone(distFromCafe);

    const zoneType = zone ?? 'OUT_OF_ZONE';
    const deliveryFee =
      zone === 'PRIMARY' ? primaryFee : zone === 'SECONDARY' ? secondaryFee : 0;
    const estimatedTime =
      zone === 'PRIMARY' ? '20–30 min' : zone === 'SECONDARY' ? '30–45 min' : 'Not available';

    // Society match — check if pin is within 200m of any SocietyTower
    const towers = await this.prisma.societyTower.findMany();
    let societyMatch: any = null;
    for (const tower of towers) {
      // SocietyTower doesn't have lat/lng in schema — skip match if not present
      const tLat = (tower as any).latitude;
      const tLng = (tower as any).longitude;
      if (tLat && tLng) {
        const d = this.calculateDistance(tLat, tLng, lat, lng);
        if (d <= 0.2) { societyMatch = tower; break; }
      }
    }

    const result: Record<string, any> = {
      zoneType,
      distanceFromCafeKm: Math.round(distFromCafe * 100) / 100,
      deliveryFee,
      estimatedTime,
      societyMatch,
    };

    if (userLat !== undefined && userLng !== undefined) {
      result.distanceFromUserKm = Math.round(
        this.calculateDistance(userLat, userLng, lat, lng) * 100,
      ) / 100;
    }

    return result;
  }
}

// Made with Bob
