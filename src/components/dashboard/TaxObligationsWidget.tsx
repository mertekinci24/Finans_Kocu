import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TaxObligation } from '@/types';

interface TaxObligationsWidgetProps {
  obligations: TaxObligation[];
  onMarkPaid?: (id: string) => void;
}

export default function TaxObligationsWidget({ obligations, onMarkPaid }: TaxObligationsWidgetProps) {
  const [upcomingThisMonth, setUpcomingThisMonth] = useState<TaxObligation[]>([]);
  const today = new Date();

  useEffect(() => {
    const thisMonth = obligations.filter((ob) => {
      const obDate = new Date(ob.dueDate);
      return obDate.getMonth() === today.getMonth() && obDate.getFullYear() === today.getFullYear();
    });

    setUpcomingThisMonth(thisMonth.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  }, [obligations]);

  const overdueCost = upcomingThisMonth
    .filter((ob) => ob.paymentStatus === 'overdue')
    .reduce((sum, ob) => sum + ob.estimatedAmount, 0);

  const pendingCost = upcomingThisMonth
    .filter((ob) => ob.paymentStatus === 'pending')
    .reduce((sum, ob) => sum + ob.estimatedAmount, 0);

  const getDaysUntil = (dueDate: Date | string) => {
    const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string, daysUntil: number) => {
    if (status === 'paid') return 'bg-score-normal-bg border-score-normal/20';
    if (status === 'overdue') return 'bg-score-crisis-bg border-score-crisis/20';
    if (daysUntil <= 3) return 'bg-score-warning-bg border-score-warning/20';
    return 'bg-muted/30 border-border';
  };

  const getStatusBadgeColor = (status: string, daysUntil: number) => {
    if (status === 'paid') return 'bg-score-normal text-score-normal-bg';
    if (status === 'overdue') return 'bg-score-crisis text-score-crisis-bg';
    if (daysUntil <= 3) return 'bg-score-warning text-score-warning-bg';
    return 'bg-muted text-muted-foreground';
  };

  const getStatusText = (status: string, daysUntil: number) => {
    if (status === 'paid') return '✓ Ödendi';
    if (status === 'overdue') return '⚠ Gecikmiş';
    if (daysUntil <= 3) return `🔴 ${daysUntil} gün kaldı`;
    return `${daysUntil} gün`;
  };

  return (
    <div className="bg-card rounded-lg shadow-md p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Bu Ayki Yükümlülükler</h2>
        <div className="text-sm font-medium text-muted-foreground">
          {upcomingThisMonth.length} görev
        </div>
      </div>

      {upcomingThisMonth.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Bu ay yükümlülük bulunmamaktadır.</p>
      ) : (
        <div className="space-y-3">
          {overdueCost > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-score-crisis-bg border border-score-crisis/20 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-score-crisis">
                ⚠️ Gecikmiş Ödemeler: ₺{overdueCost.toLocaleString('tr-TR')}
              </p>
            </motion.div>
          )}

          {pendingCost > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/10 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-primary">
                💰 Bekleyen Ödemeler: ₺{pendingCost.toLocaleString('tr-TR')}
              </p>
            </motion.div>
          )}

          <div className="space-y-2">
            {upcomingThisMonth.map((ob, idx) => {
              const daysUntil = getDaysUntil(ob.dueDate);
              const statusColor = getStatusColor(ob.paymentStatus, daysUntil);
              const badgeColor = getStatusBadgeColor(ob.paymentStatus, daysUntil);

              return (
                <motion.div
                  key={ob.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`border rounded-lg p-3 ${statusColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{ob.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Vade: {new Date(ob.dueDate).toLocaleDateString('tr-TR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className={`text-sm font-semibold px-2 py-1 rounded ${badgeColor}`}>
                      {getStatusText(ob.paymentStatus, daysUntil)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-foreground">
                      ₺{ob.estimatedAmount.toLocaleString('tr-TR')}
                    </p>
                    {ob.paymentStatus === 'pending' && onMarkPaid && (
                      <button
                        onClick={() => onMarkPaid(ob.id)}
                        className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded transition-colors border border-border"
                      >
                        Ödendi
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
