// ═══════════════════════════════════════════════════════════════════════════════
// FinansKoçu — useSubscription Hook
// Kullanıcının abonelik durumunu yönetir ve paywall kontrolü sağlar
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { iyzicoAdapter } from '@/services/payment/iyzicoAdapter';
import {
  subscriptionGuard,
  PLANS,
  type UserSubscription,
  type PlanType,
  type PremiumFeature,
  type PlanLimits,
} from '@/services/payment/subscriptionPlans';

interface UseSubscriptionReturn {
  subscription: UserSubscription | null;
  planType: PlanType;
  isPro: boolean;
  loading: boolean;
  canAccess: (feature: PremiumFeature) => boolean;
  checkLimit: (limitType: keyof PlanLimits, currentUsage: number) => {
    allowed: boolean;
    limit: number;
    remaining: number;
  };
  startCheckout: (billingPeriod: 'monthly' | 'annual') => Promise<string | null>;
  cancelSubscription: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Abonelik durumunu yükle
  const loadSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const sub = await iyzicoAdapter.getSubscriptionStatus(user.id);
      setSubscription(sub);
    } catch {
      // API yoksa Free plan varsayılan
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Plan tipi
  const planType = useMemo<PlanType>(() => {
    if (!subscription || subscription.status !== 'active') return 'free';
    return subscription.planType;
  }, [subscription]);

  const isPro = planType === 'pro';

  // Özellik erişim kontrolü
  const canAccess = useCallback(
    (feature: PremiumFeature) => subscriptionGuard.canAccess(subscription, feature),
    [subscription]
  );

  // Limit kontrolü
  const checkLimit = useCallback(
    (limitType: keyof PlanLimits, currentUsage: number) =>
      subscriptionGuard.checkLimit(subscription, limitType, currentUsage),
    [subscription]
  );

  // Checkout başlat
  const startCheckout = useCallback(
    async (billingPeriod: 'monthly' | 'annual'): Promise<string | null> => {
      if (!user?.id || !user?.email) return null;

      const result = await iyzicoAdapter.createCheckoutSession({
        userId: user.id,
        email: user.email,
        planType: 'pro',
        billingPeriod,
      });

      if (result.status === 'success' && result.paymentPageUrl) {
        return result.paymentPageUrl;
      }

      return null;
    },
    [user]
  );

  // İptal
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!subscription?.iyzicoSubscriptionReferenceCode) return false;

    const result = await iyzicoAdapter.cancelSubscription(
      subscription.iyzicoSubscriptionReferenceCode
    );

    if (result.success) {
      await loadSubscription(); // Refresh
    }

    return result.success;
  }, [subscription, loadSubscription]);

  return {
    subscription,
    planType,
    isPro,
    loading,
    canAccess,
    checkLimit,
    startCheckout,
    cancelSubscription,
    refresh: loadSubscription,
  };
}
