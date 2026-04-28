import { calculateCCDates, formatFullDate } from './src/utils/dateUtils';

function test() {
  console.log('--- FinansKoçu Date Engine Test ---');
  
  // Case 1: Statement 15, Payment 25 (Normal day)
  // Assuming today is around April 19, 2026.
  // 15.04.2026 was Wednesday. 25.04.2026 will be Saturday.
  // Expect Payment to roll to 27.04.2026 (Monday).
  
  const dates1 = calculateCCDates(15, 25);
  console.log('Case 1 (Sat -> Mon Check):');
  console.log('Statement:', formatFullDate(dates1.statementDate));
  console.log('Payment (Unadjusted 25.04):', formatFullDate(dates1.paymentDate));
  console.log('Payment Day of week:', dates1.paymentDate.getDay()); // Should be 1 (Monday)
  
  // Case 2: Statement 20, Payment 30 (Next Month Roll)
  // If today is 21st, and statement is 20th.
  // Should move to next month.
  const dates2 = calculateCCDates(10, 20); // Today is likely 19th in system time. 19 > 10.
  console.log('\nCase 2 (Rolling Logic Check):');
  console.log('Target Statement (expected next month):', formatFullDate(dates2.statementDate));
  
  console.log('\n--- Test End ---');
}

test();
