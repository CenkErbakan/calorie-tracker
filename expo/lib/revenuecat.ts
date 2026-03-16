/**
 * RevenueCat configuration and helpers.
 * Planlar: Aylık, 3 Aylık, Yıllık
 *
 * RevenueCat Dashboard'da:
 * - Entitlement: "premium" oluştur
 * - Products: monthly, quarterly, annual (App Store / Play Console ile eşleştir)
 * - Offering: Bu ürünleri içeren offering oluştur
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const REVENUECAT_API_KEY = 'test_AaMuNXRFDfRmHkcdZZeIohCUftc';
const ENTITLEMENT_ID = 'premium';

// RevenueCat package identifier'ları - Dashboard'daki product ID'lerle eşleşmeli
// $rc_three_month = 3 aylık paket (RevenueCat standart)
export const PACKAGE_IDS = {
  monthly: '$rc_monthly',
  quarterly: '$rc_three_month',
  annual: '$rc_annual',
} as const;

export type RevenueCatPlan = keyof typeof PACKAGE_IDS;

let purchasesModule: typeof import('react-native-purchases') | null = null;

async function getPurchasesModule() {
  if (purchasesModule) return purchasesModule;
  if (Platform.OS === 'web') return null;
  try {
    purchasesModule = await import('react-native-purchases');
    return purchasesModule;
  } catch {
    return null;
  }
}

/** Expo Go'da native modül yok - mock mod */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * RevenueCat SDK'yı başlat. Uygulama açılışında bir kez çağrılmalı.
 */
export async function initializeRevenueCat(): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo()) return;

  const Purchases = await getPurchasesModule();
  if (!Purchases) return;

  try {
    await Purchases.default.configure({ apiKey: REVENUECAT_API_KEY });
  } catch (error) {
    console.warn('RevenueCat init failed:', error);
  }
}

/**
 * Kullanıcının premium olup olmadığını kontrol et.
 */
export async function checkPremiumStatus(): Promise<boolean> {
  const Purchases = await getPurchasesModule();
  if (!Purchases) return false;

  try {
    const customerInfo = await Purchases.default.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
  } catch {
    return false;
  }
}

/**
 * Belirtilen plan için satın alma başlat.
 * Başarılı olursa true döner.
 * Expo Go / web'de simüle eder (test için).
 */
export async function purchasePlan(plan: RevenueCatPlan): Promise<boolean> {
  const Purchases = await getPurchasesModule();
  if (!Purchases) {
    // Expo Go / web - geliştirme için simüle (gerçek ödeme yok)
    if (__DEV__) {
      await new Promise((r) => setTimeout(r, 800));
      return true;
    }
    return false;
  }

  try {
    const offerings = await Purchases.default.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];

    const packageId = PACKAGE_IDS[plan];
    const pkg = packages.find((p) => p.identifier === packageId);

    if (!pkg) {
      console.warn('Package not found:', packageId);
      return false;
    }

    const { customerInfo } = await Purchases.default.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
  } catch (error: unknown) {
    const err = error as { userCancelled?: boolean };
    if (err?.userCancelled) return false;
    console.warn('Purchase failed:', error);
    throw error;
  }
}

/**
 * Satın alımları geri yükle.
 */
export async function restorePurchases(): Promise<boolean> {
  const Purchases = await getPurchasesModule();
  if (!Purchases) return false;

  try {
    const customerInfo = await Purchases.default.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
  } catch {
    return false;
  }
}
