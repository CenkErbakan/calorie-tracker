import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { PurchasesOfferings, PurchasesOffering } from 'react-native-purchases';
import { formatStoreMoney, type PaywallPriceDisplay } from '@/lib/paywallPricing';
import { appendOnDeviceLog } from '@/lib/onDeviceLog';

export type RevenueCatPlan = 'monthly' | 'quarterly' | 'annual';

const SUB = '[NutriLens/Sub]';

function subLog(...args: unknown[]) {
  console.log(SUB, ...args);
  appendOnDeviceLog('IAP', ...args);
}

function subWarn(...args: unknown[]) {
  console.warn(SUB, ...args);
  appendOnDeviceLog('IAP⚠️', ...args);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** PurchasesError + native userInfo; kod 23’ün altındaki gerçek StoreKit mesajı burada çıkar. */
function logPurchaseError(err: unknown) {
  const e = err as Record<string, unknown> & {
    userInfo?: Record<string, unknown>;
    underlyingError?: { message?: string; code?: string; userInfo?: Record<string, unknown> };
  } | null;

  const underlying = e?.underlyingError;
  subWarn('StoreKit/RevenueCat hata:', {
    message: e?.message,
    code: e?.code,
    readableErrorCode: e?.readableErrorCode,
    userCancelled: e?.userCancelled,
    underlyingErrorMessage: e?.underlyingErrorMessage,
    underlyingError: underlying
      ? { message: underlying.message, code: underlying.code, userInfo: underlying.userInfo }
      : undefined,
    userInfo: e?.userInfo,
  });

  if (__DEV__ && e && typeof e === 'object') {
    const extra = { ...e } as Record<string, unknown>;
    delete extra.message;
    subLog('StoreKit/RevenueCat hata (DEV ayrıntı)', safeJson(extra));
  }
}

const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || 'appl_rRUSKXTjZaorfXDoAVNBtLrEXvp';

/** Expo Go’da yalnızca bu anahtarla SDK yüklenir (appl_ ile configure ASLA yapılmaz). */
const REVENUECAT_TEST_STORE_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY?.trim() ?? '';

const REVENUECAT_V2_PROJECT_ID = process.env.EXPO_PUBLIC_REVENUECAT_PROJECT_ID?.trim() ?? '';

/**
 * RevenueCat tarafında premium entitlement kontrolü için
 * identifier / display name farklı olabiliyor.
 */
const PREMIUM_ENTITLEMENT_IDS = [
  'default2',
  'Nutrilens Premium',
  'NutriLens Premium',
] as const;

const PACKAGE_IDS: Record<RevenueCatPlan, string> = {
  monthly: '$rc_monthly',
  quarterly: '$rc_three_month',
  annual: '$rc_annual',
};

const APP_STORE_PRODUCT_IDS: Record<RevenueCatPlan, string> = {
  monthly: 'com.cesk.nutrilens.montly',
  quarterly: 'com.cesk.nutrilens.threemountly',
  annual: 'com.cesk.nutrilens.yearly',
};

let purchasesModule: typeof import('react-native-purchases') | null = null;
let isRevenueCatConfigured = false;

/** _layout’taki void initialize ile paywall / context yarışmasın: tüm SDK çağrıları bunu await eder. */
let revenueCatInitPromise: Promise<void> | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/** Web yok; Expo Go’da sadece Test Store key varken SDK (simüle IAP). */
function canUsePurchasesSdk(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return REVENUECAT_TEST_STORE_API_KEY.length > 0;
  return true;
}

function hasPremiumEntitlement(
  customerInfo: { entitlements: { active: Record<string, unknown> } } | null
): boolean {
  if (!customerInfo) return false;

  const active = customerInfo.entitlements.active ?? {};
  const activeKeys = Object.keys(active);

  const matched = PREMIUM_ENTITLEMENT_IDS.some((id) => !!active[id]);

  if (__DEV__) {
    subLog('Premium entitlement kontrolü', {
      beklenen: PREMIUM_ENTITLEMENT_IDS,
      aktif: activeKeys,
      matched,
    });
  }

  return matched;
}

/**
 * Aktif premium entitlement veya latestExpirationDate üzerinden bitiş (ms).
 * Apple’da “iptal” sonrası da erişim bu tarihe kadar sürebilir.
 */
export function getPremiumExpirationMillis(
  customerInfo: {
    entitlements: { active: Record<string, { expirationDate?: string | null } | undefined> };
    latestExpirationDate?: string | null;
  } | null
): number | null {
  if (!customerInfo) return null;

  let best: number | null = null;
  const active = customerInfo.entitlements.active ?? {};

  for (const id of PREMIUM_ENTITLEMENT_IDS) {
    const ent = active[id];
    const raw = ent?.expirationDate;
    if (raw) {
      const ms = new Date(raw).getTime();
      if (!Number.isNaN(ms) && (best === null || ms > best)) best = ms;
    }
  }

  const latest = customerInfo.latestExpirationDate;
  if (latest) {
    const ms = new Date(latest).getTime();
    if (!Number.isNaN(ms) && (best === null || ms > best)) best = ms;
  }

  return best;
}

function findOfferingPackage<T extends { identifier: string; product: { identifier: string } }>(
  availablePackages: T[],
  plan: RevenueCatPlan
): T | undefined {
  const byRcPackageId = availablePackages.find((p) => p.identifier === PACKAGE_IDS[plan]);
  if (byRcPackageId) return byRcPackageId;

  const storeId = APP_STORE_PRODUCT_IDS[plan];
  return availablePackages.find((p) => p.product.identifier === storeId);
}

function resolveOfferingWithPackages(offerings: PurchasesOfferings | null): PurchasesOffering | null {
  if (!offerings) return null;

  if (offerings.current?.availablePackages?.length) {
    return offerings.current;
  }

  const all = offerings.all ?? {};
  for (const key of Object.keys(all)) {
    const offering = all[key];
    if (offering?.availablePackages?.length) {
      return offering;
    }
  }

  return null;
}

/** REST v1 yanıtı — mağaza fiyatı içermez (fiyat için StoreKit / SDK). */
export type RevenueCatV1OfferingsResponse = {
  current_offering_id?: string;
  offerings?: Array<{
    identifier: string;
    description?: string;
    packages?: Array<{ identifier: string; platform_product_identifier: string }>;
  }>;
  placements?: { fallback_offering_id?: string };
};

/**
 * Public iOS key (`appl_`) ile çalışır: GET, POST yok.
 * RevenueCat sunucusundaki offering + paket + App Store product id listesi gelir.
 * Expo Go SDK’nın reddettiği `appl_` burada geçerlidir; satın alma / yerel fiyat yine native build ister.
 */
export async function fetchOfferingsFromRevenueCatV1(
  appUserId: string = 'nutrilens_anonymous'
): Promise<RevenueCatV1OfferingsResponse | null> {
  try {
    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/offerings`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${REVENUECAT_API_KEY}`,
        Accept: 'application/json',
      },
    });
    const text = await res.text();
    if (!res.ok) {
      subLog('RC REST v1 offerings HTTP', { status: res.status, bodyStart: text.slice(0, 400) });
      return null;
    }
    return JSON.parse(text) as RevenueCatV1OfferingsResponse;
  } catch (e) {
    subLog('RC REST v1 offerings ağ/parse hata', String(e));
    return null;
  }
}

