import {
  CachedPrice,
  ExchangeRateState,
  PortfolioItem,
  PortfolioSnapshot,
  TriggeredAlerts,
} from '@/types/portfolio';

const FALLBACK_EXCHANGE_RATE: ExchangeRateState = {
  rate: 0,
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
  const normalizedStatus =
    status === 'live' || status === 'cached' || status === 'fallback'
      ? status
      : FALLBACK_EXCHANGE_RATE.status;
  const normalizedRate = typeof value.rate === 'number' && Number.isFinite(value.rate) ? value.rate : 0;
  const hasUsableRate = normalizedStatus !== 'fallback' && normalizedRate > 0;

  return {
    rate: hasUsableRate ? normalizedRate : 0,
    status: hasUsableRate ? normalizedStatus : FALLBACK_EXCHANGE_RATE.status,
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

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeAlertSettings(value: unknown): PortfolioItem['alertSettings'] {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    enableAthAlert: value.enableAthAlert === true,
    targetPrice: normalizeNullableNumber(value.targetPrice),
    profitAlertPercent: normalizeNullableNumber(value.profitAlertPercent),
    lossAlertPercent: normalizeNullableNumber(value.lossAlertPercent),
  };
}

function normalizePortfolioItems(value: unknown): PortfolioItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((item, index) => {
    const priceCurrency = item.priceCurrency === 'THB' ? 'THB' : 'USD';
    const legacyExchangeRate = normalizeNumber(item.exchangeRate, FALLBACK_EXCHANGE_RATE.rate);
    const buyExchangeRate = normalizeNumber(item.buyExchangeRate, legacyExchangeRate);
    const exchangeRateCapturedAt =
      typeof item.exchangeRateCapturedAt === 'number' && Number.isFinite(item.exchangeRateCapturedAt)
        ? item.exchangeRateCapturedAt
        : undefined;

    return {
      id: typeof item.id === 'string' ? item.id : `portfolio-item-${index}`,
      symbol: typeof item.symbol === 'string' ? item.symbol : '',
      name: typeof item.name === 'string' ? item.name : '',
      investedAmountTHB: normalizeNumber(item.investedAmountTHB, 0),
      buyPrice: normalizeNumber(item.buyPrice, 0),
      priceCurrency,
      buyExchangeRate,
      exchangeRateCapturedAt,
      exchangeRate: legacyExchangeRate,
      useGlobalExchangeRate: item.useGlobalExchangeRate !== false,
      alertSettings: normalizeAlertSettings(item.alertSettings),
    };
  });
}

export function normalizePortfolioSnapshot(value: unknown): PortfolioSnapshot {
  if (!isRecord(value)) {
    return createDefaultPortfolioSnapshot();
  }

  return {
    isSetupComplete: value.isSetupComplete === true,
    items: normalizePortfolioItems(value.items),
    triggeredAlerts: isRecord(value.triggeredAlerts) ? (value.triggeredAlerts as TriggeredAlerts) : {},
    globalExchangeRate: normalizeExchangeRate(value.globalExchangeRate),
    cachedPrices: normalizeCachedPrices(value.cachedPrices),
  };
}

export function hasPortfolioData(snapshot: PortfolioSnapshot) {
  return snapshot.isSetupComplete || snapshot.items.length > 0;
}
