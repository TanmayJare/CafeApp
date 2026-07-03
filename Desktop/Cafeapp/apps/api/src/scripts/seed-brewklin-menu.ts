import { PrismaClient } from '@cafeconnect/database';

const p = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Brewklin Cafe menu...\n');

  // ─── CATEGORIES ──────────────────────────────────────────────────────────
  const [
    catJuice, catTea, catSprout, catHealthySnack,
    catPudding, catSalad, catIndian, catExtras,
  ] = await Promise.all([
    p.category.create({ data: { name: 'Juice / Drinks',    description: 'Fresh juices, sodas, ice teas and more',          sortOrder: 1 } }),
    p.category.create({ data: { name: 'Tea & Coffee',      description: 'Hot & cold tea and coffee',                       sortOrder: 2 } }),
    p.category.create({ data: { name: 'Morning Sprout',    description: 'Healthy sprouted grain bowls',                   sortOrder: 3 } }),
    p.category.create({ data: { name: 'Healthy Snacking',  description: 'Light, nutritious snacking options',             sortOrder: 4 } }),
    p.category.create({ data: { name: 'Healthy Pudding',   description: 'Fresh fruit puddings',                           sortOrder: 5 } }),
    p.category.create({ data: { name: 'Salad',             description: 'Fresh salads — veg & non-veg',                   sortOrder: 6 } }),
    p.category.create({ data: { name: 'Indian Snacking',   description: 'Classic Indian street food and snacks',          sortOrder: 7 } }),
    p.category.create({ data: { name: 'Extras',            description: 'Add-ons, toppings, dips and sides',              sortOrder: 8 } }),
  ]);

  console.log('✅ Categories created');

  // ─── JUICE / DRINKS ───────────────────────────────────────────────────────
  await p.menuItem.createMany({ data: [
    { categoryId: catJuice.id, name: 'Watermelon Juice',      price: 60,  sortOrder: 1 },
    { categoryId: catJuice.id, name: 'Pineapple Juice',       price: 60,  sortOrder: 2 },
    { categoryId: catJuice.id, name: 'Orange Juice',          price: 60,  sortOrder: 3 },
    { categoryId: catJuice.id, name: 'Lemon Juice',           price: 30,  sortOrder: 4 },
    { categoryId: catJuice.id, name: 'Fresh Lime Soda',       price: 60,  sortOrder: 5 },
    { categoryId: catJuice.id, name: 'Mojito Mint Flavour',   price: 80,  sortOrder: 6 },
    { categoryId: catJuice.id, name: 'Lemon Ice Tea',         price: 90,  sortOrder: 7 },
    { categoryId: catJuice.id, name: 'Peach Ice Tea',         price: 100, sortOrder: 8 },
    { categoryId: catJuice.id, name: 'Kokum',                 price: 40,  sortOrder: 9 },
    { categoryId: catJuice.id, name: 'Beet Juice',            price: 50,  sortOrder: 10 },
    { categoryId: catJuice.id, name: 'Carrot Juice',          price: 50,  sortOrder: 11 },
    { categoryId: catJuice.id, name: 'Buttermilk',            price: 40,  sortOrder: 12 },
    { categoryId: catJuice.id, name: 'Solkadi',               price: 50,  sortOrder: 13 },
    { categoryId: catJuice.id, name: 'Lassi',                 price: 60,  sortOrder: 14 },
  ]});

  // ─── TEA & COFFEE ─────────────────────────────────────────────────────────
  await p.menuItem.createMany({ data: [
    { categoryId: catTea.id, name: 'Tea - Paper Cup',    description: 'Hot tea in a paper cup',    price: 10, sortOrder: 1 },
    { categoryId: catTea.id, name: 'Tea - Glass Cup',    description: 'Hot tea in a glass cup',    price: 30, sortOrder: 2 },
    { categoryId: catTea.id, name: 'Coffee - Paper Cup', description: 'Hot coffee in a paper cup', price: 20, sortOrder: 3 },
    { categoryId: catTea.id, name: 'Coffee - Glass Cup', description: 'Hot coffee in a glass cup', price: 50, sortOrder: 4 },
  ]});

  // ─── MORNING SPROUT ───────────────────────────────────────────────────────
  await p.menuItem.createMany({ data: [
    { categoryId: catSprout.id, name: 'Matki Sprout',         description: 'Sprouted matki bowl',               price: 80,  sortOrder: 1 },
    { categoryId: catSprout.id, name: 'Green Chana Sprout',   description: 'Sprouted green chana bowl',          price: 80,  sortOrder: 2 },
    { categoryId: catSprout.id, name: 'Moong Sprout',         description: 'Sprouted moong bowl',                price: 80,  sortOrder: 3 },
    { categoryId: catSprout.id, name: 'Black Chana Sprout',   description: 'Sprouted black chana bowl',          price: 80,  sortOrder: 4 },
    { categoryId: catSprout.id, name: 'Rajma Sprout',         description: 'Sprouted rajma bowl',                price: 80,  sortOrder: 5 },
    { categoryId: catSprout.id, name: 'Chole Sprout',         description: 'Sprouted chole bowl',                price: 100, sortOrder: 6 },
    { categoryId: catSprout.id, name: 'High Protein Mix',     description: 'High protein sprout mix',            price: 150, sortOrder: 7 },
    { categoryId: catSprout.id, name: 'Sprout + Paneer',      description: 'Sprout bowl with paneer',            price: 150, sortOrder: 8 },
  ]});

  // ─── HEALTHY SNACKING ─────────────────────────────────────────────────────
  await p.menuItem.createMany({ data: [
    { categoryId: catHealthySnack.id, name: 'Mung Chilla',                      description: 'Mung bean chilla',                         price: 40, sortOrder: 1 },
    { categoryId: catHealthySnack.id, name: 'Millet Chilla',                    description: 'Millet flour chilla',                      price: 50, sortOrder: 2 },
    { categoryId: catHealthySnack.id, name: 'Oats Chilla (Veg)',                description: 'Oats chilla - vegetarian',                  price: 60, sortOrder: 3 },
    { categoryId: catHealthySnack.id, name: 'Boiled Egg',                       description: 'Plain boiled egg',                         price: 15, sortOrder: 4 },
    { categoryId: catHealthySnack.id, name: 'Egg Omlet',                        description: 'Classic egg omelette',                     price: 50, sortOrder: 5 },
    { categoryId: catHealthySnack.id, name: 'Sunrise Egg',                      description: 'Sunrise style egg preparation',            price: 50, sortOrder: 6 },
    { categoryId: catHealthySnack.id, name: 'Oats Chilla (Egg)',                description: 'Oats chilla with egg',                     price: 80, sortOrder: 7 },
    { categoryId: catHealthySnack.id, name: 'Spinach Health Omelette (Yolk Free)', description: 'Spinach omelette - yolk free',           price: 80, sortOrder: 8 },
  ]});

  // ─── HEALTHY PUDDING ──────────────────────────────────────────────────────
  await p.menuItem.createMany({ data: [
    { categoryId: catPudding.id, name: 'Mixed Fruit Pudding', description: 'Fresh mixed fruit pudding', price: 150, sortOrder: 1 },
    { categoryId: catPudding.id, name: 'Mango Pudding',       description: 'Fresh mango pudding',       price: 150, sortOrder: 2 },
    { categoryId: catPudding.id, name: 'Banana Pudding',      description: 'Fresh banana pudding',      price: 100, sortOrder: 3 },
    { categoryId: catPudding.id, name: 'Muskmelon Pudding',   description: 'Fresh muskmelon pudding',   price: 110, sortOrder: 4 },
  ]});

  // ─── SALAD ────────────────────────────────────────────────────────────────
  // Veg price used where two prices shown (veg / non-veg)
  await p.menuItem.createMany({ data: [
    { categoryId: catSalad.id, name: 'Green Salad',                  description: 'Fresh green salad',                          price: 100, sortOrder: 1 },
    { categoryId: catSalad.id, name: 'Garden Salad',                 description: 'Garden fresh salad',                         price: 120, sortOrder: 2 },
    { categoryId: catSalad.id, name: 'Caesar Salad',                 description: 'Classic caesar salad',                       price: 180, sortOrder: 3 },
    { categoryId: catSalad.id, name: 'Greek Feta Salad',             description: 'Greek salad with feta cheese',               price: 200, sortOrder: 4 },
    { categoryId: catSalad.id, name: 'Watermelon Basil Feta Salad',  description: 'Watermelon, basil and feta salad',           price: 200, sortOrder: 5 },
    { categoryId: catSalad.id, name: 'Exotic Salad',                 description: 'Exotic mix salad',                           price: 220, sortOrder: 6 },
    { categoryId: catSalad.id, name: 'Italian Continental Salad',    description: 'Italian continental salad',                  price: 220, sortOrder: 7 },
    { categoryId: catSalad.id, name: 'Fruit Salad',                  description: 'Fresh seasonal fruit salad',                 price: 120, sortOrder: 8 },
  ]});

  // ─── INDIAN SNACKING ──────────────────────────────────────────────────────
  await p.menuItem.createMany({ data: [
    { categoryId: catIndian.id, name: 'Misal Pav',          description: 'Spicy misal with pav',                price: 60,  sortOrder: 1  },
    { categoryId: catIndian.id, name: 'Kanda Poha',         description: 'Classic kanda poha',                  price: 30,  sortOrder: 2  },
    { categoryId: catIndian.id, name: 'Samosa',             description: 'Crispy samosa',                       price: 20,  sortOrder: 3  },
    { categoryId: catIndian.id, name: 'Shira',              description: 'Sweet semolina shira',                price: 40,  sortOrder: 4  },
    { categoryId: catIndian.id, name: 'Potato Wada Pav',    description: 'Classic potato wada pav',             price: 15,  sortOrder: 5  },
    { categoryId: catIndian.id, name: 'Tandoor Wada Pav',   description: 'Tandoor style wada pav',              price: 40,  sortOrder: 6  },
    { categoryId: catIndian.id, name: 'Usal Pav',           description: 'Usal with pav',                       price: 40,  sortOrder: 7  },
    { categoryId: catIndian.id, name: 'Potato Bhaji',       description: 'Spiced potato bhaji',                 price: 25,  sortOrder: 8  },
    { categoryId: catIndian.id, name: 'Bread Pattice',      description: 'Bread pattice snack',                 price: 15,  sortOrder: 9  },
    { categoryId: catIndian.id, name: 'Idli',               description: 'Soft steamed idli with sambar',       price: 40,  sortOrder: 10 },
    { categoryId: catIndian.id, name: 'Medu Wada',          description: 'Crispy medu wada',                    price: 60,  sortOrder: 11 },
    { categoryId: catIndian.id, name: 'Kanda Bhaji',        description: 'Crispy onion bhaji',                  price: 30,  sortOrder: 12 },
    { categoryId: catIndian.id, name: 'Upma',               description: 'Classic upma',                        price: 30,  sortOrder: 13 },
    { categoryId: catIndian.id, name: 'Pani Puri',          description: 'Crispy pani puri',                    price: 30,  sortOrder: 14 },
    { categoryId: catIndian.id, name: 'Shev Puri',          description: 'Shev puri chaat',                     price: 50,  sortOrder: 15 },
    { categoryId: catIndian.id, name: 'Dahi Puri',          description: 'Dahi puri chaat',                     price: 60,  sortOrder: 16 },
    { categoryId: catIndian.id, name: 'Bhel',               description: 'Mumbai style bhel puri',              price: 25,  sortOrder: 17 },
    { categoryId: catIndian.id, name: 'Pav Bhaaji',         description: 'Buttery pav bhaaji',                  price: 120, sortOrder: 18 },
    { categoryId: catIndian.id, name: 'Mungdal Bhaji',      description: 'Mung dal bhaji',                      price: 30,  sortOrder: 19 },
    { categoryId: catIndian.id, name: 'Chicken Misal Pav',  description: 'Chicken misal with pav',              price: 80,  sortOrder: 20 },
    { categoryId: catIndian.id, name: 'Chicken Samosa',     description: 'Crispy chicken samosa',               price: 40,  sortOrder: 21 },
    { categoryId: catIndian.id, name: 'Sabudana Khichadi',  description: 'Sabudana khichadi',                   price: 35,  sortOrder: 22 },
    { categoryId: catIndian.id, name: 'Sabudana Wada',      description: 'Crispy sabudana wada',                price: 25,  sortOrder: 23 },
    { categoryId: catIndian.id, name: 'Kothimbir Wadi',     description: 'Kothimbir wadi snack',                price: 30,  sortOrder: 24 },
    { categoryId: catIndian.id, name: 'Thalipith',          description: 'Multigrain thalipith',                price: 40,  sortOrder: 25 },
    { categoryId: catIndian.id, name: 'Gulab Jamun',        description: 'Soft gulab jamun in sugar syrup',     price: 50,  sortOrder: 26 },
    { categoryId: catIndian.id, name: 'Gajar Halwa',        description: 'Classic gajar halwa',                 price: 60,  sortOrder: 27 },
    { categoryId: catIndian.id, name: 'Dahi Wada',          description: 'Soft dahi wada',                      price: 60,  sortOrder: 28 },
    { categoryId: catIndian.id, name: 'Plain Dosa',         description: 'Crispy plain dosa with sambar',       price: 50,  sortOrder: 29 },
    { categoryId: catIndian.id, name: 'Masala Dosa',        description: 'Crispy dosa with potato masala',      price: 70,  sortOrder: 30 },
    { categoryId: catIndian.id, name: 'Mysore Masala Dosa', description: 'Mysore chutney masala dosa',          price: 90,  sortOrder: 31 },
  ]});

  // ─── EXTRAS ───────────────────────────────────────────────────────────────
  await p.menuItem.createMany({ data: [
    { categoryId: catExtras.id, name: 'Any Dip',                      description: 'Choice of dip',                    price: 25,  sortOrder: 1  },
    { categoryId: catExtras.id, name: 'Chutney',                      description: 'Fresh chutney',                    price: 20,  sortOrder: 2  },
    { categoryId: catExtras.id, name: 'Butter',                       description: 'Butter side',                      price: 25,  sortOrder: 3  },
    { categoryId: catExtras.id, name: 'Fried Noodles',                description: 'Crispy fried noodles',             price: 20,  sortOrder: 4  },
    { categoryId: catExtras.id, name: 'Roasted Papad',                description: 'Roasted papad',                    price: 10,  sortOrder: 5  },
    { categoryId: catExtras.id, name: 'Fried Papad',                  description: 'Fried papad',                      price: 15,  sortOrder: 6  },
    { categoryId: catExtras.id, name: 'Indian Topping (S)',           description: 'Small Indian topping',             price: 25,  sortOrder: 7  },
    { categoryId: catExtras.id, name: 'Indian Topping (M)',           description: 'Medium Indian topping',            price: 40,  sortOrder: 8  },
    { categoryId: catExtras.id, name: 'Indian Topping (L)',           description: 'Large Indian topping',             price: 60,  sortOrder: 9  },
    { categoryId: catExtras.id, name: 'Continental Topping (S)',      description: 'Small continental topping',        price: 40,  sortOrder: 10 },
    { categoryId: catExtras.id, name: 'Continental Topping (M)',      description: 'Medium continental topping',       price: 70,  sortOrder: 11 },
    { categoryId: catExtras.id, name: 'Continental Topping (L)',      description: 'Large continental topping',        price: 90,  sortOrder: 12 },
    { categoryId: catExtras.id, name: 'Chicken Topping (S)',          description: 'Small chicken topping',            price: 50,  sortOrder: 13 },
    { categoryId: catExtras.id, name: 'Chicken Topping (M)',          description: 'Medium chicken topping',           price: 80,  sortOrder: 14 },
    { categoryId: catExtras.id, name: 'Chicken Topping (L)',          description: 'Large chicken topping',            price: 100, sortOrder: 15 },
    { categoryId: catExtras.id, name: 'Cheese (S)',                   description: 'Small cheese add-on',             price: 50,  sortOrder: 16 },
    { categoryId: catExtras.id, name: 'Cheese (M)',                   description: 'Medium cheese add-on',            price: 90,  sortOrder: 17 },
    { categoryId: catExtras.id, name: 'Cheese (L)',                   description: 'Large cheese add-on',             price: 110, sortOrder: 18 },
    { categoryId: catExtras.id, name: 'Pav',                          description: 'Single pav bread',                price: 5,   sortOrder: 19 },
  ]});

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  const [totalCats, totalItems] = await Promise.all([
    p.category.count(),
    p.menuItem.count(),
  ]);

  console.log(`\n✅ Done!`);
  console.log(`   ${totalCats} categories`);
  console.log(`   ${totalItems} menu items`);
  console.log(`\n   Juice/Drinks    → 14 items`);
  console.log(`   Tea & Coffee    →  4 items`);
  console.log(`   Morning Sprout  →  8 items`);
  console.log(`   Healthy Snack   →  8 items`);
  console.log(`   Healthy Pudding →  4 items`);
  console.log(`   Salad           →  8 items`);
  console.log(`   Indian Snacking → 31 items`);
  console.log(`   Extras          → 19 items`);
}

main().catch(console.error).finally(() => p.$disconnect());