async function getPurchasesModule() {
  if (!canUsePurchasesSdk()) return null;
  if (purchasesModule) return purchasesModule;

  try {
    purchasesModule = await import('react-native-purchases');
    return purchasesModule;
  } catch (error) {
    subWarn('react-native-purchases yüklenemedi:', error);
    return null;
  }
}

async function logRestOfferingsExpoGoOnce(): Promise<void> {
  if (!isExpoGo() || !REVENUECAT_V2_PROJECT_ID) return;
  try {
    const url = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(REVENUECAT_V2_PROJECT_ID)}/offerings`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${REVENUECAT_API_KEY}`,
        Accept: 'application/json',
      },
    });
    const bodyText = await res.text();
    if (!res.ok) {
      subLog('Expo Go REST offerings', { status: res.status, bodyStart: bodyText.slice(0, 200) });
      return;
    }
    const data = JSON.parse(bodyText) as {
      items?: Array<{
        lookup_key?: string;
        packages?: {
          items?: Array<{
            lookup_key?: string;
            products?: { items?: Array<{ product?: { store_identifier?: string | null } }> };
          }>;
        };
      }>;
    };
    const summary = (data.items ?? []).map((off) => ({
      offering: off.lookup_key,
      packages: (off.packages?.items ?? []).map((p) => ({
        pkg: p.lookup_key,
        ids: (p.products?.items ?? []).map((x) => x.product?.store_identifier).filter(Boolean),
      })),
    }));
    subLog('Expo Go REST offering özeti', summary);
  } catch (e) {
    subLog('Expo Go REST offerings alınamadı', String(e));
  }
}

