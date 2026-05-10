import { NextResponse } from 'next/server';

interface CacheItem {
  rate: number;
  timestamp: number;
}

// In-memory cache to prevent excessive calls and speed up response
const rateCache: { current: CacheItem | null } = { current: null };
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // 1. Check Cache
    if (rateCache.current && (Date.now() - rateCache.current.timestamp < CACHE_DURATION_MS)) {
      return NextResponse.json({ rate: rateCache.current.rate, cached: true });
    }

    // 2. Fetch from Frankfurter
    const response = await fetch('https://api.frankfurter.app/latest?base=USD&symbols=THB', {
      // Revalidate at Next.js fetch level just in case
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      if (rateCache.current) {
        return NextResponse.json({ rate: rateCache.current.rate, cached: true, warning: 'API failed, serving stale cache' });
      }
      return NextResponse.json({ error: `Frankfurter API Error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    
    if (data && data.rates && typeof data.rates.THB === 'number') {
      const rate = data.rates.THB;
      // 3. Update Cache
      rateCache.current = { rate, timestamp: Date.now() };
      return NextResponse.json({ rate, cached: false });
    }

    return NextResponse.json({ error: 'Invalid exchange rate data' }, { status: 500 });

  } catch (error: unknown) {
    console.error('Exchange Rate API Route Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
