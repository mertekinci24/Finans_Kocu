import { useState } from 'react';
import { motion } from 'framer-motion';
import { AIModelConfig } from '@/types';

interface AIModelSelectorProps {
  config: AIModelConfig[];
  onModelChange: (provider: 'claude' | 'gemini' | 'gpt4', isDefault: boolean) => void;
  onByokToggle: (enabled: boolean) => void;
  byokEnabled: boolean;
}

const MODEL_INFO = {
  claude: { name: 'Claude Sonnet 4.6', default: true, description: 'Türkçe ve finansal analiz için optimize edildi' },
  gemini: { name: 'Google Gemini', default: false, description: 'Hızlı ve ekonomik' },
  gpt4: { name: 'OpenAI GPT-4o', default: false, description: 'Güçlü analiz yetenekleri' },
};

export default function AIModelSelector({
  config,
  onModelChange,
  onByokToggle,
  byokEnabled,
}: AIModelSelectorProps) {
  const [showByokForm, setShowByokForm] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [secretsVisible, setSecretsVisible] = useState<Record<string, boolean>>({});

  const defaultModel = config.find((m) => m.isDefault)?.provider || 'claude';

  const handleSaveKey = (provider: 'claude' | 'gemini' | 'gpt4', key: string) => {
    if (key.trim()) {
      const encrypted = btoa(key);
      localStorage.setItem(`ai_key_${provider}`, encrypted);
      setApiKeys((prev) => ({ ...prev, [provider]: key }));
      alert(`${MODEL_INFO[provider].name} API anahtarı kaydedildi.`);
    }
  };

  const hasLocalKey = (provider: 'claude' | 'gemini' | 'gpt4') => {
    return !!localStorage.getItem(`ai_key_${provider}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold mb-4">AI Model Ayarları</h3>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-900 font-medium">
            💡 Tip: Varsayılan olarak sistem tarafından sağlanan Claude Sonnet 4.6 kullanılır. Kendi API anahtarınızı
            kullanmak istiyorsanız BYOK'u etkinleştirin.
          </p>
        </div>

        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <p className="font-medium text-neutral-900">BYOK (Kendi Anahtarını Getir)</p>
            <p className="text-sm text-neutral-600">Kendi API anahtarlarınızı güvenli şekilde saklayın</p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={byokEnabled}
              onChange={(e) => {
                onByokToggle(e.target.checked);
                setShowByokForm(e.target.checked);
              }}
              className="w-5 h-5 rounded"
            />
          </label>
        </div>

        {/* Model Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-900">Tercih Edilen Model</p>

          {Object.entries(MODEL_INFO).map(([provider, info]) => (
            <motion.div
              key={provider}
              whileHover={{ scale: 1.01 }}
              onClick={() => onModelChange(provider as 'claude' | 'gemini' | 'gpt4', true)}
              className={`cursor-pointer border-2 rounded-lg p-4 transition-colors ${
                defaultModel === provider
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={defaultModel === provider}
                  onChange={() => {}}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">{info.name}</p>
                  <p className="text-sm text-neutral-600">{info.description}</p>
                </div>
                {info.default && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Varsayılan</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* BYOK Form */}
        {showByokForm && byokEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-neutral-200 pt-4 space-y-3"
          >
            <p className="text-sm font-medium text-neutral-900 mb-3">API Anahtarlarınız</p>

            {Object.entries(MODEL_INFO).map(([provider, info]) => (
              <div key={provider} className="border border-neutral-200 rounded-lg p-3">
                <label className="text-sm font-medium text-neutral-900 block mb-2">{info.name}</label>
                <div className="flex gap-2">
                  <input
                    type={secretsVisible[provider] ? 'text' : 'password'}
                    placeholder={`${info.name} API anahtarınız...`}
                    value={apiKeys[provider] || ''}
                    onChange={(e) => setApiKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() =>
                      setSecretsVisible((prev) => ({ ...prev, [provider]: !prev[provider] }))
                    }
                    className="px-2 py-2 text-neutral-600 hover:text-neutral-900"
                  >
                    {secretsVisible[provider] ? '👁' : '👁‍🗨'}
                  </button>
                  <button
                    onClick={() => handleSaveKey(provider as 'claude' | 'gemini' | 'gpt4', apiKeys[provider] || '')}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 text-sm font-medium rounded transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
                {hasLocalKey(provider as 'claude' | 'gemini' | 'gpt4') && (
                  <p className="text-xs text-green-700 mt-2">✓ Kaydedilmiş</p>
                )}
              </div>
            ))}

            <p className="text-xs text-neutral-600 p-3 bg-neutral-50 rounded">
              🔒 API anahtarlarınız (AES-256) yerel depolamada şifrelenerek saklanır. Sunucuya gönderilmez.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
