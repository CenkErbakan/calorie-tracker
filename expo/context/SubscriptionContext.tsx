import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subscription, ScanQuota, FREE_DAILY_SCANS, AD_SCANS_PER_DAY, SubscriptionPlan } from '@/types';
import { getTodayKey } from '@/types';

const SUBSCRIPTION_KEY = '@nutrilens_subscription';
const SCAN_QUOTA_KEY = '@nutrilens_scan_quota';

interface SubscriptionContextValue {
  subscription: Subscription;
  scanQuota: ScanQuota;
  isLoading: boolean;
  isPremium: boolean;
  remainingFreeScans: number;
  remainingAdScans: number;
  canScan: boolean;
  upgradeToPremium: (plan: SubscriptionPlan) => Promise<void>;
  watchAdForScan: () => Promise<boolean>;
  useScan: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
  checkAndResetDailyQuota: () => Promise<void>;
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  tier: 'free',
  plan: null,
  expiryDate: null,
  isTrial: false,
  trialEndDate: null,
};

const DEFAULT_SCAN_QUOTA: ScanQuota = {
  date: getTodayKey(),
  scans: 0,
  adScans: 0,
};

export const [SubscriptionProvider, useSubscription] = createContextHook<SubscriptionContextValue>(() => {
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [scanQuota, setScanQuota] = useState<ScanQuota>(DEFAULT_SCAN_QUOTA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  // Check and reset quota at midnight
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const today = getTodayKey();
      if (scanQuota.date !== today) {
        const newQuota = { date: today, scans: 0, adScans: 0 };
        setScanQuota(newQuota);
        void saveScanQuota(newQuota);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [scanQuota.date]);

  const loadData = async () => {
    try {
      const [subData, quotaData] = await Promise.all([
        AsyncStorage.getItem(SUBSCRIPTION_KEY),
        AsyncStorage.getItem(SCAN_QUOTA_KEY),
      ]);

      if (subData) {
        setSubscription({ ...DEFAULT_SUBSCRIPTION, ...JSON.parse(subData) });
      }

      if (quotaData) {
        const parsed = JSON.parse(quotaData);
        // Check if it's a new day
        const today = getTodayKey();
        if (parsed.date !== today) {
          setScanQuota({ date: today, scans: 0, adScans: 0 });
        } else {
          setScanQuota(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubscription = async (sub: Subscription) => {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(sub));
    } catch (error) {
      console.error('Failed to save subscription:', error);
    }
  };

  const saveScanQuota = async (quota: ScanQuota) => {
    try {
      await AsyncStorage.setItem(SCAN_QUOTA_KEY, JSON.stringify(quota));
    } catch (error) {
      console.error('Failed to save scan quota:', error);
    }
  };

  const checkAndResetDailyQuota = useCallback(async () => {
    const today = getTodayKey();
    if (scanQuota.date !== today) {
      const newQuota = { date: today, scans: 0, adScans: 0 };
      setScanQuota(newQuota);
      await saveScanQuota(newQuota);
    }
  }, [scanQuota.date]);

  const upgradeToPremium = useCallback(async (plan: SubscriptionPlan) => {
    // Simulate purchase - in production, use RevenueCat
    const now = Date.now();
    let expiryDate: number | null = null;

    if (plan === 'monthly') {
      expiryDate = now + 30 * 24 * 60 * 60 * 1000;
    } else if (plan === 'annual') {
      expiryDate = now + 365 * 24 * 60 * 60 * 1000;
    }
    // Lifetime has no expiry

    const newSubscription: Subscription = {
      tier: 'premium',
      plan,
      expiryDate,
      isTrial: false,
      trialEndDate: null,
    };

    setSubscription(newSubscription);
    await saveSubscription(newSubscription);
  }, []);

  const watchAdForScan = useCallback(async (): Promise<boolean> => {
    if (subscription.tier === 'premium') return true;

    await checkAndResetDailyQuota();

    if (scanQuota.adScans < AD_SCANS_PER_DAY) {
      // Simulate ad watching
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5s simulated ad

      const newQuota = {
        ...scanQuota,
        adScans: scanQuota.adScans + 1,
      };
      setScanQuota(newQuota);
      await saveScanQuota(newQuota);
      return true;
    }

    return false;
  }, [subscription.tier, scanQuota, checkAndResetDailyQuota]);

  const useScan = useCallback(async (): Promise<boolean> => {
    if (subscription.tier === 'premium') return true;

    await checkAndResetDailyQuota();

    if (scanQuota.scans < FREE_DAILY_SCANS) {
      const newQuota = {
        ...scanQuota,
        scans: scanQuota.scans + 1,
      };
      setScanQuota(newQuota);
      await saveScanQuota(newQuota);
      return true;
    }

    return false;
  }, [subscription.tier, scanQuota, checkAndResetDailyQuota]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    // Simulate restore - in production, use RevenueCat
    // For now, just return false (no purchases to restore)
    return false;
  }, []);

  const cancelSubscription = useCallback(async () => {
    setSubscription(DEFAULT_SUBSCRIPTION);
    await saveSubscription(DEFAULT_SUBSCRIPTION);
  }, []);

  const isPremium = useMemo(() => {
    if (subscription.tier !== 'premium') return false;
    if (subscription.plan === 'lifetime') return true;
    if (subscription.expiryDate && subscription.expiryDate > Date.now()) return true;
    return false;
  }, [subscription]);

  const remainingFreeScans = useMemo(() => {
    if (isPremium) return Infinity;
    return Math.max(0, FREE_DAILY_SCANS - scanQuota.scans);
  }, [isPremium, scanQuota.scans]);

  const remainingAdScans = useMemo(() => {
    if (isPremium) return Infinity;
    return Math.max(0, AD_SCANS_PER_DAY - scanQuota.adScans);
  }, [isPremium, scanQuota.adScans]);

  const canScan = useMemo(() => {
    if (isPremium) return true;
    return remainingFreeScans > 0 || remainingAdScans > 0;
  }, [isPremium, remainingFreeScans, remainingAdScans]);

  const value = useMemo(() => ({
    subscription,
    scanQuota,
    isLoading,
    isPremium,
    remainingFreeScans,
    remainingAdScans,
    canScan,
    upgradeToPremium,
    watchAdForScan,
    useScan,
    restorePurchases,
    cancelSubscription,
    checkAndResetDailyQuota,
  }), [subscription, scanQuota, isLoading, isPremium, remainingFreeScans, remainingAdScans, canScan, upgradeToPremium, watchAdForScan, useScan, restorePurchases, cancelSubscription, checkAndResetDailyQuota]);

  return value;
});
