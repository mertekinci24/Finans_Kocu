import { supabase } from '../adapter';
import { Widget, DashboardLayout, DEFAULT_DASHBOARD_LAYOUT } from '@/types/widgets';

export interface IDashboardLayoutRepository {
  getLayout(userId: string): Promise<DashboardLayout>;
  saveLayout(userId: string, layout: DashboardLayout): Promise<DashboardLayout>;
  resetLayout(userId: string): Promise<DashboardLayout>;
}

export class SupabaseDashboardLayoutRepository implements IDashboardLayoutRepository {
  async getLayout(userId: string): Promise<DashboardLayout> {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      return {
        userId: data.user_id,
        widgets: data.widgets as Widget[],
        gridColumns: data.grid_columns || 4,
        lastUpdated: new Date(data.last_updated),
        version: data.version || 1,
      };
    }

    return {
      userId,
      widgets: DEFAULT_DASHBOARD_LAYOUT,
      gridColumns: 4,
      lastUpdated: new Date(),
      version: 1,
    };
  }

  async saveLayout(userId: string, layout: DashboardLayout): Promise<DashboardLayout> {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .upsert(
        {
          user_id: userId,
          widgets: layout.widgets,
          grid_columns: layout.gridColumns,
          last_updated: new Date().toISOString(),
          version: layout.version,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to save layout');

    return {
      userId: data.user_id,
      widgets: data.widgets as Widget[],
      gridColumns: data.grid_columns,
      lastUpdated: new Date(data.last_updated),
      version: data.version,
    };
  }

  async resetLayout(userId: string): Promise<DashboardLayout> {
    const defaultLayout: DashboardLayout = {
      userId,
      widgets: DEFAULT_DASHBOARD_LAYOUT,
      gridColumns: 4,
      lastUpdated: new Date(),
      version: 1,
    };

    return this.saveLayout(userId, defaultLayout);
  }
}
