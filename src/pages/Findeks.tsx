import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { extractTextFromPDF, parseRawFindeksText, determineRiskLevel, calculateScoreImprovementPotential } from '@/services/findeks/findeksOcrParser';
import { analyzeFindeksWithClaude } from '@/services/findeks/claudeAnalyzer';
import FindeksScoreScale from '@/components/findeks/FindeksScoreScale';
import ActionPlanCard from '@/components/findeks/ActionPlanCard';

type UploadStep = 'upload' | 'processing' | 'preview' | 'analysis' | 'result';

export default function Findeks() {
  const { user } = useAuth();
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rawData, setRawData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [report, setReport] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.includes('pdf')) {
        setError('Lütfen PDF dosyası yükleyin');
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
      setRawData(parsed);
      setStep('preview');
    } catch (err) {
      setError(`OCR Hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      setStep('upload');
      setLoading(false);
    }
  };

  const handleConfirmPreview = async () => {
    if (!rawData || !user) return;

    setLoading(true);
    setStep('analysis');

    try {
      const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
      if (!apiKey) {
        throw new Error('Claude API key not configured');
      }

      const analysis = await analyzeFindeksWithClaude(rawData, apiKey);
      setAnalysisResult(analysis);

      const riskLevel = determineRiskLevel(
        rawData.creditScore,
        rawData.limitUsageRatio,
        rawData.delayMonths
      );

      const newReport = await dataSourceAdapter.findeks.createReport({
        userId: user.id,
        fileName: file?.name || 'findeks-report.pdf',
        creditScore: rawData.creditScore,
        limitUsageRatio: rawData.limitUsageRatio,
        delayMonths: rawData.delayMonths,
        delayHistory: rawData.delayHistory,
        bankAccounts: rawData.bankAccounts,
        creditCards: rawData.creditCards,
        activeDebts: rawData.activeDebts,
        banksList: rawData.banksList,
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
      setError(`Analiz hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const riskColors: Record<string, string> = {
    kritik: 'text-red-600 bg-red-50',
    gelişim_açık: 'text-orange-600 bg-orange-50',
    dengeli: 'text-yellow-600 bg-yellow-50',
    güvenli: 'text-blue-600 bg-blue-50',
    prestijli: 'text-green-600 bg-green-50',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Findeks Analizi</h1>
        <p className="text-neutral-600 mt-2">Findeks raporunuzu yükleyerek AI-destekli finansal tavsiye alın</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-input"
              />
              <label htmlFor="pdf-input" className="cursor-pointer">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-lg font-medium">Findeks PDF dosyasını sürükleyin veya tıklayın</p>
                <p className="text-neutral-500 text-sm mt-2">
                  {file ? `Seçilen: ${file.name}` : 'PDF formatında yükleyin'}
                </p>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {loading ? 'İşleniyor...' : 'Dosyayı Analiz Et'}
            </button>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                <span className="text-2xl">⚙️</span>
              </motion.div>
            </div>
            <p className="text-lg font-medium">Findeks raporu OCR ile okunuyor...</p>
            <p className="text-neutral-500 text-sm mt-2">Bu birkaç saniye sürebilir</p>
          </motion.div>
        )}

        {step === 'preview' && rawData && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-600 text-sm">Kredi Notu</p>
                <p className="text-2xl font-bold text-blue-600">{rawData.creditScore}</p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-600 text-sm">Limit Kullanımı</p>
                <p className="text-2xl font-bold text-orange-600">{rawData.limitUsageRatio.toFixed(1)}%</p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-600 text-sm">Gecikme Geçmişi</p>
                <p className="text-2xl font-bold text-red-600">{rawData.delayMonths} ay</p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-600 text-sm">Banka Hesapları</p>
                <p className="text-2xl font-bold">{rawData.bankAccounts}</p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-600 text-sm">Kredi Kartları</p>
                <p className="text-2xl font-bold">{rawData.creditCards}</p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-600 text-sm">Aktif Borçlar</p>
                <p className="text-2xl font-bold">{rawData.activeDebts}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep('upload')}
                disabled={loading}
                className="flex-1 bg-neutral-200 hover:bg-neutral-300 disabled:opacity-50 text-neutral-900 font-medium py-3 rounded-lg transition-colors"
              >
                Geri
              </button>
              <button
                onClick={handleConfirmPreview}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? 'Analiz ediliyor...' : 'AI Analiz Et'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                <span className="text-2xl">🤖</span>
              </motion.div>
            </div>
            <p className="text-lg font-medium">AI Analiz Uzmanı çalışıyor...</p>
            <p className="text-neutral-500 text-sm mt-2">Kişiselleştirilmiş tavsiye hazırlanıyor</p>
          </motion.div>
        )}

        {step === 'result' && report && analysisResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-lg">
              <FindeksScoreScale score={report.creditScore} riskLevel={report.riskLevel} />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${riskColors[report.riskLevel]}`}>
                <p className="text-sm font-medium">Risk Seviyesi</p>
                <p className="text-xl font-bold capitalize">{report.riskLevel.replace('_', ' ')}</p>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-700">Potansiyel Artış</p>
                <p className="text-xl font-bold text-green-600">+{report.scoreImprovementPotential} puan</p>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 rounded-lg space-y-4">
              <h3 className="font-bold text-lg">AI Uzman Tavsiyesi</h3>
              <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{analysisResult.aiAnalysis}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg">Aksiyon Planı</h3>
              {analysisResult.actionPlan.map((step: { title: string; description: string }, idx: number) => (
                <ActionPlanCard key={idx} step={step} index={idx} />
              ))}
            </div>

            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setRawData(null);
                setAnalysisResult(null);
                setReport(null);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Yeni Rapor Yükle
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
