"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { mockPriceService } from '@/services/mockPriceService';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';

import { MarketPriceStatus } from '@/types/portfolio';

interface AlertSystemProps {
  activePrices: Record<string, { price: number; status: MarketPriceStatus }>;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function AlertSystem({ activePrices }: AlertSystemProps) {
  const { items, triggeredAlerts, markAlertTriggered } = usePortfolioStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtx.current) {
        const AudioContextClass =
          window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;

        if (!AudioContextClass) {
          return;
        }

        audioCtx.current = new AudioContextClass();
      }
      
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }, []);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    playBeep();

    // Auto remove after 5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, [playBeep]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (Object.keys(activePrices).length === 0) return;

    items.forEach(item => {
      const activeData = activePrices[item.symbol];
      if (!activeData) return;

      const currentPrice = activeData.price;
      const athPrice = mockPriceService.getAthPrice(item.symbol); // Still mock ATH for MVP
      const alerts = triggeredAlerts[item.id];

      // ATH Alert Check
      // Using >= athPrice - 1 to simulate hitting ATH for MVP (since mock is static)
      // or if we add dynamic mock later
      if (currentPrice >= athPrice && currentPrice > 0) {
        if (alerts && !alerts.athTriggered) {
          addToast(`🚀 ${item.symbol} ทำราคา All Time High ใหม่ที่ ${currentPrice}!`, 'success');
          markAlertTriggered(item.id, 'athTriggered', true);
        }
      }

      // TODO: Add targetPrice, profitAlertPercent, lossAlertPercent logic here 
      // when we implement the settings modal for it.
    });
  }, [activePrices, items, triggeredAlerts, markAlertTriggered, addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md w-80 
              ${toast.type === 'success' ? 'bg-profit/10 border-profit/30' : 
                toast.type === 'warning' ? 'bg-loss/10 border-loss/30' : 
                'bg-navy-800/80 border-white/10'}`}
          >
            <div className={`mt-0.5 ${toast.type === 'success' ? 'text-profit-light' : 'text-slate-200'}`}>
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-100">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
