export type MarketPriceStatus = 'live' | 'cached' | 'mock';

export interface MarketPriceResult {
  price: number;
  status: MarketPriceStatus;
  symbol: string;
}

export const marketPriceService = {
  async getLivePrice(symbol: string): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const response = await fetch(`/api/market-price?symbol=${symbol.toUpperCase()}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Proxy API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && typeof data.price === 'number' && data.price > 0) {
        return data.price;
      }
      
      throw new Error(data.error || 'Invalid price data or symbol not found');
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
};
