import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subscription, ScanQuota, FREE_DAILY_SCANS, AD_SCANS_PER_DAY, SubscriptionPlan } from '@/types';
import { getTodayKey } from '@/types';
import { useUser } from '@/context/UserContext';
import { showRewardedAd } from '@/lib/ads';
import {
  checkPremiumStatus,
  purchasePlan,
  restorePurchases as rcRestorePurchases,
  type RevenueCatPlan,
} from '@/lib/revenuecat';

const VIP_NAMES = ['cenk', 'serkan'];

const SUBSCRIPTION_KEY = '@nutrilens_subscription';
const SCAN_QUOTA_KEY = '@nutrilens_scan_quota';

interface SubscriptionContextValue {
  subscription: Subscription;
  scanQuota: ScanQuota;
  isLoading: boolean;
  isPremium: boolean;
  remainingFreeScans: number;
  remainingAdScans: number;
  canEarnMoreAdScans: boolean;
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
  adScansUsed: 0,
};

export const [SubscriptionProvider, useSubscription] = createContextHook<SubscriptionContextValue>(() => {
  const { profile } = useUser();
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [scanQuota, setScanQuota] = useState<ScanQuota>(DEFAULT_SCAN_QUOTA);
  const [isLoading, setIsLoading] = useState(true);

  const isVipUser = useMemo(() => {
    const name = profile.name?.trim().toLowerCase() ?? '';
    return VIP_NAMES.includes(name);
  }, [profile.name]);

  useEffect(() => {
    void loadData();
  }, []);

  // Check and reset quota at midnight
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const today = getTodayKey();
      if (scanQuota.date !== today) {
        const newQuota = { date: today, scans: 0, adScans: 0, adScansUsed: 0 };
        setScanQuota(newQuota);
        void saveScanQuota(newQuota);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [scanQuota.date]);

  const loadData = async () => {
    try {
      const [subData, quotaData, rcPremium] = await Promise.all([
        AsyncStorage.getItem(SUBSCRIPTION_KEY),
        AsyncStorage.getItem(SCAN_QUOTA_KEY),
        checkPremiumStatus(),
      ]);

      // RevenueCat premium ise öncelikli
      if (rcPremium) {
        setSubscription({
          tier: 'premium',
          plan: 'annual',
          expiryDate: null,
          isTrial: false,
          trialEndDate: null,
        });
      } else if (subData) {
        setSubscription({ ...DEFAULT_SUBSCRIPTION, ...JSON.parse(subData) });
      }

      if (quotaData) {
        const parsed = JSON.parse(quotaData);
        const today = getTodayKey();
        if (parsed.date !== today) {
          setScanQuota({ date: today, scans: 0, adScans: 0, adScansUsed: 0 });
        } else {
          setScanQuota({
            ...parsed,
            adScansUsed: parsed.adScansUsed ?? 0,
          });
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
    const rcPlan = plan as RevenueCatPlan;
    const success = await purchasePlan(rcPlan);

    if (success) {
      const newSubscription: Subscription = {
        tier: 'premium',
        plan,
        expiryDate: null,
        isTrial: false,
        trialEndDate: null,
      };
      setSubscription(newSubscription);
      await saveSubscription(newSubscription);
    } else {
      throw new Error('Purchase failed');
    }
  }, []);

  const watchAdForScan = useCallback(async (): Promise<boolean> => {
    if (subscription.tier === 'premium' || isVipUser) return true;

    await checkAndResetDailyQuota();

    if (scanQuota.adScans < AD_SCANS_PER_DAY) {
      const earned = await showRewardedAd();
      if (!earned) return false;

      const newQuota = {
        ...scanQuota,
        adScans: scanQuota.adScans + 1,
        adScansUsed: scanQuota.adScansUsed ?? 0,
      };
      setScanQuota(newQuota);
      await saveScanQuota(newQuota);
      return true;
    }

    return false;
  }, [subscription.tier, isVipUser, scanQuota, checkAndResetDailyQuota]);

  const useScan = useCallback(async (): Promise<boolean> => {
    if (subscription.tier === 'premium' || isVipUser) return true;

    await checkAndResetDailyQuota();

    // Önce ücretsiz hakkı kullan
    if (scanQuota.scans < FREE_DAILY_SCANS) {
      const newQuota = {
        ...scanQuota,
        scans: scanQuota.scans + 1,
        adScansUsed: scanQuota.adScansUsed ?? 0,
      };
      setScanQuota(newQuota);
      await saveScanQuota(newQuota);
      return true;
    }

    // Ücretsiz hakkı bittiyse reklam izleyerek kazanılan hakkı kullan
    const adAvailable = (scanQuota.adScans ?? 0) - (scanQuota.adScansUsed ?? 0);
    if (adAvailable > 0) {
      const newQuota = {
        ...scanQuota,
        adScansUsed: (scanQuota.adScansUsed ?? 0) + 1,
      };
      setScanQuota(newQuota);
      await saveScanQuota(newQuota);
      return true;
    }

    return false;
  }, [subscription.tier, isVipUser, scanQuota, checkAndResetDailyQuota]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const success = await rcRestorePurchases();
    if (success) {
      setSubscription({
        tier: 'premium',
        plan: 'annual',
        expiryDate: null,
        isTrial: false,
        trialEndDate: null,
      });
      await saveSubscription({
        tier: 'premium',
        plan: 'annual',
        expiryDate: null,
        isTrial: false,
        trialEndDate: null,
      });
    }
    return success;
  }, []);

  const cancelSubscription = useCallback(async () => {
    setSubscription(DEFAULT_SUBSCRIPTION);
    await saveSubscription(DEFAULT_SUBSCRIPTION);
  }, []);

  const isPremium = useMemo(() => {
    if (isVipUser) return true;
    return subscription.tier === 'premium';
  }, [subscription, isVipUser]);

  const remainingFreeScans = useMemo(() => {
    if (isPremium) return Infinity;
    return Math.max(0, FREE_DAILY_SCANS - scanQuota.scans);
  }, [isPremium, scanQuota.scans]);

  const remainingAdScans = useMemo(() => {
    if (isPremium) return Infinity;
    const earned = scanQuota.adScans ?? 0;
    const used = scanQuota.adScansUsed ?? 0;
    return Math.max(0, earned - used);
  }, [isPremium, scanQuota.adScans, scanQuota.adScansUsed]);

  const canEarnMoreAdScans = useMemo(() => {
    if (isPremium) return false;
    return (scanQuota.adScans ?? 0) < AD_SCANS_PER_DAY;
  }, [isPremium, scanQuota.adScans]);

  const canScan = useMemo(() => {
    if (isPremium) return true;
    return remainingFreeScans > 0 || remainingAdScans > 0 || canEarnMoreAdScans;
  }, [isPremium, remainingFreeScans, remainingAdScans, canEarnMoreAdScans]);

  const value = useMemo(() => ({
    subscription,
    scanQuota,
    isLoading,
    isPremium,
    remainingFreeScans,
    remainingAdScans,
    canEarnMoreAdScans,
    canScan,
    upgradeToPremium,
    watchAdForScan,
    useScan,
    restorePurchases,
    cancelSubscription,
    checkAndResetDailyQuota,
  }), [subscription, scanQuota, isLoading, isPremium, remainingFreeScans, remainingAdScans, canEarnMoreAdScans, canScan, upgradeToPremium, watchAdForScan, useScan, restorePurchases, cancelSubscription, checkAndResetDailyQuota]);

  return value;
});