export async function initializeRevenueCat(): Promise<void> {
  if (!revenueCatInitPromise) {
    revenueCatInitPromise = runRevenueCatInitialization();
  }
  return revenueCatInitPromise;
}

async function runRevenueCatInitialization(): Promise<void> {
  if (Platform.OS === 'web') {
    subLog('Web: IAP yok');
    return;
  }

  if (isExpoGo()) {
    const v1 = await fetchOfferingsFromRevenueCatV1();
    if (v1?.offerings?.length) {
      const satirlar = v1.offerings.flatMap((o) =>
        (o.packages ?? []).map(
          (p) => `${o.identifier} | ${p.identifier} → ${p.platform_product_identifier}`
        )
      );
      subLog(
        `Expo Go REST v1 (appl_): current=${v1.current_offering_id ?? '—'} | fiyat yok, sadece id’ler\n${satirlar.join('\n')}`
      );
    }
    void logRestOfferingsExpoGoOnce();
    if (!REVENUECAT_TEST_STORE_API_KEY) {
      subLog(
        'Expo Go: SDK kapalı (Test Store key yok). Simüle satın alma → .env EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY. Gerçek IAP → dev build / TestFlight.'
      );
      return;
    }

    const Purchases = await getPurchasesModule();
    if (!Purchases) return;

    try {
      if (!isRevenueCatConfigured) {
        await Purchases.default.configure({ apiKey: REVENUECAT_TEST_STORE_API_KEY });
        isRevenueCatConfigured = true;
        subLog('Expo Go RevenueCat Test Store configure tamam');
      }
      if (__DEV__) {
        await Purchases.default.setLogLevel(Purchases.default.LOG_LEVEL.DEBUG);
      }
      const offerings = await Purchases.default.getOfferings();
      const resolved = resolveOfferingWithPackages(offerings);
      const n = resolved?.availablePackages?.length ?? 0;
      subLog('Expo Go getOfferings', {
        resolvedId: resolved?.identifier ?? null,
        paketSayısı: n,
      });
      if (n === 0) {
        subLog(
          'Expo Go: SDK offerings boş — Test Store key ile sadece RC’de “Test Store” ürünleri offering’e bağlıysa paket gelir. App Store ürünleri bu modda doldurmaz; paket listesi için zaten üstte REST v1 (appl_) loga düştü.'
        );
      }
    } catch (error) {
      isRevenueCatConfigured = false;
      subWarn('Expo Go Test Store configure/getOfferings:', error);
    }
    return;
  }

  const Purchases = await getPurchasesModule();
  if (!Purchases) return;

  try {
    if (!isRevenueCatConfigured) {
      await Purchases.default.configure({
        apiKey: REVENUECAT_API_KEY,
      });

      isRevenueCatConfigured = true;
      subLog('RevenueCat configure tamam', {
        apiKeyPrefix: REVENUECAT_API_KEY.slice(0, 8) + '…',
        iosBundleId: Constants.expoConfig?.ios?.bundleIdentifier ?? '(expoConfig yok)',
        executionEnvironment: Constants.executionEnvironment,
      });
      if (__DEV__) {
        subLog(
          'IAP (DEV bilgi): offerings boş / kod 23 → rev.cat/why-are-offerings-empty; fiziksel cihaz + sandbox; RC iOS bundle = app bundle.'
        );
      }
    }

    if (__DEV__) {
      await Purchases.default.setLogLevel(Purchases.default.LOG_LEVEL.DEBUG);
      subLog('RevenueCat DEBUG log aktif');
    }
  } catch (error) {
    subWarn('RevenueCat configure hatası:', error);
  }
}

