import { PrismaClient } from '@prisma/client';

const API_URL = 'http://localhost:3000/api';
const prisma = new PrismaClient();

async function apiCall(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', body?: any) {
  const options: any = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();
  return { status: response.status, data };
}

async function run() {
  console.log('🧪 Running WhatsApp OTP Auth Specific Tests...');
  const testPhone = '+919999988888';

  // Cleanup prior data
  await prisma.otpVerification.deleteMany({ where: { phone: testPhone } });
  await prisma.user.deleteMany({ where: { phone: testPhone } });

  // 1. Send OTP
  console.log('\n--- 1. Send OTP ---');
  const sendRes = await apiCall('/auth/send-otp', 'POST', { phone: testPhone });
  console.log('Send OTP status:', sendRes.status);
  console.log('Send OTP response:', sendRes.data);
  if (sendRes.status !== 200) {
    throw new Error('Send OTP failed');
  }
  const code = sendRes.data.code;

  // 2. Rate Limit: Send 3 more OTPs (total 4). The 4th should return 429.
  console.log('\n--- 2. Rate Limit (Max 3 sends) ---');
  const res2 = await apiCall('/auth/send-otp', 'POST', { phone: testPhone });
  console.log('2nd Send OTP status:', res2.status); // 200

  const res3 = await apiCall('/auth/send-otp', 'POST', { phone: testPhone });
  console.log('3rd Send OTP status:', res3.status); // 200

  const res4 = await apiCall('/auth/send-otp', 'POST', { phone: testPhone });
  console.log('4th Send OTP status:', res4.status); // 429
  console.log('4th Send OTP response:', res4.data);
  if (res4.status !== 429) {
    throw new Error(`Expected 429, got ${res4.status}`);
  }

  // To allow verification tests to run, let's delete the rate limit entries or use a different phone number
  const verifyPhone = '+919999977777';
  await prisma.otpVerification.deleteMany({ where: { phone: verifyPhone } });
  await prisma.user.deleteMany({ where: { phone: verifyPhone } });

  const sendVerifyRes = await apiCall('/auth/send-otp', 'POST', { phone: verifyPhone });
  const verifyCode = sendVerifyRes.data.code;

  // 3. Verify with Wrong Code (returns 401, increments attempts)
  console.log('\n--- 3. Verify with Wrong Code ---');
  const wrongRes = await apiCall('/auth/verify-otp', 'POST', { phone: verifyPhone, code: '000000' });
  console.log('Wrong code verify status:', wrongRes.status); // 401
  if (wrongRes.status !== 401) {
    throw new Error(`Expected 401, got ${wrongRes.status}`);
  }

  // Check attempts incremented in DB
  const otpRecord = await prisma.otpVerification.findFirst({ where: { phone: verifyPhone } });
  console.log('OTP attempts in DB:', otpRecord?.attempts);
  if (otpRecord?.attempts !== 1) {
    throw new Error(`Expected attempts = 1, got ${otpRecord?.attempts}`);
  }

  // 4. Verify with Correct Code (returns 200, JWT, creates User keyed by phone)
  console.log('\n--- 4. Verify with Correct Code ---');
  const correctRes = await apiCall('/auth/verify-otp', 'POST', { phone: verifyPhone, code: verifyCode });
  console.log('Correct code verify status:', correctRes.status); // 200
  console.log('Correct code response token present:', !!correctRes.data.accessToken);
  console.log('User role and phone:', correctRes.data.user.role, correctRes.data.user.phone);

  if (correctRes.status !== 200 || !correctRes.data.accessToken) {
    throw new Error('Verification failed');
  }

  // Check user is created in DB
  const user = await prisma.user.findUnique({ where: { phone: verifyPhone } });
  console.log('User created in DB:', !!user);
  if (!user || user.phone !== verifyPhone) {
    throw new Error('User not created or phone mismatch');
  }

  console.log('\n✅ All targeted WhatsApp OTP tests passed successfully!');
}

run()
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
