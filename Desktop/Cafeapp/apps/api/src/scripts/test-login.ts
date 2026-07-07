import { AuthService } from '../modules/auth/auth.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    const result = await authService.staffLogin('admin@cafe.test', 'cafestaff2024');
    console.log('✅ Login succeeded:', result);
  } catch (err: any) {
    console.error('❌ Login failed:', err.message, err.response);
  }

  await app.close();
}

main();
