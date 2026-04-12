import { useState, useMemo } from 'react';

interface InflationData {
  monthlyRate: number; // TÜFE aylık değişim %
  yearlyRate: number; // TÜFE yıllık değişim %
  lastUpdated: Date;
}

const DEFAULT_INFLATION: InflationData = {
  monthlyRate: 2.5, // Varsayılan aylık %2.5
  yearlyRate: 32,   // Varsayılan yıllık %32
  lastUpdated: new Date(),
};

export function useInflationAdjustment() {
  const [inflationData, setInflationData] = useState<InflationData>(DEFAULT_INFLATION);
  const [useRealValue, setUseRealValue] = useState(false);

  const adjustToRealValue = useMemo(
    () => (nominalAmount: number, months: number = 1) => {
      if (!useRealValue) return nominalAmount;

      const monthlyRate = inflationData.monthlyRate / 100;
      const inflationFactor = Math.pow(1 + monthlyRate, months);
      return nominalAmount / inflationFactor;
    },
    [useRealValue, inflationData.monthlyRate]
  );

  const calculateRealChange = useMemo(
    () => (currentNominal: number, previousNominal: number) => {
      if (!useRealValue) {
        return ((currentNominal - previousNominal) / previousNominal) * 100;
      }

      const currentReal = adjustToRealValue(currentNominal, 1);
      const previousReal = adjustToRealValue(previousNominal, 2);

      return previousReal > 0 ? ((currentReal - previousReal) / previousReal) * 100 : 0;
    },
    [useRealValue, adjustToRealValue]
  );

  const getInflationContext = useMemo(
    () => (amount: number) => {
      const real = adjustToRealValue(amount);
      const loss = amount - real;
      return {
        nominal: amount,
        real,
        inflationLoss: loss,
        lossPercentage: (loss / amount) * 100,
      };
    },
    [adjustToRealValue]
  );

  return {
    inflationData,
    setInflationData,
    useRealValue,
    setUseRealValue,
    adjustToRealValue,
    calculateRealChange,
    getInflationContext,
  };
}
