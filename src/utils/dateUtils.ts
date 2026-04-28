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