export async function getCurrentOffering() {
  await initializeRevenueCat();
  if (!canUsePurchasesSdk()) return null;
  if (!isRevenueCatConfigured) return null;

  const Purchases = await getPurchasesModule();
  if (!Purchases) return null;

  try {
    const offerings = await Purchases.default.getOfferings();
    const resolved = resolveOfferingWithPackages(offerings);

    if (__DEV__) {
      subLog('getOfferings sonucu', {
        currentId: offerings.current?.identifier ?? null,
        currentPackageCount: offerings.current?.availablePackages?.length ?? 0,
        allKeys: Object.keys(offerings.all ?? {}),
        resolvedOfferingId: resolved?.identifier ?? null,
        resolvedPackageCount: resolved?.availablePackages?.length ?? 0,
      });

      if (resolved) {
        subLog(
          'resolved offering packages',
          resolved.availablePackages.map((p) => ({
            packageId: p.identifier,
            productId: p.product.identifier,
            price: p.product.priceString,
          }))
        );
      }
    }

    return resolved;
  } catch (error) {
    logPurchaseError(error);
    return null;
  }
}

export async function fetchPaywallStorePrices(
  localeTag: string
): Promise<PaywallPriceDisplay | null> {
  const offering = await getCurrentOffering();

  if (!offering) {
    subWarn('fetchPaywallStorePrices: offering bulunamadı');
    return null;
  }

  const pick = (plan: RevenueCatPlan) => findOfferingPackage(offering.availablePackages, plan);

  const mPkg = pick('monthly');
  const qPkg = pick('quarterly');
  const aPkg = pick('annual');

  if (!mPkg?.product || !qPkg?.product || !aPkg?.product) {
    subWarn('fetchPaywallStorePrices: bazı paketler eksik', {
      monthly: !!mPkg?.product,
      quarterly: !!qPkg?.product,
      annual: !!aPkg?.product,
    });
    return null;
  }

  const mp = mPkg.product;
  const qp = qPkg.product;
  const ap = aPkg.product;

  if (mp.price <= 0) {
    subWarn('Aylık fiyat 0 veya hatalı geldi');
    return null;
  }

  const quarterlySavings = Math.max(
    0,
    Math.round((1 - qp.price / (mp.price * 3)) * 100)
  );

  const annualSavings = Math.max(
    0,
    Math.round((1 - ap.price / (mp.price * 12)) * 100)
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
  await initializeRevenueCat();
  if (!canUsePurchasesSdk()) return null;
  if (!isRevenueCatConfigured) return null;

  const Purchases = await getPurchasesModule();
  if (!Purchases) return null;

  try {
    const info = await Purchases.default.getCustomerInfo();

    if (__DEV__) {
      subLog('getCustomerInfo', {
        activeEntitlements: Object.keys(info.entitlements.active ?? {}),
        activeSubscriptions: info.activeSubscriptions,
        allPurchasedProductIdentifiers: info.allPurchasedProductIdentifiers,
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
  await initializeRevenueCat();

  subLog('purchasePlan başladı', {
    plan,
    expoGo: isExpoGo(),
    sdk: canUsePurchasesSdk(),
  });

  if (!canUsePurchasesSdk()) {
    subLog('purchasePlan: SDK kapalı (web veya Expo Go + Test Store key yok)');
    return 'failed';
  }
  if (!isRevenueCatConfigured) {
    subLog('purchasePlan: RevenueCat henüz configure olmadı');
    return 'failed';
  }

  const Purchases = await getPurchasesModule();
  if (!Purchases) {
    subWarn('purchasePlan: SDK yüklenemedi');
    return 'failed';
  }

  try {
    const offerings = await Purchases.default.getOfferings();
    const currentOffering = resolveOfferingWithPackages(offerings);

    if (!currentOffering) {
      subWarn('purchasePlan: offering bulunamadı', {
        currentId: offerings.current?.identifier ?? null,
        allKeys: Object.keys(offerings.all ?? {}),
      });
      return 'failed';
    }

    const selectedPackage = findOfferingPackage(currentOffering.availablePackages, plan);

    if (!selectedPackage) {
      subWarn('purchasePlan: paket eşleşmedi', {
        plan,
        arananPackageId: PACKAGE_IDS[plan],
        arananProductId: APP_STORE_PRODUCT_IDS[plan],
        offeringId: currentOffering.identifier,
        mevcutPaketler: currentOffering.availablePackages.map((p) => ({
          packageId: p.identifier,
          productId: p.product.identifier,
          price: p.product.priceString,
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

    if (__DEV__) {
      subLog('purchase sonucu', {
        activeEntitlements: Object.keys(purchaseResult.customerInfo.entitlements.active ?? {}),
        activeSubscriptions: purchaseResult.customerInfo.activeSubscriptions,
        allPurchasedProductIdentifiers: purchaseResult.customerInfo.allPurchasedProductIdentifiers,
      });
    }

    const isPremium = hasPremiumEntitlement(purchaseResult.customerInfo);

    if (isPremium) {
      subLog('purchasePlan başarılı', { plan });
      return 'success';
    }

    subWarn('Satın alma sonrası entitlement aktif görünmedi', {
      beklenen: PREMIUM_ENTITLEMENT_IDS,
      aktif: Object.keys(purchaseResult.customerInfo.entitlements.active ?? {}),
    });

    return 'failed';
  } catch (error: any) {
    if (error?.userCancelled) {
      subLog('purchasePlan: kullanıcı iptal etti');
      return 'cancelled';
    }

    logPurchaseError(error);
    return 'failed';
  }
}

export async function restorePurchases(): Promise<boolean> {
  await initializeRevenueCat();
  if (!canUsePurchasesSdk() || !isRevenueCatConfigured) return false;

  const Purchases = await getPurchasesModule();
  if (!Purchases) return false;

  try {
    const customerInfo = await Purchases.default.restorePurchases();
    const isPremium = hasPremiumEntitlement(customerInfo);

    if (__DEV__) {
      subLog('restorePurchases sonucu', {
        activeEntitlements: Object.keys(customerInfo.entitlements.active ?? {}),
        activeSubscriptions: customerInfo.activeSubscriptions,
        isPremium,
      });
    }

    if (isPremium) {
      subLog('Satın alımlar geri yüklendi');
    } else {
      subWarn('Geri yüklenecek premium satın alma bulunamadı');
    }

    return isPremium;
  } catch (error) {
    logPurchaseError(error);
    return false;
  }
}

/** Konsoldan: önce uygulama açılsın (initializeRevenueCat çalışmış olsun). */
if (__DEV__) {
  const g = globalThis as typeof globalThis & {
    __NUTRILENS_DEV__?: {
      getCurrentOffering: typeof getCurrentOffering;
      fetchPaywallStorePrices: typeof fetchPaywallStorePrices;
      getCustomerInfo: typeof getCustomerInfo;
      fetchOfferingsFromRevenueCatV1: typeof fetchOfferingsFromRevenueCatV1;
    };
  };
  g.__NUTRILENS_DEV__ = {
    getCurrentOffering,
    fetchPaywallStorePrices,
    getCustomerInfo,
    fetchOfferingsFromRevenueCatV1,
  };
}