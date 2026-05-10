"use client";

import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { AuthForm } from '@/components/auth/AuthForm';

export function AuthGate() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-lg border border-white/10 bg-navy-800/75 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="mb-7 flex items-center gap-4">
          <div className="rounded-lg border border-gold/30 bg-gold/15 p-3 text-gold-light shadow-[0_10px_30px_rgba(234,179,8,0.08)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Portfolio sync</p>
            <h1 className="text-xl font-semibold text-slate-100">Welcome to Live Portfolio</h1>
          </div>
        </div>
        <AuthForm initialMode="signup" />
      </motion.div>
    </div>
  );
}
