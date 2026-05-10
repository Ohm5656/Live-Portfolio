import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createDefaultPortfolioSnapshot,
  hasPortfolioData,
  normalizePortfolioSnapshot,
} from '@/lib/portfolioSnapshot';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { portfolioSyncService } from '@/services/portfolioSyncService';
import {
  AuthUserProfile,
  ExchangeRateState,
  PortfolioItem,
  PortfolioSnapshot,
  PortfolioSyncMode,
  TriggeredAlerts,
} from '@/types/portfolio';

interface PortfolioState extends PortfolioSnapshot {
  authUser: AuthUserProfile | null;
  syncMode: PortfolioSyncMode;
  isAddingAssets: boolean;
  isAuthReady: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: number | null;

  // Auth and sync
  handleAuthSession: (session: Session | null, options?: { initial?: boolean }) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearSyncError: () => void;

  // Portfolio actions
  completeSetup: () => void;
  resetSetup: () => void;
  addItem: (item: PortfolioItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<PortfolioItem>) => void;
  updateCachedPrice: (symbol: string, price: number) => void;
  updateGlobalExchangeRate: (
    rate: number,
    status: ExchangeRateState['status'],
    lastUpdated: number,
    errorReason?: string
  ) => void;
  markAlertTriggered: (itemId: string, alertType: keyof TriggeredAlerts[string], triggered: boolean) => void;
  resetAlerts: (itemId: string) => void;
}

let cloudSaveTimeout: ReturnType<typeof setTimeout> | null = null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong while syncing your portfolio.';

const getSnapshotFromState = (state: PortfolioSnapshot): PortfolioSnapshot => ({
  isSetupComplete: state.isSetupComplete,
  items: state.items,
  triggeredAlerts: state.triggeredAlerts,
  globalExchangeRate: state.globalExchangeRate,
  cachedPrices: state.cachedPrices,
});

const getUserProfile = (session: Session): AuthUserProfile => ({
  id: session.user.id,
  email: session.user.email ?? null,
});

