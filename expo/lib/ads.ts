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

/**
 * Rewarded / banner birim ID'leri `ca-app-pub-XXXX/YYYY` (slash) olmalı.
 * `ca-app-pub-XXXX~YYYY` App ID'dir — reklam birimi olarak kullanılamaz.
 */
const ADMOB_IOS_REWARDED_ENV = process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID;
const ADMOB_ANDROID_REWARDED_ENV = process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID;

/** NutriLens iOS ödüllü reklam birimi (AdMob). App ID `~6791050571` app.json plugin’de; bu satır slash’lı birimdir. */
const NUTRILENS_IOS_REWARDED_UNIT_ID = 'ca-app-pub-2088222165570955/3844170023';

const GOOGLE_TEST_REWARDED_ANDROID = 'ca-app-pub-3940256099942544/5224354917';

function isValidAdUnitId(id: string | undefined): id is string {
  return !!id && id.includes('/') && !id.includes('~');
}

function resolveRewardedAdUnitId(): string | undefined {
  if (__DEV__) return undefined;

  if (Platform.OS === 'ios') {
    if (isValidAdUnitId(ADMOB_IOS_REWARDED_ENV)) return ADMOB_IOS_REWARDED_ENV;
    if (ADMOB_IOS_REWARDED_ENV?.includes('~')) {
      console.warn(
        '[AdMob] EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID App ID gibi görünüyor (~). Rewarded birim ID’si .../... formatında olmalı.',
      );
    }
    return NUTRILENS_IOS_REWARDED_UNIT_ID;
  }

  if (Platform.OS === 'android') {
    if (isValidAdUnitId(ADMOB_ANDROID_REWARDED_ENV)) return ADMOB_ANDROID_REWARDED_ENV;
    console.warn(
      '[AdMob] EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID yok; test rewarded kullanılıyor.',
    );
    return GOOGLE_TEST_REWARDED_ANDROID;
  }

  return undefined;
}

const REWARDED_AD_UNIT_ID = resolveRewardedAdUnitId();

const BANNER_AD_UNIT_ID = __DEV__
  ? undefined
  : Platform.select({
      android: isValidAdUnitId(process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID)
        ? process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID
        : undefined,
      ios: isValidAdUnitId(process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID)
        ? process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID
        : undefined,
      default: undefined,
    });

export { BANNER_AD_UNIT_ID };

/** AdMob “envanter yok” — tekrar denemek bazen işe yarar; politika için en fazla 1 ek deneme. */
function isNoFillPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  const code = String(p.code ?? '');
  const message = String(p.message ?? '');
  return (
    code.includes('no-fill') ||
    message.includes('no-fill') ||
    message.includes('No ad to show')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Tek yükleme/gösterim döngüsü. no-fill ayrı işaretlenir (yeniden deneme için).
 */
function runRewardedOnce(
  mod: NonNullable<Awaited<ReturnType<typeof getAdsModule>>>,
  adUnitId: string
): Promise<{ reward: boolean; noFill: boolean }> {
  return new Promise((resolve) => {
    let resolved = false;
    let rewardEarned = false;
    const unsubs: (() => void)[] = [];
    const finish = (result: { reward: boolean; noFill: boolean }) => {
      if (!resolved) {
        resolved = true;
        unsubs.forEach((u) => u());
        resolve(result);
      }
    };

    try {
      const rewarded = mod.RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      let showCalled = false;
      const tryShow = () => {
        if (showCalled || resolved) return;
        showCalled = true;
        try {
          void rewarded.show();
        } catch (e) {
          console.warn('Rewarded ad show() hatası:', e);
          finish({ reward: false, noFill: false });
        }
      };

      unsubs.push(
        rewarded.addAdEventsListener(({ type, payload }) => {
          switch (type) {
            case mod.RewardedAdEventType.LOADED:
            case mod.AdEventType.LOADED:
              tryShow();
              break;
            case mod.RewardedAdEventType.EARNED_REWARD:
              rewardEarned = true;
              break;
            case mod.AdEventType.CLOSED:
              finish({ reward: rewardEarned, noFill: false });
              break;
            case mod.AdEventType.ERROR: {
              console.warn('Rewarded ad error:', payload);
              const noFill = isNoFillPayload(payload);
              finish({ reward: false, noFill });
              break;
            }
            default:
              break;
          }
        }),
      );

      rewarded.load();

      const timeout = setTimeout(() => finish({ reward: rewardEarned, noFill: false }), 45000);
      unsubs.push(() => clearTimeout(timeout));
    } catch (error) {
      console.warn('Rewarded ad failed:', error);
      finish({ reward: false, noFill: false });
    }
  });
}

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
    await new Promise((r) => setTimeout(r, 5000));
    return true;
  }

  const adUnitId = REWARDED_AD_UNIT_ID ?? mod.TestIds.REWARDED;

  let out = await runRewardedOnce(mod, adUnitId);
  if (out.reward) return true;

  if (out.noFill) {
    await delay(2000);
    out = await runRewardedOnce(mod, adUnitId);
  }

  return out.reward;
}
