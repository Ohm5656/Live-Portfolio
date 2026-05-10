"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export function AuthBootstrap() {
  useEffect(() => {
    let isActive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }

      void usePortfolioStore.getState().handleAuthSession(data.session, { initial: true });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      void usePortfolioStore.getState().handleAuthSession(session, { initial: false });
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
