import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('maps')
@UseGuards(JwtAuthGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('geocode')
  async geocode(@Query('text') text: string) {
    if (!text) {
      return [];
    }
    return this.mapsService.geocode(text);
  }

  @Post('route')
  async getRoute(
    @Body() body: { startLat: number; startLng: number; endLat: number; endLng: number },
  ) {
    const { startLat, startLng, endLat, endLng } = body;
    if (
      startLat === undefined ||
      startLng === undefined ||
      endLat === undefined ||
      endLng === undefined
    ) {
      throw new BadRequestException('startLat, startLng, endLat, and endLng are required');
    }
    return this.mapsService.getRoute(startLat, startLng, endLat, endLng);
  }
}
