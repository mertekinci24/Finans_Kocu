import { getBankMeta, getAccountTypeLabel } from '@/utils/bankLogos';
import type { Account } from '@/types';

interface BankLogoProps {
  account: Account;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

export default function BankLogo({ account, size = 'md' }: BankLogoProps): JSX.Element {
  const meta = getBankMeta(account.bankName);
  const label = account.type === 'nakit' ? 'NAK' : meta.shortName;
  const bgColor = account.type === 'nakit' ? '#22c55e' : meta.color;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeMap[size]} rounded-xl flex items-center justify-center font-bold shadow-sm flex-shrink-0`}
        style={{ backgroundColor: bgColor, color: meta.textColor }}
        title={account.bankName || getAccountTypeLabel(account.type)}
      >
        {label}
      </div>
    </div>
  );
}
