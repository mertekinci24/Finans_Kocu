/**
 * Credit Card Date Utility Engine (v6.3)
 * Handles rolling logic based on Payment Day to prevent cycle shifts.
 */

export interface CCDates {
  statementDate: Date;
  paymentDate: Date;
  isTodayStatement: boolean;
  isTodayPayment: boolean;
}

/**
 * Calculates the next statement and payment dates based on month days (1-31).
 * Includes rolling logic based on Payment Day.
 */
export function calculateCCDates(statementDay: number, paymentDay: number, baseDate: Date = new Date()): CCDates {
  const today = new Date(baseDate);
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let pYear = today.getFullYear();
  let pMonth = today.getMonth();

  // 1. Önce bulunduğumuz ayın ödeme tarihini (pDate) varsay
  let pDate = new Date(pYear, pMonth, paymentDay);

  // 2. Eğer bugün, bu ayki ödeme gününü GEÇTİYSE, demek ki mevcut döngü kapandı. Sonraki ödemeye geç.
  if (todayDateOnly > pDate) {
    pMonth += 1;
    if (pMonth > 11) {
      pMonth = 0;
      pYear += 1;
    }
    pDate = new Date(pYear, pMonth, paymentDay);
  }

  // 3. Bulunan kesin ödeme tarihine (pDate) bakarak, ait olduğu Hesap Kesim (sDate) tarihini bul.
  let sMonth = pMonth;
  let sYear = pYear;

  // Eğer ödeme günü, kesim gününden sayısal olarak küçükse (Örn: Kesim 20, Ödeme 5), kesim bir önceki aydadır.
  if (paymentDay < statementDay) {
    sMonth -= 1;
    if (sMonth < 0) {
      sMonth = 11;
      sYear -= 1;
    }
  }

  const sDate = new Date(sYear, sMonth, statementDay);

  return {
    statementDate: sDate,
    paymentDate: pDate,
    isTodayStatement: false,
    isTodayPayment: false
  };
}

/**
 * Formats a Date object as DD.MM.YYYY
 */
export function formatFullDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

// ─── Local Date Safety Helpers (TIME-SSOT-1) ────────────────────────

/**
 * Returns midnight of the given date in LOCAL timezone.
 * Prevents UTC-based hour shifts that cause off-by-one day bugs.
 */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Formats a Date as YYYY-MM-DD using LOCAL year/month/day.
 * Drop-in replacement for the unsafe `toISOString().split('T')[0]`.
 */
export function formatDateInputLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string into a LOCAL Date (midnight).
 * Drop-in replacement for the unsafe `new Date(value)` which parses as UTC.
 */
export function parseDateInputLocal(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Checks whether two Date objects fall on the same LOCAL calendar day.
 */
export function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns today's date at local midnight — the canonical "now" for date inputs.
 */
export function todayLocal(): Date {
  return startOfLocalDay(new Date());
}
