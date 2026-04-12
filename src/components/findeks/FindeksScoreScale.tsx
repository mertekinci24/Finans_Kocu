import { motion } from 'framer-motion';

interface FindeksScoreScaleProps {
  score: number;
  riskLevel: 'kritik' | 'gelişim_açık' | 'dengeli' | 'güvenli' | 'prestijli';
}

const scaleRanges = [
  { label: 'Kritik', color: 'bg-red-600', range: '1–969', emoji: '🔴' },
  { label: 'Gelişime Açık', color: 'bg-orange-600', range: '970–1149', emoji: '🟠' },
  { label: 'Dengeli', color: 'bg-yellow-600', range: '1150–1469', emoji: '🟡' },
  { label: 'Güvenli', color: 'bg-blue-600', range: '1470–1719', emoji: '🔵' },
  { label: 'Prestijli', color: 'bg-green-600', range: '1720–1900', emoji: '🟢' },
];

export default function FindeksScoreScale({ score, riskLevel }: FindeksScoreScaleProps) {
  const percentage = (score / 1900) * 100;

  const getRiskDescription = (level: string): string => {
    const descriptions: Record<string, string> = {
      kritik:
        'Kredi profiliniz riskli bölgededir. Acil adım atmanız önerilir. Limit kullanımını düşürün, gecikmeleri temizleyin.',
      gelişim_açık:
        'Kredi profilinizde gelişim alanları vardır. Sistematik adımlarla skorunuzu yükseltebilirsiniz.',
      dengeli:
        'Kredi profiliniz dengeli durumdadır. Devam eden disiplin ile iyileştirme sağlayabilirsiniz.',
      güvenli:
        'Kredi profiliniz güvenli bir seviyededir. Limit kullanımını minimum tutarak veya borç ödeyerek daha yüksekte olabilirsiniz.',
      prestijli: 'Kredi profiliniz mükemmel durumdadır. Finansal hedeflerinize kolayca ulaşabilirsiniz.',
    };
    return descriptions[level] || '';
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center justify-center"
        >
          <div className="text-5xl font-bold text-blue-600">{score}</div>
          <div className="ml-2 text-neutral-600">/1900</div>
        </motion.div>
        <p className="text-neutral-600">Findeks Kredi Notu</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-xs font-medium text-neutral-600 mb-2">
          <span>1</span>
          <span>1900</span>
        </div>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3 }} className="h-12 bg-gradient-to-r from-red-600 via-orange-600 via-yellow-600 via-blue-600 to-green-600 rounded-lg relative overflow-hidden">
          <motion.div
            initial={{ left: -4 }}
            animate={{ left: `${percentage - 2}%` }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-16 bg-white shadow-lg rounded"
          />
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm opacity-90">
            ⬆ Şundasınız
          </div>
        </motion.div>

        <div className="grid grid-cols-5 gap-2">
          {scaleRanges.map((range, idx) => {
            const labelLower = range.label.toLowerCase().replace(/ş/g, 's').replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ /g, '_');
            const riskLower = riskLevel.replace(/ /g, '_');
            const isActive = riskLower === labelLower;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className={`p-3 rounded-lg text-center border-2 transition-all ${
                  isActive
                    ? `${range.color} text-white border-transparent scale-105`
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="text-2xl mb-1">{range.emoji}</div>
                <p className="text-xs font-medium">{range.label}</p>
                <p className="text-xs opacity-75 mt-1">{range.range}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-blue-900"
      >
        <p className="text-sm leading-relaxed">{getRiskDescription(riskLevel)}</p>
      </motion.div>
    </div>
  );
}
