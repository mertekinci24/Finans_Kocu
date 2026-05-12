import { ScoringEngine } from './src/services/scoringEngine';
import { cashFlowEngine } from './src/services/cashFlowEngine';
const engine = new ScoringEngine();

// Mock forecast to force Cash Warning
const originalForecast = cashFlowEngine.forecast;
cashFlowEngine.forecast = (...args) => {
  const result = originalForecast.apply(cashFlowEngine, args);
  return { ...result, minBalance: -5000 }; // Force minBalance < 0
};

// Fixture 6C - Cash warning with high score
console.log("\n--- Fixture 6C: Cash warning with high score ---");
const res6c = engine.calculate({
  accounts: [{ id: '1', name: 'Garanti', balance: 100000, type: 'vadesiz', accountType: 'vadesiz' } as any],
  transactions: [],
  debts: [],
  installments: [{ id: '2', status: 'active', principal: 10000, monthlyPayment: 5000, firstPaymentDate: new Date() } as any],
  recurringFlows: [{ id: '3', type: 'gelir', amount: 40000, isActive: true } as any],
});
console.log("Score:", res6c.assessment.overallScore);
console.log("Severity:", res6c.assessment.severity);
console.log("Badge:", res6c.assessment.badgeLabel);
console.log("Status:", res6c.assessment.statusLabel);
console.log("Flags:", res6c.assessment.flags);

// Restore mock
cashFlowEngine.forecast = originalForecast;
