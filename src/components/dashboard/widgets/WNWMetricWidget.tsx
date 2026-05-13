import { CURRENCY_SYMBOL } from '@/constants';

interface WNWMetricWidgetProps {
  displayWNW: number;
}

export default function WNWMetricWidget({ displayWNW }: WNWMetricWidgetProps) {
  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 italic">
          Düzeltilmiş Varlık (WNW)
        </div>
        <div className={`text-3xl font-black ${displayWNW < 0 ? 'text-error' : 'text-primary'}`}>
          {fmt(displayWNW)}
        </div>
      </div>
      <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-4">
        Likidite ve Borç Duyarlı Temiz Varlık
      </div>
    </div>
  );
}
