import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { extractTextFromPDF, parseRawFindeksText, determineRiskLevel, calculateScoreImprovementPotential } from '@/services/findeks/findeksOcrParser';
import { analyzeFindeksWithClaude } from '@/services/findeks/claudeAnalyzer';
import FindeksScoreScale from '@/components/findeks/FindeksScoreScale';
import ActionPlanCard from '@/components/findeks/ActionPlanCard';

type UploadStep = 'upload' | 'processing' | 'preview' | 'analysis' | 'result';

// Evidence-Aware display helper
function getDisplayValue(
  field: any,
  fieldKey: string,
  documentType: string
): { main: string; sub: string; isFound: boolean; isScopeWarning: boolean } {
  if (field?.status === 'found' && field.value != null) {
    let mainText = String(field.value);
    if (fieldKey === 'limitUsageRatio') mainText = `${Number(field.value).toFixed(1)}%`;
    if (fieldKey === 'delayMonths') mainText = `${field.value} ay`;
    return { main: mainText, isFound: true, isScopeWarning: false, sub: 'Yüksek güvenle okundu' };
  }
  
  if (documentType === 'findeks_credit_score_only') {
    const scopeMap: Record<string, string> = {
      limitUsageRatio: 'Bu raporda yer almıyor',
      delayMonths:     'Detay tablo yok',
      bankAccounts:    'Hesap detayı yok',
      creditCards:     'Kart detayı yok',
      activeDebts:     'Borç detayı yok',
    };
    if (scopeMap[fieldKey]) return { main: scopeMap[fieldKey], sub: field?.reason || '', isFound: false, isScopeWarning: true };
  }
  
  if (field?.status === 'low_confidence') return { main: 'Düşük güven', sub: field.reason ?? '', isFound: false, isScopeWarning: false };
  if (field?.status === 'rejected') return { main: 'Geçersiz veri', sub: field.reason ?? '', isFound: false, isScopeWarning: false };
  
  return { main: 'Okunamadı', sub: field?.reason ?? '', isFound: false, isScopeWarning: false };
}

const riskColors: Record<string, string> = {
  kritik:       'text-red-500 bg-red-950/40 border-red-800',
  gelişim_açık: 'text-orange-400 bg-orange-950/40 border-orange-800',
  dengeli:      'text-yellow-400 bg-yellow-950/40 border-yellow-800',
  güvenli:      'text-blue-400 bg-blue-950/40 border-blue-800',
  prestijli:    'text-emerald-400 bg-emerald-950/40 border-emerald-800',
};

