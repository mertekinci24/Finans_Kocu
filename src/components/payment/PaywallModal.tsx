import { motion } from 'framer-motion';
import { PLANS, PREMIUM_FEATURE_LABELS, subscriptionGuard, type PremiumFeature } from '@/services/payment/subscriptionPlans';

interface PaywallModalProps {
  feature: PremiumFeature;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PaywallModal({ feature, isOpen, onClose, onUpgrade }: PaywallModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const featureLabel = PREMIUM_FEATURE_LABELS[feature];
  const upgradeReason = subscriptionGuard.getUpgradeReasons(feature);
  const proPlan = PLANS.pro;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 px-6 py-8 text-center text-white">
          <div className="text-4xl mb-3">⭐</div>
          <h2 className="text-xl font-bold mb-1">Pro'ya Yükselt</h2>
          <p className="text-sm text-indigo-100 opacity-90">
            {featureLabel} özelliğini kullanmak için Pro plana geçin
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Neden */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-sm text-indigo-900 leading-relaxed">{upgradeReason}</p>
          </div>

          {/* Pro özellikleri */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Pro Plan İçerikleri
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {proPlan.features.filter((f) => f.included).map((f) => (
                <div key={f.key} className="flex items-center gap-1.5 text-xs text-neutral-700">
                  <span className="text-green-500">✓</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fiyat */}
          <div className="text-center pt-2 border-t border-neutral-100">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-neutral-900">₺{proPlan.price}</span>
              <span className="text-sm text-neutral-500">/ay</span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Yıllık: ₺{proPlan.priceAnnual}/yıl (2 ay hediye)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors"
          >
            Belki Sonra
          </button>
          <button
            onClick={onUpgrade}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200"
          >
            Pro'ya Geç →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
