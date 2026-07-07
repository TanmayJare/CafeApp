/**
 * Seed: Create initial staff account
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/seed-staff.ts
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@cafeconnect/database';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.STAFF_SEED_EMAIL ?? 'tanmayjare13@gmail.com';
  const password = process.env.STAFF_SEED_PASSWORD ?? 'cafestaff2024';
  const name = process.env.STAFF_SEED_NAME ?? 'Tanmay (Staff)';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Update password hash if account already exists
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash, role: 'STAFF', name },
    });
    console.log(`✅ Staff account updated: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, name, passwordHash, role: 'STAFF', phone: '+919876543210' },
    });
    console.log(`✅ Staff account created: ${email}`);
  }

  console.log(`   Password: ${password}`);
  console.log(`   Role:     STAFF`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
