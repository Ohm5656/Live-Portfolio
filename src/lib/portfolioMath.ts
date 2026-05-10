import { PortfolioItem } from '@/types/portfolio';

export interface PortfolioItemCalculation {
  units: number;
  currentValueTHB: number;
  profitLossTHB: number;
  profitLossPercent: number;
  isProfit: boolean;
  buyExchangeRate: number;
  currentExchangeRate: number;
  currentExchangeRateSource: 'global' | 'cost' | 'missing';
}

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function getBuyExchangeRate(item: PortfolioItem, fallbackRate = 0) {
  if (item.priceCurrency === 'THB') {
    return 1;
  }

  if (isPositiveNumber(item.buyExchangeRate)) {
    return item.buyExchangeRate;
  }

  if (isPositiveNumber(item.exchangeRate)) {
    return item.exchangeRate;
  }

  return isPositiveNumber(fallbackRate) ? fallbackRate : 0;
}

export function calculatePortfolioItem(
  item: PortfolioItem,
  activePrice: number,
  currentUsdThbRate: number
): PortfolioItemCalculation {
  const investedAmount = item.investedAmountTHB || 0;
  const buyPrice = item.buyPrice || 0;
  const safeActivePrice = activePrice || 0;
  const buyExchangeRate = getBuyExchangeRate(item, currentUsdThbRate);
  const hasGlobalExchangeRate = item.priceCurrency === 'USD' && isPositiveNumber(currentUsdThbRate);
  const currentExchangeRate =
    item.priceCurrency === 'THB'
      ? 1
      : hasGlobalExchangeRate
        ? currentUsdThbRate
        : buyExchangeRate;
  const currentExchangeRateSource =
    item.priceCurrency !== 'USD'
      ? 'global'
      : hasGlobalExchangeRate
        ? 'global'
        : isPositiveNumber(currentExchangeRate)
          ? 'cost'
          : 'missing';

  let units = 0;
  let currentValueTHB = 0;

  if (investedAmount > 0 && buyPrice > 0) {
    if (item.priceCurrency === 'USD') {
      if (buyExchangeRate > 0 && currentExchangeRate > 0) {
        units = investedAmount / buyExchangeRate / buyPrice;
        currentValueTHB = units * safeActivePrice * currentExchangeRate;
      }
    } else {
      units = investedAmount / buyPrice;
      currentValueTHB = units * safeActivePrice;
    }
  }

  const profitLossTHB = currentValueTHB - investedAmount;
  const profitLossPercent = investedAmount > 0 ? (profitLossTHB / investedAmount) * 100 : 0;

  return {
    units,
    currentValueTHB,
    profitLossTHB,
    profitLossPercent,
    isProfit: profitLossTHB >= 0,
    buyExchangeRate,
    currentExchangeRate,
    currentExchangeRateSource,
  };
}
