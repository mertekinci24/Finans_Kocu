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

export const dataManager = {
  /**
   * Tüm verileri JSON olarak dışa aktar
   */
  async exportData(userId: string): Promise<BackupData> {
    try {
      const [
        { data: accounts },
        { data: transactions },
        { data: debts },
        { data: installments },
        { data: recurringFlows },
        { data: savingGoals },
        { data: dashboardLayouts }
      ] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('installments').select('*').eq('user_id', userId),
        supabase.from('recurring_flows').select('*').eq('user_id', userId),
        supabase.from('saving_goals').select('*').eq('user_id', userId),
        supabase.from('dashboard_layouts').select('*').eq('user_id', userId)
      ]);

      return {
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        app: 'FinansKoçu',
        userId,
        data: {
          accounts: accounts || [],
          transactions: transactions || [],
          debts: debts || [],
          installments: installments || [],
          recurringFlows: recurringFlows || [],
          savingGoals: savingGoals || [],
          dashboardLayouts: dashboardLayouts || []
        }
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
    const tables = [
      'transactions',
      'installments',
      'debts',
      'recurring_flows',
      'saving_goals',
      'dashboard_layouts',
      'accounts' // En son accounts silinmeli çünkü foreign key ilişkisi olabilir
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error(`[DATA_RESET_ERROR] Table: ${table}`, error);
        throw new Error(`${table} tablosu sıfırlanırken hata oluştu.`);
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
        // Her satırı sanitize et:
        // 1. user_id'yi güncel userId ile override et (güvenlik)
        // 2. created_at ve updated_at alanlarını kaldır (Supabase otomatik atasın)
        const sanitizedRows = rows.map((row: any) => {
          const { created_at, updated_at, ...rest } = row;
          return {
            ...rest,
            user_id: userId
          };
        });

        console.log(`[DATA_IMPORT] Inserting ${sanitizedRows.length} rows into ${table}...`);
        
        const { error } = await supabase.from(table).insert(sanitizedRows);
        
        if (error) {
          console.error(`[DATA_IMPORT_ERROR] Table: ${table}`, error);
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
