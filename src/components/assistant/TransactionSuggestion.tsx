import { motion } from 'framer-motion';
import { SuggestedTransaction } from '@/types';

interface TransactionSuggestionProps {
  transaction: SuggestedTransaction;
  onAccept: (transaction: SuggestedTransaction) => void;
}

export default function TransactionSuggestion({
  transaction,
  onAccept,
}: TransactionSuggestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <p className="text-sm font-medium text-blue-900 mb-2">İşlem Kaydedilsin mi?</p>
      <div className="space-y-1 text-sm text-blue-800 mb-3">
        <p>
          <span className="font-medium">Tutar:</span> ₺{transaction.amount.toLocaleString('tr-TR')}
        </p>
        <p>
          <span className="font-medium">Kategori:</span> {transaction.category}
        </p>
        <p>
          <span className="font-medium">Açıklama:</span> {transaction.description}
        </p>
        <p>
          <span className="font-medium">Tarih:</span>{' '}
          {new Date(transaction.date).toLocaleDateString('tr-TR')}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(transaction)}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          ✓ Kaydet
        </button>
        <button className="flex-1 px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 text-sm font-medium rounded transition-colors">
          ✕ Vazgeç
        </button>
      </div>
    </motion.div>
  );
}
