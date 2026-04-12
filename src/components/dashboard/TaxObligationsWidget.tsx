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
    if (status === 'paid') return 'bg-green-50 border-green-200';
    if (status === 'overdue') return 'bg-red-50 border-red-200';
    if (daysUntil <= 3) return 'bg-orange-50 border-orange-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getStatusBadgeColor = (status: string, daysUntil: number) => {
    if (status === 'paid') return 'bg-green-100 text-green-800';
    if (status === 'overdue') return 'bg-red-100 text-red-800';
    if (daysUntil <= 3) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = (status: string, daysUntil: number) => {
    if (status === 'paid') return '✓ Ödendi';
    if (status === 'overdue') return '⚠ Gecikmiş';
    if (daysUntil <= 3) return `🔴 ${daysUntil} gün kaldı`;
    return `${daysUntil} gün`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-neutral-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-neutral-900">Bu Ayki Yükümlülükler</h2>
        <div className="text-sm font-medium text-neutral-600">
          {upcomingThisMonth.length} görev
        </div>
      </div>

      {upcomingThisMonth.length === 0 ? (
        <p className="text-neutral-500 text-center py-8">Bu ay yükümlülük bulunmamaktadır.</p>
      ) : (
        <div className="space-y-3">
          {overdueCost > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-red-900">
                ⚠️ Gecikmiş Ödemeler: ₺{overdueCost.toLocaleString('tr-TR')}
              </p>
            </motion.div>
          )}

          {pendingCost > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-blue-900">
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
                      <p className="font-medium text-neutral-900">{ob.description}</p>
                      <p className="text-xs text-neutral-600">
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
                    <p className="text-lg font-bold text-neutral-900">
                      ₺{ob.estimatedAmount.toLocaleString('tr-TR')}
                    </p>
                    {ob.paymentStatus === 'pending' && onMarkPaid && (
                      <button
                        onClick={() => onMarkPaid(ob.id)}
                        className="text-xs px-2 py-1 bg-neutral-200 hover:bg-neutral-300 rounded transition-colors"
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
