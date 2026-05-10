import { NextResponse } from 'next/server';

interface CacheItem {
  price: number;
  timestamp: number;
}

// In-memory cache to prevent Finnhub 429 Rate Limits
// Note: In development/local production, this persists as long as the server runs.
const priceCache = new Map<string, CacheItem>();
const CACHE_DURATION_MS = 60 * 1000; // 60 seconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // 1. Check Cache
    const cached = priceCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
      return NextResponse.json({ price: cached.price, cached: true });
    }

    // 2. Fetch from Finnhub
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Finnhub API key is missing on server' }, { status: 500 });
    }

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    
    if (!response.ok) {
      // If we got rate limited, try to serve stale cache as an absolute last resort on the server
      if (response.status === 429 && cached) {
        return NextResponse.json({ price: cached.price, cached: true, warning: 'Rate limited, serving stale cache' });
      }
      return NextResponse.json({ error: `Finnhub API Error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    
    if (data && typeof data.c === 'number' && data.c > 0) {
      // 3. Update Cache
      priceCache.set(symbol, { price: data.c, timestamp: Date.now() });
      return NextResponse.json({ price: data.c, cached: false });
    }

    return NextResponse.json({ error: 'Invalid price data or symbol not found' }, { status: 404 });

  } catch (error: unknown) {
    console.error('Market Price API Route Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
