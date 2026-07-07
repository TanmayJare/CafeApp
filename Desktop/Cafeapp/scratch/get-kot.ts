import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const secret = process.env.JWT_SECRET ?? 'cafeconnect-kot-secret';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!order) {
    console.log('No orders found in database.');
    return;
  }

  const iat = Math.floor(Date.now() / 1000);
  const payload = `${order.id}:${iat}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
  const token = `${payload}:${sig}`;

  console.log('\n========================================');
  console.log('ORDER DETAILS:');
  console.log('----------------------------------------');
  console.log('Order Number  :', order.orderNumber);
  console.log('Order ID      :', order.id);
  console.log('Current Status:', order.status);
  console.log('\nSIGNED KOT TOKEN (Copy the entire line below):');
  console.log('----------------------------------------');
  console.log(token);
  console.log('========================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
