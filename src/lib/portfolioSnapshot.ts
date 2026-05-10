import {
  CachedPrice,
  ExchangeRateState,
  PortfolioItem,
  PortfolioSnapshot,
  TriggeredAlerts,
} from '@/types/portfolio';

const FALLBACK_EXCHANGE_RATE: ExchangeRateState = {
  rate: 36.0,
  status: 'fallback',
  lastUpdated: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function createDefaultPortfolioSnapshot(): PortfolioSnapshot {
  return {
    isSetupComplete: false,
    items: [],
    triggeredAlerts: {},
    globalExchangeRate: { ...FALLBACK_EXCHANGE_RATE },
    cachedPrices: {},
  };
}

function normalizeExchangeRate(value: unknown): ExchangeRateState {
  if (!isRecord(value)) {
    return { ...FALLBACK_EXCHANGE_RATE };
  }

  const status = value.status;
  const lastUpdated = value.lastUpdated;

  return {
    rate: typeof value.rate === 'number' ? value.rate : FALLBACK_EXCHANGE_RATE.rate,
    status:
      status === 'live' || status === 'cached' || status === 'fallback'
        ? status
        : FALLBACK_EXCHANGE_RATE.status,
    lastUpdated: typeof lastUpdated === 'number' || lastUpdated === null ? lastUpdated : null,
    errorReason: typeof value.errorReason === 'string' ? value.errorReason : undefined,
  };
}

function normalizeCachedPrices(value: unknown): Record<string, CachedPrice> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, CachedPrice>>((acc, [symbol, entry]) => {
    if (!isRecord(entry)) {
      return acc;
    }

    if (typeof entry.price === 'number' && typeof entry.lastUpdated === 'number') {
      acc[symbol.toUpperCase()] = {
        price: entry.price,
        lastUpdated: entry.lastUpdated,
      };
    }

    return acc;
  }, {});
}

export function normalizePortfolioSnapshot(value: unknown): PortfolioSnapshot {
  if (!isRecord(value)) {
    return createDefaultPortfolioSnapshot();
  }

  return {
    isSetupComplete: value.isSetupComplete === true,
    items: Array.isArray(value.items) ? (value.items as PortfolioItem[]) : [],
    triggeredAlerts: isRecord(value.triggeredAlerts) ? (value.triggeredAlerts as TriggeredAlerts) : {},
    globalExchangeRate: normalizeExchangeRate(value.globalExchangeRate),
    cachedPrices: normalizeCachedPrices(value.cachedPrices),
  };
}

export function hasPortfolioData(snapshot: PortfolioSnapshot) {
  return snapshot.isSetupComplete || snapshot.items.length > 0;
}
