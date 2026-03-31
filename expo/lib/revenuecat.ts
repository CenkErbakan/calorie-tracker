import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { PurchasesOfferings, PurchasesOffering } from 'react-native-purchases';
import { formatStoreMoney, type PaywallPriceDisplay } from '@/lib/paywallPricing';

export type RevenueCatPlan = 'monthly' | 'quarterly' | 'annual';

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

async function getPurchasesModule() {
  if (purchasesModule) return purchasesModule;
  if (Platform.OS === 'web') return null;

  try {
    purchasesModule = await import('react-native-purchases');
    return purchasesModule;
  } catch (error) {
    console.warn('react-native-purchases yüklenemedi:', error);
    return null;
  }
}

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function initializeRevenueCat(): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo()) {
    return;
  }

  const Purchases = await getPurchasesModule();
  if (!Purchases) return;

  try {
    await Purchases.default.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    console.log('✅ RevenueCat başlatıldı');
  } catch (error) {
    console.warn('❌ RevenueCat initialize hatası:', error);
  }
}

export async function getCurrentOffering() {
  const Purchases = await getPurchasesModule();
  if (!Purchases) return null;

  try {
    const offerings = await Purchases.default.getOfferings();
    return resolveOfferingWithPackages(offerings);
  } catch (error) {
    console.warn('❌ Offering alınamadı:', error);
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
  if (!offering) return null;

  const pick = (plan: RevenueCatPlan) => findOfferingPackage(offering.availablePackages, plan);

  const mPkg = pick('monthly');
  const qPkg = pick('quarterly');
  const aPkg = pick('annual');
  if (!mPkg?.product || !qPkg?.product || !aPkg?.product) return null;

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
    return await Purchases.default.getCustomerInfo();
  } catch (error) {
    console.warn('❌ Customer info alınamadı:', error);
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
  const Purchases = await getPurchasesModule();
  if (!Purchases) return 'failed';

  try {
    const offerings = await Purchases.default.getOfferings();
    const currentOffering = resolveOfferingWithPackages(offerings);

    if (!currentOffering) {
      console.warn('❌ RevenueCat’te paket içeren offering yok (current ve all boş).');
      return 'failed';
    }

    const selectedPackage = findOfferingPackage(currentOffering.availablePackages, plan);

    if (!selectedPackage) {
      console.warn(
        `❌ Paket bulunamadı: ${plan} (RC: ${PACKAGE_IDS[plan]}, Store: ${APP_STORE_PRODUCT_IDS[plan]})`
      );
      console.log(
        'Mevcut paketler:',
        currentOffering.availablePackages.map((p) => ({
          identifier: p.identifier,
          productId: p.product.identifier,
          price: p.product.priceString,
        }))
      );
      return 'failed';
    }

    const purchaseResult = await Purchases.default.purchasePackage(selectedPackage);

    const isPremium = hasPremiumEntitlement(purchaseResult.customerInfo);

    if (isPremium) {
      console.log(`✅ Satın alma başarılı: ${plan}`);
      return 'success';
    }

    const activeEntitlements = purchaseResult.customerInfo.entitlements.active;
    console.warn(
      'Satın alma tamamlandı ama premium entitlement görünmüyor. RevenueCat’te ürün bu entitlement’a bağlı mı? Beklenen:',
      PREMIUM_ENTITLEMENT_IDS.join(' veya '),
      'Aktif anahtarlar:',
      Object.keys(activeEntitlements),
    );
    return 'failed';
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('ℹ️ Kullanıcı satın almayı iptal etti');
      return 'cancelled';
    }

    console.warn('❌ Satın alma hatası:', error);
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
    console.warn('❌ Restore purchases hatası:', error);
    return false;
  }
}