// ═══════════════════════════════════════════════════════════════════════════════
// FinansKoçu — Supabase Edge Function: Payment Gateway + AI Proxy
// Dosya: supabase/functions/api-gateway/index.ts
//
// Bu dosya Supabase Edge Functions ortamında (Deno) çalışır.
// Deploy: supabase functions deploy api-gateway
//
// Gerekli Environment Variables (Supabase Dashboard → Edge Functions → Secrets):
//   IYZICO_API_KEY          — Iyzico merchant API key
//   IYZICO_SECRET_KEY       — Iyzico merchant secret key
//   IYZICO_BASE_URL         — https://sandbox-api.iyzipay.com (sandbox) veya https://api.iyzipay.com (production)
//   IYZICO_WEBHOOK_SECRET   — Webhook HMAC doğrulama anahtarı
//   CLAUDE_API_KEY           — Anthropic Claude API key
//   GEMINI_API_KEY           — Google Gemini API key
//   SUPABASE_URL             — otomatik
//   SUPABASE_SERVICE_ROLE_KEY — otomatik
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ─── CORS Headers ───────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ status: 'failure', errorMessage: message }, status);
}

// ─── HMAC-SHA256 Webhook Doğrulama ──────────────────────────────────
async function verifyIyzicoWebhookSignature(
  payload: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computedSignature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === signature.toLowerCase();
}

