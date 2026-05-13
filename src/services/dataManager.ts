import { supabase } from './supabase/adapter';

export interface BackupData {
  schemaVersion: string;
  exportedAt: string;
  app: string;
  userId: string;
  data: {
    accounts: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    debts: Record<string, unknown>[];
    installments: Record<string, unknown>[];
    recurringFlows: Record<string, unknown>[];
    savingGoals: Record<string, unknown>[];
    dashboardLayouts: Record<string, unknown>[];
  };
}

type SupabaseErrorShape = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

class DataManagerError extends Error {
  readonly kind: string;
  readonly causeCode?: string;

  constructor(kind: string, message: string, causeCode?: string) {
    super(message);
    this.kind = kind;
    this.causeCode = causeCode;
  }
}

async function getUserAccountIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId);

  if (error) {
    const e = error as SupabaseErrorShape;
    throw new DataManagerError(
      'USER_ACCOUNTS_FETCH_FAILED',
      'Hesaplar alınamadı.',
      e.code
    );
  }

  const rows = (data ?? []) as Array<{ id?: string }>;
  return rows.map((r) => r.id).filter((id): id is string => Boolean(id));
}

function logResetTableFailed(table: string, error: SupabaseErrorShape) {
  console.error('[SETTINGS_DATA_RESET_TABLE_FAILED]', {
    table,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function logTransactionsFailed(
  phase: 'export' | 'reset' | 'import',
  error: SupabaseErrorShape
) {
  console.error('[SETTINGS_DATA_TRANSACTIONS_FAILED]', {
    phase,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

type OwnershipStrategy =
  | { type: 'direct_user_id'; userIdColumn: 'user_id' }
  | { type: 'account_based' };

function ownershipForTable(table: string): OwnershipStrategy | null {
  // A) Direct user ownership (user_id column exists on these tables)
  if (
    table === 'accounts' ||
    table === 'debts' ||
    table === 'installments' ||
    table === 'recurring_flows' ||
    table === 'saving_goals' ||
    table === 'dashboard_layouts'
  ) {
    return { type: 'direct_user_id', userIdColumn: 'user_id' };
  }

  // B) Account-based ownership (transactions: account_id -> accounts.user_id)
  if (table === 'transactions') return { type: 'account_based' };

  // Unknown tables are out of scope for SETTINGS-DATA-1C.
  return null;
}

async function exportDirectUserTable(userId: string, table: string) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
  if (error) {
    const e = error as SupabaseErrorShape;
    throw new DataManagerError(
      'EXPORT_FAILED',
      `${table} verileri dışa aktarılırken hata oluştu.`,
      e.code
    );
  }
  return (data ?? []) as Record<string, unknown>[];
}

async function exportTransactions(userId: string): Promise<Record<string, unknown>[]> {
  try {
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', accountIds);

    if (error) {
      const e = error as SupabaseErrorShape;
      logTransactionsFailed('export', e);
      throw new DataManagerError(
        'TRANSACTIONS_EXPORT_FAILED',
        'İşlemler dışa aktarılırken hata oluştu.',
        e.code
      );
    }

    return (data ?? []) as Record<string, unknown>[];
  } catch (err) {
    if (err instanceof DataManagerError) throw err;
    console.error('[SETTINGS_DATA_TRANSACTIONS_FAILED]', { phase: 'export', err });
    throw new DataManagerError(
      'TRANSACTIONS_EXPORT_FAILED',
      'İşlemler dışa aktarılırken hata oluştu.'
    );
  }
}

async function resetDirectUserTable(userId: string, table: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error) {
    const e = error as SupabaseErrorShape;
    logResetTableFailed(table, e);
    throw new DataManagerError(
      'RESET_FAILED',
      `${table} tablosu sıfırlanırken hata oluştu.`,
      e.code
    );
  }
}

async function resetTransactions(userId: string): Promise<void> {
  try {
    const accountIds = await getUserAccountIds(userId);
    if (accountIds.length === 0) return;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('account_id', accountIds);

    if (error) {
      const e = error as SupabaseErrorShape;
      logTransactionsFailed('reset', e);
      throw new DataManagerError(
        'TRANSACTIONS_RESET_FAILED',
        'İşlemler tablosu temizlenirken hata oluştu.',
        e.code
      );
    }
  } catch (err) {
    if (err instanceof DataManagerError) throw err;
    console.error('[SETTINGS_DATA_TRANSACTIONS_FAILED]', { phase: 'reset', err });
    throw new DataManagerError(
      'TRANSACTIONS_RESET_FAILED',
      'İşlemler tablosu temizlenirken hata oluştu.'
    );
  }
}

function sanitizeRowForTable(
  userId: string,
  table: string,
  row: Record<string, unknown>
): Record<string, unknown> {
  const { created_at: _createdAt, updated_at: _updatedAt, ...rest } = row as Record<
    string,
    unknown
  >;

  const ownership = ownershipForTable(table);

  // Transactions table has NO user_id column; do not inject user_id.
  if (ownership?.type === 'account_based') {
    return rest;
  }

  // Direct user ownership: user_id must be overridden for safety.
  if (ownership?.type === 'direct_user_id') {
    return { ...rest, user_id: userId };
  }

  return rest;
}

async function importTable(
  userId: string,
  table: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return;

  const sanitizedRows = rows.map((row) => sanitizeRowForTable(userId, table, row));

  const { error } = await supabase.from(table).insert(sanitizedRows);

  if (error) {
    const e = error as SupabaseErrorShape;
    if (table === 'transactions') logTransactionsFailed('import', e);
    throw new DataManagerError(
      'IMPORT_FAILED',
      `${table} verileri geri yüklenirken hata oluştu: ${e.message || 'Unknown error'}`,
      e.code
    );
  }
}

export const dataManager = {
  /**
   * Tüm verileri JSON olarak dışa aktar
   */
  async exportData(userId: string): Promise<BackupData> {
    try {
      const [
        accounts,
        transactions,
        debts,
        installments,
        recurringFlows,
        savingGoals,
        dashboardLayouts,
      ] = await Promise.all([
        exportDirectUserTable(userId, 'accounts'),
        exportTransactions(userId),
        exportDirectUserTable(userId, 'debts'),
        exportDirectUserTable(userId, 'installments'),
        exportDirectUserTable(userId, 'recurring_flows'),
        exportDirectUserTable(userId, 'saving_goals'),
        exportDirectUserTable(userId, 'dashboard_layouts'),
      ]);

      return {
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        app: 'FinansKoçu',
        userId,
        data: {
          accounts,
          transactions,
          debts,
          installments,
          recurringFlows,
          savingGoals,
          dashboardLayouts,
        },
      };
    } catch (error) {
      console.error('[DATA_EXPORT_ERROR]', error);
      throw new Error('Veriler dışa aktarılırken bir hata oluştu.');
    }
  },

  /**
   * Verileri sıfırla (Auth ve Profil hariç)
   */
  async resetData(userId: string): Promise<void> {
    // Dependency-safe delete order:
    // - transactions is child of accounts (account_id FK), so delete it first.
    // - accounts must be deleted last.
    const order: Array<
      | 'transactions'
      | 'installments'
      | 'debts'
      | 'saving_goals'
      | 'recurring_flows'
      | 'dashboard_layouts'
      | 'accounts'
    > = [
      'transactions',
      'installments',
      'debts',
      'saving_goals',
      'recurring_flows',
      'dashboard_layouts',
      'accounts',
    ];

    for (const table of order) {
      const strategy = ownershipForTable(table);
      if (!strategy) continue;

      if (strategy.type === 'account_based') {
        await resetTransactions(userId);
      } else {
        await resetDirectUserTable(userId, table);
      }
    }
  },

  /**
   * Verileri geri yükle (Replace modunda)
   */
  async importData(userId: string, backup: BackupData): Promise<void> {
    if (backup.schemaVersion !== '1.0.0') {
      throw new Error('Geçersiz yedek dosyası sürümü.');
    }

    // Önce mevcut verileri sıfırla. Başarısız olursa import başlamamalı.
    await this.resetData(userId);

    const tablesMap: Record<string, keyof BackupData['data']> = {
      accounts: 'accounts',
      saving_goals: 'savingGoals',
      debts: 'debts',
      installments: 'installments',
      recurring_flows: 'recurringFlows',
      transactions: 'transactions',
      dashboard_layouts: 'dashboardLayouts',
    };

    // Insert order: accounts first, then dependent tables, then layouts.
    const order = [
      'accounts',
      'saving_goals',
      'debts',
      'installments',
      'recurring_flows',
      'transactions',
      'dashboard_layouts',
    ] as const;

    for (const table of order) {
      const dataKey = tablesMap[table];
      const rows = (backup.data[dataKey] || []) as Record<string, unknown>[];
      await importTable(userId, table, rows);
    }
  },

  /**
   * Dosyaya kaydet
   */
  downloadAsFile(data: BackupData) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `finanskocu-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

