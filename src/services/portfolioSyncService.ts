import { normalizePortfolioSnapshot } from '@/lib/portfolioSnapshot';
import { supabase } from '@/lib/supabaseClient';
import { PortfolioSnapshot } from '@/types/portfolio';

const PORTFOLIO_TABLE = 'portfolios';

interface PortfolioRow {
  user_id: string;
  is_setup_complete: boolean | null;
  items: unknown;
  triggered_alerts: unknown;
  global_exchange_rate: unknown;
  cached_prices: unknown;
  updated_at: string | null;
}

export interface RemotePortfolio {
  snapshot: PortfolioSnapshot;
  updatedAt: string | null;
}

export const portfolioSyncService = {
  async loadPortfolio(userId: string): Promise<RemotePortfolio | null> {
    const { data, error } = await supabase
      .from(PORTFOLIO_TABLE)
      .select(
        'user_id,is_setup_complete,items,triggered_alerts,global_exchange_rate,cached_prices,updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const row = data as PortfolioRow;

    return {
      snapshot: normalizePortfolioSnapshot({
        isSetupComplete: row.is_setup_complete === true,
        items: row.items,
        triggeredAlerts: row.triggered_alerts,
        globalExchangeRate: row.global_exchange_rate,
        cachedPrices: row.cached_prices,
      }),
      updatedAt: row.updated_at,
    };
  },

  async savePortfolio(userId: string, snapshot: PortfolioSnapshot): Promise<void> {
    const payload = {
      user_id: userId,
      is_setup_complete: snapshot.isSetupComplete,
      items: snapshot.items,
      triggered_alerts: snapshot.triggeredAlerts,
      global_exchange_rate: snapshot.globalExchangeRate,
      cached_prices: snapshot.cachedPrices,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(PORTFOLIO_TABLE).upsert(payload, {
      onConflict: 'user_id',
    });

    if (error) {
      throw new Error(error.message);
    }
  },
};
