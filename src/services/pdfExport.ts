import type { Account, Transaction, Debt, Installment } from '@/types';
import type { DetailedScore } from './scoringEngine';
import { CURRENCY_SYMBOL } from '@/constants';

interface ReportData {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  installments: Installment[];
  score: DetailedScore | null;
  month: Date;
  userEmail?: string;
}

function fmt(n: number): string {
  return `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#0284c7';
  if (score >= 40) return '#ca8a04';
  return '#dc2626';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Mükemmel';
  if (score >= 60) return 'İyi';
  if (score >= 40) return 'Orta';
  return 'Kritik';
}

function categoryBreakdown(transactions: Transaction[]): { name: string; amount: number; pct: number }[] {
  const map: Record<string, number> = {};
  const expenses = transactions.filter((t) => t.type === 'gider');
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  expenses.forEach((t) => {
    map[t.category] = (map[t.category] ?? 0) + t.amount;
  });
  return Object.entries(map)
    .map(([name, amount]) => ({ name, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
}

export function generateMonthlyReport(data: ReportData): void {
  const { accounts, transactions, debts, installments, score, month, userEmail } = data;

  const monthLabel = month.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const now = new Date().toLocaleDateString('tr-TR', { dateStyle: 'long' });

  const income    = transactions.filter((t) => t.type === 'gelir').reduce((s, t) => s + t.amount, 0);
  const expenses  = transactions.filter((t) => t.type === 'gider').reduce((s, t) => s + t.amount, 0);
  const net       = income - expenses;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalDebt = debts.filter((d) => d.status === 'active').reduce((s, d) => s + d.remainingAmount, 0);
  const monthlyInstallment = installments.filter((i) => i.status === 'active').reduce((s, i) => s + i.monthlyPayment, 0);

  const cats = categoryBreakdown(transactions);
  const recentTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>FinansKoçu — ${monthLabel} Raporu</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #1f2937; font-size: 12px; line-height: 1.5; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 800; color: #0284c7; }
    .subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: #6b7280; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .score-row { display: flex; align-items: center; gap: 24px; }
    .score-circle { width: 72px; height: 72px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid ${score ? scoreColor(score.score.overallScore) : '#9ca3af'}; }
    .score-num { font-size: 22px; font-weight: 800; color: ${score ? scoreColor(score.score.overallScore) : '#9ca3af'}; }
    .score-label { font-size: 10px; color: ${score ? scoreColor(score.score.overallScore) : '#9ca3af'}; font-weight: 600; }
    .score-explanation { font-size: 11px; color: #6b7280; max-width: 500px; line-height: 1.6; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .kpi-label { font-size: 10px; color: #6b7280; font-weight: 500; margin-bottom: 4px; }
    .kpi-value { font-size: 15px; font-weight: 700; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .blue { color: #0284c7; }
    .orange { color: #ca8a04; }
    .cat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .cat-bar-bg { flex: 1; height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
    .cat-bar { height: 100%; background: #0284c7; border-radius: 3px; }
    .cat-name { width: 90px; font-size: 11px; color: #374151; }
    .cat-amount { width: 80px; text-align: right; font-size: 11px; font-weight: 600; color: #374151; }
    .cat-pct { width: 36px; text-align: right; font-size: 10px; color: #9ca3af; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    td { padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #f3f4f6; }
    .footer { text-align: center; font-size: 10px; color: #9ca3af; padding-top: 16px; border-top: 1px solid #e5e7eb; margin-top: 24px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">FinansKoçu</div>
        <div class="subtitle">${monthLabel} Aylık Finans Raporu</div>
      </div>
      <div class="meta">
        ${userEmail ? `<div>${userEmail}</div>` : ''}
        <div>Oluşturulma: ${now}</div>
      </div>
    </div>

    ${score ? `
    <div class="section">
      <div class="section-title">Finansal Sağlık Skoru</div>
      <div class="score-row">
        <div class="score-circle">
          <span class="score-num">${score.score.overallScore}</span>
          <span class="score-label">${scoreLabel(score.score.overallScore)}</span>
        </div>
        <div class="score-explanation">${score.explanation}</div>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-title">Aylık Özet — ${monthLabel}</div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Toplam Gelir</div>
          <div class="kpi-value green">${fmt(income)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Toplam Gider</div>
          <div class="kpi-value red">${fmt(expenses)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net</div>
          <div class="kpi-value ${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}${fmt(net)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Toplam Bakiye</div>
          <div class="kpi-value blue">${fmt(totalBalance)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Taksit Yükü</div>
          <div class="kpi-value orange">${fmt(monthlyInstallment)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Toplam Borç</div>
          <div class="kpi-value red">${fmt(totalDebt)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Hesap Sayısı</div>
          <div class="kpi-value">${accounts.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">İşlem Sayısı</div>
          <div class="kpi-value">${transactions.length}</div>
        </div>
      </div>
    </div>

    ${cats.length > 0 ? `
    <div class="section">
      <div class="section-title">Harcama Kategorileri</div>
      ${cats.map((c) => `
        <div class="cat-row">
          <div class="cat-name">${c.name}</div>
          <div class="cat-bar-bg"><div class="cat-bar" style="width:${c.pct.toFixed(0)}%"></div></div>
          <div class="cat-amount">${fmt(c.amount)}</div>
          <div class="cat-pct">%${c.pct.toFixed(0)}</div>
        </div>
      `).join('')}
    </div>` : ''}

    ${recentTx.length > 0 ? `
    <div class="section">
      <div class="section-title">Son İşlemler</div>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Açıklama</th>
            <th>Kategori</th>
            <th style="text-align:right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          ${recentTx.map((tx) => `
            <tr>
              <td>${new Date(tx.date).toLocaleDateString('tr-TR')}</td>
              <td>${tx.description}</td>
              <td style="color:#6b7280">${tx.category}</td>
              <td style="text-align:right; font-weight:600; color:${tx.type === 'gelir' ? '#16a34a' : '#dc2626'}">
                ${tx.type === 'gelir' ? '+' : '-'}${fmt(tx.amount)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="footer">
      Bu rapor FinansKoçu tarafından otomatik olarak oluşturulmuştur. Kişisel finans danışmanlığı yerine geçmez.
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