// ─── Supabase Admin Client ──────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// ─── Path Normalization ──────────────────────────────────────────────
function normalizePath(pathname: string): string {
  let path = pathname;

  path = path.replace(/^\/functions\/v1\/api-gateway/, '');
  path = path.replace(/^\/api-gateway/, '');

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return path;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IYZICO PAYMENT HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleCreateCheckout(body: Record<string, unknown>): Promise<Response> {
  const { userId, email, planType, billingPeriod } = body as {
    userId: string;
    email: string;
    planType: string;
    billingPeriod: 'monthly' | 'annual';
  };

  if (!userId || !email || !planType) {
    return errorResponse('userId, email ve planType zorunlu', 400);
  }

  const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY');
  const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY');
  const IYZICO_BASE_URL = Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';

  if (!IYZICO_API_KEY || !IYZICO_SECRET_KEY) {
    return errorResponse('Iyzico anahtarları yapılandırılmamış', 500);
  }

  // Fiyatlandırma
  const price = billingPeriod === 'annual' ? '1490.00' : '149.00';
  const pricingPlanName = billingPeriod === 'annual' ? 'Pro Yıllık' : 'Pro Aylık';

  // Iyzico Subscription Initialize
  const requestBody = {
    locale: 'tr',
    conversationId: `finans-kocu-${userId}-${Date.now()}`,
    pricingPlanReferenceCode: `FK_PRO_${billingPeriod.toUpperCase()}`,
    subscriptionInitialStatus: 'ACTIVE',
    callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/api-gateway/webhook/iyzico`,
    customer: {
      name: email.split('@')[0],
      surname: 'User',
      email,
      gsmNumber: '+905000000000',
      identityNumber: '00000000000',
      shippingContactName: email.split('@')[0],
      shippingCity: 'Istanbul',
      shippingCountry: 'Turkey',
      shippingAddress: '-',
      billingContactName: email.split('@')[0],
      billingCity: 'Istanbul',
      billingCountry: 'Turkey',
      billingAddress: '-',
    },
  };

  try {
    // Iyzico API hash generation
    const hashStr = IYZICO_API_KEY + JSON.stringify(requestBody) + IYZICO_SECRET_KEY;
    const hashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(hashStr));
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    const authorizationString = `apiKey:${IYZICO_API_KEY}&randomKey:${Date.now()}&signature:${hashBase64}`;
    const pkkHeader = `IYZWS ${btoa(authorizationString)}`;

    const response = await fetch(`${IYZICO_BASE_URL}/v2/subscription/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pkkHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (result.status === 'success') {
      return jsonResponse({
        status: 'success',
        checkoutFormContent: result.checkoutFormContent,
        token: result.token,
        paymentPageUrl: result.paymentPageUrl,
      });
    }

    return errorResponse(result.errorMessage || 'Checkout başlatılamadı', 400);
  } catch (err) {
    return errorResponse(`Iyzico bağlantı hatası: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
  }
}

async function handleCheckoutResult(body: Record<string, unknown>): Promise<Response> {
  const { token } = body as { token: string };
  if (!token) return errorResponse('Token zorunlu', 400);

  const IYZICO_BASE_URL = Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';

  try {
    const response = await fetch(`${IYZICO_BASE_URL}/v2/subscription/checkinit/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(`Ödeme sonucu alınamadı: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
  }
}

async function handleCancelSubscription(body: Record<string, unknown>): Promise<Response> {
  const { subscriptionReferenceCode } = body as { subscriptionReferenceCode: string };
  if (!subscriptionReferenceCode) return errorResponse('subscriptionReferenceCode zorunlu', 400);

  const IYZICO_BASE_URL = Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';

  try {
    const response = await fetch(`${IYZICO_BASE_URL}/v2/subscription/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionReferenceCode }),
    });

    const result = await response.json();

    if (result.status === 'success') {
      // DB güncelle
      const supabase = getSupabaseAdmin();
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('iyzico_subscription_reference_code', subscriptionReferenceCode);
    }

    return jsonResponse(result);
  } catch (err) {
    return errorResponse(`İptal hatası: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
  }
}

async function handleSubscriptionStatus(userId: string): Promise<Response> {
  if (!userId) return errorResponse('userId zorunlu', 400);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({
    status: 'success',
    subscription: data ? {
      id: data.id,
      userId: data.user_id,
      planType: data.plan_type,
      status: data.status,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      iyzicoSubscriptionReferenceCode: data.iyzico_subscription_reference_code,
      cancelledAt: data.cancelled_at,
      trialEndsAt: data.trial_ends_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } : null,
  });
}

// ─── Iyzico Webhook Handler (HMAC Doğrulamalı) ─────────────────────
async function handleIyzicoWebhook(request: Request): Promise<Response> {
  const WEBHOOK_SECRET = Deno.env.get('IYZICO_WEBHOOK_SECRET');
  if (!WEBHOOK_SECRET) return errorResponse('Webhook secret yapılandırılmamış', 500);

  const rawBody = await request.text();
  const signature = request.headers.get('x-iyz-signature') || '';

  // HMAC-SHA256 doğrulama
  const isValid = await verifyIyzicoWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
  if (!isValid) {
    return errorResponse('Geçersiz webhook imzası', 403);
  }

  const event = JSON.parse(rawBody);
  const supabase = getSupabaseAdmin();

  // Event log (audit trail)
  await supabase.from('payment_events').insert([{
    event_type: event.iyziEventType,
    reference_code: event.iyziReferenceCode,
    subscription_reference_code: event.subscriptionReferenceCode,
    raw_payload: event,
    processed: false,
  }]);

  // Event'e göre DB güncelleme
  switch (event.iyziEventType) {
    case 'SUBSCRIPTION_ORDER_SUCCESS': {
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: event.customerReferenceCode,
          plan_type: 'pro',
          status: 'active',
          iyzico_subscription_reference_code: event.subscriptionReferenceCode,
          iyzico_customer_reference_code: event.customerReferenceCode,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Mark event processed
      await supabase
        .from('payment_events')
        .update({ processed: true })
        .eq('reference_code', event.iyziReferenceCode);
      break;
    }

    case 'SUBSCRIPTION_ORDER_FAILURE': {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('iyzico_subscription_reference_code', event.subscriptionReferenceCode);
      break;
    }

    case 'SUBSCRIPTION_CANCEL': {
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('iyzico_subscription_reference_code', event.subscriptionReferenceCode);
      break;
    }
  }

  return jsonResponse({ received: true });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE AI PROXY HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleClaudeProxy(body: Record<string, unknown>): Promise<Response> {
  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
  if (!CLAUDE_API_KEY) {
    return errorResponse('Claude API anahtarı yapılandırılmamış', 500);
  }

  const { model, max_tokens, system, messages } = body as {
    model?: string;
    max_tokens?: number;
    system?: string;
    messages: Array<{ role: string; content: string }>;
  };

  if (!messages || messages.length === 0) {
    return errorResponse('messages zorunlu', 400);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: Math.min(max_tokens || 512, 2048), // Max 2048 token limit
        system: system || '',
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return errorResponse(`Claude API error: ${response.status} - ${err}`, response.status);
    }

    const result = await response.json();
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(`Claude bağlantı hatası: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GEMINI AI PROXY HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FREE_MODEL_FALLBACKS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-3-12b-it:free",
];

const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503]);

