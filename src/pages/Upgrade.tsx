import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PLANS, type PlanType } from '@/services/payment/subscriptionPlans';
import { useSubscription } from '@/hooks/useSubscription';
import { ROUTES, CURRENCY_SYMBOL } from '@/constants';

export default function UpgradePage(): JSX.Element {
  const navigate = useNavigate();
  const { planType, isPro, startCheckout, cancelSubscription, subscription } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => setToast(prev => prev?.id === id ? null : prev), 4000);
  };

  const handleUpgrade = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await startCheckout(billingPeriod);
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      showToast(result.error, 'error');
    } catch (err) {
      showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
      console.error('[UPGRADE_ERROR]', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Aboneliğinizi iptal etmek istediğinize emin misiniz?')) return;
    setIsProcessing(true);
    try {
      await cancelSubscription();
      showToast('Aboneliğiniz başarıyla iptal edildi.', 'success');
    } catch (err) {
      showToast('İptal işlemi sırasında bir hata oluştu.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-500/90 border-emerald-400 text-white'
                : 'bg-rose-500/90 border-rose-400 text-white'
            }`}
          >
            <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">💎 Planını Seç</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          FinansKoçu ile finansal geleceğini şekillendir
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
            billingPeriod === 'monthly'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Aylık
        </button>
        <button
          onClick={() => setBillingPeriod('annual')}
          className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
            billingPeriod === 'annual'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Yıllık
          <span className="ml-1.5 text-xs bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-semibold">
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
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Mevcut plan: <strong className="text-primary">{PLANS[planType].name}</strong>
            {subscription.currentPeriodEnd && (
              <span className="text-muted-foreground/60 ml-2">
                (dönem sonu: {new Date(subscription.currentPeriodEnd).toLocaleDateString('tr-TR')})
              </span>
            )}
          </p>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
      className={`relative rounded-2xl border-2 p-6 transition-shadow bg-card ${
        highlighted
          ? 'border-primary shadow-lg shadow-primary/10'
          : 'border-border hover:shadow-md hover:border-border/80'
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
        <h3 className="text-lg font-bold text-card-foreground mt-1">{plan.name}</h3>
        <div className="mt-3">
          {plan.price === 0 ? (
            <div className="text-3xl font-bold text-foreground">Ücretsiz</div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-foreground">
                  {CURRENCY_SYMBOL}{price}
                </span>
                <span className="text-sm text-muted-foreground">/ay</span>
              </div>
              {billingPeriod === 'annual' && (
                <p className="text-xs text-muted-foreground mt-1">
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
            <span className={f.included ? 'text-emerald-500' : 'text-muted-foreground/40'}>
              {f.included ? '✓' : '✕'}
            </span>
            <span className={f.included ? 'text-card-foreground' : 'text-muted-foreground'}>
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
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/20'
            : isCurrent
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-foreground text-background hover:opacity-90'
        } disabled:opacity-50`}
      >
        {isCurrent && !highlighted ? '✓ Mevcut Plan' : buttonLabel}
      </button>
    </motion.div>
  );
}
