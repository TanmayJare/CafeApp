import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@cafeconnect/database';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@cafe.test';
  const password = 'cafestaff2024';
  const name = 'Admin User';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      name
    },
    create: {
      email,
      name,
      passwordHash,
      role: 'SUPER_ADMIN',
      phone: '+919999999999'
    }
  });

  console.log(`✅ Super Admin Account Set:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role:     SUPER_ADMIN`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
