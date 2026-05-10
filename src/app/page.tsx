"use client";

import { usePortfolioStore } from "@/store/usePortfolioStore";
import { AuthGate } from "@/components/auth/AuthGate";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function Home() {
  const isSetupComplete = usePortfolioStore((state) => state.isSetupComplete);
  const isAddingAssets = usePortfolioStore((state) => state.isAddingAssets);
  const isAuthReady = usePortfolioStore((state) => state.isAuthReady);
  const authUser = usePortfolioStore((state) => state.authUser);
  const itemCount = usePortfolioStore((state) => state.items.length);
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const shouldShowOnboarding = isAddingAssets || (!isSetupComplete && itemCount === 0);

  if (!mounted || !isAuthReady) {
    return <div className="flex h-[50vh] items-center justify-center">
      <div className="animate-pulse w-8 h-8 rounded-full bg-gold/50"></div>
    </div>;
  }

  return (
    <div className="w-full">
      {!authUser ? <AuthGate /> : shouldShowOnboarding ? <OnboardingFlow /> : <Dashboard />}
    </div>
  );
}
