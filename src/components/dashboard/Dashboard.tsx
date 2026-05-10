"use client";

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { PortfolioCard } from './PortfolioCard';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { mockPriceService } from '@/services/mockPriceService';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { calculatePortfolioItem } from '@/lib/portfolioMath';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, AlertTriangle, RefreshCcw, Activity } from 'lucide-react';
import { exchangeRateService } from '@/services/exchangeRateService';
import { marketPriceService } from '@/services/marketPriceService';
import { MarketPriceStatus } from '@/types/portfolio';

const EXCHANGE_RATE_REFRESH_MS = 60 * 60 * 1000; // 1 hour

const TradingViewChart = dynamic(
  () => import('../chart/TradingViewChart').then((module) => module.TradingViewChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-white/10 text-sm text-slate-400">
        Loading chart...
      </div>
    ),
  }
);

export function Dashboard() {
  const { items, removeItem, globalExchangeRate, updateGlobalExchangeRate, cachedPrices, updateCachedPrice, resetSetup } = usePortfolioStore();
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string | null>(null);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  
  // Local state to hold the current resolved price and status for each symbol
  const [activePrices, setActivePrices] = useState<Record<string, { price: number; status: MarketPriceStatus }>>({});
  
  const fetchExchangeRate = React.useCallback(async () => {
    setIsRefreshingRate(true);
    const result = await exchangeRateService.getUsdToThbRate();
    const hasStoredExchangeRate = globalExchangeRate.status !== 'fallback' && globalExchangeRate.rate > 0;
    
    if (result.status === 'fallback' && hasStoredExchangeRate) {
      updateGlobalExchangeRate(
        globalExchangeRate.rate,
        'cached',
        globalExchangeRate.lastUpdated || Date.now(),
        result.errorReason
      );
    } else {
      updateGlobalExchangeRate(result.rate, result.status, result.lastUpdated || Date.now(), result.errorReason);
    }
    setIsRefreshingRate(false);
  }, [globalExchangeRate.lastUpdated, globalExchangeRate.rate, globalExchangeRate.status, updateGlobalExchangeRate]);
  
  const fetchMarketPrices = React.useCallback(async () => {
    const uniqueSymbols = Array.from(new Set(items.map(item => item.symbol.toUpperCase())));
    const newPrices: Record<string, { price: number; status: MarketPriceStatus }> = {};
    const latestCachedPrices = usePortfolioStore.getState().cachedPrices;

    await Promise.all(uniqueSymbols.map(async (symbol) => {
      try {
        const livePrice = await marketPriceService.getLivePrice(symbol);
        newPrices[symbol] = { price: livePrice, status: 'live' };
        updateCachedPrice(symbol, livePrice);
      } catch (error) {
        console.warn(`Failed to fetch live price for ${symbol}:`, error);
        const cachedPrice = latestCachedPrices[symbol];
        // Fallback to cache
        if (cachedPrice) {
          newPrices[symbol] = { price: cachedPrice.price, status: 'cached' };
        } else {
          // Final fallback to mock
          newPrices[symbol] = { price: mockPriceService.getCurrentPrice(symbol), status: 'mock' };
        }
      }
    }));
    
    setActivePrices(prev => ({ ...prev, ...newPrices }));
  }, [items, updateCachedPrice]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      if (globalExchangeRate.status === 'fallback' || !globalExchangeRate.lastUpdated || (Date.now() - globalExchangeRate.lastUpdated > EXCHANGE_RATE_REFRESH_MS)) {
        void fetchExchangeRate();
      }
    }, 0);

    const rateInterval = setInterval(fetchExchangeRate, EXCHANGE_RATE_REFRESH_MS); // Poll exchange rate every hour
    
    return () => {
      clearTimeout(initialFetch);
      clearInterval(rateInterval);
    };
  }, [fetchExchangeRate, globalExchangeRate.lastUpdated, globalExchangeRate.status]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      if (items.length === 0) {
        setActivePrices({});
        return;
      }

      void fetchMarketPrices();
    }, 0);

    const interval = setInterval(() => {
      void fetchMarketPrices();
    }, 2 * 60 * 1000); // Poll prices every 2 mins
    
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchMarketPrices, items.length]);

  const resolvedPrices = useMemo(() => {
    const prices = { ...activePrices };

    items.forEach((item) => {
      const symbol = item.symbol.toUpperCase();
      const cachedPrice = cachedPrices[symbol];

      if (!prices[symbol] && cachedPrice) {
        prices[symbol] = { price: cachedPrice.price, status: 'cached' };
      }
    });

    return prices;
  }, [activePrices, cachedPrices, items]);

  const visiblePortfolioRows = useMemo(() => {
    return items.flatMap((item) => {
      const priceData = resolvedPrices[item.symbol.toUpperCase()];

      if (!priceData || priceData.status === 'mock') {
        return [];
      }

      return [{ item, priceData }];
    });
  }, [items, resolvedPrices]);

  const hiddenFallbackCount = useMemo(() => {
    return items.filter((item) => resolvedPrices[item.symbol.toUpperCase()]?.status === 'mock').length;
  }, [items, resolvedPrices]);

  const pendingPriceCount = items.length - visiblePortfolioRows.length - hiddenFallbackCount;

  const summary = useMemo(() => {
    let totalInvestedTHB = 0;
    let totalCurrentValueTHB = 0;

    visiblePortfolioRows.forEach(({ item, priceData }) => {
      const currentPrice = priceData.price;
      
      totalInvestedTHB += item.investedAmountTHB;
      
      const calculation = calculatePortfolioItem(item, currentPrice, globalExchangeRate.rate);
      totalCurrentValueTHB += calculation.currentValueTHB;
    });

    const totalProfitLossTHB = totalCurrentValueTHB - totalInvestedTHB;
    const totalProfitLossPercent = totalInvestedTHB > 0 ? (totalProfitLossTHB / totalInvestedTHB) * 100 : 0;

    return { totalInvestedTHB, totalCurrentValueTHB, totalProfitLossTHB, totalProfitLossPercent };
  }, [visiblePortfolioRows, globalExchangeRate.rate]); 

  const isTotalProfit = summary.totalProfitLossTHB >= 0;

  const renderExchangeRateStatus = () => {
    const isLive = globalExchangeRate.status === 'live';
    const isCached = globalExchangeRate.status === 'cached';
    const isFallback = globalExchangeRate.status === 'fallback';
    const hasExchangeRate = globalExchangeRate.rate > 0;
    
    return (
      <Card className="mb-6 border-white/5 bg-navy-800/40">
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLive ? 'bg-profit/20 text-profit-light' : 'bg-yellow-500/20 text-yellow-300'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">USD/THB Exchange Rate</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  isLive ? 'border-profit/30 text-profit-light bg-profit/10' : 
                  'border-yellow-500/30 text-yellow-300 bg-yellow-500/10'
                }`}>
                  {isLive ? 'Live' : isCached ? 'Cached' : 'Fallback'}
                </span>
              </div>
              <p className="text-2xl font-mono font-bold mt-0.5">
                {hasExchangeRate ? (
                  <>
                    {formatNumber(globalExchangeRate.rate, 4)} <span className="text-sm text-slate-400">฿/$</span>
                  </>
                ) : (
                  <span className="text-base font-medium text-slate-400">ยังไม่มีเรทที่บันทึกไว้</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:items-end gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Last updated:</span>
              <span className="text-slate-200">
                {globalExchangeRate.lastUpdated ? new Date(globalExchangeRate.lastUpdated).toLocaleTimeString() : 'Never'}
              </span>
              <button 
                onClick={fetchExchangeRate} 
                disabled={isRefreshingRate}
                className="ml-2 text-slate-500 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCcw className={`w-4 h-4 ${isRefreshingRate ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {isCached && (
              <span className="text-yellow-400/80 text-xs">⚠️ ไม่สามารถดึงค่าเงินล่าสุดได้ กำลังใช้ค่าเงินล่าสุดที่บันทึกไว้ ({globalExchangeRate.errorReason})</span>
            )}
            {isFallback && (
              <span className="text-yellow-400/80 text-xs">⚠️ ไม่สามารถดึงค่าเงินล่าสุดได้ และยังไม่มีเรทเดิมให้ใช้ ({globalExchangeRate.errorReason})</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Exchange Rate Status */}
      {renderExchangeRateStatus()}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-navy-800/80 border-gold/30 shadow-gold/5">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <p className="text-sm text-slate-400 mb-1">มูลค่าพอร์ตประมาณการ</p>
            <p className={`text-2xl font-bold ${isTotalProfit ? 'text-profit-light' : 'text-loss-light'}`}>
              {formatCurrency(summary.totalCurrentValueTHB)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <p className="text-sm text-slate-400 mb-1">เงินลงทุนรวม</p>
            <p className="text-xl font-medium">{formatCurrency(summary.totalInvestedTHB)}</p>
          </CardContent>
        </Card>

        <Card className={`border ${isTotalProfit ? 'border-profit/30' : 'border-loss/30'}`}>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <p className="text-sm text-slate-400 mb-1">กำไร/ขาดทุนรวม</p>
            <p className={`text-xl font-bold ${isTotalProfit ? 'text-profit-light' : 'text-loss-light'}`}>
              {isTotalProfit ? '+' : ''}{formatCurrency(summary.totalProfitLossTHB)}
            </p>
          </CardContent>
        </Card>

        <Card className={`border ${isTotalProfit ? 'border-profit/30' : 'border-loss/30'}`}>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <p className="text-sm text-slate-400 mb-1">อัตราผลตอบแทน</p>
            <p className={`text-2xl font-bold ${isTotalProfit ? 'text-profit-light' : 'text-loss-light'}`}>
              {isTotalProfit ? '+' : ''}{formatNumber(summary.totalProfitLossPercent)}%
            </p>
          </CardContent>
        </Card>
      </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">สินทรัพย์ของคุณ ({items.length})</h2>
              <Button variant="outline" size="sm" className="border-gold/30 text-gold hover:bg-gold/10" onClick={resetSetup}>
                <Plus className="w-4 h-4 mr-1" /> เพิ่มสินทรัพย์
              </Button>
            </div>

      {(hiddenFallbackCount > 0 || pendingPriceCount > 0) && items.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="flex flex-col gap-2 p-4 text-sm text-yellow-100 md:flex-row md:items-center">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-300" />
            <div>
              <p className="font-medium">Some assets are hidden until market prices are available.</p>
              <p className="text-xs text-yellow-200/80">
                Hidden fallback: {hiddenFallbackCount} / Waiting for first price: {Math.max(pendingPriceCount, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="py-12 text-center border-dashed border-white/20">
          <CardContent className="flex flex-col items-center">
            <AlertTriangle className="w-12 h-12 text-slate-500 mb-3" />
            <p className="text-lg text-slate-300">ยังไม่มีสินทรัพย์ในพอร์ต</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">เพิ่มสินทรัพย์เพื่อเริ่มติดตามมูลค่าพอร์ตของคุณ</p>
            <Button variant="gold" onClick={resetSetup}>กลับไปหน้าเลือกสินทรัพย์</Button>
          </CardContent>
        </Card>
      ) : visiblePortfolioRows.length === 0 ? (
        <Card className="py-12 text-center border-dashed border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex flex-col items-center">
            <AlertTriangle className="w-12 h-12 text-yellow-300 mb-3" />
            <p className="text-lg text-slate-300">Waiting for live or cached market prices</p>
            <p className="text-sm text-slate-500 mt-1">
              Assets will reappear automatically after the next successful price refresh.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {visiblePortfolioRows.map(({ item, priceData }) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <PortfolioCard 
                  item={item} 
                  activePrice={priceData.price}
                  priceStatus={priceData.status}
                  onOpenChart={setSelectedChartSymbol} 
                  onRemove={removeItem}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Chart Modal Overlay */}
      <AnimatePresence>
        {selectedChartSymbol && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-900/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-5xl h-[80vh] flex flex-col bg-navy-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-gold">{selectedChartSymbol}</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedChartSymbol(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 bg-[#0A1128] p-1">
                <TradingViewChart symbol={selectedChartSymbol} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
