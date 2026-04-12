import { useState } from 'react';
import { motion } from 'framer-motion';
import { BaskurProfile, BaskurProfileType } from '@/types';
import { calculateBaskurPremium, getTierDescription } from '@/services/tax/baskurCalculator';

interface BaskurConfigProps {
  profile?: BaskurProfile;
  onSave: (profile: Omit<BaskurProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

const PROFILE_TYPES: { value: BaskurProfileType; label: string }[] = [
  { value: 'free_professional', label: 'Serbest Profesyonel (Avukat, Doktor, Mühendis)' },
  { value: 'self_employed', label: 'Serbest Çalışan / Esnaf' },
  { value: 'artisan', label: 'Zanaatçı / Sanatçı' },
  { value: 'farmer', label: 'Çiftçi' },
  { value: 'employee_with_private', label: 'Çalışan + Özel İşletme Sahibi' },
];

export default function BaskurConfig({ profile, onSave }: BaskurConfigProps) {
  const [grossIncome, setGrossIncome] = useState(profile?.grossIncomeMonthly || 15000);
  const [profileType, setProfileType] = useState<BaskurProfileType>(profile?.profileType || 'self_employed');
  const [isActive, setIsActive] = useState(profile?.isActive !== false);

  const calculation = calculateBaskurPremium(grossIncome, profileType);

  const handleSave = () => {
    onSave({
      profileType,
      grossIncomeMonthly: grossIncome,
      baskurTier: calculation.tier,
      monthlyPremium: calculation.monthlyPremium,
      isActive,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold mb-4">Bağkur / SGK Ayarları</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-2">Statü Seçimi</label>
          <select
            value={profileType}
            onChange={(e) => setProfileType(e.target.value as BaskurProfileType)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROFILE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-2">
            Aylık Brüt Gelir (₺)
          </label>
          <input
            type="number"
            value={grossIncome}
            onChange={(e) => setGrossIncome(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="1000"
          />
          <p className="text-xs text-neutral-600 mt-1">
            Vergi beyanınıza esas olan brüt aylık gelir
          </p>
        </div>

        <motion.div
          animate={{ backgroundColor: '#f0f9ff' }}
          className="border border-blue-200 rounded-lg p-4"
        >
          <h4 className="font-bold text-blue-900 mb-3">Hesaplanmış Bağkur Primleri</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-blue-700">Katılım Basamağı</p>
              <p className="text-lg font-bold text-blue-900">{getTierDescription(calculation.tier)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Katkı Oranı</p>
              <p className="text-lg font-bold text-blue-900">%{calculation.contributionRate.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Aylık Prim</p>
              <p className="text-lg font-bold text-blue-900">
                ₺{calculation.monthlyPremium.toLocaleString('tr-TR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Yıllık Prim</p>
              <p className="text-lg font-bold text-blue-900">
                ₺{calculation.yearlyPremium.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          <p className="text-xs text-blue-700 mt-3">
            Bu prim, bütçenize otomatik aylık gider olarak eklenecektir.
          </p>
        </motion.div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="is-active" className="text-sm text-neutral-900">
            Bağkur prim takibini etkinleştir
          </label>
        </div>

        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Ayarları Kaydet
        </button>
      </div>
    </motion.div>
  );
}
