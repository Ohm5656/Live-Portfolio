"use client";

import React, { useMemo } from 'react';
import { PortfolioItem } from '@/types/portfolio';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { LineChart, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { MarketPriceStatus } from '@/types/portfolio';
import { calculatePortfolioItem } from '@/lib/portfolioMath';

interface PortfolioCardProps {
  item: PortfolioItem;
  activePrice: number;
  priceStatus: MarketPriceStatus;
  onOpenChart: (symbol: string) => void;
  onRemove: (id: string) => void;
}

export function PortfolioCard({ item, activePrice, priceStatus, onOpenChart, onRemove }: PortfolioCardProps) {
  const { globalExchangeRate } = usePortfolioStore();

  const calculations = useMemo(
    () => calculatePortfolioItem(item, activePrice, globalExchangeRate.rate),
    [item, activePrice, globalExchangeRate.rate]
  );

  const {
    units,
    currentValueTHB,
    profitLossTHB,
    profitLossPercent,
    isProfit,
    buyExchangeRate,
    currentExchangeRate,
    currentExchangeRateSource,
  } = calculations;

  const renderExchangeRateIndicator = () => {
    if (item.priceCurrency !== 'USD') return null;

    const { status } = globalExchangeRate;
    const label =
      status === 'live'
        ? 'Live'
        : status === 'cached'
          ? 'Cached'
          : currentExchangeRateSource === 'cost'
            ? 'Saved cost rate'
            : 'No rate';

    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-[10px] h-5 opacity-80 gap-1",
          status === 'live' ? 'border-profit/30 text-profit-light' : 'border-yellow-500/30 text-yellow-300'
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", status === 'live' ? 'bg-profit' : 'bg-yellow-500')} />
        USD/THB • {label}
      </Badge>
    );
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-white/20 ${isProfit ? 'hover:shadow-profit/10' : 'hover:shadow-loss/10'}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${isProfit ? 'bg-profit' : 'bg-loss'}`} />
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-100">{item.symbol}</h3>
              <Badge variant={isProfit ? 'success' : 'danger'}>
                {isProfit ? '+' : ''}{formatNumber(profitLossPercent)}%
              </Badge>
            </div>
            <p className="text-sm text-slate-400 truncate max-w-[150px]">{item.name}</p>
            {renderExchangeRateIndicator()}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">ราคาตลาด ({item.priceCurrency})</p>
            <p className="font-mono text-xl font-bold text-slate-100 mb-1">{formatNumber(activePrice)}</p>
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] h-5 opacity-80 gap-1 float-right",
                priceStatus === 'live' ? 'border-profit/30 text-profit-light bg-profit/10' : 
                priceStatus === 'cached' ? 'border-yellow-500/30 text-yellow-300 bg-yellow-500/10' :
                'border-slate-500/30 text-slate-300 bg-slate-800'
              )}
            >
              {priceStatus === 'live' && <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-profit" />}
              {priceStatus === 'cached' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
              {priceStatus === 'mock' && <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
              {priceStatus === 'live' ? 'Live market price' : 
               priceStatus === 'cached' ? 'Cached market price' : 'Mock price fallback'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 bg-navy-800/30 p-3 rounded-lg border border-white/5">
          <div>
            <p className="text-xs text-slate-500">มูลค่าปัจจุบัน (THB)</p>
            <p className="font-semibold text-lg">{formatCurrency(currentValueTHB)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">กำไร/ขาดทุน (THB)</p>
            <p className={`font-semibold text-lg ${isProfit ? 'text-profit-light' : 'text-loss-light'}`}>
              {isProfit ? '+' : ''}{formatCurrency(profitLossTHB)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-400 mb-5">
          <div className="flex justify-between">
            <span>ราคาที่เข้าซื้อ:</span>
            <span className="font-mono text-slate-200">{formatNumber(item.buyPrice)} {item.priceCurrency}</span>
          </div>
          <div className="flex justify-between">
            <span>จำนวน:</span>
            <span className="font-mono text-slate-200">{formatNumber(units, 4)}</span>
          </div>
          <div className="flex justify-between">
            <span>เงินลงทุน:</span>
            <span className="font-mono text-slate-200">{formatCurrency(item.investedAmountTHB)}</span>
          </div>
          {item.priceCurrency === 'USD' && (
            <>
              <div className="flex justify-between">
                <span>เรทต้นทุน:</span>
                <span className="font-mono text-slate-200">{formatNumber(buyExchangeRate)} ฿/$</span>
              </div>
              <div className="flex justify-between">
                <span>{currentExchangeRateSource === 'cost' ? 'เรทที่ใช้ประเมิน:' : 'เรทปัจจุบัน:'}</span>
                <span className="font-mono text-slate-200">
                  {currentExchangeRate > 0 ? `${formatNumber(currentExchangeRate)} ฿/$` : '-'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 text-xs h-8"
            onClick={() => onOpenChart(item.symbol)}
          >
            <LineChart className="w-3.5 h-3.5 mr-1.5" /> ดูกราฟ
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            title="ตั้งค่าแจ้งเตือน"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
          </Button>
          <Button 
            variant="danger" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onRemove(item.id)}
            title="ลบ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
