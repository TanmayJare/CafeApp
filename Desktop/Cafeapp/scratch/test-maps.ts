import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
import { MapsService } from '../apps/api/src/modules/maps/maps.service';
import { AddressService } from '../apps/api/src/modules/address/address.service';

async function run() {
  console.log('🧪 Initializing NestJS App context for testing...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const mapsService = app.get(MapsService);
  const addressService = app.get(AddressService);

  console.log('\n--- 1. Testing Haversine Calculation ---');
  const lat1 = 19.0760, lng1 = 72.8777; // Café coords (Mumbai)
  const lat2 = 19.1136, lng2 = 72.8697; // ~4.2 km away
  const directDist = mapsService.calculateHaversine(lat1, lng1, lat2, lng2);
  console.log(`Direct distance: ${directDist.toFixed(2)} km`);

  console.log('\n--- 2. Testing Route Lookup (Fallback Path) ---');
  // ORS key is not in .env, so it should trigger straight-line fallback
  const route = await mapsService.getRoute(lat1, lng1, lat2, lng2);
  console.log('Route response:', route);
  if (route.isFallback) {
    console.log('✅ Fallback successfully activated!');
  } else {
    console.log('❌ Unexpectedly got actual route (key was configured?)');
  }

  console.log('\n--- 3. Testing Address Validation ---');
  const validation = await addressService.validateLocation(lat2, lng2);
  console.log('Validation response:', {
    zoneType: validation.zoneType,
    distanceFromCafeKm: validation.distanceFromCafeKm,
    deliveryFee: validation.deliveryFee,
    allowed: validation.allowed,
    isFallbackRoute: validation.isFallbackRoute,
  });

  if (validation.allowed && validation.zoneType === 'SECONDARY') {
    console.log('✅ Address validation with secondary zone working!');
  } else {
    console.log('❌ Address validation failed logic checks');
  }

  console.log('\n--- 4. Testing Out Of Zone Address Validation ---');
  const farLat = 19.2812, farLng = 72.8532; // ~23 km away (Mira Road)
  const farValidation = await addressService.validateLocation(farLat, farLng);
  console.log('Far Validation allowed:', farValidation.allowed);
  console.log('Far Validation zoneType:', farValidation.zoneType);

  if (!farValidation.allowed && farValidation.zoneType === 'OUT_OF_ZONE') {
    console.log('✅ Out of range validation working!');
  } else {
    console.log('❌ Out of range check failed');
  }

  await app.close();
  console.log('\n🏁 Tests complete!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
