import type { Insight } from '@/services/ruleEngine';

interface CoachInsightsProps {
  recommendations?: string[];
  explanation?: string;
  title?: string;
}

const priorityLabels: Record<string, string> = {
  high: 'Acil',
  medium: 'Normal',
  low: 'Düşük',
};

export default function CoachInsights({ 
  recommendations = [], 
  explanation, 
  title = 'Koç Önerileri' 
}: CoachInsightsProps): JSX.Element {
  if (recommendations.length === 0 && !explanation) {
    return (
      <div className="bg-success-50 border border-success-200 rounded-xl p-4 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-success-700 font-medium">Mükemmel!</p>
        <p className="text-success-600 text-sm">Şu an uyaracak bir durum yok. Böyle devam et!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Unified Engine Strategic Insight ─── */}
      {(explanation || recommendations.length > 0) && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🧠</span>
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Stratejik Analiz</h4>
            </div>
            {explanation && (
              <p className="text-xs font-bold text-white leading-relaxed mb-3">
                {explanation}
              </p>
            )}
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-zinc-300 font-medium bg-white/5 p-2 rounded-lg border border-white/5 mb-1 last:mb-0">
                <span className="text-emerald-500 mt-0.5">♦</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
