/**
 * AdMob configuration and helpers.
 *
 * IMPORTANT: Replace TestIds with your real Ad Unit IDs from AdMob console
 * before publishing. Using test IDs in production violates AdMob policies.
 *
 * Get your IDs at: https://admob.google.com
 *
 * NOTE: Ads require a development build (eas build). They won't work in Expo Go or web.
 * In Expo Go, we fall back to a simulated ad (5s wait).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Expo Go'da native AdMob modülü yok - hiç deneme */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

// Lazy load to avoid crashes on web/Expo Go where native module may not exist
let adsModule: typeof import('react-native-google-mobile-ads') | null | false = null;

async function getAdsModule(): Promise<typeof import('react-native-google-mobile-ads') | null> {
  if (adsModule === false) return null; // Previously failed, don't retry
  if (adsModule) return adsModule;
  if (Platform.OS === 'web' || isExpoGo()) {
    adsModule = false;
    return null;
  }
  try {
    const mod = await import('react-native-google-mobile-ads');
    // API: default export = MobileAds (mobileAds()), named: TestIds, RewardedAd
    const mobileAdsFn = mod?.default ?? mod?.MobileAds;
    const hasMobileAds = typeof mobileAdsFn === 'function';
    const hasTestIds = mod?.TestIds?.REWARDED != null;
    if (!hasMobileAds || !hasTestIds) {
      adsModule = false;
      return null;
    }
    adsModule = mod;
    return mod;
  } catch {
    adsModule = false;
    return null;
  }
}

// Use TestIds for development. Replace with your real IDs for production.
const REWARDED_AD_UNIT_ID = __DEV__
  ? undefined // Will use TestIds.REWARDED from module
  : Platform.select({
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
      ios: 'ca-app-pub-2088222165570955~6791050571',
      default: undefined,
    });

const BANNER_AD_UNIT_ID = __DEV__
  ? undefined
  : Platform.select({
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
      ios: 'ca-app-pub-2088222165570955~6791050571',
      default: undefined,
    });

export { BANNER_AD_UNIT_ID };

/**
 * Initialize Mobile Ads SDK. Call once at app startup.
 * Expo Go'da sessizce atlanır (native modül yok).
 */
export async function initializeAds(): Promise<void> {
  const mod = await getAdsModule();
  if (!mod) return;
  try {
    const mobileAdsFn = mod.default ?? mod.MobileAds;
    if (typeof mobileAdsFn === 'function') {
      const instance = mobileAdsFn();
      if (instance?.initialize) {
        await instance.initialize();
      }
    }
  } catch {
    // Expo Go veya native build yok - sessizce devam et
  }
}

/**
 * Show a rewarded ad and return a promise that resolves when user earns the reward.
 * Resolves to true if reward earned, false if ad closed early, failed to load, or error.
 * Falls back to simulated ad (5s wait) when native ads unavailable (Expo Go, web).
 */
export async function showRewardedAd(): Promise<boolean> {
  const mod = await getAdsModule();
  if (!mod || !mod.TestIds?.REWARDED || !mod.RewardedAd) {
    // Fallback: simulate ad for Expo Go / web
    await new Promise((r) => setTimeout(r, 5000));
    return true;
  }

  const adUnitId = REWARDED_AD_UNIT_ID ?? mod.TestIds.REWARDED;

  return new Promise((resolve) => {
    let resolved = false;
    const unsubs: (() => void)[] = [];
    const finish = (result: boolean) => {
      if (!resolved) {
        resolved = true;
        unsubs.forEach((u) => u());
        resolve(result);
      }
    };

    try {
      const rewarded = mod.RewardedAd.createForAdRequest(adUnitId);

      unsubs.push(
        rewarded.addAdEventsListener(({ type, payload }) => {
          switch (type) {
            case mod.RewardedAdEventType.EARNED_REWARD:
              finish(true);
              break;
            case mod.AdEventType.CLOSED:
              finish(false);
              break;
            case mod.AdEventType.ERROR:
              console.warn('Rewarded ad error:', payload);
              finish(false);
              break;
            default:
              break;
          }
        }),
      );

      unsubs.push(
        rewarded.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
          void rewarded.show();
        }),
      );

      rewarded.load();

      const timeout = setTimeout(() => finish(false), 15000);
      unsubs.push(() => clearTimeout(timeout));
    } catch (error) {
      console.warn('Rewarded ad failed:', error);
      finish(false);
    }
  });
}
