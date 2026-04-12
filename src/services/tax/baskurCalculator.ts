import { BaskurTier, BaskurProfileType } from '@/types';

export interface BaskurCalculationResult {
  grossIncome: number;
  tier: BaskurTier;
  monthlyPremium: number;
  yearlyPremium: number;
  contributionRate: number;
  description: string;
}

const BASKUR_TIERS: Record<BaskurTier, { minIncome: number; maxIncome: number; rate: number }> = {
  tier1: { minIncome: 0, maxIncome: 7500, rate: 0.1205 },
  tier2: { minIncome: 7501, maxIncome: 15000, rate: 0.1265 },
  tier3: { minIncome: 15001, maxIncome: 22500, rate: 0.1325 },
  tier4: { minIncome: 22501, maxIncome: 30000, rate: 0.1385 },
  tier5: { minIncome: 30001, maxIncome: 37500, rate: 0.1445 },
  tier6: { minIncome: 37501, maxIncome: Infinity, rate: 0.1505 },
};

const PROFILE_DESCRIPTIONS: Record<BaskurProfileType, string> = {
  free_professional: 'Serbest Profesyonel (Avukat, Doktor, Mühendis)',
  self_employed: 'Serbest Çalışan / Esnaf',
  artisan: 'Zanaatçı / Sanatçı',
  farmer: 'Çiftçi',
  employee_with_private: 'Çalışan + Özel İşletme Sahibi',
};

export function calculateBaskurPremium(
  grossMonthlyIncome: number,
  profileType: BaskurProfileType
): BaskurCalculationResult {
  const tier = determineTier(grossMonthlyIncome);
  const tierConfig = BASKUR_TIERS[tier];

  const monthlyPremium = grossMonthlyIncome * tierConfig.rate;
  const yearlyPremium = monthlyPremium * 12;

  return {
    grossIncome: grossMonthlyIncome,
    tier,
    monthlyPremium: Math.round(monthlyPremium * 100) / 100,
    yearlyPremium: Math.round(yearlyPremium * 100) / 100,
    contributionRate: tierConfig.rate * 100,
    description: PROFILE_DESCRIPTIONS[profileType],
  };
}

export function determineTier(grossMonthlyIncome: number): BaskurTier {
  for (const [tier, config] of Object.entries(BASKUR_TIERS)) {
    if (grossMonthlyIncome >= config.minIncome && grossMonthlyIncome <= config.maxIncome) {
      return tier as BaskurTier;
    }
  }
  return 'tier6';
}

export function getTierDescription(tier: BaskurTier): string {
  return `Tier ${tier.slice(-1)} - ${(BASKUR_TIERS[tier].rate * 100).toFixed(2)}% katkı oranı`;
}

export function getMonthlyObligationDates(): Array<{ obligation: string; day: number; description: string }> {
  return [
    { obligation: 'kdv', day: 28, description: 'KDV Bildirim Formu (Form 90)' },
    { obligation: 'muhtasar', day: 26, description: 'Muhtasar Beyannamesi' },
    { obligation: 'geçici_vergi', day: 25, description: 'Geçici Vergi Kesintisi' },
    { obligation: 'sgk_bağkur', day: 20, description: 'SGK/Bağkur Prim Ödemesi' },
  ];
}

export function generateAnnualTaxCalendar(grossMonthlyIncome: number): Array<{
  month: number;
  obligations: string[];
  estimatedCost: number;
}> {
  const baskurResult = calculateBaskurPremium(grossMonthlyIncome, 'self_employed');
  const estimatedMonthlyTax = grossMonthlyIncome * 0.15;

  const calendar = [];

  for (let month = 1; month <= 12; month++) {
    const obligations = [];
    let estimatedCost = baskurResult.monthlyPremium;

    obligations.push('sgk_bağkur');

    if (month % 3 === 0) {
      obligations.push('kdv');
      obligations.push('muhtasar');
      estimatedCost += estimatedMonthlyTax * 3;
    }

    calendar.push({
      month,
      obligations,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    });
  }

  return calendar;
}
