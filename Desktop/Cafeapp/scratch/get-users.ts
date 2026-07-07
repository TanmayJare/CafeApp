import { PrismaClient } from '@cafeconnect/database';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true
    }
  });
  console.log("=== REGISTERED SYSTEM USERS ===");
  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
