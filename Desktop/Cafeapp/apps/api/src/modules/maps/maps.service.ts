import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Geocode a text query to address suggestion coordinates.
   */
  async geocode(text: string): Promise<any[]> {
    const apiKey = this.configService.get<string>('OPENROUTESERVICE_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'OPENROUTESERVICE_API_KEY is not configured. Falling back to OpenStreetMap Nominatim geocoding.',
      );
      return this.getFallbackGeocode(text);
    }

    try {
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(text)}&size=10`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.features) {
        return [];
      }
      return data.features.map((f: any) => ({
        name: f.properties.label,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }));
    } catch (err) {
      this.logger.error(`Geocoding error: ${err.message}. Trying Nominatim fallback.`);
      return this.getFallbackGeocode(text);
    }
  }

  /**
   * Fallback geocoding using OpenStreetMap Nominatim.
   */
  private async getFallbackGeocode(text: string): Promise<any[]> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=10`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CafeApp/1.0 (contact: tanmayjare29@gmail.com)',
        },
      });
      if (!response.ok) {
        throw new Error(`Nominatim request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }
      return data.map((f: any) => ({
        name: f.display_name,
        latitude: parseFloat(f.lat),
        longitude: parseFloat(f.lon),
      }));
    } catch (err) {
      this.logger.error(`Nominatim fallback geocoding error: ${err.message}`);
      return [];
    }
  }

  /**
   * Calculate driving car route from start coords to end coords.
   * Returns GeoJSON coordinates, distance in km, and duration in seconds.
   */
  async getRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<{
    coordinates: number[][];
    distanceKm: number;
    durationSec: number;
    isFallback?: boolean;
  }> {
    const apiKey = this.configService.get<string>('OPENROUTESERVICE_API_KEY');
    if (apiKey) {
      try {
        // ORS directions parameters: start=lng,lat&end=lng,lat
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const route = data.features[0];
            return {
              coordinates: route.geometry.coordinates, // Array of [lng, lat]
              distanceKm: route.properties.summary.distance / 1000,
              durationSec: route.properties.summary.duration,
              isFallback: false,
            };
          }
        }
        this.logger.warn(`ORS request returned no features or was unsuccessful. Trying OSRM fallback.`);
      } catch (err) {
        this.logger.error(`ORS routing error, trying OSRM fallback: ${err.message}`);
      }
    }

    // Fallback to OSRM routing
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM route request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes returned in OSRM response');
      }
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates, // Array of [lng, lat]
        distanceKm: route.distance / 1000,
        durationSec: route.duration,
        isFallback: false,
      };
    } catch (err) {
      this.logger.error(`OSRM routing error: ${err.message}`);
      return this.getFallbackRoute(startLat, startLng, endLat, endLng, err.message);
    }
  }

  /**
   * Fallback straight-line route.
   */
  private getFallbackRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    reason: string,
  ) {
    this.logger.warn(`Using fallback straight-line route: ${reason}`);
    const distanceKm = this.calculateHaversine(startLat, startLng, endLat, endLng);
    // Estimate ETA based on average speed of 30 km/h
    const durationSec = Math.round((distanceKm / 30) * 3600);

    return {
      coordinates: [
        [startLng, startLat],
        [endLng, endLat],
      ],
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationSec,
      isFallback: true,
    };
  }

  /**
   * Haversine formula calculation in km.
   */
  calculateHaversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number) {
    return deg * (Math.PI / 180);
  }
}
