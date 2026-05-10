export type Currency = 'THB' | 'USD';
export type ExchangeRateStatus = 'live' | 'cached' | 'fallback';
export type MarketPriceStatus = 'live' | 'cached' | 'mock';

export interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'etf';
}

export interface PortfolioItem {
  id: string; // Unique ID (could be symbol if no duplicates allowed, but UUID is safer for multiple entries)
  symbol: string;
  name: string;
  investedAmountTHB: number;
  buyPrice: number;
  priceCurrency: Currency;
  exchangeRate: number; // The manual override rate if useGlobalExchangeRate is false
  useGlobalExchangeRate: boolean; // True to sync with global live rate, False to use manual
  alertSettings?: AlertSettings;
}

export interface ExchangeRateState {
  rate: number;
  status: ExchangeRateStatus;
  lastUpdated: number | null;
  errorReason?: string;
}

export interface AlertSettings {
  enableAthAlert: boolean;
  targetPrice: number | null;
  profitAlertPercent: number | null;
  lossAlertPercent: number | null;
}

// Added to track which alerts have been triggered so they don't spam
export interface TriggeredAlerts {
  [itemId: string]: {
    athTriggered: boolean;
    targetPriceTriggered: boolean;
    profitTriggered: boolean;
    lossTriggered: boolean;
  };
}

export interface CachedPrice {
  price: number;
  lastUpdated: number;
}

export interface PortfolioSnapshot {
  isSetupComplete: boolean;
  items: PortfolioItem[];
  triggeredAlerts: TriggeredAlerts;
  globalExchangeRate: ExchangeRateState;
  cachedPrices: Record<string, CachedPrice>;
}

export type PortfolioSyncMode = 'guest' | 'supabase';

export interface AuthUserProfile {
  id: string;
  email: string | null;
}
