/**
 * E2E Programmatic Test for CafeConnect Billing Panel
 * Validates:
 * 1. Staff login
 * 2. Creating orders for a table (marks table OCCUPIED)
 * 3. Generating a GST-compliant Bill (marks table BILLING)
 * 4. Applying discount below threshold (no PIN)
 * 5. Applying discount above threshold (fails without PIN, succeeds with correct PIN)
 * 6. Split payments (CASH + UPI) which completes the bill (marks table FREE)
 * 7. Voiding a bill with manager PIN (frees table, marks VOID)
 * 8. Daily Z-report summary validation
 */

const API_URL = 'http://localhost:3000/api';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message?: string;
}

const results: TestResult[] = [];

function logTest(test: string, status: 'PASS' | 'FAIL', message?: string) {
  results.push({ test, status, message });
  const emoji = status === 'PASS' ? '✅' : '❌';
  console.log(`${emoji} ${test}`);
  if (message) console.log(`   ${message}`);
}

async function apiCall(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: any = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  return { response, data };
}

async function runTests() {
  console.log('🚀 Starting CafeConnect Billing Panel E2E Test Suite...');

  try {
    // 1. Staff login
    console.log('\n🔑 1. Logging in as Staff/Manager...');
    const loginRes = await apiCall('/auth/staff-login', 'POST', {
      email: 'tanmayjare13@gmail.com',
      password: 'cafestaff2024'
    });

    if (loginRes.response.status !== 200 || !loginRes.data.accessToken) {
      logTest('Staff Login', 'FAIL', `Status: ${loginRes.response.status}, Data: ${JSON.stringify(loginRes.data)}`);
      return;
    }
    const token = loginRes.data.accessToken;
    const staffId = loginRes.data.user.id;
    logTest('Staff Login', 'PASS', `Logged in as ${loginRes.data.user.name} (ID: ${staffId})`);

    // 2. Fetch tables and find T-1
    console.log('\n📋 2. Fetching Tables list...');
    const tablesRes = await apiCall('/billing/tables', 'GET', null, token);
    if (tablesRes.response.status !== 200 || !Array.isArray(tablesRes.data)) {
      logTest('Fetch Tables', 'FAIL', `Status: ${tablesRes.response.status}`);
      return;
    }
    const tableT1 = tablesRes.data.find((t: any) => t.number === 'T-1');
    const tableT2 = tablesRes.data.find((t: any) => t.number === 'T-2');
    if (!tableT1 || !tableT2) {
      logTest('Find Tables T-1 and T-2', 'FAIL', 'Required test tables not found');
      return;
    }
    logTest('Fetch Tables', 'PASS', `Tables found: T-1 (ID: ${tableT1.id}), T-2 (ID: ${tableT2.id})`);

    // 3. Fetch menu items
    console.log('\n🍔 3. Fetching Menu Items...');
    const menuRes = await apiCall('/menu/items', 'GET', null, token);
    if (menuRes.response.status !== 200 || menuRes.data.length === 0) {
      logTest('Fetch Menu Items', 'FAIL', 'Failed to retrieve menu items');
      return;
    }
    const menuItem = menuRes.data[0];
    logTest('Fetch Menu Items', 'PASS', `Item for testing: ${menuItem.name} @ ₹${menuItem.price}`);

    // 4. Add items to T-1 open bill directly
    console.log('\n🛍️ 4. Adding item to T-1...');
    const addRes1 = await apiCall(`/billing/tables/${tableT1.id}/items`, 'POST', {
      menuItemId: menuItem.id,
      quantity: 3
    }, token);

    if (addRes1.response.status !== 201) {
      logTest('Add Item to Table', 'FAIL', `Status: ${addRes1.response.status}, Data: ${JSON.stringify(addRes1.data)}`);
      return;
    }
    logTest('Add Item to Table', 'PASS', `Items in bill: ${addRes1.data.items.length}`);

    // Verify table T-1 status is now OCCUPIED
    const tCheck1 = await apiCall('/billing/tables', 'GET', null, token);
    const updatedT1 = tCheck1.data.find((t: any) => t.id === tableT1.id);
    if (updatedT1.status !== 'OCCUPIED') {
      logTest('Verify Table OCCUPIED status', 'FAIL', `Status is ${updatedT1.status}, expected OCCUPIED`);
      return;
    }
    logTest('Verify Table OCCUPIED status', 'PASS');

    // 5. Generate bill for T-1
    console.log('\n💵 5. Finalizing bill for T-1...');
    const billRes = await apiCall(`/billing/tables/${tableT1.id}/finalize`, 'POST', null, token);

    if (billRes.response.status !== 201) {
      logTest('Generate Bill', 'FAIL', `Status: ${billRes.response.status}, Data: ${JSON.stringify(billRes.data)}`);
      return;
    }
    const bill = billRes.data;
    logTest('Generate Bill', 'PASS', `Bill generated: ${bill.billNumber}, Grand Total: ₹${bill.grandTotal}`);

    // Verify table status is now BILLING
    const tCheck2 = await apiCall('/billing/tables', 'GET', null, token);
    const updatedT1_2 = tCheck2.data.find((t: any) => t.id === tableT1.id);
    if (updatedT1_2.status !== 'BILLING') {
      logTest('Verify Table BILLING status', 'FAIL', `Status is ${updatedT1_2.status}, expected BILLING`);
      return;
    }
    logTest('Verify Table BILLING status', 'PASS');

    // 5.5. Verify that unlocking/editing table T-1 bill transitions it back to OCCUPIED
    console.log('\n🔓 5.5 Testing table bill unlock...');
    const unlockRes = await apiCall(`/billing/tables/${tableT1.id}/unlock`, 'POST', null, token);
    if (unlockRes.response.status !== 201) {
      logTest('Unlock Bill', 'FAIL', `Status: ${unlockRes.response.status}`);
      return;
    }
    logTest('Unlock Bill', 'PASS');

    const tCheckUnlock = await apiCall('/billing/tables', 'GET', null, token);
    const updatedT1Unlock = tCheckUnlock.data.find((t: any) => t.id === tableT1.id);
    if (updatedT1Unlock.status !== 'OCCUPIED') {
      logTest('Verify Table OCCUPIED status after Unlock', 'FAIL', `Status is ${updatedT1Unlock.status}, expected OCCUPIED`);
      return;
    }
    logTest('Verify Table OCCUPIED status after Unlock', 'PASS');

    // Re-finalize bill so we can do payment/void/discount
    console.log('   Re-finalizing bill for T-1...');
    const billResRefinal = await apiCall(`/billing/tables/${tableT1.id}/finalize`, 'POST', null, token);
    const finalizedBill = billResRefinal.data;

    // 6. Apply discount below threshold (e.g. ₹20, threshold is ₹100)
    console.log('\n🏷️ 6. Applying discount below threshold...');
    const discountRes1 = await apiCall(`/billing/bills/${finalizedBill.id}/discount`, 'POST', {
      discountAmount: 20,
      reason: 'Standard customer discount'
    }, token);

    if (discountRes1.response.status !== 201) {
      logTest('Apply Low Discount', 'FAIL', `Status: ${discountRes1.response.status}, Data: ${JSON.stringify(discountRes1.data)}`);
      return;
    }
    logTest('Apply Low Discount', 'PASS', `Discount applied. New Grand Total: ₹${discountRes1.data.grandTotal}`);

    // 7. Apply discount above threshold (e.g. ₹150) without manager PIN - should FAIL
    console.log('\n🏷️ 7. Testing discount above threshold without PIN (should fail)...');
    const discountResFail = await apiCall(`/billing/bills/${finalizedBill.id}/discount`, 'POST', {
      discountAmount: 150,
      reason: 'High discount trial'
    }, token);

    if (discountResFail.response.status === 201) {
      logTest('Apply High Discount Without PIN', 'FAIL', `Expected failure, but got 201. Grand Total: ₹${discountResFail.data.grandTotal}`);
      return;
    }
    logTest('Apply High Discount Without PIN', 'PASS', `Correctly failed with status ${discountResFail.response.status}`);

    // 8. Apply discount above threshold (e.g. ₹120) with CORRECT manager PIN
    console.log('\n🏷️ 8. Applying discount above threshold with manager PIN...');
    const discountResSuccess = await apiCall(`/billing/bills/${finalizedBill.id}/discount`, 'POST', {
      discountAmount: 120,
      reason: 'High discount approved by manager',
      managerId: staffId,
      managerPin: '1234'
    }, token);

    if (discountResSuccess.response.status !== 201) {
      logTest('Apply High Discount With PIN', 'FAIL', `Status: ${discountResSuccess.response.status}, Data: ${JSON.stringify(discountResSuccess.data)}`);
      return;
    }
    const updatedBill = discountResSuccess.data;
    logTest('Apply High Discount With PIN', 'PASS', `Discount applied. New Grand Total: ₹${updatedBill.grandTotal}`);

    // 9. Split payments: pay ₹100 cash first
    console.log('\n💳 9. Recording split payments...');
    const payRes1 = await apiCall(`/billing/bills/${updatedBill.id}/payments`, 'POST', {
      method: 'CASH',
      amount: 100
    }, token);

    if (payRes1.response.status !== 201) {
      logTest('Record CASH payment', 'FAIL', `Status: ${payRes1.response.status}`);
      return;
    }
    logTest('Record CASH payment', 'PASS', `Cash recorded: ₹100. Bill status remains: ${payRes1.data.bill.status}`);

    // Pay remaining balance using UPI
    const remaining = updatedBill.grandTotal - 100;
    console.log(`   Paying remaining balance: ₹${remaining} via UPI...`);
    const payRes2 = await apiCall(`/billing/bills/${updatedBill.id}/payments`, 'POST', {
      method: 'UPI',
      amount: remaining,
      reference: 'UPI-TXN-987654'
    }, token);

    if (payRes2.response.status !== 201) {
      logTest('Record UPI payment', 'FAIL', `Status: ${payRes2.response.status}`);
      return;
    }
    logTest('Record UPI payment', 'PASS', `UPI recorded: ₹${remaining}. Bill status: ${payRes2.data.bill.status}`);

    // Verify table T-1 status is now FREE
    const tCheck3 = await apiCall('/billing/tables', 'GET', null, token);
    const updatedT1_3 = tCheck3.data.find((t: any) => t.id === tableT1.id);
    if (updatedT1_3.status !== 'FREE') {
      logTest('Verify Table status freed after full payment', 'FAIL', `Status is ${updatedT1_3.status}, expected FREE`);
      return;
    }
    logTest('Verify Table status freed after full payment', 'PASS');

    // 10. Generate order on T-2 and Void it
    console.log('\n❌ 10. Placing item on T-2 and voiding...');
    await apiCall(`/billing/tables/${tableT2.id}/items`, 'POST', {
      menuItemId: menuItem.id,
      quantity: 1
    }, token);

    const billRes2 = await apiCall(`/billing/tables/${tableT2.id}/finalize`, 'POST', null, token);
    const voidBillId = billRes2.data.id;

    const voidRes = await apiCall(`/billing/bills/${voidBillId}/void`, 'POST', {
      reason: 'Customer left before billing completed',
      managerId: staffId,
      managerPin: '1234'
    }, token);

    if (voidRes.response.status !== 201 || voidRes.data.status !== 'VOID') {
      logTest('Void Bill', 'FAIL', `Status: ${voidRes.response.status}, Data: ${JSON.stringify(voidRes.data)}`);
      return;
    }
    logTest('Void Bill', 'PASS', `Bill voided successfully. Void approved by manager.`);

    // Verify table T-2 status is back to FREE
    const tCheck4 = await apiCall('/billing/tables', 'GET', null, token);
    const updatedT2 = tCheck4.data.find((t: any) => t.id === tableT2.id);
    if (updatedT2.status !== 'FREE') {
      logTest('Verify Table T-2 freed after Void', 'FAIL', `Status is ${updatedT2.status}, expected FREE`);
      return;
    }
    logTest('Verify Table T-2 freed after Void', 'PASS');

    // 11. Z-Report
    console.log('\n📊 11. Fetching Z-Report...');
    const now = new Date();
    const targetDate = now.getHours() < 6 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
    const dateQuery = targetDate.toISOString().slice(0, 10);
    const zReport = await apiCall(`/billing/reports/z-report?date=${dateQuery}`, 'GET', null, token);
    if (zReport.response.status !== 200 || zReport.data.totalSales === undefined) {
      logTest('Z-Report generation', 'FAIL', `Status: ${zReport.response.status}, Data: ${JSON.stringify(zReport.data)}`);
      return;
    }
    logTest('Z-Report generation', 'PASS', 
      `Sales: ₹${zReport.data.totalSales}, GST CGST: ₹${zReport.data.cgstCollected}, Voided bills: ${zReport.data.voidedCount} (Value: ₹${zReport.data.voidedValue})`
    );

    // 12. Table Configuration settings
    console.log('\n🛠️ 12. Testing table configuration settings...');
    const createTableRes = await apiCall('/billing/tables', 'POST', {
      number: 'T-99',
      section: 'Patio'
    }, token);

    if (createTableRes.response.status !== 201) {
      logTest('Create Table Configuration', 'FAIL', `Status: ${createTableRes.response.status}`);
      return;
    }
    logTest('Create Table Configuration', 'PASS', `Created table: ${createTableRes.data.number}`);

    const deleteTableRes = await apiCall(`/billing/tables/${createTableRes.data.id}`, 'DELETE', null, token);
    if (deleteTableRes.response.status !== 200) {
      logTest('Delete Table Configuration', 'FAIL', `Status: ${deleteTableRes.response.status}`);
      return;
    }
    logTest('Delete Table Configuration', 'PASS', `Deleted table ID: ${createTableRes.data.id}`);

    console.log('\n🎉 ALL CAFECONNECT BILLING PANEL E2E TESTS PASSED SUCCESSFULLY!');

  } catch (error: any) {
    console.error('\n❌ Test execution failed with error:', error);
  }
}

runTests();
