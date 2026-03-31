import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { PurchasesOfferings, PurchasesOffering } from 'react-native-purchases';
import { formatStoreMoney, type PaywallPriceDisplay } from '@/lib/paywallPricing';

export type RevenueCatPlan = 'monthly' | 'quarterly' | 'annual';

/** Metro / Expo konsolunda ara: NutriLens/Sub */
const SUB = '[NutriLens/Sub]';

function subLog(...args: unknown[]) {
  console.log(SUB, ...args);
}

function subWarn(...args: unknown[]) {
  console.warn(SUB, ...args);
}

function logPurchaseError(err: unknown) {
  const e = err as Record<string, unknown> | null;
  subWarn('StoreKit/RevenueCat hata:', {
    message: e?.message,
    code: e?.code,
    readableErrorCode: e?.readableErrorCode,
    userCancelled: e?.userCancelled,
    underlyingErrorMessage: e?.underlyingErrorMessage,
  });
}

const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || 'appl_rRUSKXTjZaorfXDoAVNBtLrEXvp';

/** RevenueCat entitlement identifier — dashboard ile birebir aynı olmalı. */
const ENTITLEMENT_ID = 'Nutrilens Premium';

const PREMIUM_ENTITLEMENT_IDS = [ENTITLEMENT_ID, 'NutriLens Premium'] as const;

function hasPremiumEntitlement(customerInfo: { entitlements: { active: Record<string, unknown> } } | null): boolean {
  if (!customerInfo) return false;
  const active = customerInfo.entitlements.active;
  return PREMIUM_ENTITLEMENT_IDS.some((id) => !!active[id]);
}

/** RevenueCat varsayılan paket adları (offering’de böyle tanımlıysa önce bunlar aranır). */
const PACKAGE_IDS: Record<RevenueCatPlan, string> = {
  monthly: '$rc_monthly',
  quarterly: '$rc_three_month',
  annual: '$rc_annual',
};

/** App Store Connect ürün kimlikleri — paket adı farklı olsa bile offering içinden bulunur. */
const APP_STORE_PRODUCT_IDS: Record<RevenueCatPlan, string> = {
  monthly: 'com.cesk.nutrilens.montly',
  quarterly: 'com.cesk.nutrilens.threemountly',
  annual: 'com.cesk.nutrilens.yearly',
};

function findOfferingPackage<T extends { identifier: string; product: { identifier: string } }>(
  availablePackages: T[],
  plan: RevenueCatPlan
): T | undefined {
  const byRc = availablePackages.find((p) => p.identifier === PACKAGE_IDS[plan]);
  if (byRc) return byRc;
  const storeId = APP_STORE_PRODUCT_IDS[plan];
  return availablePackages.find((p) => p.product.identifier === storeId);
}

/**
 * `current` boş bırakılmışsa veya paket yoksa `offerings.all` içinden paketi olan ilk offering’i kullanır.
 */
function resolveOfferingWithPackages(offerings: PurchasesOfferings | null): PurchasesOffering | null {
  if (!offerings) return null;
  if (offerings.current?.availablePackages?.length) return offerings.current;
  const all = offerings.all ?? {};
  for (const key of Object.keys(all)) {
    const o = all[key];
    if (o?.availablePackages?.length) return o;
  }
  return null;
}

let purchasesModule: typeof import('react-native-purchases') | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/** Expo Go ve web’de native IAP yok; SDK yüklenirse configure edilmeden singleton hatası verir. */
function canUseNativePurchases(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  return true;
}

async function getPurchasesModule() {
  if (!canUseNativePurchases()) return null;
  if (purchasesModule) return purchasesModule;

  try {
    purchasesModule = await import('react-native-purchases');
    return purchasesModule;
  } catch (error) {
    console.warn('react-native-purchases yüklenemedi:', error);
    return null;
  }
}

export async function initializeRevenueCat(): Promise<void> {
  if (!canUseNativePurchases()) {
    subWarn(
      isExpoGo()
        ? 'Expo Go: Abonelik çalışmaz (StoreKit yok). Test için: npx eas-cli build --profile development --platform ios sonra o IPA ile bağlan.'
        : 'Web: IAP yok.',
    );
    return;
  }

  const Purchases = await getPurchasesModule();
  if (!Purchases) return;

  try {
    await Purchases.default.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      await Purchases.default.setLogLevel(Purchases.default.LOG_LEVEL.DEBUG);
      subLog('RevenueCat SDK LOG_LEVEL.DEBUG (sadece __DEV__)');
    }

    subLog('RevenueCat configure tamam', { apiKeyPrefix: REVENUECAT_API_KEY.slice(0, 8) + '…' });
  } catch (error) {
    subWarn('configure hatası:', error);
  }
}

export async function getCurrentOffering() {
  const Purchases = await getPurchasesModule();
  if (!Purchases) {
    subLog('getCurrentOffering: SDK yok (Expo Go/web) → null');
    return null;
  }

  try {
    const offerings = await Purchases.default.getOfferings();
    const resolved = resolveOfferingWithPackages(offerings);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      subLog('getOfferings', {
        currentId: offerings.current?.identifier ?? null,
        currentPackageCount: offerings.current?.availablePackages?.length ?? 0,
        allKeys: Object.keys(offerings.all ?? {}),
        resolvedOfferingId: resolved?.identifier ?? null,
        resolvedPackageCount: resolved?.availablePackages?.length ?? 0,
      });
    }
    return resolved;
  } catch (error) {
    logPurchaseError(error);
    return null;
  }
}

