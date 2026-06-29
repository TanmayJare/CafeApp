/**
 * Phase 1 Testing Script - Complete End-to-End Flow
 * Tests all redesigned pages and functionality
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const CUSTOMER_WEB = 'http://localhost:3002';
const STAFF_WEB = 'http://localhost:3001';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  duration?: number;
}

const results: TestResult[] = [];

// Helper function to make API calls
async function apiCall(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: any = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  }
  return { response, data };
}

// Helper function to log test results
function logTest(test: string, status: 'PASS' | 'FAIL', message?: string, duration?: number) {
  results.push({ test, status, message, duration });
  const emoji = status === 'PASS' ? '✅' : '❌';
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`${emoji} ${test}${durationStr}`);
  if (message) {
    console.log(`   ${message}`);
  }
}

// Test 1: Customer Authentication
async function testCustomerAuth() {
  console.log('\n🔐 Testing Customer Authentication...');
  const startTime = Date.now();
  
  try {
    // Send OTP
    const { response: otpResponse, data: otpData } = await apiCall('/auth/send-otp', 'POST', {
      email: 'customer@test.com'
    });
    
    if (otpResponse.status !== 201) {
      logTest('Send OTP', 'FAIL', `Status: ${otpResponse.status}`);
      return null;
    }
    logTest('Send OTP', 'PASS', `OTP: ${otpData.otp || 'sent to email'}`);

    // Wait a bit for database transaction to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify OTP
    const { response: verifyResponse, data: verifyData } = await apiCall('/auth/verify-otp', 'POST', {
      email: 'customer@test.com',
      code: '123456'
    });

    if (verifyResponse.status !== 201 || !verifyData.accessToken) {
      logTest('Verify OTP', 'FAIL', `Status: ${verifyResponse.status}, Data: ${JSON.stringify(verifyData)}`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    logTest('Verify OTP', 'PASS', `Token received`, duration);
    return verifyData.accessToken;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logTest('Customer Authentication', 'FAIL', message);
    return null;
  }
}

// Test 2: Staff Authentication
async function testStaffAuth() {
  console.log('\n🔐 Testing Staff Authentication...');
  const startTime = Date.now();
  
  try {
    // Send OTP
    const { response: otpResponse } = await apiCall('/auth/send-otp', 'POST', {
      email: 'staff@cafe.test'
    });
    
    if (otpResponse.status !== 201) {
      logTest('Staff Send OTP', 'FAIL', `Status: ${otpResponse.status}`);
      return null;
    }
    logTest('Staff Send OTP', 'PASS');

    // Verify OTP
    const { response: verifyResponse, data: verifyData } = await apiCall('/auth/verify-otp', 'POST', {
      email: 'staff@cafe.test',
      code: '123456'
    });

    if (verifyResponse.status !== 201 || !verifyData.accessToken) {
      logTest('Staff Verify OTP', 'FAIL', `Status: ${verifyResponse.status}`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    logTest('Staff Verify OTP', 'PASS', `Token received`, duration);
    return verifyData.accessToken;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logTest('Staff Authentication', 'FAIL', message);
    return null;
  }
}

// Test 3: Fetch Menu Items
async function testFetchMenu(token: string) {
  console.log('\n📋 Testing Menu Fetch...');
  const startTime = Date.now();
  
  try {
    const { response, data } = await apiCall('/menu/items', 'GET', null, token);
    
    if (response.status !== 200) {
      logTest('Fetch Menu', 'FAIL', `Status: ${response.status}`);
      return [];
    }
    
    if (!Array.isArray(data) || data.length === 0) {
      logTest('Fetch Menu', 'FAIL', 'No menu items found');
      return [];
    }
    
    const duration = Date.now() - startTime;
    logTest('Fetch Menu', 'PASS', `${data.length} items found`, duration);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logTest('Fetch Menu', 'FAIL', message);
    return [];
  }
}

// Test 4: Create Order
async function testCreateOrder(token: string, menuItems: any[]) {
  console.log('\n🛒 Testing Order Creation...');
  const startTime = Date.now();
  
  try {
    if (menuItems.length === 0) {
      logTest('Create Order', 'FAIL', 'No menu items available');
      return null;
    }

    // First, create an address
    const addressData = {
      type: 'EXTERNAL',
      label: 'Test Address',
      addressLine: '123 Test Street, Mumbai',
      landmark: 'Near Test Landmark',
      pincode: '400001',
      latitude: 19.0760,
      longitude: 72.8777
    };

    const { response: addressResponse, data: addressDataResult } = await apiCall('/address', 'POST', addressData, token);
    
    if (addressResponse.status !== 201) {
      logTest('Create Address', 'FAIL', `Status: ${addressResponse.status}`);
      return null;
    }
    logTest('Create Address', 'PASS', `Address ID: ${addressDataResult.id}`);

    // Now create the order
    const orderData = {
      items: [
        {
          menuItemId: menuItems[0].id,
          quantity: 2,
          options: []
        }
      ],
      addressId: addressDataResult.id,
      paymentMethod: 'COD'
    };

    const { response, data } = await apiCall('/orders', 'POST', orderData, token);
    
    if (response.status !== 201) {
      logTest('Create Order', 'FAIL', `Status: ${response.status}, ${JSON.stringify(data)}`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    logTest('Create Order', 'PASS', `Order ID: ${data.id}`, duration);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logTest('Create Order', 'FAIL', message);
    return null;
  }
}

// Test 5: Fetch Order Details
async function testFetchOrderDetails(token: string, orderId: string) {
  console.log('\n📦 Testing Order Details Fetch...');
  const startTime = Date.now();
  
  try {
    const { response, data } = await apiCall(`/orders/${orderId}`, 'GET', null, token);
    
    if (response.status !== 200) {
      logTest('Fetch Order Details', 'FAIL', `Status: ${response.status}`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    logTest('Fetch Order Details', 'PASS', `Status: ${data.status}`, duration);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logTest('Fetch Order Details', 'FAIL', message);
    return null;
  }
}

// Test 6: Update Order Status (Staff)
async function testUpdateOrderStatus(staffToken: string, orderId: string) {
  console.log('\n🔄 Testing Order Status Update...');
  const startTime = Date.now();
  
  try {
    const statuses = ['ACCEPTED', 'PREPARING', 'READY'];
    
    for (const status of statuses) {
      const { response } = await apiCall(
        `/orders/${orderId}/status`,
        'PATCH',
        { status },
        staffToken
      );
      
      if (response.status !== 200) {
        logTest(`Update Status to ${status}`, 'FAIL', `Status: ${response.status}`);
        return false;
      }
      
      logTest(`Update Status to ${status}`, 'PASS');
      
      // Wait a bit between status updates
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const duration = Date.now() - startTime;
    logTest('Order Status Updates', 'PASS', `All statuses updated`, duration);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logTest('Update Order Status', 'FAIL', message);
    return false;
  }
}

// Test 7: Fetch Customer Orders
async function testFetchCustomerOrders(token: string) {
  console.log('\n📋 Testing Customer Orders Fetch...');
  const startTime = Date.now();
  
  try {
    const { response, data } = await apiCall('/orders', 'GET', null, token);
    
    if (response.status !== 200) {
      logTest('Fetch Customer Orders', 'FAIL', `Status: ${response.status}`);
      return [];
    }
    
    const duration = Date.now() - startTime;
    logTest('Fetch Customer Orders', 'PASS', `${data.length} orders found`, duration);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logTest('Fetch Customer Orders', 'FAIL', message);
    return [];
  }
}

// Test 8: Frontend Pages Accessibility
async function testFrontendPages() {
  console.log('\n🌐 Testing Frontend Pages...');
  
  const pages = [
    { url: CUSTOMER_WEB, name: 'Customer Home' },
    { url: `${CUSTOMER_WEB}/cart`, name: 'Cart Page' },
    { url: STAFF_WEB, name: 'Staff Login' },
  ];

  for (const page of pages) {
    try {
      const startTime = Date.now();
      const response = await fetch(page.url);
      const duration = Date.now() - startTime;
      
      if (response.status === 200) {
        logTest(`${page.name} Accessible`, 'PASS', `${page.url}`, duration);
      } else {
        logTest(`${page.name} Accessible`, 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logTest(`${page.name} Accessible`, 'FAIL', message);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Phase 1 End-to-End Tests\n');
  console.log(`   API base: ${API_URL}`);
  console.log('=' .repeat(60));

  // Pre-flight: verify the backend is reachable
  try {
    const healthUrl = `${API_URL}/health`;
    console.log(`\n⏳ Checking backend health at ${healthUrl} ...`);
    const res = await fetch(healthUrl);
    if (!res.ok) {
      console.log(`❌ Health check failed — HTTP ${res.status}. Is the API server running?`);
      return;
    }
    console.log('✅ Backend reachable\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌ Cannot reach backend at ${API_URL} — ${msg}`);
    console.log('   Start the API with:  cd Desktop/Cafeapp/apps/api && npm run start:dev');
    return;
  }

  const overallStartTime = Date.now();

  // Test 1: Customer Authentication
  const customerToken = await testCustomerAuth();
  if (!customerToken) {
    console.log('\n❌ Customer authentication failed. Stopping tests.');
    return;
  }

  // Test 2: Staff Authentication
  const staffToken = await testStaffAuth();
  if (!staffToken) {
    console.log('\n❌ Staff authentication failed. Stopping tests.');
    return;
  }

  // Test 3: Fetch Menu
  const menuItems = await testFetchMenu(customerToken);
  
  // Test 4: Create Order
  const order = await testCreateOrder(customerToken, menuItems);
  
  if (order) {
    // Test 5: Fetch Order Details
    await testFetchOrderDetails(customerToken, order.id);
    
    // Test 6: Update Order Status
    await testUpdateOrderStatus(staffToken, order.id);
    
    // Test 7: Fetch Customer Orders
    await testFetchCustomerOrders(customerToken);
  }

  // Test 8: Frontend Pages
  await testFrontendPages();

  // Summary
  const overallDuration = Date.now() - overallStartTime;
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${overallDuration}ms`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.message || 'Unknown error'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Phase 1 is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);

// Made with Bob
