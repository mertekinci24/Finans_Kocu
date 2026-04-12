import { useState, useRef, useCallback } from 'react';
import { BankStatementParser, type ParsedTransaction } from '@/services/parsers/bankStatementParser';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { CURRENCY_SYMBOL } from '@/constants';
import type { Account, Transaction } from '@/types';

const CATEGORIES = [
  'maaş', 'yiyecek', 'ulaşım', 'sağlık', 'eğitim',
  'hizmet', 'eğlence', 'işlem', 'giyim', 'kira', 'diğer',
];

interface ImportRow extends ParsedTransaction {
  selected: boolean;
  isDuplicate: boolean;
}

interface ImportPreviewProps {
  accounts: Account[];
  existingTransactions: Transaction[];
  onImportComplete: (imported: Transaction[]) => void;
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'done';

function isDuplicateOf(parsed: ParsedTransaction, existing: Transaction[]): boolean {
  const parsedDate = parsed.date.toISOString().split('T')[0];
  return existing.some((tx) => {
    const txDate = new Date(tx.date).toISOString().split('T')[0];
    return (
      txDate === parsedDate &&
      tx.amount === parsed.amount &&
      tx.type === parsed.type
    );
  });
}

export default function ImportPreview({
  accounts,
  existingTransactions,
  onImportComplete,
  onClose,
}: ImportPreviewProps): JSX.Element {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const result = isCSV
          ? BankStatementParser.parseCSV(content)
          : BankStatementParser.parseText(content);

        const mapped: ImportRow[] = result.transactions.map((t) => ({
          ...t,
          category: t.category ?? 'diğer',
          selected: true,
          isDuplicate: isDuplicateOf(t, existingTransactions),
        }));

        setRows(mapped);
        setErrors(result.errors);
        setStep('preview');
      };
      reader.readAsText(file, 'UTF-8');
    },
    [existingTransactions]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const toggleRow = (idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const updateCategory = (idx: number, category: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, category } : r))
    );
  };

  const updateType = (idx: number, type: 'gelir' | 'gider') => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, type } : r))
    );
  };

  const handleImport = async () => {
    if (!selectedAccountId) return;
    setImporting(true);

    try {
      const toImport = rows
        .filter((r) => r.selected && !r.isDuplicate)
        .map((r) => ({
          accountId: selectedAccountId,
          amount: r.amount,
          description: r.description,
          category: r.category ?? 'diğer',
          date: r.date,
          type: r.type,
        }));

      const created = await dataSourceAdapter.transaction.createMany(toImport);
      setImportedCount(created.length);
      setStep('done');
      onImportComplete(created);
    } catch (err) {
      console.error('Import hatası:', err);
    } finally {
      setImporting(false);
    }
  };

  const selectedRows = rows.filter((r) => r.selected);
  const duplicateRows = rows.filter((r) => r.isDuplicate);
  const newRows = selectedRows.filter((r) => !r.isDuplicate);
  const totalAmount = newRows.reduce((s, r) => (r.type === 'gider' ? s - r.amount : s + r.amount), 0);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Banka Ekstresi İçe Aktar</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {step === 'upload' && 'CSV veya TXT dosyanı yükle'}
              {step === 'preview' && `${rows.length} işlem bulundu — kontrol et ve onayla`}
              {step === 'done' && `${importedCount} işlem başarıyla aktarıldı`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">

          {step === 'upload' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-64">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-neutral-300 hover:border-primary-300 hover:bg-neutral-50'
                }`}
              >
                <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-neutral-700">
                  Dosyayı sürükle bırak veya tıkla
                </p>
                <p className="text-xs text-neutral-400 mt-1">CSV veya TXT — maks 10 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="mt-6 bg-neutral-50 rounded-xl p-4 w-full max-w-lg text-xs text-neutral-500">
                <p className="font-medium text-neutral-700 mb-2">CSV Format (Garanti/İş Bankası):</p>
                <code className="text-xs text-neutral-600">
                  Tarih,Açıklama,Tutar,Tür<br />
                  2026-04-01,Market Alışverişi,250.50,gider<br />
                  2026-04-02,Maaş Ödemesi,8500,gelir
                </code>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col">
              <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center gap-4 flex-wrap">
                <div>
                  <label className="text-xs font-medium text-neutral-600">Hesap</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="ml-2 border border-neutral-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} — {acc.bankName ?? acc.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 ml-auto text-xs">
                  <span className="text-neutral-600">
                    <span className="font-bold text-neutral-900">{newRows.length}</span> yeni işlem
                  </span>
                  {duplicateRows.length > 0 && (
                    <span className="text-warning-600">
                      <span className="font-bold">{duplicateRows.length}</span> olası tekrar (atlanacak)
                    </span>
                  )}
                  <span className={totalAmount >= 0 ? 'text-success-600' : 'text-error-600'}>
                    Net: <span className="font-bold">{totalAmount >= 0 ? '+' : '-'}{fmt(totalAmount)}</span>
                  </span>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mx-6 mt-3 bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-warning-700 mb-1">{errors.length} satır atlandı:</p>
                  <ul className="text-xs text-warning-600 space-y-0.5">
                    {errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                    {errors.length > 5 && <li>...ve {errors.length - 5} daha</li>}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50">
                      <th className="py-2 px-3 text-left font-medium text-neutral-500 w-8">
                        <input
                          type="checkbox"
                          checked={rows.every((r) => r.selected)}
                          onChange={toggleAll}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
                        />
                      </th>
                      <th className="py-2 px-3 text-left font-medium text-neutral-500 w-28">Tarih</th>
                      <th className="py-2 px-3 text-left font-medium text-neutral-500">Açıklama</th>
                      <th className="py-2 px-3 text-right font-medium text-neutral-500 w-28">Tutar</th>
                      <th className="py-2 px-3 text-center font-medium text-neutral-500 w-20">Tür</th>
                      <th className="py-2 px-3 text-left font-medium text-neutral-500 w-36">Kategori</th>
                      <th className="py-2 px-3 text-center font-medium text-neutral-500 w-16">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          row.isDuplicate
                            ? 'bg-warning-50/60'
                            : row.selected
                              ? 'hover:bg-neutral-50'
                              : 'bg-neutral-50/50 opacity-60'
                        }`}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(idx)}
                            disabled={row.isDuplicate}
                            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-400 disabled:opacity-40"
                          />
                        </td>
                        <td className="py-2 px-3 text-neutral-600 whitespace-nowrap">
                          {row.date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="py-2 px-3 text-neutral-800 max-w-xs truncate" title={row.description}>
                          {row.description}
                        </td>
                        <td className={`py-2 px-3 text-right font-medium whitespace-nowrap ${
                          row.type === 'gelir' ? 'text-success-600' : 'text-error-600'
                        }`}>
                          {row.type === 'gelir' ? '+' : '-'}{fmt(row.amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => updateType(idx, row.type === 'gelir' ? 'gider' : 'gelir')}
                            disabled={row.isDuplicate}
                            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
                              row.type === 'gelir'
                                ? 'bg-success-100 text-success-700 hover:bg-success-200'
                                : 'bg-error-100 text-error-700 hover:bg-error-200'
                            }`}
                          >
                            {row.type === 'gelir' ? 'Gelir' : 'Gider'}
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.category ?? 'diğer'}
                            onChange={(e) => updateCategory(idx, e.target.value)}
                            disabled={row.isDuplicate}
                            className="w-full border border-neutral-200 rounded-md px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-warning-600 text-xs font-medium">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Tekrar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-success-600 text-xs">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Yeni
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="p-10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900">İçe Aktarma Tamamlandı</h3>
              <p className="text-sm text-neutral-500 mt-1">
                <span className="font-semibold text-success-600">{importedCount}</span> işlem başarıyla eklendi
              </p>
              {duplicateRows.length > 0 && (
                <p className="text-xs text-neutral-400 mt-2">
                  {duplicateRows.length} tekrar kayıt atlandı
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl">
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Geri
              </button>
              <div className="flex items-center gap-3">
                {newRows.length === 0 ? (
                  <span className="text-xs text-warning-600">
                    Tüm kayıtlar tekrar veya seçim yapılmadı
                  </span>
                ) : null}
                <button
                  onClick={handleImport}
                  disabled={importing || newRows.length === 0 || !selectedAccountId}
                  className="px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {newRows.length} İşlemi İçe Aktar
                </button>
              </div>
            </>
          )}
          {(step === 'upload' || step === 'done') && (
            <button
              onClick={onClose}
              className="ml-auto px-5 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-300 transition-colors"
            >
              {step === 'done' ? 'Kapat' : 'İptal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