async function handleGeminiProxy(body: Record<string, unknown>): Promise<Response> {
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (!OPENROUTER_API_KEY) {
    return errorResponse('OpenRouter API anahtarı yapılandırılmamış', 500);
  }

  const { fullPrompt, maxTokens, model: requestedModel } = body as {
    fullPrompt?: string;
    model?: string;
    maxTokens?: number;
  };

  if (!fullPrompt) {
    return errorResponse('fullPrompt zorunlu', 400);
  }

  // If body.model is not already in the verified fallback list, prepend it as a one-shot attempt.
  // Otherwise always use the fallback list order (avoids getting stuck on a stale/unavailable model).
  const modelsToTry: string[] = [
    ...(typeof requestedModel === 'string' && !FREE_MODEL_FALLBACKS.includes(requestedModel)
      ? [requestedModel]
      : []),
    ...FREE_MODEL_FALLBACKS,
  ];

  console.log('[OPENROUTER_REQUEST]', {
    modelsToTry,
    hasKey: Boolean(OPENROUTER_API_KEY),
    promptLength: fullPrompt?.length ?? 0,
  });

  let lastError: string = 'Unknown error';

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: maxTokens || 800,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = `${response.status} - ${errText}`;

        if (RETRYABLE_STATUSES.has(response.status)) {
          console.warn('[OPENROUTER_MODEL_FAILED]', { model, status: response.status, error: errText });
          continue;
        }

        // Non-retryable error — fail immediately
        console.error('[OPENROUTER_ERROR]', response.status, errText);
        return errorResponse(`OpenRouter API error: ${lastError}`, response.status);
      }

      // Return raw OpenRouter JSON directly — frontend parses choices[0].message.content
      const result = await response.json();

      // Guard: treat empty content as a failure and try next model
      const content = result?.choices?.[0]?.message?.content;
      if (!content || String(content).trim().length === 0) {
        lastError = `Empty response from ${model}`;
        console.warn('[OPENROUTER_EMPTY_RESPONSE]', { model });
        continue;
      }

      console.log('[OPENROUTER_SUCCESS]', { model, contentLength: String(content).length });
      return jsonResponse(result);

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn('[OPENROUTER_MODEL_FAILED]', { model, status: 'exception', error: lastError });
      // Network/parse exceptions — try next model
    }
  }

  console.error('[OPENROUTER_ALL_FAILED]', { lastError });
  return errorResponse(`All OpenRouter free models failed. Last error: ${lastError}`, 503);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPENROUTER MODEL DISCOVERY (diagnostic)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleOpenRouterModels(): Promise<Response> {
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (!OPENROUTER_API_KEY) {
    return errorResponse('OpenRouter API anahtarı yapılandırılmamış', 500);
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return errorResponse(`OpenRouter models fetch failed: ${response.status} - ${errText}`, response.status);
    }

    const raw = await response.json();

    // Simplified list for quick inspection
    const simplified = (raw.data ?? []).map((m: Record<string, unknown>) => ({
      id: m.id,
      name: m.name,
      pricing: m.pricing,
      context_length: m.context_length,
    }));

    return jsonResponse({ total: simplified.length, models: simplified, raw });
  } catch (err) {
    return errorResponse(`OpenRouter models exception: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ROUTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

serve(async (request: Request) => {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  
  console.log('[API_GATEWAY_ROUTE]', { rawPath: url.pathname, normalizedPath: path });

  try {
    // ── Payment Routes ──────────────────────────────────────────────
    if (path === '/payment/create-checkout' && request.method === 'POST') {
      const body = await request.json();
      return handleCreateCheckout(body);
    }

    if (path === '/payment/checkout-result' && request.method === 'POST') {
      const body = await request.json();
      return handleCheckoutResult(body);
    }

    if (path === '/payment/cancel-subscription' && request.method === 'POST') {
      const body = await request.json();
      return handleCancelSubscription(body);
    }

    if (path === '/payment/subscription-status' && request.method === 'GET') {
      const userId = url.searchParams.get('userId') || '';
      return handleSubscriptionStatus(userId);
    }

    // ── Iyzico Webhook ──────────────────────────────────────────────
    if (path === '/webhook/iyzico' && request.method === 'POST') {
      return handleIyzicoWebhook(request);
    }

    // ── Claude AI Proxy ─────────────────────────────────────────────
    if (path === '/ai/claude' && request.method === 'POST') {
      const body = await request.json();
      return handleClaudeProxy(body);
    }

    // ── Gemini AI Proxy ─────────────────────────────────────────────
    if (path === '/ai/gemini' && request.method === 'POST') {
      const body = await request.json();
      return handleGeminiProxy(body);
    }

    // ── OpenRouter Model Discovery (diagnostic) ──────────────────────
    if (path === '/ai/openrouter-models' && request.method === 'GET') {
      return handleOpenRouterModels();
    }

    return errorResponse('Route bulunamadı', 404);
  } catch (err) {
    return errorResponse(`Server error: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
  }
});
