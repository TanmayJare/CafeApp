import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (optional - comment out in production)
  await prisma.notification.deleteMany();
  await prisma.riderLocation.deleteMany();
  await prisma.riderProfile.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItemOption.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.menuItemOption.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.dailySpecial.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.societyTower.deleteMany();
  await prisma.cafeConfig.deleteMany();

  // 1. Create Users
  console.log('Creating users...');
  const staff = await prisma.user.create({
    data: {
      email: 'tanmayjare13@gmail.com',
      name: 'Tanmay (Staff)',
      phone: '+919876543210',
      role: 'STAFF',
    },
  });

  const rider = await prisma.user.create({
    data: {
      email: 'rider@cafe.test',
      name: 'Rider User',
      phone: '+919876543211',
      role: 'RIDER',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cafe.test',
      name: 'Admin User',
      phone: '+919876543212',
      role: 'SUPER_ADMIN',
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@test.com',
      name: 'Test Customer',
      phone: '+919876543213',
      role: 'CUSTOMER',
    },
  });

  // Create rider profile
  await prisma.riderProfile.create({
    data: {
      userId: rider.id,
      isOnline: true,
    },
  });

  // 2. Create Cafe Config
  console.log('Creating cafe config...');
  await prisma.cafeConfig.create({
    data: {
      id: 'default',
      name: 'Sunshine Café',
      address: 'Sunshine Residency, Main Road, Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      taxRate: 0.05,
      primaryDeliveryFee: 20,
      secondaryDeliveryFee: 40,
      deliveryRadiusKm: 7,
      societyName: 'Sunshine Residency',
      isOpen: true,
      openingTime: '07:00',
      closingTime: '22:00',
    },
  });

  // 3. Create Society Towers
  console.log('Creating society towers...');
  await prisma.societyTower.createMany({
    data: [
      { name: 'Tower A', wings: ['A', 'B'], maxFloors: 20 },
      { name: 'Tower B', wings: ['C', 'D'], maxFloors: 20 },
      { name: 'Tower C', wings: ['E', 'F'], maxFloors: 15 },
      { name: 'Tower D', wings: ['G', 'H'], maxFloors: 15 },
    ],
  });

  // 4. Create Categories
  console.log('Creating categories...');
  const coffeeCategory = await prisma.category.create({
    data: {
      name: 'Coffee',
      description: 'Freshly brewed coffee',
      sortOrder: 1,
    },
  });

  const teaCategory = await prisma.category.create({
    data: {
      name: 'Tea',
      description: 'Premium tea selection',
      sortOrder: 2,
    },
  });

  const snacksCategory = await prisma.category.create({
    data: {
      name: 'Snacks',
      description: 'Quick bites and snacks',
      sortOrder: 3,
    },
  });

  const sandwichesCategory = await prisma.category.create({
    data: {
      name: 'Sandwiches',
      description: 'Fresh sandwiches',
      sortOrder: 4,
    },
  });

  const burgersCategory = await prisma.category.create({
    data: {
      name: 'Burgers',
      description: 'Juicy burgers',
      sortOrder: 5,
    },
  });

  const dessertsCategory = await prisma.category.create({
    data: {
      name: 'Desserts',
      description: 'Sweet treats',
      sortOrder: 6,
    },
  });

  const beveragesCategory = await prisma.category.create({
    data: {
      name: 'Beverages',
      description: 'Cold drinks and shakes',
      sortOrder: 7,
    },
  });

  // 5. Create Menu Items with Options
  console.log('Creating menu items...');

  // Coffee items
  const cappuccino = await prisma.menuItem.create({
    data: {
      categoryId: coffeeCategory.id,
      name: 'Cappuccino',
      description: 'Classic Italian coffee with steamed milk foam',
      price: 120,
      sortOrder: 1,
      options: {
        create: [
          { type: 'SIZE', name: 'Regular', priceDelta: 0, isDefault: true },
          { type: 'SIZE', name: 'Large', priceDelta: 30 },
          { type: 'ADDON', name: 'Extra Shot', priceDelta: 20 },
          { type: 'ADDON', name: 'Vanilla Syrup', priceDelta: 15 },
        ],
      },
    },
  });

  const latte = await prisma.menuItem.create({
    data: {
      categoryId: coffeeCategory.id,
      name: 'Caffe Latte',
      description: 'Espresso with steamed milk',
      price: 130,
      sortOrder: 2,
      options: {
        create: [
          { type: 'SIZE', name: 'Regular', priceDelta: 0, isDefault: true },
          { type: 'SIZE', name: 'Large', priceDelta: 30 },
          { type: 'ADDON', name: 'Caramel Syrup', priceDelta: 15 },
        ],
      },
    },
  });

  const espresso = await prisma.menuItem.create({
    data: {
      categoryId: coffeeCategory.id,
      name: 'Espresso',
      description: 'Strong and bold coffee shot',
      price: 80,
      sortOrder: 3,
      options: {
        create: [
          { type: 'SIZE', name: 'Single', priceDelta: 0, isDefault: true },
          { type: 'SIZE', name: 'Double', priceDelta: 40 },
        ],
      },
    },
  });

  // Tea items
  await prisma.menuItem.create({
    data: {
      categoryId: teaCategory.id,
      name: 'Masala Chai',
      description: 'Traditional Indian spiced tea',
      price: 40,
      sortOrder: 1,
      options: {
        create: [
          { type: 'SIZE', name: 'Regular', priceDelta: 0, isDefault: true },
          { type: 'SIZE', name: 'Large', priceDelta: 20 },
          { type: 'ADDON', name: 'Extra Ginger', priceDelta: 10 },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: teaCategory.id,
      name: 'Green Tea',
      description: 'Healthy green tea',
      price: 50,
      sortOrder: 2,
    },
  });

  // Snacks
  await prisma.menuItem.create({
    data: {
      categoryId: snacksCategory.id,
      name: 'Samosa',
      description: 'Crispy fried pastry with potato filling',
      price: 30,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: snacksCategory.id,
      name: 'French Fries',
      description: 'Crispy golden fries',
      price: 80,
      sortOrder: 2,
      options: {
        create: [
          { type: 'SIZE', name: 'Regular', priceDelta: 0, isDefault: true },
          { type: 'SIZE', name: 'Large', priceDelta: 40 },
          { type: 'ADDON', name: 'Cheese Dip', priceDelta: 20 },
        ],
      },
    },
  });

  // Sandwiches
  await prisma.menuItem.create({
    data: {
      categoryId: sandwichesCategory.id,
      name: 'Veg Grilled Sandwich',
      description: 'Grilled sandwich with vegetables and cheese',
      price: 100,
      sortOrder: 1,
      options: {
        create: [
          { type: 'ADDON', name: 'Extra Cheese', priceDelta: 20 },
          { type: 'ADDON', name: 'Extra Mayo', priceDelta: 10 },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: sandwichesCategory.id,
      name: 'Chicken Sandwich',
      description: 'Grilled chicken with lettuce and mayo',
      price: 150,
      sortOrder: 2,
    },
  });

  // Burgers
  await prisma.menuItem.create({
    data: {
      categoryId: burgersCategory.id,
      name: 'Veg Burger',
      description: 'Crispy veg patty with fresh vegetables',
      price: 120,
      sortOrder: 1,
      options: {
        create: [
          { type: 'ADDON', name: 'Extra Patty', priceDelta: 40 },
          { type: 'ADDON', name: 'Cheese Slice', priceDelta: 20 },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: burgersCategory.id,
      name: 'Chicken Burger',
      description: 'Juicy chicken patty with special sauce',
      price: 160,
      sortOrder: 2,
      options: {
        create: [
          { type: 'ADDON', name: 'Extra Patty', priceDelta: 50 },
          { type: 'ADDON', name: 'Bacon', priceDelta: 40 },
        ],
      },
    },
  });

  // Desserts
  await prisma.menuItem.create({
    data: {
      categoryId: dessertsCategory.id,
      name: 'Chocolate Brownie',
      description: 'Rich chocolate brownie with ice cream',
      price: 100,
      sortOrder: 1,
      options: {
        create: [
          { type: 'ADDON', name: 'Extra Ice Cream', priceDelta: 30 },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: dessertsCategory.id,
      name: 'Cheesecake',
      description: 'Creamy New York style cheesecake',
      price: 120,
      sortOrder: 2,
    },
  });

  // Beverages
  await prisma.menuItem.create({
    data: {
      categoryId: beveragesCategory.id,
      name: 'Mango Shake',
      description: 'Fresh mango milkshake',
      price: 90,
      sortOrder: 1,
      options: {
        create: [
          { type: 'SIZE', name: 'Regular', priceDelta: 0, isDefault: true },
          { type: 'SIZE', name: 'Large', priceDelta: 30 },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: beveragesCategory.id,
      name: 'Cold Coffee',
      description: 'Chilled coffee with ice cream',
      price: 110,
      sortOrder: 2,
    },
  });

  // 6. Create Daily Specials
  console.log('Creating daily specials...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailySpecial.createMany({
    data: [
      {
        title: "Today's Special: Paneer Tikka Sandwich",
        description: 'Grilled paneer tikka sandwich with mint chutney',
        price: 140,
        availableOn: today,
      },
      {
        title: 'Chef Special: Chocolate Frappe',
        description: 'Rich chocolate frappe with whipped cream',
        price: 150,
        availableOn: today,
      },
    ],
  });

  // 7. Create Banners
  console.log('Creating banners...');
  await prisma.banner.createMany({
    data: [
      {
        title: 'Welcome to Sunshine Café',
        subtitle: 'Fresh food delivered to your door',
        sortOrder: 1,
      },
      {
        title: 'New Menu Items',
        subtitle: 'Try our latest additions',
        linkType: 'category',
        linkId: coffeeCategory.id,
        sortOrder: 2,
      },
      {
        title: 'Special Offer',
        subtitle: 'Get 20% off on orders above ₹200',
        sortOrder: 3,
      },
    ],
  });

  // 8. Create Coupon
  console.log('Creating coupons...');
  await prisma.coupon.create({
    data: {
      code: 'FLAT20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderValue: 200,
      maxDiscount: 100,
      isActive: true,
    },
  });

  // 9. Create sample address for customer
  console.log('Creating sample address...');
  await prisma.address.create({
    data: {
      userId: customer.id,
      type: 'SOCIETY',
      label: 'Home',
      isDefault: true,
      societyName: 'Sunshine Residency',
      tower: 'Tower A',
      wing: 'A',
      floor: '5',
      flatNumber: '501',
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('\n📝 Credentials:');
  console.log('Staff:  tanmayjare13@gmail.com  (password: cafestaff2024)');
  console.log('Rider:  rider@cafe.test');
  console.log('Admin:  admin@cafe.test');
  console.log('Customer: any email → OTP sent via Gmail');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Made with Bob
