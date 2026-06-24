import { OrderStatus, ALLOWED_TRANSITIONS } from './src/index';

// Test 1: Verify ALLOWED_TRANSITIONS has exactly 8 keys
const transitionKeys = Object.keys(ALLOWED_TRANSITIONS);
console.log('✓ Test 1: ALLOWED_TRANSITIONS keys count');
console.log(`  Expected: 8, Got: ${transitionKeys.length}`);
if (transitionKeys.length !== 8) {
  console.error('  ❌ FAILED: Expected 8 keys');
  process.exit(1);
}
console.log('  ✅ PASSED');

// Test 2: Verify all OrderStatus enum values are present as keys
const orderStatusValues = Object.values(OrderStatus);
console.log('\n✓ Test 2: All OrderStatus values present in ALLOWED_TRANSITIONS');
console.log(`  OrderStatus enum values: ${orderStatusValues.length}`);

const missingKeys = orderStatusValues.filter(
  status => !transitionKeys.includes(status)
);

if (missingKeys.length > 0) {
  console.error(`  ❌ FAILED: Missing keys: ${missingKeys.join(', ')}`);
  process.exit(1);
}
console.log('  ✅ PASSED');

// Test 3: Verify the structure matches Appendix A
console.log('\n✓ Test 3: Verify transition rules match Appendix A');
const expectedTransitions = {
  [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.ASSIGNED],
  [OrderStatus.ASSIGNED]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

let allMatch = true;
for (const [status, expectedNext] of Object.entries(expectedTransitions)) {
  const actualNext = ALLOWED_TRANSITIONS[status as OrderStatus];
  const matches = 
    actualNext.length === expectedNext.length &&
    actualNext.every(s => expectedNext.includes(s));
  
  if (!matches) {
    console.error(`  ❌ FAILED: ${status} transitions don't match`);
    console.error(`    Expected: [${expectedNext.join(', ')}]`);
    console.error(`    Got: [${actualNext.join(', ')}]`);
    allMatch = false;
  }
}

if (!allMatch) {
  process.exit(1);
}
console.log('  ✅ PASSED');

console.log('\n🎉 All Phase 0 AI tests passed!');

// Made with Bob
