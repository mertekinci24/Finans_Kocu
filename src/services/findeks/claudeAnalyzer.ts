import { RawFindeksData, determineRiskLevel, calculateScoreImprovementPotential } from './findeksOcrParser';
import { ActionStep } from '@/types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export interface FindeksAnalysisResult {
  aiAnalysis: string;
  actionPlan: ActionStep[];
  riskLevel: string;
  improvementPotential: number;
}

export async function analyzeFindeksWithClaude(
  data: RawFindeksData,
  apiKey: string
): Promise<FindeksAnalysisResult> {
  const riskLevel = determineRiskLevel(data.creditScore, data.limitUsageRatio, data.delayMonths);
  const improvementPotential = calculateScoreImprovementPotential(
    data.creditScore,
    data.limitUsageRatio,
    data.delayMonths
  );

  const systemPrompt = `Sen FinansKoçu'nun AI Analiz Uzmanısı'sın. Kullanıcının Findeks raporunu analiz edip:
1. Kişiselleştirilmiş, Türkçe, "koç" tonunda tavsiye ver
2. Herhangi bir yargılama yapma — destek ve rehberlik tonu kullan
3. Somut, uygulanabilir öneriler sun
4. "Skorunu yükseltmek için şu 3 adımı at" formatında cevap ver

Tone Guidelines:
- ❌ "Limit kullanımınız çok yüksek"
- ✅ "Limit kullanımınızı %50'nin altına düşürürseniz, krediniz daha çok rahat eder"
- Motivasyon ve ümit ver
- Her tavsiyenin beklenen etkisini açıkla`;

  const userPrompt = `Findeks Rapor Analizi:
- Kredi Skoru: ${data.creditScore}/1900
- Limit Kullanım Oranı: %${data.limitUsageRatio}
- Gecikmiş Ay Sayısı: ${data.delayMonths}
- Banka Hesapları: ${data.bankAccounts}
- Kredi Kartları: ${data.creditCards}
- Aktif Borçlar: ${data.activeDebts}
- Bankalar: ${data.banksList.map((b) => b.name).join(', ')}

Bu kullanıcıya kişiselleştirilmiş finansal tavsiye ver. Skorunu kaç puana çıkarabileceği potansiyelini vurgu. 3 adımlık bir aksiyon planı sun.`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const result = await response.json();
    const aiAnalysis = result.content[0].text;

    const actionPlan = extractActionPlan(aiAnalysis);

    return {
      aiAnalysis,
      actionPlan,
      riskLevel,
      improvementPotential,
    };
  } catch (error) {
    throw new Error(
      `Findeks AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function extractActionPlan(aiAnalysis: string): ActionStep[] {
  const steps: ActionStep[] = [];
  const lines = aiAnalysis.split('\n');

  let stepCount = 0;
  let currentTitle = '';
  let currentDescription = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^(?:1\.|2\.|3\.|adım\s*[123]|step\s*[123])/i.test(trimmed)) {
      if (currentTitle && stepCount < 3) {
        steps.push({
          priority: (stepCount + 1) as 1 | 2 | 3,
          title: currentTitle,
          description: currentDescription,
          expectedImpact: calculateImpactScore(currentDescription),
          timeline: extractTimeline(currentDescription) || '1-2 ay',
        });
      }

      currentTitle = trimmed.replace(/^(?:1\.|2\.|3\.|adım\s*[123]|step\s*[123])/i, '').trim();
      currentDescription = '';
      stepCount++;
    } else if (currentTitle && trimmed.length > 0 && stepCount <= 3) {
      currentDescription += ' ' + trimmed;
    }
  }

  if (currentTitle && stepCount <= 3) {
    steps.push({
      priority: (stepCount) as 1 | 2 | 3,
      title: currentTitle,
      description: currentDescription.trim(),
      expectedImpact: calculateImpactScore(currentDescription),
      timeline: extractTimeline(currentDescription) || '1-2 ay',
    });
  }

  return steps.slice(0, 3);
}

function calculateImpactScore(text: string): number {
  const keywords: Record<string, number> = {
    'yüksek etki': 100,
    'büyük etki': 90,
    'önemli': 80,
    'puan': 70,
    'orta etki': 50,
    'az': 30,
  };

  let score = 50;
  for (const [keyword, value] of Object.entries(keywords)) {
    if (text.toLowerCase().includes(keyword)) {
      score = Math.max(score, value);
    }
  }

  return score;
}

function extractTimeline(text: string): string | null {
  const patterns = ['1-2 hafta', '2-4 hafta', '1-2 ay', '2-3 ay', '3-6 ay', 'hemen'];
  for (const pattern of patterns) {
    if (text.toLowerCase().includes(pattern)) {
      return pattern;
    }
  }
  return null;
}
