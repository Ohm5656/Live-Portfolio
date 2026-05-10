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
        className="rounded-lg border border-white/10 bg-navy-800/90 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg border border-gold/30 bg-gold/20 p-2 text-gold-light">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Portfolio sync</p>
            <h1 className="text-lg font-semibold text-slate-100">Start with your account</h1>
          </div>
        </div>
        <AuthForm initialMode="signup" />
      </motion.div>
    </div>
  );
}