export default function Findeks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  
  const [analysisStuck, setAnalysisStuck] = useState(false);

  const getCoachAdvice = (score: number) => {
    if (score >= 1700) return 'Mükemmel durumdasınız! Mevcut ödeme disiplininizi koruyarak en düşük faizli kredilere erişebilirsiniz.';
    if (score >= 1500) return "Tebrikler, kredi notunuz 'İYİ' seviyesinde. Mevcut borç limit oranınızı korumanız yeterli.";
    if (score >= 1100) return "Notunuz 'Dengeli'. Skorunuzu 1500 üzerine çekmek için kredi kartı borçlarını asgari yerine tam ödemeyi deneyin.";
    return 'Skorunuz riskli bölgede. Düzenli ödemelerle 6 ay içinde hızlı bir toparlanma sağlayabiliriz.';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.includes('pdf')) {
        setError('Lütfen orijinal Findeks PDF dosyası yükleyin. Resim veya taranmış dosyalar desteklenmemektedir.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      const ocrText = await extractTextFromPDF(file);
      const parsed = parseRawFindeksText(ocrText);

      if (parsed.creditScore.value === null && parsed.limitUsageRatio.value === null) {
        throw new Error('Dosya okundu ancak Findeks formatına uygun veri bulunamadı. Lütfen doğru dosyayı yüklediğinizden emin olun.');
      }

      setRawData(parsed);
      setStep('preview');
    } catch (err) {
      setError(`OCR Hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const buildFindeksBridgePayload = () => ({
    ...rawData,
    fileName: file?.name,
    source: "findeks_upload",
    interpretationReady: true,
    scope: rawData?.documentType,
    legacyValues: {
      creditScore: rawData?.creditScore?.value ?? null,
      limitUsageRatio: rawData?.limitUsageRatio?.value ?? null,
      delayMonths: rawData?.delayMonths?.value ?? null,
      bankAccounts: rawData?.bankAccounts?.value ?? null,
      creditCards: rawData?.creditCards?.value ?? null,
      activeDebts: rawData?.activeDebts?.value ?? null,
    },
  });

  const navigateToAssistantWithFindeks = () => {
    const score = rawData?.creditScore?.value ?? report?.creditScore ?? "bilinmiyor";
    navigate("/assistant", {
      state: {
        initialQuery: `Findeks raporumu analiz eder misin? Kredi notum ${score}. Bu rapor bir ${rawData?.documentType}. Eksik alanları varsayım yapmadan değerlendir.`,
        findeksData: buildFindeksBridgePayload(),
      },
    });
  };

  const handleConfirmPreview = async () => {
    if (!rawData || !user) return;
    setLoading(true);
    setStep('analysis');
    
    setAnalysisStuck(false);
    const stuckTimer = setTimeout(() => setAnalysisStuck(true), 8000);

    try {
      const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
      if (!apiKey) throw new Error('Claude API key not configured');

      const analysisPromise = analyzeFindeksWithClaude(rawData, apiKey);
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('AI Analiz zaman aşımı (10s)')), 10000)
      );

      const analysis = await Promise.race([analysisPromise, timeoutPromise]);
      setAnalysisResult(analysis);

      const riskLevel = determineRiskLevel(rawData.creditScore, rawData.limitUsageRatio, rawData.delayMonths);
      const newReport = await dataSourceAdapter.findeks.createReport({
        userId: user.id,
        fileName: file?.name || 'findeks-report.pdf',
        creditScore: rawData.creditScore?.value ?? 0,
        limitUsageRatio: rawData.limitUsageRatio?.value ?? 0,
        delayMonths: rawData.delayMonths?.value ?? 0,
        delayHistory: rawData.delayHistory ?? [],
        bankAccounts: rawData.bankAccounts?.value ?? 0,
        creditCards: rawData.creditCards?.value ?? 0,
        activeDebts: rawData.activeDebts?.value ?? 0,
        banksList: rawData.banksList ?? [],
        riskLevel,
        scoreImprovementPotential: calculateScoreImprovementPotential(
          rawData.creditScore,
          rawData.limitUsageRatio,
          rawData.delayMonths
        ),
        uploadedAt: new Date(),
        aiAnalysis: analysis.aiAnalysis,
        actionPlan: analysis.actionPlan,
      });

      setReport(newReport);
      setStep('result');
    } catch (err) {
      console.error('[FINDEKS_ERROR] Analiz veya Kayıt Hatası:', err);
      const deterministicRiskLevel = determineRiskLevel(
        rawData.creditScore,
        rawData.limitUsageRatio,
        rawData.delayMonths
      );
      setAnalysisResult({
        aiAnalysis: 'AI Analizi şu an yapılamadı, ancak asistan ile manuel tartışabilirsiniz.',
        actionPlan: [{ title: "AI Asistan'a Sor", description: 'Verileriniz hazır, butona basarak detaylı analiz isteyebilirsiniz.' }],
        riskLevel: deterministicRiskLevel,
        improvementPotential: 0,
      });
      setStep('result');
    } finally {
      clearTimeout(stuckTimer);
      setAnalysisStuck(false);
      setLoading(false);
    }
  };

  const FieldCard = ({ label, fieldKey, colorClass }: { label: string; fieldKey: string; colorClass?: string }) => {
    const field = rawData?.[fieldKey];
    const { main, sub, isFound, isScopeWarning } = getDisplayValue(field, fieldKey, rawData?.documentType);
    
    return (
      <div className="bg-neutral-800/60 border border-neutral-700 p-4 rounded-xl flex flex-col gap-1">
        <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold ${isFound ? (colorClass ?? 'text-white') : isScopeWarning ? 'text-amber-500' : 'text-neutral-500'}`}>
          {main}
        </p>
        {sub && <p className="text-xs text-neutral-500 leading-tight">{sub}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold">Findeks Analizi</h1>
        <p className="text-neutral-400 mt-2">Findeks raporunuzu yükleyerek AI-destekli finansal tavsiye alın</p>
      </div>

      <AnimatePresence mode="wait">

        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="border-2 border-dashed border-neutral-600 rounded-xl p-10 text-center hover:border-blue-500 transition-colors bg-neutral-900/40">
              <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="pdf-input" />
              <label htmlFor="pdf-input" className="cursor-pointer">
                <div className="text-5xl mb-4">📄</div>
                <p className="text-lg font-medium">Findeks PDF dosyasını sürükleyin veya tıklayın</p>
                <p className="text-neutral-500 text-sm mt-2">
                  {file ? `Seçilen: ${file.name}` : 'PDF formatında yükleyin'}
                </p>
              </label>
            </div>

            {error && <div className="bg-red-950/60 border border-red-800 rounded-lg p-4 text-red-300">{error}</div>}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'İşleniyor...' : 'Dosyayı Analiz Et'}
            </button>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/50 mb-6">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <span className="text-2xl">⚙️</span>
              </motion.div>
            </div>
            <p className="text-lg font-semibold">Findeks raporu dijital olarak analiz ediliyor...</p>
            <p className="text-neutral-500 text-sm mt-2">Bu birkaç saniye sürebilir</p>
          </motion.div>
        )}

        {step === 'preview' && rawData && (
          <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {rawData.documentType === 'findeks_credit_score_only' && (
              <div className="bg-blue-950/60 border border-blue-700 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 text-lg">ℹ️</span>
                  <p className="font-semibold text-blue-300">Bu belge kredi notu özeti olarak algılandı</p>
                </div>
                <p className="text-sm text-blue-200/80 leading-relaxed">
                  Kredi notunuz, rapor tarihiniz ve not bileşenleriniz yüksek güvenle okundu. Ancak bu belge, kişisel limit, borç, kredi kartı, banka hesabı ve gecikme detaylarını içeren tam risk tablosunu barındırmaz. Bu nedenle bu alanları sıfır kabul etmiyoruz; kapsam dışı olarak değerlendiriyoruz.
                </p>
                <p className="text-xs text-blue-300/60 leading-relaxed font-semibold">
                  Daha derin analiz için Findeks Risk Raporu'nun detay sayfalarını veya banka kredi/limit özetinizi yükleyebilirsiniz.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <FieldCard label="Kredi Notu"       fieldKey="creditScore"     colorClass="text-blue-400" />
              <FieldCard label="Limit Kullanımı"  fieldKey="limitUsageRatio" colorClass="text-orange-400" />
              <FieldCard label="Gecikme Geçmişi"  fieldKey="delayMonths"     colorClass="text-red-400" />
              <FieldCard label="Banka Hesapları"  fieldKey="bankAccounts" />
              <FieldCard label="Kredi Kartları"   fieldKey="creditCards" />
              <FieldCard label="Aktif Borçlar"    fieldKey="activeDebts" />
            </div>

            {(() => {
              const sc = rawData.scoreComponents;
              const hasComponents =
                sc?.paymentHabits?.status === 'found' ||
                sc?.currentAccountAndDebtStatus?.status === 'found' ||
                sc?.creditUsageIntensity?.status === 'found' ||
                sc?.newCreditOpenings?.status === 'found';
              if (!hasComponents) return null;
              return (
                <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-5 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm text-white">Findeks Not Bileşenleri</h3>
                    <p className="text-xs text-amber-400/80 mt-1">
                      ⚠️ Bu yüzdeler limit kullanım oranı <strong>değildir</strong>; kredi notunuzu etkileyen ana faktör ağırlıklarıdır.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Ödeme Alışkanlıkları', field: sc.paymentHabits },
                      { label: 'Mevcut Hesap ve Borç Durumu', field: sc.currentAccountAndDebtStatus },
                      { label: 'Kredi Kullanım Yoğunluğu', field: sc.creditUsageIntensity },
                      { label: 'Yeni Kredili Ürün Açılışları', field: sc.newCreditOpenings },
                    ].map(({ label, field }) =>
                      field?.status === 'found' ? (
                        <div key={label} className="bg-neutral-700/50 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-xs text-neutral-300">{label}</span>
                          <span className="font-bold text-white text-sm">%{field.value}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Behavioral Interpretation Panel */}
            <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <span className="text-indigo-400">💡</span> Bu veriler ne söylüyor?
              </h3>
              <div className="space-y-3">
                {rawData.creditScore?.status === 'found' && (
                  <p className="text-sm text-indigo-100/90 leading-relaxed">
                    Kredi notunuz <strong className="text-white">{rawData.creditScore.value}</strong>. Bu seviye, ödeme alışkanlıklarınızın güçlü olduğunu ve finansal geçmişinizin büyük ölçüde stabil olduğunu gösterir.
                  </p>
                )}
                {rawData.scoreComponents?.paymentHabits?.status === 'found' && (
                  <p className="text-sm text-indigo-100/80 leading-relaxed">
                    Ödeme alışkanlıklarının %45 ağırlığa sahip olması, kredi notunuzun en çok ödeme disiplininizden etkilendiğini gösterir.
                  </p>
                )}
                {rawData.scoreComponents?.creditUsageIntensity?.status === 'found' && (
                  <p className="text-sm text-indigo-100/80 leading-relaxed">
                    Kredi Kullanım Yoğunluğu bileşeni %18 ağırlığa sahip. Bu doğrudan limit kullanım oranınız değildir; ancak limit ve borç yönetiminizin kredi notu üzerinde etkili olabileceğini gösteren bir sinyaldir.
                  </p>
                )}
                {rawData.documentType === 'findeks_credit_score_only' && (
                  <p className="text-sm text-amber-300/90 leading-relaxed bg-amber-950/30 p-3 rounded-lg border border-amber-900/50">
                    Ancak bu rapor, kredi kullanım oranı ve aktif borç detaylarını içermediği için risk profilinizin en kritik boyutunu kesin olarak analiz edemiyoruz.
                  </p>
                )}
              </div>
            </div>

            {/* Missing Data Strategy Panel */}
            {rawData.documentType === 'findeks_credit_score_only' && (
              <div className="bg-neutral-800/40 border border-neutral-700 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-sm text-white">Daha derin analiz için gereken veriler</h3>
                <ul className="list-disc list-inside text-sm text-neutral-300 space-y-1">
                  <li>Limit kullanım oranı</li>
                  <li>Aktif borçlar</li>
                  <li>Kredi kartı dağılımı</li>
                  <li>Gecikme geçmişi</li>
                </ul>
                <p className="text-xs text-neutral-400 mt-2">
                  Bu bilgiler, kredi riskinizi ve finansal baskınızı doğru analiz etmek için kritik öneme sahiptir.
                </p>
                <div className="mt-3 p-4 bg-neutral-700/30 rounded-lg border border-neutral-600/50 flex flex-col gap-3">
                  <p className="text-sm font-medium text-white">
                    👉 Tam Findeks Risk Raporu veya banka limit özetinizi yükleyerek analizi derinleştirebilirsiniz.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep('upload')}
                      className="flex-1 text-xs font-medium bg-neutral-600 hover:bg-neutral-500 text-white py-2 rounded transition-colors"
                    >
                      Tam Risk Raporu Yükle
                    </button>
                    <button
                      onClick={() => setStep('upload')}
                      className="flex-1 text-xs font-medium bg-neutral-600 hover:bg-neutral-500 text-white py-2 rounded transition-colors"
                    >
                      Banka Limit Özeti Yükle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="bg-red-950/60 border border-red-800 rounded-lg p-4 text-red-300">{error}</div>}

            <p className="text-xs text-center text-neutral-500 font-medium">
              AI analizi yalnızca bu raporda kanıtlanan verileri kesin kabul eder. Kapsam dışı alanlar varsayım yapılmadan yorumlanır.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('upload')}
                disabled={loading}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Geri
              </button>
              <button
                onClick={handleConfirmPreview}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Analiz ediliyor...' : 'AI Analiz Et'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'analysis' && (
          <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-900/50 mb-6">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <span className="text-2xl">🤖</span>
              </motion.div>
            </div>
            <p className="text-lg font-semibold">AI Analiz Uzmanı çalışıyor...</p>
            <p className="text-neutral-500 text-sm mt-2">Kişiselleştirilmiş tavsiye hazırlanıyor</p>
            
            {analysisStuck && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-4 bg-orange-950/30 border border-orange-800/50 rounded-xl w-full max-w-md">
                <p className="text-orange-300 text-sm mb-4">
                  AI analizi beklenenden uzun sürüyor. İstersen raporu AI Asistan'a taşıyarak sohbet üzerinden manuel analiz başlatabilirsin.
                </p>
                <button
                  onClick={navigateToAssistantWithFindeks}
                  className="w-full bg-orange-600/80 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  AI Asistan ile Devam Et
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 'result' && (report || rawData) && analysisResult && (() => {
          const displayScore = report?.creditScore ?? rawData?.creditScore?.value ?? 0;
          const fallbackRisk = determineRiskLevel(
            rawData.creditScore,
            rawData.limitUsageRatio,
            rawData.delayMonths
          );
          const displayRisk  = report?.riskLevel ?? analysisResult.riskLevel ?? fallbackRisk;
          const displayPot   = report?.scoreImprovementPotential ?? analysisResult.improvementPotential ?? 0;

          return (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/50 p-8 rounded-xl">
                <FindeksScoreScale score={displayScore} riskLevel={displayRisk} />
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${riskColors[displayRisk] ?? riskColors.dengeli}`}>
                  <p className="text-sm font-medium">Risk Seviyesi</p>
                  <p className="text-xl font-bold capitalize">{displayRisk.replace('_', ' ')}</p>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-800 p-4 rounded-xl">
                  <p className="text-sm font-medium text-emerald-300">Potansiyel Artış</p>
                  <p className="text-xl font-bold text-emerald-400">+{displayPot} puan</p>
                </div>
              </div>

              {rawData?.missingFields?.length > 0 && (
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-semibold text-neutral-300">📌 Analiz kapsamı</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Bu analiz yalnızca bu belgede doğrulanabilen verilere dayanır. Limit, borç ve hesap detayları bu raporda yer almadığı için bu alanlarda kesin çıkarım yapılmamıştır.
                  </p>
                </div>
              )}

              <div className="bg-neutral-800/50 border-l-4 border-blue-500 p-6 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Hızlı Koç Yorumu</h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${displayScore >= 1470 ? 'bg-blue-900/60 text-blue-300' : 'bg-orange-900/60 text-orange-300'}`}>
                    {displayScore >= 1720 ? 'PRESTİJLİ' : displayScore >= 1470 ? 'İYİ / GÜVENLİ' : displayRisk.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-neutral-300 italic">"{getCoachAdvice(displayScore)}"</p>
              </div>

              <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl space-y-3">
                <h3 className="font-bold text-lg">AI Uzman Tavsiyesi</h3>
                <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{analysisResult.aiAnalysis}</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">Aksiyon Planı</h3>
                {analysisResult.actionPlan.map((item: { title: string; description: string }, idx: number) => (
                  <ActionPlanCard key={idx} step={item} index={idx} />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => { setStep('upload'); setFile(null); setRawData(null); setAnalysisResult(null); setReport(null); }}
                  className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Yeni Rapor Yükle
                </button>
                <button
                  onClick={navigateToAssistantWithFindeks}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <span>🤖 DETAYLARI AI İLE TARTIŞ</span>
                </button>
              </div>

            </motion.div>
          );
        })()}

      </AnimatePresence>
    </div>
  );
}
