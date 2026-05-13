import { supabase } from './supabase/adapter';

export interface BackupData {
  schemaVersion: string;
  exportedAt: string;
  app: string;
  userId: string;
  data: {
    accounts: any[];
    transactions: any[];
    debts: any[];
    installments: any[];
    recurringFlows: any[];
    savingGoals: any[];
    dashboardLayouts: any[];
  };
}

/**
 * Kullanıcının hesap ID listesini getirir
 */
async function getUserAccountIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId);

  if (error) {
    console.error('[DATA_MANAGER] Failed to fetch account IDs:', error);
    throw new Error('Hesap bilgileri alınamadı.');
  }

  return (data || []).map(row => row.id);
}

export const dataManager = {
  /**
   * Tüm verileri JSON olarak dışa aktar
   */
  async exportData(userId: string): Promise<BackupData> {
    try {
      const accountIds = await getUserAccountIds(userId);

      const [
        { data: accounts, error: errAcc },
        { data: debts, error: errDebts },
        { data: installments, error: errInst },
        { data: recurringFlows, error: errRec },
        { data: savingGoals, error: errGoals },
        { data: dashboardLayouts, error: errLayout }
      ] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('installments').select('*').eq('user_id', userId),
        supabase.from('recurring_flows').select('*').eq('user_id', userId),
        supabase.from('saving_goals').select('*').eq('user_id', userId),
        supabase.from('dashboard_layouts').select('*').eq('user_id', userId)
      ]);

      // Hata kontrolü
      if (errAcc || errDebts || errInst || errRec || errGoals || errLayout) {
        throw new Error('Veriler çekilirken bir hata oluştu.');
      }

      // Transactions account_id üzerinden çekilmeli
      let transactions: any[] = [];
      if (accountIds.length > 0) {
        const { data: txData, error: errTx } = await supabase
          .from('transactions')
          .select('*')
          .in('account_id', accountIds);
        
        if (errTx) {
          console.error('[DATA_EXPORT_ERROR] Table: transactions', errTx);
          throw new Error('İşlem verileri dışa aktarılamadı.');
        }
        transactions = txData || [];
      }

      return {
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        app: 'FinansKoçu',
        userId,
        data: {
          accounts: accounts || [],
          transactions: transactions,
          debts: debts || [],
          installments: installments || [],
          recurringFlows: recurringFlows || [],
          savingGoals: savingGoals || [],
          dashboardLayouts: dashboardLayouts || []
        }
      };
    } catch (error: any) {
      console.error('[DATA_EXPORT_ERROR]', error);
      throw error;
    }
  },

  /**
   * Verileri sıfırla (Auth ve Profil hariç)
   */
  async resetData(userId: string): Promise<void> {
    try {
      const accountIds = await getUserAccountIds(userId);

      // Reset sırası önemli (Foreign Key kısıtlamaları için)
      // 1. Transactions (Account bağımlı)
      if (accountIds.length > 0) {
        const { error: txErr } = await supabase
          .from('transactions')
          .delete()
          .in('account_id', accountIds);
        
        if (txErr) {
          console.error('[DATA_RESET_ERROR] Table: transactions', txErr);
          throw new Error('İşlemler tablosu sıfırlanırken hata oluştu.');
        }
      }

      // 2. Diğer tablolar (user_id bazlı)
      const directOwnershipTables = [
        'installments',
        'debts',
        'recurring_flows',
        'saving_goals',
        'dashboard_layouts'
      ];

      for (const table of directOwnershipTables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);
        
        if (error) {
          console.error(`[DATA_RESET_ERROR] Table: ${table}`, error);
          throw new Error(`${table} tablosu sıfırlanırken hata oluştu.`);
        }
      }

      // 3. Accounts (En son silinmeli)
      const { error: accErr } = await supabase
        .from('accounts')
        .delete()
        .eq('user_id', userId);
      
      if (accErr) {
        console.error('[DATA_RESET_ERROR] Table: accounts', accErr);
        throw new Error('Hesaplar tablosu sıfırlanırken hata oluştu.');
      }
    } catch (error: any) {
      console.error('[DATA_RESET_GLOBAL_ERROR]', error);
      throw error;
    }
  },

  /**
   * Verileri geri yükle (Replace modunda)
   */
  async importData(userId: string, backup: BackupData): Promise<void> {
    if (backup.schemaVersion !== '1.0.0') {
      throw new Error('Geçersiz yedek dosyası sürümü.');
    }

    // Önce mevcut verileri sıfırla
    await this.resetData(userId);

    const tablesMap: Record<string, keyof BackupData['data']> = {
      'accounts': 'accounts',
      'saving_goals': 'savingGoals',
      'debts': 'debts',
      'installments': 'installments',
      'recurring_flows': 'recurringFlows',
      'transactions': 'transactions',
      'dashboard_layouts': 'dashboardLayouts'
    };

    // Sırayla tabloları doldur
    // Not: Accounts en önce eklenmeli çünkü transactions ve diğerleri buna bağlı olabilir
    const order = ['accounts', 'saving_goals', 'debts', 'installments', 'recurring_flows', 'transactions', 'dashboard_layouts'];

    for (const table of order) {
      const dataKey = tablesMap[table];
      const rows = backup.data[dataKey];

      if (rows && rows.length > 0) {
        const sanitizedRows = rows.map((row: any) => {
          const { created_at, updated_at, user_id, ...rest } = row;
          
          // Transactions tablosunda user_id kolonu yok
          if (table === 'transactions') {
            return rest;
          }

          return {
            ...rest,
            user_id: userId
          };
        });

        console.log(`[DATA_IMPORT] Inserting ${sanitizedRows.length} rows into ${table}...`);
        
        const { error } = await supabase.from(table).insert(sanitizedRows);
        
        if (error) {
          console.error(`[DATA_IMPORT_ERROR] Table: ${table}`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(`${table} verileri geri yüklenirken hata oluştu: ${error.message}`);
        }
      }
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
  }
};
