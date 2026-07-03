/**
 * CafeConnect V3 Features - Complete E2E Testing Suite
 * Verifies Phase 34, 35, 36, 37, and 38.
 */

import * as fs from 'fs';
import * as path from 'path';
import { io, Socket } from 'socket.io-client';
import { PrismaClient, OrderStatus, AddressLabel, AddressType, ZoneType } from '@prisma/client';

// Load environment variables from apps/api/.env
try {
  const envPath = path.join(__dirname, 'apps', 'api', '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  console.error('Error loading env file:', e);
}

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000/orders';
const prisma = new PrismaClient();

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(suite: string, name: string, status: 'PASS' | 'FAIL', message?: string, duration?: number) {
  results.push({ suite, name, status, message, duration });
  const emoji = status === 'PASS' ? '✅' : '❌';
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`[${suite}] ${emoji} ${name}${durationStr}`);
  if (message) {
    console.log(`      ${message}`);
  }
}

// Helper: HTTP request wrapper
async function apiCall(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', body?: any, token?: string) {
  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const options: any = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();
  return { status: response.status, headers: response.headers, data };
}

// Helper: Connect Socket.IO client
function connectSocket(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      forceNew: true,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

async function runAllTests() {
  console.log('🚀 Starting CafeConnect V3 E2E Tests...\n');
  const overallStart = Date.now();

  let customerToken = '';
  let staffToken = '';
  let adminToken = '';
  let customerId = '';
  let staffId = '';
  let adminId = '';
  let testMenuItemId = '';
  let testCategoryId = '';
  
  // Track addresses created during test to clean them up safely
  const createdAddressIds: string[] = [];
  const cleanupCreatedAddresses = async () => {
    if (createdAddressIds.length > 0) {
      await prisma.address.deleteMany({
        where: { id: { in: createdAddressIds } }
      });
      createdAddressIds.length = 0;
    }
  };

  // ─── AUTH PREPARATION ──────────────────────────────────────────────────────
  try {
    // 1. Authenticate Customer
    const customerEmail = 'customer@test.com';
    const sendCustRes = await apiCall('/auth/send-otp', 'POST', { email: customerEmail });
    if (sendCustRes.status !== 200) {
      throw new Error(`Failed to send customer OTP: status ${sendCustRes.status}`);
    }

    // Fetch OTP code from DB
    const custOtp = await prisma.otpVerification.findFirst({
      where: { email: customerEmail },
      orderBy: { createdAt: 'desc' }
    });
    if (!custOtp) throw new Error('Customer OTP record not found in DB');

    const custAuth = await apiCall('/auth/verify-otp', 'POST', { email: customerEmail, code: custOtp.code });
    if (custAuth.status !== 200 || !custAuth.data.accessToken) {
      throw new Error(`Failed to verify customer OTP: ${JSON.stringify(custAuth.data)}`);
    }
    customerToken = custAuth.data.accessToken;
    customerId = custAuth.data.user.id;
    console.log(`🔑 Authenticated customer (ID: ${customerId})`);

    // Clean customer orders and addresses to avoid foreign key references and address limits
    await prisma.order.deleteMany({ where: { customerId } });
    await prisma.address.deleteMany({ where: { userId: customerId } });
    console.log(`🧹 Cleaned customer orders and addresses`);

    // 2. Authenticate Staff
    const staffEmail = 'tanmayjare13@gmail.com';
    const sendStaffRes = await apiCall('/auth/send-otp', 'POST', { email: staffEmail });
    if (sendStaffRes.status !== 200) {
      throw new Error(`Failed to send staff OTP: status ${sendStaffRes.status}`);
    }

    // Fetch OTP code from DB
    const staffOtp = await prisma.otpVerification.findFirst({
      where: { email: staffEmail },
      orderBy: { createdAt: 'desc' }
    });
    if (!staffOtp) throw new Error('Staff OTP record not found in DB');

    const staffAuth = await apiCall('/auth/verify-otp', 'POST', { email: staffEmail, code: staffOtp.code });
    if (staffAuth.status !== 200 || !staffAuth.data.accessToken) {
      throw new Error(`Failed to verify staff OTP: ${JSON.stringify(staffAuth.data)}`);
    }
    staffToken = staffAuth.data.accessToken;
    staffId = staffAuth.data.user.id;
    console.log(`🔑 Authenticated staff (ID: ${staffId})`);

    // 3. Authenticate Admin (SUPER_ADMIN)
    const adminEmail = 'admin@cafe.test';
    const sendAdminRes = await apiCall('/auth/send-otp', 'POST', { email: adminEmail });
    if (sendAdminRes.status !== 200) {
      throw new Error(`Failed to send admin OTP: status ${sendAdminRes.status}`);
    }

    // Fetch OTP code from DB
    const adminOtp = await prisma.otpVerification.findFirst({
      where: { email: adminEmail },
      orderBy: { createdAt: 'desc' }
    });
    if (!adminOtp) throw new Error('Admin OTP record not found in DB');

    const adminAuth = await apiCall('/auth/verify-otp', 'POST', { email: adminEmail, code: adminOtp.code });
    if (adminAuth.status !== 200 || !adminAuth.data.accessToken) {
      throw new Error(`Failed to verify admin OTP: ${JSON.stringify(adminAuth.data)}`);
    }
    adminToken = adminAuth.data.accessToken;
    adminId = adminAuth.data.user.id;
    console.log(`🔑 Authenticated admin (ID: ${adminId})`);

    // 4. Make sure we have a category and item for specials/cart testing
    const catRes = await apiCall('/menu/categories', 'POST', { name: 'V3 Test Category', description: 'Used for V3 E2E testing', sortOrder: 100 }, staffToken);
    testCategoryId = catRes.data.id;

    const itemRes = await apiCall('/menu/items', 'POST', {
      name: 'V3 Special Coffee',
      description: 'Brewed coffee for specials test',
      price: 150,
      categoryId: testCategoryId,
      isAvailable: true,
      options: []
    }, staffToken);
    testMenuItemId = itemRes.data.id;
    console.log(`☕ Created test category and menu item (Item ID: ${testMenuItemId})`);
  } catch (error: any) {
    console.error('Setup failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  // ===========================================================================
  // PHASE 34 — Realtime Overhaul (Socket.IO notifications)
  // ===========================================================================
  console.log('\n--- Phase 34: Realtime Overhaul Sockets ---');
  let customerSocket: Socket | null = null;
  let staffSocket: Socket | null = null;

  try {
    customerSocket = await connectSocket(customerToken);
    staffSocket = await connectSocket(staffToken);
    logTest('Phase 34', 'Socket connections established', 'PASS');
  } catch (err: any) {
    logTest('Phase 34', 'Socket connections established', 'FAIL', err.message);
  }

  if (customerSocket && staffSocket) {
    // 34B.3 — menu:item_updated test
    await new Promise<void>(async (resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('menu:item_updated event timed out')), 6000);
      staffSocket!.on('menu:item_updated', (payload) => {
        clearTimeout(timeout);
        try {
          if (payload.menuItemId === testMenuItemId && typeof payload.isAvailable === 'boolean') {
            logTest('Phase 34', 'Receive menu:item_updated on toggle availability', 'PASS');
            resolve();
          } else {
            reject(new Error('Invalid payload fields'));
          }
        } catch (e: any) {
          reject(e);
        }
      });
      // Trigger toggle availability
      await apiCall(`/menu/items/${testMenuItemId}/toggle-availability`, 'PATCH', null, staffToken);
    })
    .then(async () => {
      // Toggle back to make it available again for subsequent tests
      await apiCall(`/menu/items/${testMenuItemId}/toggle-availability`, 'PATCH', null, staffToken);
    })
    .catch(err => logTest('Phase 34', 'Receive menu:item_updated on toggle availability', 'FAIL', err.message));

    // 34C.3 / 34A.2 — menu:specials_updated test
    let testSpecialId = '';
    await new Promise<void>(async (resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('menu:specials_updated event timed out')), 6000);
      customerSocket!.on('menu:specials_updated', (payload) => {
        clearTimeout(timeout);
        try {
          if (payload.action === 'created' && payload.special) {
            testSpecialId = payload.special.id;
            logTest('Phase 34', 'Receive menu:specials_updated on Specials creation', 'PASS');
            resolve();
          } else {
            reject(new Error('Invalid specials payload'));
          }
        } catch (e: any) {
          reject(e);
        }
      });

      // Create a daily special
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      await apiCall('/menu/specials', 'POST', {
        title: 'Specials Push Test',
        description: 'Testing live socket broadcast',
        discountedPrice: 120,
        originalPrice: 150,
        linkedMenuItemId: testMenuItemId,
        availableFrom: now.toISOString(),
        availableUntil: inOneHour.toISOString(),
        isActive: true,
        badgeText: 'Live'
      }, staffToken);
    }).catch(err => logTest('Phase 34', 'Receive menu:specials_updated on Specials creation', 'FAIL', err.message));

    // 34C.4 / 34A.4 — cart:updated test
    await new Promise<void>(async (resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('cart:updated event timed out')), 6000);
      customerSocket!.on('cart:updated', (payload) => {
        clearTimeout(timeout);
        try {
          if (payload.cart) {
            logTest('Phase 34', 'Receive cart:updated on cart mutation', 'PASS');
            resolve();
          } else {
            reject(new Error('Invalid cart payload'));
          }
        } catch (e: any) {
          reject(e);
        }
      });
      // Clear cart to trigger mutation
      const clearRes = await apiCall('/cart', 'DELETE', null, customerToken);
      if (clearRes.status !== 200) console.log(`      ⚠️ DELETE /cart returned status ${clearRes.status}`);
      // Add item to cart
      const addRes = await apiCall('/cart/items', 'POST', { menuItemId: testMenuItemId, quantity: 1 }, customerToken);
      if (addRes.status !== 201) console.log(`      ⚠️ POST /cart/items returned status ${addRes.status}`);
    }).catch(err => logTest('Phase 34', 'Receive cart:updated on cart mutation', 'FAIL', err.message));

    // Cleanup special
    if (testSpecialId) {
      await apiCall(`/menu/specials/${testSpecialId}`, 'DELETE', null, staffToken);
    }
  }

  // ===========================================================================
  // PHASE 35 — Daily Specials System
  // ===========================================================================
  console.log('\n--- Phase 35: Daily Specials System ---');

  // 1. Time range validation availableFrom < availableUntil
  const now = new Date();
  const pastTime = new Date(now.getTime() - 10000);
  const badTimeRes = await apiCall('/menu/specials', 'POST', {
    title: 'Invalid Special',
    discountedPrice: 100,
    availableFrom: now.toISOString(),
    availableUntil: pastTime.toISOString(),
    isActive: true
  }, staffToken);

  if (badTimeRes.status === 400) {
    logTest('Phase 35', 'Validate availableFrom < availableUntil rule', 'PASS');
  } else {
    logTest('Phase 35', 'Validate availableFrom < availableUntil rule', 'FAIL', `Expected 400 but got ${badTimeRes.status}`);
  }

  // 2. Inheritance of ImageUrl
  // Retrieve testMenuItem's imageUrl if any (or we set one)
  const itemWithImage = await prisma.menuItem.update({
    where: { id: testMenuItemId },
    data: { imageUrl: 'http://test-image-url.com/coffee.jpg' }
  });

  const specialInheritRes = await apiCall('/menu/specials', 'POST', {
    title: 'Inherited Special',
    discountedPrice: 100,
    linkedMenuItemId: testMenuItemId,
    availableFrom: now.toISOString(),
    availableUntil: new Date(now.getTime() + 100000).toISOString(),
    isActive: true
  }, staffToken);

  if (specialInheritRes.status === 201 && specialInheritRes.data.imageUrl === itemWithImage.imageUrl) {
    logTest('Phase 35', 'Inherit MenuItem imageUrl when linked', 'PASS');
  } else {
    logTest('Phase 35', 'Inherit MenuItem imageUrl when linked', 'FAIL', `ImageUrl: ${specialInheritRes.data?.imageUrl}`);
  }

  // 3. Active filter & Sort order checks
  // Clean up all existing specials to ensure precise sorting tests
  await prisma.dailySpecial.deleteMany();

  // Create Special A (sortOrder = 2)
  const specA = await apiCall('/menu/specials', 'POST', {
    title: 'Special A',
    discountedPrice: 90,
    availableFrom: new Date(now.getTime() - 10000).toISOString(),
    availableUntil: new Date(now.getTime() + 60000).toISOString(),
    isActive: true,
    sortOrder: 2
  }, staffToken);

  // Create Special B (sortOrder = 1)
  const specB = await apiCall('/menu/specials', 'POST', {
    title: 'Special B',
    discountedPrice: 80,
    availableFrom: new Date(now.getTime() - 10000).toISOString(),
    availableUntil: new Date(now.getTime() + 60000).toISOString(),
    isActive: true,
    sortOrder: 1
  }, staffToken);

  // Create Special C (inactive)
  const specC = await apiCall('/menu/specials', 'POST', {
    title: 'Special C',
    discountedPrice: 70,
    availableFrom: new Date(now.getTime() - 10000).toISOString(),
    availableUntil: new Date(now.getTime() + 60000).toISOString(),
    isActive: false,
    sortOrder: 0
  }, staffToken);

  // Create Special D (expired)
  const specD = await apiCall('/menu/specials', 'POST', {
    title: 'Special D',
    discountedPrice: 60,
    availableFrom: new Date(now.getTime() - 20000).toISOString(),
    availableUntil: new Date(now.getTime() - 10000).toISOString(),
    isActive: true,
    sortOrder: 0
  }, staffToken);

  const activeSpecialsRes = await apiCall('/menu/daily-specials', 'GET');
  const specials = activeSpecialsRes.data;

  const titles = specials.map((s: any) => s.title);
  const isSorted = titles[0] === 'Special B' && titles[1] === 'Special A';
  const containsExcluded = titles.includes('Special C') || titles.includes('Special D');

  if (isSorted && !containsExcluded && specials.length === 2) {
    logTest('Phase 35', 'GET /menu/daily-specials lists active and correctly sorted specials', 'PASS');
  } else {
    logTest('Phase 35', 'GET /menu/daily-specials lists active and correctly sorted specials', 'FAIL', `Length: ${specials.length}, Sorted: ${isSorted}, Titles: ${JSON.stringify(titles)}`);
  }

  // 4. Bulk reorder test
  const reorderPayload = {
    items: [
      { id: specA.data.id, sortOrder: 1 },
      { id: specB.data.id, sortOrder: 2 }
    ]
  };

  const reorderRes = await apiCall('/menu/specials/reorder', 'PATCH', reorderPayload, staffToken);
  const updatedSpecials = await apiCall('/menu/daily-specials', 'GET');
  const updatedTitles = updatedSpecials.data.map((s: any) => s.title);

  if (reorderRes.status === 200 && updatedTitles[0] === 'Special A' && updatedTitles[1] === 'Special B') {
    logTest('Phase 35', 'Bulk reorder specials logic', 'PASS');
  } else {
    logTest('Phase 35', 'Bulk reorder specials logic', 'FAIL', `Status: ${reorderRes.status}, Order: ${JSON.stringify(updatedTitles)}`);
  }

  // Clean up specials
  await prisma.dailySpecial.deleteMany();


  // ===========================================================================
  // PHASE 36 — User Profile + Address Book
  // ===========================================================================
  console.log('\n--- Phase 36: User Profile & Address Book ---');

  // Clean created addresses
  await cleanupCreatedAddresses();

  // 1. First address is auto default
  const addr1Res = await apiCall('/address', 'POST', {
    type: 'EXTERNAL',
    label: 'HOME',
    addressLine: 'First Address, Mumbai',
    pincode: '400001',
    latitude: 19.0760,
    longitude: 72.8777,
    isDefault: false
  }, customerToken);

  if (addr1Res.status === 201) {
    createdAddressIds.push(addr1Res.data.id);
  }

  if (addr1Res.status === 201 && addr1Res.data.isDefault === true) {
    logTest('Phase 36', 'First address becomes default automatically', 'PASS');
  } else {
    logTest('Phase 36', 'First address becomes default automatically', 'FAIL', `Status: ${addr1Res.status}, Default: ${addr1Res.data?.isDefault}`);
  }

  // 2. Atomic default un-setting when creating Address 2 with isDefault: true
  const addr2Res = await apiCall('/address', 'POST', {
    type: 'EXTERNAL',
    label: 'WORK',
    addressLine: 'Second Address, Mumbai',
    pincode: '400002',
    latitude: 19.0765,
    longitude: 72.8778,
    isDefault: true
  }, customerToken);

  if (addr2Res.status === 201) {
    createdAddressIds.push(addr2Res.data.id);
  }

  const dbAddr1 = await prisma.address.findUnique({ where: { id: addr1Res.data.id } });
  if (addr2Res.status === 201 && addr2Res.data.isDefault === true && dbAddr1?.isDefault === false) {
    logTest('Phase 36', 'Setting new default un-defaults other addresses atomically', 'PASS');
  } else {
    logTest('Phase 36', 'Setting new default un-defaults other addresses atomically', 'FAIL', `Addr2 default: ${addr2Res.data?.isDefault}, Addr1 default in DB: ${dbAddr1?.isDefault}`);
  }

  // 3. Shortcut /set-default endpoint
  const setDefaultRes = await apiCall(`/address/${addr1Res.data.id}/set-default`, 'PATCH', null, customerToken);
  const dbAddr2 = await prisma.address.findUnique({ where: { id: addr2Res.data.id } });
  const updatedDbAddr1 = await prisma.address.findUnique({ where: { id: addr1Res.data.id } });

  if (setDefaultRes.status === 200 && updatedDbAddr1?.isDefault === true && dbAddr2?.isDefault === false) {
    logTest('Phase 36', 'Shortcut PATCH set-default endpoint works', 'PASS');
  } else {
    logTest('Phase 36', 'Shortcut PATCH set-default endpoint works', 'FAIL', `Status: ${setDefaultRes.status}, Addr1: ${updatedDbAddr1?.isDefault}, Addr2: ${dbAddr2?.isDefault}`);
  }

  // 4. Deleting default address does NOT promote others
  await apiCall(`/address/${addr1Res.data.id}`, 'DELETE', null, customerToken);
  // remove deleted ID from tracking list
  const idx = createdAddressIds.indexOf(addr1Res.data.id);
  if (idx > -1) createdAddressIds.splice(idx, 1);

  const remainingDefault = await prisma.address.findFirst({ where: { userId: customerId, isDefault: true } });

  if (!remainingDefault) {
    logTest('Phase 36', 'Deleting default address leaves default clear (no auto re-default)', 'PASS');
  } else {
    logTest('Phase 36', 'Deleting default address leaves default clear (no auto re-default)', 'FAIL', `Remaining default found: ${remainingDefault.id}`);
  }

  // Reset: restore defaults
  await apiCall(`/address/${addr2Res.data.id}/set-default`, 'PATCH', null, customerToken);

  // 5. Max 5 addresses limit
  for (let i = 0; i < 3; i++) { // we already have 1 active created address, so add 3 more to make it 4
    const res = await apiCall('/address', 'POST', {
      type: 'EXTERNAL',
      label: 'OTHER',
      addressLine: `Extra Address ${i}, Mumbai`,
      pincode: '400003',
      latitude: 19.0760,
      longitude: 72.8777
    }, customerToken);
    if (res.status === 201) createdAddressIds.push(res.data.id);
  }
  // add 5th
  const addr5Res = await apiCall('/address', 'POST', {
    type: 'EXTERNAL',
    label: 'OTHER',
    addressLine: '5th Address, Mumbai',
    pincode: '400003',
    latitude: 19.0760,
    longitude: 72.8777
  }, customerToken);
  if (addr5Res.status === 201) createdAddressIds.push(addr5Res.data.id);

  // attempt 6th
  const extraRes = await apiCall('/address', 'POST', {
    type: 'EXTERNAL',
    label: 'OTHER',
    addressLine: '6th Address, Mumbai',
    pincode: '400003',
    latitude: 19.0760,
    longitude: 72.8777
  }, customerToken);
  if (extraRes.status === 201) createdAddressIds.push(extraRes.data.id);

  if (extraRes.status === 400) {
    logTest('Phase 36', 'Address list limit of 5 returns 400 error', 'PASS');
  } else {
    logTest('Phase 36', 'Address list limit of 5 returns 400 error', 'FAIL', `Expected 400, got ${extraRes.status}`);
  }

  // 6. Get Profile returns addresses + defaultAddress
  const meRes = await apiCall('/auth/me', 'GET', null, customerToken);
  
  if (meRes.status === 200 && Array.isArray(meRes.data.addresses) && meRes.data.defaultAddress) {
    logTest('Phase 36', 'GET /auth/me returns full addresses and defaultAddress', 'PASS');
  } else {
    logTest('Phase 36', 'GET /auth/me returns full addresses and defaultAddress', 'FAIL', `Addresses length: ${meRes.data?.addresses?.length}, DefaultAddress: ${JSON.stringify(meRes.data?.defaultAddress)}`);
  }

  // Cleanup addresses
  await cleanupCreatedAddresses();


  // ===========================================================================
  // PHASE 37 — Map-Based Address Picker
  // ===========================================================================
  console.log('\n--- Phase 37: Map-Based Address Picker ---');

  // Configure a custom society tower coordinates in DB directly via prisma
  const tower = await prisma.societyTower.create({
    data: {
      name: 'V3 Tower Z',
      wings: ['A'],
      maxFloors: 10,
      latitude: 19.0762,
      longitude: 72.8779
    }
  });

  // 1. Primary Zone (<= 3km radius from 19.0760, 72.8777)
  const primaryVal = await apiCall('/address/validate', 'POST', {
    lat: 19.0800, // ~450m away
    lng: 72.8800
  }, customerToken);

  if (primaryVal.status === 200 && primaryVal.data.zoneType === 'PRIMARY' && primaryVal.data.deliveryFee === 20) {
    logTest('Phase 37', 'Primary zone validation (<= 3km) returns correct zone and fee', 'PASS');
  } else {
    logTest('Phase 37', 'Primary zone validation (<= 3km) returns correct zone and fee', 'FAIL', `Zone: ${primaryVal.data?.zoneType}, Fee: ${primaryVal.data?.deliveryFee}`);
  }

  // 2. Secondary Zone (3km - 7km)
  const secondaryVal = await apiCall('/address/validate', 'POST', {
    lat: 19.1100, // ~4.9km away
    lng: 72.9100
  }, customerToken);

  if (secondaryVal.status === 200 && secondaryVal.data.zoneType === 'SECONDARY' && secondaryVal.data.deliveryFee === 40) {
    logTest('Phase 37', 'Secondary zone validation (3-7km) returns correct zone and fee', 'PASS');
  } else {
    logTest('Phase 37', 'Secondary zone validation (3-7km) returns correct zone and fee', 'FAIL', `Zone: ${secondaryVal.data?.zoneType}, Fee: ${secondaryVal.data?.deliveryFee}`);
  }

  // 3. Out of Zone (> 7km)
  const outVal = await apiCall('/address/validate', 'POST', {
    lat: 19.2000, // ~19km away
    lng: 72.9500
  }, customerToken);

  if (outVal.status === 200 && outVal.data.zoneType === 'OUT_OF_ZONE') {
    logTest('Phase 37', 'Out of zone validation (> 7km) returns OUT_OF_ZONE status', 'PASS');
  } else {
    logTest('Phase 37', 'Out of zone validation (> 7km) returns OUT_OF_ZONE status', 'FAIL', `Zone: ${outVal.data?.zoneType}`);
  }

  // 4. Distance from user and Society Tower matching
  const matchVal = await apiCall('/address/validate', 'POST', {
    lat: 19.0762, // matching tower Z
    lng: 72.8779,
    userLat: 19.0760, // user ~30m away
    userLng: 72.8777
  }, customerToken);

  const hasSociety = matchVal.data.societyMatch !== null;
  const hasUserDist = matchVal.data.distanceFromUserKm !== undefined;

  if (matchVal.status === 200 && hasSociety && hasUserDist) {
    logTest('Phase 37', 'validateLocation calculates distance from user and matches society tower', 'PASS');
  } else {
    logTest('Phase 37', 'validateLocation calculates distance from user and matches society tower', 'FAIL', `SocietyMatch: ${hasSociety}, UserDist: ${hasUserDist}, Response: ${JSON.stringify(matchVal.data)}`);
  }

  // Cleanup tower
  await prisma.societyTower.delete({ where: { id: tower.id } });


  // ===========================================================================
  // PHASE 38 — Invoice System
  // ===========================================================================
  console.log('\n--- Phase 38: Invoice System ---');

  // Let's create an address and set it up to place an order
  const checkoutAddr = await apiCall('/address', 'POST', {
    type: 'EXTERNAL',
    label: 'HOME',
    addressLine: 'Checkout St, Mumbai',
    pincode: '400001',
    latitude: 19.0760,
    longitude: 72.8777
  }, customerToken);

  if (checkoutAddr.status === 201) {
    createdAddressIds.push(checkoutAddr.data.id);
  }

  // Clear cart and add item
  await apiCall('/cart', 'DELETE', null, customerToken);
  await apiCall('/cart/items', 'POST', { menuItemId: testMenuItemId, quantity: 2 }, customerToken);

  // Place order
  const orderRes = await apiCall('/orders', 'POST', {
    addressId: checkoutAddr.data.id,
    paymentMethod: 'COD',
    notes: 'V3 Test',
    items: [
      {
        menuItemId: testMenuItemId,
        quantity: 2,
        options: []
      }
    ]
  }, customerToken);

  const orderId = orderRes.data.id;

  if (orderRes.status === 201) {
    // 1. Download Invoice: verify PDF magic bytes
    // We can open it directly by appending ?token=
    const invoiceRes = await apiCall(`/orders/${orderId}/invoice?token=${customerToken}`, 'GET');
    
    // Check Content-Type is PDF
    const contentType = invoiceRes.headers.get('content-type');
    const isPDFHeader = typeof invoiceRes.data === 'string' && invoiceRes.data.startsWith('%PDF');

    if (invoiceRes.status === 200 && contentType?.includes('application/pdf') && isPDFHeader) {
      logTest('Phase 38', 'Invoice download returns PDF stream with valid magic bytes (%PDF)', 'PASS');
    } else {
      logTest('Phase 38', 'Invoice download returns PDF stream with valid magic bytes (%PDF)', 'FAIL', `Status: ${invoiceRes.status}, Content-Type: ${contentType}, Magic bytes match: ${isPDFHeader}`);
    }

    // 2. KOT endpoint (STAFF only check)
    const kotStaffRes = await apiCall(`/orders/${orderId}/kot`, 'GET', null, staffToken);
    const kotCustRes = await apiCall(`/orders/${orderId}/kot`, 'GET', null, customerToken);

    const staffOk = kotStaffRes.status === 200 && kotStaffRes.data.qrCodeBase64 && kotStaffRes.data.kotToken;
    const custBlocked = kotCustRes.status === 403;

    if (staffOk && custBlocked) {
      logTest('Phase 38', 'KOT endpoint retrieves data for STAFF and blocks CUSTOMER with 403', 'PASS');
    } else {
      logTest('Phase 38', 'KOT endpoint retrieves data for STAFF and blocks CUSTOMER with 403', 'FAIL', `Staff status: ${kotStaffRes.status}, Customer status: ${kotCustRes.status}`);
    }

    // 3. Scan KOT validation
    const kotToken = kotStaffRes.data.kotToken;

    // A. Scan non-READY order (Order is currently PLACED)
    const scanPlacedRes = await apiCall('/orders/scan-kot', 'POST', { token: kotToken });
    const isPlacedBlocked = scanPlacedRes.status === 400 && scanPlacedRes.data.currentStatus === 'PLACED';

    if (isPlacedBlocked) {
      logTest('Phase 38', 'KOT scan on non-READY order fails with 400 & returns current status', 'PASS');
    } else {
      logTest('Phase 38', 'KOT scan on non-READY order fails with 400 & returns current status', 'FAIL', `Status: ${scanPlacedRes.status}, payload: ${JSON.stringify(scanPlacedRes.data)}`);
    }

    // B. Scan READY order
    // Move order to ACCEPTED -> PREPARING -> READY
    await apiCall(`/orders/${orderId}/status`, 'PATCH', { status: 'ACCEPTED' }, staffToken);
    await apiCall(`/orders/${orderId}/status`, 'PATCH', { status: 'PREPARING' }, staffToken);
    await apiCall(`/orders/${orderId}/status`, 'PATCH', { status: 'READY' }, staffToken);

    // Now scan KOT
    await new Promise<void>(async (resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('order:status socket event timed out')), 6000);
      customerSocket!.on('order:status', (payload) => {
        if (payload.orderId === orderId && payload.status === 'OUT_FOR_DELIVERY') {
          clearTimeout(timeout);
          resolve();
        }
      });

      const scanReadyRes = await apiCall('/orders/scan-kot', 'POST', { token: kotToken });
      
      const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (scanReadyRes.status === 200 && dbOrder?.status === 'OUT_FOR_DELIVERY') {
        logTest('Phase 38', 'KOT scan on READY order transitions status to OUT_FOR_DELIVERY', 'PASS');
      } else {
        reject(new Error(`Scan status: ${scanReadyRes.status}, DB status: ${dbOrder?.status}`));
      }
    })
    .then(() => logTest('Phase 38', 'KOT scan fires order:status Socket event live', 'PASS'))
    .catch((err) => {
      logTest('Phase 38', 'KOT scan READY transition and sockets', 'FAIL', err.message);
    });

    // C. Scan expired token (modify token or wait - we can mock by sending an invalid token structure)
    const scanExpiredRes = await apiCall('/orders/scan-kot', 'POST', { token: 'invalid-or-expired-token-signature' });
    if (scanExpiredRes.status === 401) {
      logTest('Phase 38', 'KOT scan with invalid/expired token returns 401', 'PASS');
    } else {
      logTest('Phase 38', 'KOT scan with invalid/expired token returns 401', 'FAIL', `Status: ${scanExpiredRes.status}`);
    }

    // D. Revenue delta verification
    // Move order to DELIVERED using Admin token (since it has SUPER_ADMIN role required for DELIVERED)
    await new Promise<void>(async (resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('revenue:updated socket event timed out')), 6000);
      staffSocket!.on('revenue:updated', (payload) => {
        clearTimeout(timeout);
        if (payload.delta > 0 && payload.newTotal > 0) {
          logTest('Phase 34', 'Receive revenue:updated on DELIVERED transition', 'PASS');
          resolve();
        } else {
          reject(new Error('Invalid revenue payload'));
        }
      });

      // Update to DELIVERED via admin
      await apiCall(`/orders/${orderId}/status`, 'PATCH', { status: 'DELIVERED' }, adminToken);
    }).catch((err) => {
      logTest('Phase 34', 'Receive revenue:updated on DELIVERED transition', 'FAIL', err.message);
    });
  }

  // Cleanup checkout order and address
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.delete({ where: { id: orderId } });
  await cleanupCreatedAddresses();

  // ─── FINAL CLEANUP ─────────────────────────────────────────────────────────
  try {
    await prisma.menuItem.delete({ where: { id: testMenuItemId } });
    await prisma.category.delete({ where: { id: testCategoryId } });
  } catch (e) {
    console.error('Final cleanup error:', e);
  }

  if (customerSocket) customerSocket.disconnect();
  if (staffSocket) staffSocket.disconnect();

  const totalDuration = Date.now() - overallStart;
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - [${r.suite}] ${r.name}: ${r.message || 'Unknown error'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    console.log('🎉 All CafeConnect V3 tests passed successfully!');
  } else {
    console.log('⚠️  Some tests failed. Please investigate the errors above.');
  }

  // Force close database connection
  await prisma.$disconnect();
}

runAllTests().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
