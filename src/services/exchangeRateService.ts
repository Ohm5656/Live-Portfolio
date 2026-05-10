export type ExchangeRateStatus = 'live' | 'cached' | 'fallback';

export interface ExchangeRateResponse {
  rate: number;
  status: ExchangeRateStatus;
  lastUpdated: number;
  errorReason?: string;
}

export const exchangeRateService = {
  async getUsdToThbRate(): Promise<ExchangeRateResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('/api/exchange-rate', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data?.rate;

      if (typeof rate !== 'number') {
        throw new Error('Invalid response format');
      }

      return {
        rate,
        status: 'live',
        lastUpdated: Date.now(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const name = error instanceof Error ? error.name : '';

      console.warn('Failed to fetch exchange rate, keeping cached rate if available:', message);
      let reason = message;
      if (name === 'AbortError') {
        reason = 'Request timeout';
      } else if (message.includes('fetch')) {
        reason = 'Network error / API unavailable';
      }

      return {
        rate: 0,
        status: 'fallback',
        lastUpdated: Date.now(),
        errorReason: reason,
      };
    }
  }
};
