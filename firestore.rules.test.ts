import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * Property Rental Management - Security Rules Emulator Test Suite
 * This test runner validates the "Dirty Dozen" payloads against firestore.rules using the Firebase Emulator.
 */

async function runTests() {
  console.log('=== STARTING FIRESTORE SECURITY RULES TEST RUNNER ===');
  
  let testEnv: RulesTestEnvironment;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'studio-424851478-89318',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  } catch (err) {
    console.error('Error initializing test environment. Ensure the Firebase Emulator is running on port 8080.', err);
    process.exit(1);
  }

  const ownerAuth = { uid: 'owner-123', email: 'yared.abegaz@gmail.com', email_verified: true };
  const untrustedAuth = { uid: 'attacker-123', email: 'attacker@evil.com', email_verified: true };
  const unverifiedAuth = { uid: 'unverified-123', email: 'yared.abegaz@gmail.com', email_verified: false };

  const ownerContext = testEnv.authenticatedContext(ownerAuth.uid, {
    email: ownerAuth.email,
    email_verified: ownerAuth.email_verified,
  });

  const attackerContext = testEnv.authenticatedContext(untrustedAuth.uid, {
    email: untrustedAuth.email,
    email_verified: untrustedAuth.email_verified,
  });

  const unverifiedContext = testEnv.authenticatedContext(unverifiedAuth.uid, {
    email: unverifiedAuth.email,
    email_verified: unverifiedAuth.email_verified,
  });

  const anonContext = testEnv.unauthenticatedContext();

  let passedTests = 0;
  let failedTests = 0;

  async function assertDenied(promise: Promise<any>, description: string) {
    try {
      await promise;
      console.error(`❌ FAIL: ${description} (Expected PERMISSION_DENIED but operation succeeded)`);
      failedTests++;
    } catch (err: any) {
      if (err.code === 'permission-denied' || String(err).includes('permission-denied')) {
        console.log(`✅ PASS: ${description}`);
        passedTests++;
      } else {
        console.error(`❌ FAIL: ${description} (Expected PERMISSION_DENIED but got: ${err.message || err})`);
        failedTests++;
      }
    }
  }

  async function assertAllowed(promise: Promise<any>, description: string) {
    try {
      await promise;
      console.log(`✅ PASS: ${description}`);
      passedTests++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${description} (Expected operation to succeed but got: ${err.message || err})`);
      failedTests++;
    }
  }

  // Clear Firestore Emulator database state before tests
  await testEnv.clearFirestore();

  console.log('\n--- Running "Dirty Dozen" Vulnerability Tests ---');

  // 1. Spoofed Owner Write
  await assertDenied(
    setDoc(doc(attackerContext.firestore(), 'properties', 'prop-1'), {
      id: 'prop-1',
      name: 'Malicious Property',
      address: '123 Dark Web Lane',
      type: 'Commercial',
      createdAt: '2026-07-16T17:47:56Z',
      updatedAt: '2026-07-16T17:47:56Z',
    }),
    'Dirty Dozen #1: Spoofed Owner Write (Attacker creating a property)'
  );

  // Set up a valid property payload
  const validPropertyPayload = {
    id: 'prop-1',
    name: 'ATOTE Commercial Tower',
    address: 'Hawassa, Ethiopia',
    type: 'Commercial',
    createdAt: '2026-07-16T17:47:56Z',
    updatedAt: '2026-07-16T17:47:56Z',
  };

  await assertDenied(
    setDoc(doc(unverifiedContext.firestore(), 'properties', 'prop-1'), validPropertyPayload),
    'Dirty Dozen #1b: Unverified Owner Write (Owner email but email_verified is false)'
  );

  // Set up a valid property by the real owner first
  await assertAllowed(
    setDoc(doc(ownerContext.firestore(), 'properties', 'prop-1'), validPropertyPayload),
    'Setup: Owner creates a valid property'
  );

  // 2. Overwriting Immortals (Attempting to modify createdAt)
  await assertDenied(
    updateDoc(doc(ownerContext.firestore(), 'properties', 'prop-1'), {
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2026-07-16T18:00:00Z',
    }),
    'Dirty Dozen #2: Overwriting Immortals (Modifying createdAt after creation)'
  );

  // 3. Ghost Field Injection
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'properties', 'prop-ghost'), {
      ...validPropertyPayload,
      id: 'prop-ghost',
      isAdminProperty: true, // Shadow / Ghost field
    }),
    'Dirty Dozen #3: Ghost Field Injection (Extra unexpected fields in schema)'
  );

  // 4. ID Poisoning Attack (Specifying 1MB junk ID)
  const poisonId = 'a'.repeat(200); // Exceeds size limit
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'properties', poisonId), {
      ...validPropertyPayload,
      id: poisonId,
    }),
    'Dirty Dozen #4: ID Poisoning Attack (Document ID too long)'
  );

  // 5. Status Shortcutting (Bypassing tenant verification and force-activating an invalid lease)
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'leases', 'lease-1'), {
      id: 'lease-1',
      tenantId: 'tenant-1',
      businessName: 'Innocent Biz',
      propertyId: 'prop-1',
      propertyName: 'ATOTE Commercial Tower',
      unitId: 'unit-1',
      unitNumber: 'Suite 101',
      startDate: '2026-07-16',
      endDate: '2027-07-16',
      monthlyRent: -500, // Invalid negative rent
      status: 'Active',
      createdAt: '2026-07-16T17:47:56Z',
      updatedAt: '2026-07-16T17:47:56Z',
    }),
    'Dirty Dozen #5: Status Shortcutting (Lease creation with invalid constraints / negative rent)'
  );

  // 6. Payment Date Spoofing (e.g. formatting violations or invalid types)
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'payments', 'pay-1'), {
      id: 'pay-1',
      tenantId: 'tenant-1',
      businessName: 'Innocent Biz',
      leaseId: 'lease-1',
      propertyId: 'prop-1',
      unitId: 'unit-1',
      unitNumber: 'Suite 101',
      dueDate: '2026-07-16',
      amountDue: 5000,
      amountPaid: 5000,
      paymentStatus: 'Paid',
      createdAt: '2026-07-16T17:47:56Z',
      updatedAt: '2026-07-16T17:47:56Z',
      paymentDate: 123456789, // Type mismatch, should be string or omitted
    }),
    'Dirty Dozen #6: Payment Date Spoofing (Incorrect data types in optional fields)'
  );

  // 7. Negative Balance Hack
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'payments', 'pay-negative'), {
      id: 'pay-negative',
      tenantId: 'tenant-1',
      businessName: 'Innocent Biz',
      leaseId: 'lease-1',
      propertyId: 'prop-1',
      unitId: 'unit-1',
      unitNumber: 'Suite 101',
      dueDate: '2026-07-16',
      amountDue: 5000,
      amountPaid: -100, // Negative balance hack
      paymentStatus: 'Paid',
      createdAt: '2026-07-16T17:47:56Z',
      updatedAt: '2026-07-16T17:47:56Z',
    }),
    'Dirty Dozen #7: Negative Balance Hack (Negative amountPaid in rent payments)'
  );

  // 8. PII Blanket Scrape (Read tenant emergency contact details as attacker)
  await assertDenied(
    getDoc(doc(attackerContext.firestore(), 'tenants', 'tenant-1')),
    'Dirty Dozen #8: PII Blanket Scrape (Non-owner trying to read sensitive tenant contact card)'
  );

  // 9. Contractor Overwrite on Maintenance
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'maintenance', 'maint-1'), {
      id: 'maint-1',
      propertyId: 'prop-1',
      propertyName: 'ATOTE Commercial Tower',
      unitId: 'unit-1',
      unitNumber: 'Suite 101',
      title: 'Broken AC',
      description: 'The main air conditioner is broken.',
      priority: 'Emergency',
      status: 'New',
      createdAt: '2026-07-16T17:47:56Z',
      updatedAt: '2026-07-16T17:47:56Z',
      cost: -200, // Invalid negative cost
    }),
    'Dirty Dozen #9: Contractor Overwrite (Invalid values on maintenance creation)'
  );

  // 10. Shadow Lease Update (Bypassing validation)
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'leases', 'lease-shadow'), {
      id: 'lease-shadow',
      tenantId: 'tenant-1',
      businessName: 'Innocent Biz',
      propertyId: 'prop-1',
      propertyName: 'ATOTE Commercial Tower',
      unitId: 'unit-1',
      unitNumber: 'Suite 101',
      startDate: '2026-07-16',
      endDate: '2027-07-16',
      monthlyRent: 5000,
      status: 'Active',
      createdAt: '2026-07-16T17:47:56Z',
      updatedAt: '2026-07-16T17:47:56Z',
      mysteryField: 'Bypassing strict keys', // Violates hasAll & size <= 15
    }),
    'Dirty Dozen #10: Shadow Lease Update (Key count/ghost keys check)'
  );

  // 11. Orphaned Unit Allocation (Unit pointing to invalid property format)
  await assertDenied(
    setDoc(doc(ownerContext.firestore(), 'units', 'unit-1'), {
      id: 'unit-1',
      propertyId: 'this_is_an_extremely_long_unregistered_property_id_that_violates_max_length_constraints_for_a_valid_foreign_key_in_our_system',
      propertyName: 'ATOTE Commercial Tower',
      unitNumber: 'Suite 101',
      type: 'Commercial Office',
      sizeSqFt: 1500,
      monthlyRent: 2500,
      occupancyStatus: 'Vacant',
      createdAt: '2026-07-16T17:47:56Z',
      updatedAt: '2026-07-16T17:47:56Z',
    }),
    'Dirty Dozen #11: Orphaned Unit Allocation (PropertyId too long)'
  );

  // 12. System Log Manipulation
  await assertDenied(
    setDoc(doc(attackerContext.firestore(), 'notifications', 'notif-1'), {
      id: 'notif-1',
      title: 'Overdue Alert',
      message: 'Rent is overdue!',
      type: 'rent_overdue',
      status: 'Read',
      createdAt: '2026-07-16T17:47:56Z',
    }),
    'Dirty Dozen #12: System Log Manipulation (Attacker modifying or inserting system compliance alerts)'
  );

  console.log('\n=== TEST RUN SUMMARY ===');
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  await testEnv.cleanup();
  
  if (failedTests > 0) {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('🎉 ALL SECURITY RULES TEST CASES PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

// Check if run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('firestore.rules.test')) {
  runTests().catch(console.error);
}

export { runTests };
