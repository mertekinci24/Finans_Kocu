// ═══════════════════════════════════════════════════════════════════════════════
// FinansKoçu — Iyzico Payment Adapter
// Faz 4: Monetizasyon — Server-side proxy üzerinden çalışır
// ═══════════════════════════════════════════════════════════════════════════════
//
// NOT: Iyzico API çağrıları SECRET KEY gerektirir ve client-side'da YAPILMAMALIDIR.
// Bu adapter, Supabase Edge Functions veya Node.js backend proxy üzerinden çalışmak
// üzere tasarlanmıştır. Frontend yalnızca checkout form URL'si alır.
//
// Mimari:
//  Frontend → Supabase Edge Function → Iyzico API → Webhook → Supabase DB
//

import type { PlanType, UserSubscription } from './subscriptionPlans';

// ─── Iyzico Konfigürasyonu ──────────────────────────────────────────
export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string; // 'https://sandbox-api.iyzipay.com' | 'https://api.iyzipay.com'
}

// ─── Checkout Request/Response ──────────────────────────────────────
export interface CreateCheckoutRequest {
  userId: string;
  email: string;
  planType: PlanType;
  billingPeriod: 'monthly' | 'annual';
  locale?: 'tr' | 'en';
}

export interface CheckoutResponse {
  status: 'success' | 'failure';
  checkoutFormContent?: string;     // Iyzico iframe HTML
  token?: string;                    // Checkout token
  errorMessage?: string;
  paymentPageUrl?: string;
}

// ─── Ödeme Sonucu ───────────────────────────────────────────────────
export interface PaymentResult {
  status: 'success' | 'failure';
  paymentId?: string;
  referenceCode?: string;
  paidPrice?: number;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
}

// ─── Webhook Event ──────────────────────────────────────────────────
export interface IyzicoWebhookEvent {
  iyziEventType: 'SUBSCRIPTION_ORDER_SUCCESS' | 'SUBSCRIPTION_ORDER_FAILURE' | 'SUBSCRIPTION_CANCEL';
  iyziReferenceCode: string;
  subscriptionReferenceCode: string;
  customerReferenceCode: string;
  orderReferenceCode?: string;
  iyziEventTime: number;
  status: string;
}

// ─── Payment Adapter ────────────────────────────────────────────────
// Bu sınıf yalnızca Supabase Edge Function içinde kullanılır.
// Frontend'den doğrudan çağrılmamalıdır.

export const iyzicoAdapter = {
  /**
   * Checkout başlat — Edge Function endpoint'ine istek gönderir
   * Frontend bu fonksiyonu çağırır, gerçek API call Edge Function'da olur
   */
  async createCheckoutSession(request: CreateCheckoutRequest): Promise<CheckoutResponse> {
    try {
      const response = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        return {
          status: 'failure',
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Ödeme başlatılamadı',
      };
    }
  },

  /**
   * Checkout sonucu kontrol et
   */
  async retrieveCheckoutResult(token: string): Promise<PaymentResult> {
    try {
      const response = await fetch('/api/payment/checkout-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return {
          status: 'failure',
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Ödeme sonucu alınamadı',
      };
    }
  },

  /**
   * Abonelik iptal et
   */
  async cancelSubscription(subscriptionReferenceCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/payment/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionReferenceCode }),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: data.status === 'success', error: data.errorMessage };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'İptal başarısız',
      };
    }
  },

  /**
   * Kullanıcının mevcut abonelik durumunu getir
   */
  async getSubscriptionStatus(userId: string): Promise<UserSubscription | null> {
    try {
      const response = await fetch(`/api/payment/subscription-status?userId=${userId}`);

      if (!response.ok) return null;

      const data = await response.json();
      if (!data || data.status === 'failure') return null;

      return data.subscription as UserSubscription;
    } catch {
      return null;
    }
  },
};

// ─── Edge Function Template (Server-side) ───────────────────────────
// Bu template'i Supabase Edge Functions'a deploy edin.
// Dosya: supabase/functions/payment/index.ts
//
// Iyzico Node.js SDK: npm install iyzipay
//
// import Iyzipay from 'iyzipay';
// const iyzipay = new Iyzipay({
//   apiKey: Deno.env.get('IYZICO_API_KEY'),
//   secretKey: Deno.env.get('IYZICO_SECRET_KEY'),
//   uri: Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com',
// });
