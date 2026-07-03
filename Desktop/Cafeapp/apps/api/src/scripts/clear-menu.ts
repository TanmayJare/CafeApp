import { PrismaClient } from '@cafeconnect/database';

const p = new PrismaClient();

async function main() {
  // Must follow FK dependency order
  const opts     = await p.menuItemOption.deleteMany({});
  const cartOpts = await p.cartItemOption.deleteMany({});
  const cartItms = await p.cartItem.deleteMany({});
  const ordItms  = await p.orderItem.deleteMany({});
  const items    = await p.menuItem.deleteMany({});
  const cats     = await p.category.deleteMany({});
  const specials = await p.dailySpecial.deleteMany({});
  console.log(`✅ Menu cleared:`);
  console.log(`   ${opts.count} item options deleted`);
  console.log(`   ${cartOpts.count} cart item options deleted`);
  console.log(`   ${cartItms.count} cart items deleted`);
  console.log(`   ${ordItms.count} order items cleared (menu item ref nulled)`);
  console.log(`   ${items.count} menu items deleted`);
  console.log(`   ${cats.count} categories deleted`);
  console.log(`   ${specials.count} daily specials deleted`);
}

main().catch(console.error).finally(() => p.$disconnect());
