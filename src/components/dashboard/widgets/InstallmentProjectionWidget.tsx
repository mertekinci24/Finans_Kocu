interface InstallmentProjection {
  month: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  isRisk: boolean;
}

interface InstallmentProjectionWidgetProps {
  projection: InstallmentProjection[];
  averageIncome: number;
  onOffsetChange: (delta: number) => void;
}

export default function InstallmentProjectionWidget({
  projection,
  averageIncome,
  onOffsetChange,
}: InstallmentProjectionWidgetProps) {
  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest italic tracking-tighter">
            12 Aylık Taksit Projeksiyonu
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-4 h-0.5 bg-emerald-400/50 rounded-full border-t border-dashed" />
            <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">
              Aylık Gelir Eşiği
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border dark:border-zinc-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOffsetChange(-1);
              }}
              className="px-2 py-0.5 text-[10px] font-bold text-neutral-500 hover:text-primary-600 border-r dark:border-zinc-700 transition-colors"
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOffsetChange(1);
              }}
              className="px-2 py-0.5 text-[10px] font-bold text-neutral-500 hover:text-primary-600 transition-colors"
            >
              ›
            </button>
          </div>
          <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Öngörü</span>
        </div>
      </div>
      <div className="flex items-end justify-between h-32 gap-1.5 px-1 pb-2">
        {projection.map((p, i) => {
          const chartMax = Math.max(...projection.map((x) => x.totalAmount), averageIncome, 1);
          const paidH = (p.paidAmount / chartMax) * 100;
          const pendingH = (p.pendingAmount / chartMax) * 100;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
            >
              {p.totalAmount > 0 && (
                <span className="text-[7px] font-bold text-zinc-400 tabular-nums transition-colors group-hover:text-primary-500">
                  ₺{(p.totalAmount / 1000).toFixed(0)}K
                </span>
              )}
              <div className="w-full flex flex-col-reverse h-[70%] justify-start items-end relative">
                {averageIncome > 0 && (
                  <div
                    className="absolute left-0 right-0 border-t border-emerald-400/30 border-dashed z-20 pointer-events-none"
                    style={{ bottom: `${(averageIncome / chartMax) * 100}%` }}
                  />
                )}
                {p.paidAmount > 0 && (
                  <div
                    className="w-full bg-emerald-500/30 rounded-t-sm transition-all"
                    style={{ height: `${paidH}%` }}
                  />
                )}
                {p.pendingAmount > 0 && (
                  <div
                    className={`w-full ${
                      p.isRisk
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                        : 'bg-primary-500/80'
                    } rounded-t-sm transition-all`}
                    style={{ height: `${pendingH}%` }}
                  />
                )}
              </div>
              <span className="text-[8px] font-bold text-neutral-400 uppercase mt-1">{p.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