const createAlertState = () => ({
  athTriggered: false,
  targetPriceTriggered: false,
  profitTriggered: false,
  lossTriggered: false,
});

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => {
      const saveToCloudNow = async () => {
        const state = get();
        if (!state.authUser || state.syncMode !== 'supabase') {
          return;
        }

        set({ isSyncing: true, syncError: null });

        try {
          await portfolioSyncService.savePortfolio(state.authUser.id, getSnapshotFromState(get()));
          set({ isSyncing: false, lastSyncedAt: Date.now(), syncError: null });
        } catch (error) {
          set({ isSyncing: false, syncError: getErrorMessage(error) });
        }
      };

      const scheduleCloudSave = () => {
        const state = get();
        if (!state.authUser || state.syncMode !== 'supabase') {
          return;
        }

        if (cloudSaveTimeout) {
          clearTimeout(cloudSaveTimeout);
        }

        set({ isSyncing: true, syncError: null });
        cloudSaveTimeout = setTimeout(() => {
          cloudSaveTimeout = null;
          void saveToCloudNow();
        }, 600);
      };

      return {
        ...createDefaultPortfolioSnapshot(),
        authUser: null,
        syncMode: 'guest',
        isAddingAssets: false,
        isAuthReady: false,
        isSyncing: false,
        syncError: null,
        lastSyncedAt: null,

        handleAuthSession: async (session, options) => {
          if (!isSupabaseConfigured) {
            set({
              authUser: null,
              syncMode: 'guest',
              isAddingAssets: false,
              isAuthReady: true,
              isSyncing: false,
              syncError: 'Supabase environment variables are missing.',
            });
            return;
          }

          if (!session) {
            if (cloudSaveTimeout) {
              clearTimeout(cloudSaveTimeout);
              cloudSaveTimeout = null;
            }

            const nextSnapshot = options?.initial
              ? getSnapshotFromState(get())
              : createDefaultPortfolioSnapshot();

            set({
              ...nextSnapshot,
              authUser: null,
              syncMode: 'guest',
              isAddingAssets: false,
              isAuthReady: true,
              isSyncing: false,
              syncError: null,
              lastSyncedAt: null,
            });
            return;
          }

          const authUser = getUserProfile(session);
          const current = get();

          if (current.authUser?.id === authUser.id && current.isSyncing) {
            return;
          }

          if (
            current.authUser?.id === authUser.id &&
            current.syncMode === 'supabase' &&
            current.isAuthReady
          ) {
            return;
          }

          const deviceSnapshot = getSnapshotFromState(current);

          set({
            authUser,
            isAddingAssets: false,
            isAuthReady: true,
            isSyncing: true,
            syncError: null,
          });

          try {
            const remotePortfolio = await portfolioSyncService.loadPortfolio(authUser.id);

            if (remotePortfolio && hasPortfolioData(remotePortfolio.snapshot)) {
              set({
                ...remotePortfolio.snapshot,
                authUser,
                syncMode: 'supabase',
                isAddingAssets: false,
                isAuthReady: true,
                isSyncing: false,
                syncError: null,
                lastSyncedAt: remotePortfolio.updatedAt ? Date.parse(remotePortfolio.updatedAt) : Date.now(),
              });
              return;
            }

            const snapshotToUse = hasPortfolioData(deviceSnapshot)
              ? deviceSnapshot
              : createDefaultPortfolioSnapshot();

            if (hasPortfolioData(snapshotToUse)) {
              await portfolioSyncService.savePortfolio(authUser.id, snapshotToUse);
            }

            set({
              ...snapshotToUse,
              authUser,
              syncMode: 'supabase',
              isAddingAssets: false,
              isAuthReady: true,
              isSyncing: false,
              syncError: null,
              lastSyncedAt: Date.now(),
            });
          } catch (error) {
            set({
              authUser,
              syncMode: 'guest',
              isAddingAssets: false,
              isAuthReady: true,
              isSyncing: false,
              syncError: getErrorMessage(error),
            });
          }
        },

        signInWithEmail: async (email, password) => {
          if (!isSupabaseConfigured) {
            throw new Error('Supabase environment variables are missing.');
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw new Error(error.message);
          }

          await get().handleAuthSession(data.session, { initial: false });
        },

        signUpWithEmail: async (email, password) => {
          if (!isSupabaseConfigured) {
            throw new Error('Supabase environment variables are missing.');
          }

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data.session) {
            await get().handleAuthSession(data.session, { initial: false });
            return null;
          }

          return 'Account created. If Supabase email confirmation is enabled, please confirm your email first. Then sign in with the same email and password.';
        },

        signOut: async () => {
          if (cloudSaveTimeout) {
            clearTimeout(cloudSaveTimeout);
            cloudSaveTimeout = null;
            await saveToCloudNow();
          }

          const { error } = await supabase.auth.signOut();
          if (error) {
            throw new Error(error.message);
          }

          await get().handleAuthSession(null, { initial: false });
        },

        syncNow: async () => {
          if (cloudSaveTimeout) {
            clearTimeout(cloudSaveTimeout);
            cloudSaveTimeout = null;
          }
          await saveToCloudNow();
        },

        clearSyncError: () => set({ syncError: null }),

        completeSetup: () => {
          set({ isSetupComplete: true, isAddingAssets: false });
          scheduleCloudSave();
        },

        resetSetup: () => {
          const state = get();

          if (state.isSetupComplete || state.items.length > 0) {
            set({ isAddingAssets: true });
            return;
          }

          set({ isSetupComplete: false, isAddingAssets: false });
          scheduleCloudSave();
        },

        addItem: (item) => {
          set((state) => ({
            items: [...state.items, item],
            triggeredAlerts: {
              ...state.triggeredAlerts,
              [item.id]: createAlertState(),
            },
          }));
          scheduleCloudSave();
        },

        removeItem: (id) => {
          set((state) => {
            const newAlerts = { ...state.triggeredAlerts };
            delete newAlerts[id];
            return {
              items: state.items.filter((i) => i.id !== id),
              triggeredAlerts: newAlerts,
            };
          });
          scheduleCloudSave();
        },

        updateItem: (id, updates) => {
          set((state) => ({
            items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
          }));
          scheduleCloudSave();
        },

        updateCachedPrice: (symbol, price) =>
          set((state) => ({
            cachedPrices: {
              ...state.cachedPrices,
              [symbol.toUpperCase()]: {
                price,
                lastUpdated: Date.now(),
              },
            },
          })),

        updateGlobalExchangeRate: (rate, status, lastUpdated, errorReason) =>
          set({
            globalExchangeRate: {
              rate,
              status,
              lastUpdated,
              errorReason,
            },
          }),

        markAlertTriggered: (itemId, alertType, triggered) => {
          set((state) => ({
            triggeredAlerts: {
              ...state.triggeredAlerts,
              [itemId]: {
                ...createAlertState(),
                ...state.triggeredAlerts[itemId],
                [alertType]: triggered,
              },
            },
          }));
          scheduleCloudSave();
        },

        resetAlerts: (itemId) => {
          set((state) => ({
            triggeredAlerts: {
              ...state.triggeredAlerts,
              [itemId]: createAlertState(),
            },
          }));
          scheduleCloudSave();
        },
      };
    },
    {
      name: 'portfolio-storage',
      partialize: (state) => getSnapshotFromState(state),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePortfolioSnapshot(persistedState),
      }),
    }
  )
);