/**
 * App Store / RevenueCat’in döndürdüğü yerel fiyat (ülkeye göre USD, EUR, AUD, TRY…).
 * `localeTag` yalnızca aylık eşdeğer satırlarında Intl formatı için kullanılır.
 */
export async function fetchPaywallStorePrices(
  localeTag: string
): Promise<PaywallPriceDisplay | null> {
  const offering = await getCurrentOffering();
  if (!offering) {
    subLog('fetchPaywallStorePrices: offering null → fallback fiyatlar');
    return null;
  }

  const pick = (plan: RevenueCatPlan) => findOfferingPackage(offering.availablePackages, plan);

  const mPkg = pick('monthly');
  const qPkg = pick('quarterly');
  const aPkg = pick('annual');
  if (!mPkg?.product || !qPkg?.product || !aPkg?.product) {
    subWarn('fetchPaywallStorePrices: üç paketten biri eksik', {
      monthly: !!mPkg?.product,
      quarterly: !!qPkg?.product,
      annual: !!aPkg?.product,
    });
    return null;
  }

  const mp = mPkg.product;
  const qp = qPkg.product;
  const ap = aPkg.product;
  const monthlyPrice = mp.price;

  if (monthlyPrice <= 0) return null;

  const quarterlySavings = Math.max(
    0,
    Math.round((1 - qp.price / (monthlyPrice * 3)) * 100)
  );
  const annualSavings = Math.max(
    0,
    Math.round((1 - ap.price / (monthlyPrice * 12)) * 100)
  );

  return {
    monthlyMain: mp.priceString,
    quarterlyMain: qp.priceString,
    quarterlyPerMonth: formatStoreMoney(qp.price / 3, qp.currencyCode, localeTag),
    quarterlySavingsPercent: quarterlySavings,
    annualMain: ap.priceString,
    annualPerMonth: formatStoreMoney(ap.price / 12, ap.currencyCode, localeTag),
    annualSavingsPercent: annualSavings,
  };
}

export async function getCustomerInfo() {
  const Purchases = await getPurchasesModule();
  if (!Purchases) return null;

  try {
    const info = await Purchases.default.getCustomerInfo();
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      subLog('getCustomerInfo', {
        activeEntitlements: Object.keys(info.entitlements.active),
        activeSubscriptions: info.activeSubscriptions,
      });
    }
    return info;
  } catch (error) {
    logPurchaseError(error);
    return null;
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  const customerInfo = await getCustomerInfo();

  if (!customerInfo) return false;

  return hasPremiumEntitlement(customerInfo);
}

export type PurchasePlanResult = 'success' | 'cancelled' | 'failed';

export async function purchasePlan(plan: RevenueCatPlan): Promise<PurchasePlanResult> {
  subLog('purchasePlan → başladı', { plan, expoGo: isExpoGo(), nativeIap: canUseNativePurchases() });

  const Purchases = await getPurchasesModule();
  if (!Purchases) {
    subWarn('purchasePlan → SDK yok: Expo Go veya web kullanıyorsun; gerçek satın alma olmaz.');
    return 'failed';
  }

  try {
    const offerings = await Purchases.default.getOfferings();
    const currentOffering = resolveOfferingWithPackages(offerings);

    if (!currentOffering) {
      subWarn('purchasePlan → offering yok', {
        currentId: offerings.current?.identifier,
        allKeys: Object.keys(offerings.all ?? {}),
      });
      return 'failed';
    }

    const selectedPackage = findOfferingPackage(currentOffering.availablePackages, plan);

    if (!selectedPackage) {
      subWarn('purchasePlan → paket eşleşmedi', {
        plan,
        arananRc: PACKAGE_IDS[plan],
        arananStore: APP_STORE_PRODUCT_IDS[plan],
        offeringId: currentOffering.identifier,
        paketler: currentOffering.availablePackages.map((p) => ({
          id: p.identifier,
          productId: p.product.identifier,
        })),
      });
      return 'failed';
    }

    subLog('purchasePackage çağrılıyor', {
      packageId: selectedPackage.identifier,
      productId: selectedPackage.product.identifier,
      price: selectedPackage.product.priceString,
    });

    const purchaseResult = await Purchases.default.purchasePackage(selectedPackage);

    const isPremium = hasPremiumEntitlement(purchaseResult.customerInfo);

    if (isPremium) {
      subLog('purchasePlan → başarılı', { plan });
      return 'success';
    }

    const activeEntitlements = purchaseResult.customerInfo.entitlements.active;
    subWarn('purchasePlan → satın alındı ama entitlement yok', {
      beklenen: PREMIUM_ENTITLEMENT_IDS,
      aktif: Object.keys(activeEntitlements),
    });
    return 'failed';
  } catch (error: any) {
    if (error?.userCancelled) {
      subLog('purchasePlan → kullanıcı iptal');
      return 'cancelled';
    }

    logPurchaseError(error);
    return 'failed';
  }
}

export async function restorePurchases(): Promise<boolean> {
  const Purchases = await getPurchasesModule();
  if (!Purchases) return false;

  try {
    const customerInfo = await Purchases.default.restorePurchases();
    const isPremium = hasPremiumEntitlement(customerInfo);

    if (isPremium) {
      console.log('✅ Satın alımlar geri yüklendi');
    } else {
      console.log('ℹ️ Geri yüklenecek premium satın alma bulunamadı');
    }

    return isPremium;
  } catch (error) {
    logPurchaseError(error);
    return false;
  }
}