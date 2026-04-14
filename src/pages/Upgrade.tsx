import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PLANS, type PlanType } from '@/services/payment/subscriptionPlans';
import { useSubscription } from '@/hooks/useSubscription';
import { ROUTES, CURRENCY_SYMBOL } from '@/constants';

export default function UpgradePage(): JSX.Element {
  const navigate = useNavigate();
  const { planType, isPro, startCheckout, cancelSubscription, subscription } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      const url = await startCheckout(billingPeriod);
      if (url) {
        window.location.href = url;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Aboneliğinizi iptal etmek istediğinize emin misiniz?')) return;
    setIsProcessing(true);
    try {
      await cancelSubscription();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900">💎 Planını Seç</h1>
        <p className="text-neutral-600 mt-2 text-sm">
          FinansKoçu ile finansal geleceğini şekillendir
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
            billingPeriod === 'monthly'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Aylık
        </button>
        <button
          onClick={() => setBillingPeriod('annual')}
          className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
            billingPeriod === 'annual'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Yıllık
          <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
            2 ay hediye
          </span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <PlanCard
          plan={PLANS.free}
          billingPeriod={billingPeriod}
          isCurrent={planType === 'free'}
          onSelect={() => navigate(ROUTES.DASHBOARD)}
          buttonLabel={planType === 'free' ? 'Mevcut Plan' : 'Ücretsiz Kullan'}
          disabled={planType === 'free'}
        />

        {/* Pro Plan */}
        <PlanCard
          plan={PLANS.pro}
          billingPeriod={billingPeriod}
          isCurrent={isPro}
          onSelect={isPro ? handleCancel : handleUpgrade}
          buttonLabel={isPro ? 'Aboneliği İptal Et' : isProcessing ? 'İşleniyor...' : 'Pro\'ya Geç'}
          disabled={isProcessing}
          highlighted
        />
      </div>

      {/* Current Status */}
      {subscription && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
          <p className="text-sm text-neutral-600">
            Mevcut plan: <strong className="text-indigo-600">{PLANS[planType].name}</strong>
            {subscription.currentPeriodEnd && (
              <span className="text-neutral-400 ml-2">
                (dönem sonu: {new Date(subscription.currentPeriodEnd).toLocaleDateString('tr-TR')})
              </span>
            )}
          </p>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          ← Kontrol Paneline Dön
        </button>
      </div>
    </div>
  );
}

// ─── Plan Kartı ─────────────────────────────────────────────────────
function PlanCard({
  plan,
  billingPeriod,
  isCurrent,
  onSelect,
  buttonLabel,
  disabled,
  highlighted,
}: {
  plan: typeof PLANS.free;
  billingPeriod: 'monthly' | 'annual';
  isCurrent: boolean;
  onSelect: () => void;
  buttonLabel: string;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  const price = billingPeriod === 'monthly' ? plan.price : Math.round(plan.priceAnnual / 12);
  const totalPrice = billingPeriod === 'annual' ? plan.priceAnnual : plan.price;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`relative rounded-2xl border-2 p-6 transition-shadow ${
        highlighted
          ? 'border-indigo-400 shadow-lg shadow-indigo-100 bg-white'
          : 'border-neutral-200 bg-white hover:shadow-md'
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
            En Popüler
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 mt-2">
        <span className="text-2xl">{plan.badge}</span>
        <h3 className="text-lg font-bold text-neutral-900 mt-1">{plan.name}</h3>
        <div className="mt-3">
          {plan.price === 0 ? (
            <div className="text-3xl font-bold text-neutral-900">Ücretsiz</div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-neutral-900">
                  {CURRENCY_SYMBOL}{price}
                </span>
                <span className="text-sm text-neutral-500">/ay</span>
              </div>
              {billingPeriod === 'annual' && (
                <p className="text-xs text-neutral-400 mt-1">
                  Toplam: {CURRENCY_SYMBOL}{totalPrice}/yıl
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2 mb-6">
        {plan.features.map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-sm">
            <span className={f.included ? 'text-green-500' : 'text-neutral-300'}>
              {f.included ? '✓' : '✕'}
            </span>
            <span className={f.included ? 'text-neutral-700' : 'text-neutral-400'}>
              {f.label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onSelect}
        disabled={disabled}
        className={`w-full py-2.5 text-sm font-medium rounded-xl transition-all ${
          highlighted && !isCurrent
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200'
            : isCurrent
              ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
              : 'bg-neutral-900 text-white hover:bg-neutral-800'
        } disabled:opacity-50`}
      >
        {isCurrent && !highlighted ? '✓ Mevcut Plan' : buttonLabel}
      </button>
    </motion.div>
  );
}
