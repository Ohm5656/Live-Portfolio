"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Cloud, CloudOff, Loader2, LogIn, LogOut } from 'lucide-react';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { InteractiveMarketBackdrop } from '@/components/InteractiveMarketBackdrop';
import { Button } from '@/components/ui/Button';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const authUser = usePortfolioStore((state) => state.authUser);
  const syncMode = usePortfolioStore((state) => state.syncMode);
  const isSyncing = usePortfolioStore((state) => state.isSyncing);
  const syncError = usePortfolioStore((state) => state.syncError);
  const signOut = usePortfolioStore((state) => state.signOut);

  const isCloudSynced = Boolean(authUser && syncMode === 'supabase' && !syncError);
  const syncLabel = syncError
    ? 'Sync issue'
    : isSyncing
      ? 'Syncing'
      : syncMode === 'supabase'
        ? 'Synced'
        : 'Local only';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative z-0">
      <InteractiveMarketBackdrop />
      <AuthBootstrap />
      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} initialMode="signin" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-navy-900/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Image
              src="/icons/live-portfolio-192.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-lg border border-gold/30 object-cover shadow-[0_8px_24px_rgba(234,179,8,0.12)]"
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Live Portfolio
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            {authUser && (
              <div
                className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 md:flex"
                title={syncError || undefined}
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-light" />
                ) : isCloudSynced ? (
                  <Cloud className="h-3.5 w-3.5 text-profit-light" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span className="max-w-40 truncate">
                  {authUser.email || 'Signed in'}
                </span>
                <span className="text-slate-500">/</span>
                <span className={syncError ? 'text-loss-light' : 'text-slate-400'}>{syncLabel}</span>
              </div>
            )}

            {authUser ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button variant="gold" size="sm" onClick={() => setIsAuthOpen(true)}>
                <LogIn className="mr-1.5 h-4 w-4" />
                Login
              </Button>
            )}
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-navy-900/50 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-500">
          
          <p className="mt-1">
            การประเมินมูลค่าพอร์ตลงทุนนี้ ใช้ราคาตลาดสดและอัตราแลกเปลี่ยนแบบ Real-time ซึ่งอาจมีความคลาดเคลื่อน
          </p>
          <p className="mt-1 text-xs opacity-70">
            This live portfolio estimator uses real-time market prices and exchange rates, which may be subject to inaccuracies.
          </p>
        </div>
      </footer>
    </div>
  );
}
