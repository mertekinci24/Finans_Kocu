import { describe, it, expect } from 'vitest';
import { goalEngine, type SavingGoal } from '../goalService';

describe('goalEngine.projectAllGoals (Waterfall Allocation)', () => {
  const mockGoals: Partial<SavingGoal>[] = [
    {
      id: '1',
      name: 'Acil Durum Fonu',
      priority: 'high',
      targetAmount: 50000,
      currentAmount: 0,
      monthlySaving: 30000,
      status: 'active'
    },
    {
      id: '2',
      name: 'Tatil',
      priority: 'medium',
      targetAmount: 20000,
      currentAmount: 0,
      monthlySaving: 10000,
      status: 'active'
    },
    {
      id: '3',
      name: 'Yeni Telefon',
      priority: 'low',
      targetAmount: 40000,
      currentAmount: 0,
      monthlySaving: 5000,
      status: 'active'
    }
  ];

  it('Case 1: Yeterli Kapasite - Tüm hedefler talep ettikleri bütçeyi almalı', () => {
    const totalSavings = 50000; // 30k + 10k + 5k = 45k (Yeterli)
    const projections = goalEngine.projectAllGoals(mockGoals as SavingGoal[], totalSavings);

    expect(projections.find(p => p.goal.id === '1')?.currentMonthlySavingsRate).toBe(30000);
    expect(projections.find(p => p.goal.id === '2')?.currentMonthlySavingsRate).toBe(10000);
    expect(projections.find(p => p.goal.id === '3')?.currentMonthlySavingsRate).toBe(5000);
  });

  it('Case 2: Şelale/Kısmi Dağıtım - Öncelik sırasına göre bütçe tükenmeli', () => {
    const totalSavings = 37000; 
    // High (1) -> 30000 alır (Kalan: 7000)
    // Medium (2) -> 10000 ister ama 7000 alır (Kalan: 0)
    // Low (3) -> 5000 ister ama 0 alır (Kalan: 0)
    
    const projections = goalEngine.projectAllGoals(mockGoals as SavingGoal[], totalSavings);

    expect(projections.find(p => p.goal.id === '1')?.currentMonthlySavingsRate).toBe(30000);
    expect(projections.find(p => p.goal.id === '2')?.currentMonthlySavingsRate).toBe(7000);
    expect(projections.find(p => p.goal.id === '3')?.currentMonthlySavingsRate).toBe(0);
  });

  it('Case 3: Sıfır Kapasite - Hiçbir hedefe bütçe atanmamalı', () => {
    const totalSavings = 0;
    const projections = goalEngine.projectAllGoals(mockGoals as SavingGoal[], totalSavings);

    projections.forEach(p => {
      expect(p.currentMonthlySavingsRate).toBe(0);
    });
  });

  it('Sıralama Testi: Hedefler giriş sırasından bağımsız olarak önceliğe göre işlem görmeli', () => {
    const reverseGoals = [...mockGoals].reverse();
    const totalSavings = 30000;
    
    const projections = goalEngine.projectAllGoals(reverseGoals as SavingGoal[], totalSavings);
    
    // Reverse de olsa High öncelikli olan bütçenin tamamını kapmalı
    expect(projections.find(p => p.goal.id === '1')?.currentMonthlySavingsRate).toBe(30000);
    expect(projections.find(p => p.goal.id === '2')?.currentMonthlySavingsRate).toBe(0);
  });
});
