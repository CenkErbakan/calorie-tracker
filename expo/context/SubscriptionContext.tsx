import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Subscription,
  ScanQuota,
  FREE_DAILY_SCANS,
  AD_SCANS_PER_DAY,
  SubscriptionPlan,
} from '@/types';
import { getTodayKey } from '@/types';
import { useUser } from '@/context/UserContext';
import { showRewardedAd } from '@/lib/ads';
import {
  checkPremiumStatus,
  purchasePlan,
  restorePurchases as rcRestorePurchases,
  getCustomerInfo,
  type RevenueCatPlan,
  type PurchasePlanResult,
} from '@/lib/revenuecat';
import { appendOnDeviceLog } from '@/lib/onDeviceLog';

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
  upgradeToPremium: (plan: SubscriptionPlan) => Promise<PurchasePlanResult>;
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

/** App Store ürün ID’leri (RevenueCat activeSubscriptions ile uyumlu). */
const RC_PRODUCT_QUARTERLY = 'com.cesk.nutrilens.threemountly';
const RC_PRODUCT_YEARLY = 'com.cesk.nutrilens.yearly';
const RC_PRODUCT_MONTHLY = 'com.cesk.nutrilens.montly';

function resolvePlanFromCustomerInfo(customerInfo: any): SubscriptionPlan | null {
  const activeSubscriptions: string[] = customerInfo?.activeSubscriptions ?? [];

  if (activeSubscriptions.some((id) => id === RC_PRODUCT_QUARTERLY || id.includes('threemount'))) {
    return 'quarterly';
  }

  if (activeSubscriptions.some((id) => id === RC_PRODUCT_YEARLY || id.includes('yearly'))) {
    return 'annual';
  }

  if (
    activeSubscriptions.some(
      (id) => id === RC_PRODUCT_MONTHLY || id.includes('monthly') || id.includes('montly')
    )
  ) {
    return 'monthly';
  }

  return null;
}

