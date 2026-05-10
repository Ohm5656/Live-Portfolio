import { Asset } from '@/types/portfolio';

// Mock data store
const MOCK_CURRENT_PRICES: Record<string, number> = {
  AAPL: 195,
  NVDA: 125,
  TSLA: 250,
  MSFT: 420,
  AMZN: 185,
  GOOGL: 170,
  META: 500,
  SPY: 540,
  VOO: 500,
  IVV: 550,
  QQQ: 460,
  BTC: 65000,
  ETH: 3500,
};

const MOCK_ATH_PRICES: Record<string, number> = {
  AAPL: 199,
  NVDA: 140,
  TSLA: 414,
  MSFT: 430,
  SPY: 545,
  VOO: 505,
  IVV: 555,
  QQQ: 470,
  BTC: 69000,
  ETH: 4800,
};

const POPULAR_ASSETS: Asset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf' },
  { symbol: 'IVV', name: 'iShares Core S&P 500 ETF', type: 'etf' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
];

export const mockPriceService = {
  getCurrentPrice(symbol: string): number {
    // In a real scenario, this might return a Promise
    return MOCK_CURRENT_PRICES[symbol.toUpperCase()] || 0;
  },

  getAthPrice(symbol: string): number {
    return MOCK_ATH_PRICES[symbol.toUpperCase()] || 0;
  },

  searchAssets(query: string): Asset[] {
    if (!query) return [];
    const q = query.toLowerCase();
    return POPULAR_ASSETS.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q)
    );
  },

  getPopularAssets(): Asset[] {
    return POPULAR_ASSETS;
  },
};
