import { CURRENCY_SYMBOL } from '@/constants';
import { Account } from '@/types';
import { AccountBalanceSkeleton } from '../WidgetSkeletons';

interface AccountBalanceWidgetProps {
  accounts: Account[];
  isLoading: boolean;
}

export default function AccountBalanceWidget({
  accounts,
  isLoading,
}: AccountBalanceWidgetProps): JSX.Element {
  if (isLoading) {
    return <AccountBalanceSkeleton />;
  }

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;

  if (accounts.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-neutral-600">Hesap bulunmuyor</p>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-xs text-neutral-600">Toplam Bakiye</p>
        <p className="text-lg font-bold text-blue-900">{fmt(totalBalance)}</p>
      </div>

      <div className="space-y-2">
        {accounts.map((acc) => (
          <div key={acc.id} className="flex justify-between items-center p-2 border-b border-neutral-100 last:border-0">
            <div>
              <p className="text-xs font-medium text-neutral-900">{acc.name}</p>
              <p className="text-xs text-neutral-600">{acc.type}</p>
            </div>
            <p className="text-sm font-bold text-neutral-900">{fmt(acc.balance)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