export const [SubscriptionProvider, useSubscription] =
  createContextHook<SubscriptionContextValue>(() => {
    const { profile } = useUser();
    const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
    const [scanQuota, setScanQuota] = useState<ScanQuota>(DEFAULT_SCAN_QUOTA);
    const [isLoading, setIsLoading] = useState(true);

    const saveSubscription = useCallback(async (sub: Subscription) => {
      try {
        await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(sub));
      } catch (error) {
        console.error('Failed to save subscription:', error);
      }
    }, []);

    const saveScanQuota = useCallback(async (quota: ScanQuota) => {
      try {
        await AsyncStorage.setItem(SCAN_QUOTA_KEY, JSON.stringify(quota));
      } catch (error) {
        console.error('Failed to save scan quota:', error);
      }
    }, []);

    const loadData = useCallback(async () => {
      try {
        const [subData, quotaData, rcPremium, customerInfo] = await Promise.all([
          AsyncStorage.getItem(SUBSCRIPTION_KEY),
          AsyncStorage.getItem(SCAN_QUOTA_KEY),
          checkPremiumStatus(),
          getCustomerInfo(),
        ]);

        if (rcPremium) {
          const resolvedPlan = resolvePlanFromCustomerInfo(customerInfo);

          setSubscription({
            tier: 'premium',
            plan: resolvedPlan,
            expiryDate: null,
            isTrial: false,
            trialEndDate: null,
          });
        } else if (subData) {
          setSubscription({ ...DEFAULT_SUBSCRIPTION, ...JSON.parse(subData) });
        }

        if (quotaData) {
          setScanQuota({ ...DEFAULT_SCAN_QUOTA, ...JSON.parse(quotaData) });
        }
      } catch (error) {
        console.error('Subscription data yükleme hatası:', error);
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      void loadData();
    }, [loadData]);

    useEffect(() => {
      const checkInterval = setInterval(() => {
        const today = getTodayKey();

        if (scanQuota.date !== today) {
          const newQuota: ScanQuota = {
            date: today,
            scans: 0,
            adScans: 0,
            adScansUsed: 0,
          };

          setScanQuota(newQuota);
          void saveScanQuota(newQuota);
        }
      }, 60000);

      return () => clearInterval(checkInterval);
    }, [scanQuota.date, saveScanQuota]);

    const checkAndResetDailyQuota = useCallback(async () => {
      const today = getTodayKey();

      if (scanQuota.date !== today) {
        const newQuota: ScanQuota = {
          date: today,
          scans: 0,
          adScans: 0,
          adScansUsed: 0,
        };

        setScanQuota(newQuota);
        await saveScanQuota(newQuota);
      }
    }, [scanQuota.date, saveScanQuota]);

    const upgradeToPremium = useCallback(
      async (plan: SubscriptionPlan): Promise<PurchasePlanResult> => {
        console.log('[NutriLens/Sub] upgradeToPremium tıklandı', { plan });
        appendOnDeviceLog('Sub', 'upgradeToPremium tıklandı', { plan });
        try {
          let rcPlan: RevenueCatPlan;

          switch (plan) {
            case 'monthly':
              rcPlan = 'monthly';
              break;
            case 'quarterly':
              rcPlan = 'quarterly';
              break;
            case 'annual':
              rcPlan = 'annual';
              break;
            default:
              return 'failed';
          }

          const result = await purchasePlan(rcPlan);
          console.log('[NutriLens/Sub] upgradeToPremium sonuç', { plan, result });
          appendOnDeviceLog('Sub', 'upgradeToPremium sonuç', { plan, result });

          if (result === 'success') {
            const premiumSub: Subscription = {
              tier: 'premium',
              plan,
              expiryDate: null,
              isTrial: false,
              trialEndDate: null,
            };

            setSubscription(premiumSub);
            await saveSubscription(premiumSub);

            const resetQuota: ScanQuota = {
              date: getTodayKey(),
              scans: 0,
              adScans: 0,
              adScansUsed: 0,
            };

            setScanQuota(resetQuota);
            await saveScanQuota(resetQuota);
          }

          return result;
        } catch (error) {
          console.error('Premium upgrade hatası:', error);
          appendOnDeviceLog('Sub⚠️', 'upgradeToPremium hata:', error);
          return 'failed';
        }
      },
      [saveScanQuota, saveSubscription]
    );

    const watchAdForScan = useCallback(async (): Promise<boolean> => {
      if (subscription.tier === 'premium') return true;

      await checkAndResetDailyQuota();

      if (scanQuota.adScans < AD_SCANS_PER_DAY) {
        const earned = await showRewardedAd();
        if (!earned) return false;

        const newQuota: ScanQuota = {
          ...scanQuota,
          adScans: scanQuota.adScans + 1,
          adScansUsed: scanQuota.adScansUsed ?? 0,
        };

        setScanQuota(newQuota);
        await saveScanQuota(newQuota);
        return true;
      }

      return false;
    }, [subscription.tier, scanQuota, checkAndResetDailyQuota, saveScanQuota]);

    const useScan = useCallback(async (): Promise<boolean> => {
      if (subscription.tier === 'premium') return true;

      await checkAndResetDailyQuota();

      if (scanQuota.scans < FREE_DAILY_SCANS) {
        const newQuota: ScanQuota = {
          ...scanQuota,
          scans: scanQuota.scans + 1,
          adScansUsed: scanQuota.adScansUsed ?? 0,
        };

        setScanQuota(newQuota);
        await saveScanQuota(newQuota);
        return true;
      }

      const adAvailable = (scanQuota.adScans ?? 0) - (scanQuota.adScansUsed ?? 0);

      if (adAvailable > 0) {
        const newQuota: ScanQuota = {
          ...scanQuota,
          adScansUsed: (scanQuota.adScansUsed ?? 0) + 1,
        };

        setScanQuota(newQuota);
        await saveScanQuota(newQuota);
        return true;
      }

      return false;
    }, [subscription.tier, scanQuota, checkAndResetDailyQuota, saveScanQuota]);

    const restorePurchases = useCallback(async (): Promise<boolean> => {
      try {
        appendOnDeviceLog('Sub', 'restorePurchases başladı');
        const success = await rcRestorePurchases();
        appendOnDeviceLog('Sub', 'restorePurchases sonuç:', success);

        if (success) {
          const customerInfo = await getCustomerInfo();
          const resolvedPlan = resolvePlanFromCustomerInfo(customerInfo);

          const restoredSub: Subscription = {
            tier: 'premium',
            plan: resolvedPlan,
            expiryDate: null,
            isTrial: false,
            trialEndDate: null,
          };

          setSubscription(restoredSub);
          await saveSubscription(restoredSub);
        }

        return success;
      } catch (error) {
        console.error('Restore purchases hatası:', error);
        appendOnDeviceLog('Sub⚠️', 'restorePurchases hata:', error);
        return false;
      }
    }, [saveSubscription]);

    const cancelSubscription = useCallback(async () => {
      setSubscription(DEFAULT_SUBSCRIPTION);
      await saveSubscription(DEFAULT_SUBSCRIPTION);
    }, [saveSubscription]);

    const isPremium = useMemo(() => {
      return subscription.tier === 'premium';
    }, [subscription]);

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

    const value = useMemo(
      () => ({
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
      }),
      [
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
      ]
    );

    return value;
  });