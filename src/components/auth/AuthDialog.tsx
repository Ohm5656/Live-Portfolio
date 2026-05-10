"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AuthForm, AuthMode } from '@/components/auth/AuthForm';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
}

export function AuthDialog({ open, onOpenChange, initialMode = 'signup' }: AuthDialogProps) {
  const closeDialog = () => onOpenChange(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-navy-900/85 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={closeDialog}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            className="w-full max-w-md rounded-lg border border-white/10 bg-navy-800 p-6 shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                onClick={closeDialog}
                aria-label="Close login dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AuthForm initialMode={initialMode} onAuthenticated={closeDialog} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
