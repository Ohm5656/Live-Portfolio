"use client";

import React, { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
}

interface TradingViewWidgetOptions {
  autosize: boolean;
  symbol: string;
  interval: string;
  timezone: string;
  theme: string;
  style: string;
  locale: string;
  enable_publishing: boolean;
  backgroundColor: string;
  gridColor: string;
  hide_top_toolbar: boolean;
  hide_legend: boolean;
  save_image: boolean;
  container_id: string;
}

interface TradingViewNamespace {
  widget: new (options: TradingViewWidgetOptions) => unknown;
}

declare global {
  interface Window {
    TradingView?: TradingViewNamespace;
  }
}

export function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine the TradingView symbol format (e.g., BINANCE:BTCUSD, NASDAQ:AAPL)
    // For MVP, we'll try to let TradingView auto-resolve or prepend common exchanges if crypto
    let tvSymbol = symbol.toUpperCase();
    if (tvSymbol === "BTC" || tvSymbol === "ETH") {
      tvSymbol = `BINANCE:${tvSymbol}USDT`;
    } else if (tvSymbol === "SPY" || tvSymbol === "VOO" || tvSymbol === "IVV" || tvSymbol === "QQQ") {
      tvSymbol = `AMEX:${tvSymbol}`;
    } else {
      tvSymbol = `NASDAQ:${tvSymbol}`; // Fallback to NASDAQ for tech stocks
    }

    if (!containerRef.current) return;
    containerRef.current.innerHTML = ''; // Clear previous chart

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: "D",
          timezone: "Asia/Bangkok",
          theme: "dark",
          style: "1",
          locale: "th_TH",
          enable_publishing: false,
          backgroundColor: "#0A1128", // Match our deep navy
          gridColor: "#1E2A50",
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerRef.current.id,
        });
      }
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup script
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol]);

  return (
    <div 
      id={`tv-chart-${symbol}`} 
      ref={containerRef} 
      className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-white/10"
    />
  );
}
