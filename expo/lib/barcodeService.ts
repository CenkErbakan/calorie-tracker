/**
 * Barkod tarama ve besin verisi alma stratejisi
 *
 * - Barkod okuma i\u00e7in Expo SDK 54 ile birlikte gelen `expo-camera` i\u00e7indeki
 *   `CameraView` + `onBarcodeScanned` API'si kullan\u0131l\u0131r.
 *   - `expo-barcode-scanner` paketi yeni Expo s\u00fcr\u00fcmlerinde depreke edilmi\u015ftir
 *     ve ayr\u0131 bir ba\u011f\u0131ml\u0131l\u0131k olarak bak\u0131m\u0131 zay\u0131ft\u0131r.
 *   - `react-native-vision-camera` olduk\u00e7a g\u00fc\u00e7l\u00fc olsa da bare / dev-client
 *     yap\u0131land\u0131rmas\u0131 gerektirir ve managed Expo uygulamas\u0131 i\u00e7in
 *     ek karma\u015f\u0131kl\u0131k getirir.
 *   Bu nedenle uzun vadeli ve resmi \u00e7\u00f6z\u00fcm oldu\u011fu i\u00e7in `expo-camera`
 *   tercih edildi.
 *
 * - \u00dcr\u00fcn verisi i\u00e7in ana kaynak olarak Open Food Facts (OFF) kullan\u0131l\u0131r:
 *   - Barkod ile \u00fcr\u00fcn sorgusu:
 *     GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 *   - \u0130simle arama i\u00e7in:
 *     GET https://world.openfoodfacts.org/api/v2/search
 *   - Kulland\u0131\u011f\u0131m\u0131z ba\u015fl\u0131ca alanlar:
 *     - product_name / product_name_en, brands, image_front_url, serving_size
 *     - nutriments.energy-kcal_100g, proteins_100g, carbohydrates_100g, fat_100g,
 *       fiber_100g, sugars_100g, sodium_100g
 *     - ingredients_text, allergens_tags, labels_tags, nutriscore_grade, nova_group
 *   - OFF okunabilirlik i\u00e7in dakikada ~100 istek civar\u0131nda bir oran \u00f6nerir;
 *     API anahtar\u0131 gerektirmez ancak caching \u00f6nemlidir.
 *
 * - Fallback stratejisi:
 *   1) Barkod ile OFF product v2 endpoint'i.
 *   2) Daha \u00f6nceden ba\u015far\u0131yla getirilen \u00fcr\u00fcnler i\u00e7in yerel cache
 *      (AsyncStorage).
 *   3) OFF search API ile isim arama ekran\u0131 (kullan\u0131c\u0131 \u00fcr\u00fcn\u00fc
 *      isme g\u00f6re arayabilir).
 *   4) H\u00e2l\u00e2 bulunamazsa manuel besin de\u011feri giri\u015fi.
 *
 * - USDA FoodData Central (FDC) ve benzeri alternatifler API anahtar\u0131
 *   zorunlulu\u011fu ve barkod i\u00e7in ayr\u0131 endpoint olmamas\u0131 nedeniyle
 *   \u015fimdilik entegre edilmemi\u015ftir. Gerekirse ileride opsiyonel ikinci
 *   veri kayna\u011f\u0131 olarak eklenebilir.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProductData {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  servingSize: number;
  servingSizeUnit: 'g' | 'ml';
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
  sugarPer100g: number | null;
  sodiumPer100g: number | null;
  ingredients: string;
  allergens: string;
  nutriscore: string | null;
  novaGroup: number | null;
  isVegan: boolean;
  isVegetarian: boolean;
}

export interface NutritionInfo {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

const PRODUCT_CACHE_PREFIX = 'product_cache_';
const RECENT_SCANS_KEY = 'recent_scans';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 g\u00fcn
const OFF_BASE_URL = 'https://world.openfoodfacts.org';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError());
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    // @ts-expect-error - Type narrowing i\u00e7in
    return result;
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof timeoutId !== 'undefined') {
      clearTimeout(timeoutId);
    }
  }
}

function parseServingSize(servingSizeRaw?: string | null): {
  value: number;
  unit: 'g' | 'ml';
} {
  if (!servingSizeRaw) {
    return { value: 100, unit: 'g' };
  }

  const cleaned = servingSizeRaw.replace(',', '.').toLowerCase();
  const match = cleaned.match(/([\d.]+)/);
  const unitMatch = cleaned.match(/(ml|l|g)/);

  const value = match ? parseFloat(match[1]) : 100;

  let unit: 'g' | 'ml' = 'g';
  if (unitMatch) {
    if (unitMatch[1] === 'ml') {
      unit = 'ml';
    } else if (unitMatch[1] === 'l') {
      unit = 'ml';
    } else {
      unit = 'g';
    }
  }

  return {
    value: Number.isFinite(value) && value > 0 ? value : 100,
    unit,
  };
}

function normalizeAllergens(tags?: string[] | null): string {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return '';
  return tags
    .map((tag) => {
      const parts = tag.split(':');
      return parts[1] ?? parts[0];
    })
    .join(', ');
}

function hasLabel(labelsTags: string[] | undefined | null, label: string): boolean {
  if (!labelsTags) return false;
  return labelsTags.includes(label);
}

function pickNumber(n: unknown): number | null {
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string') {
    const parsed = parseFloat(n);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeProduct(off: any): ProductData | null {
  if (!off) return null;

  const nutriments = off.nutriments ?? {};

  const name: string =
    off.product_name?.trim() ||
    off.product_name_en?.trim() ||
    'Unknown product';

  const brand: string = (off.brands?.split(',')[0] ?? '').trim();

  const { value: servingSize, unit: servingSizeUnit } = parseServingSize(
    off.serving_size,
  );

  const caloriesPer100g =
    pickNumber(nutriments['energy-kcal_100g']) ??
    pickNumber(nutriments['energy-kcal']) ??
    null;

  const proteinPer100g = pickNumber(nutriments['proteins_100g']);
  const carbsPer100g = pickNumber(nutriments['carbohydrates_100g']);
  const fatPer100g = pickNumber(nutriments['fat_100g']);
  const fiberPer100g = pickNumber(nutriments['fiber_100g']);
  const sugarPer100g = pickNumber(nutriments['sugars_100g']);
  const sodiumPer100g = pickNumber(nutriments['sodium_100g']);

  const allergens = normalizeAllergens(off.allergens_tags);

  const labelsTags: string[] | undefined = off.labels_tags;

  const isVegan = hasLabel(labelsTags, 'en:vegan');
  const isVegetarian =
    hasLabel(labelsTags, 'en:vegetarian') || hasLabel(labelsTags, 'en:vegan');

  const product: ProductData = {
    barcode: String(off.code ?? ''),
    name,
    brand,
    imageUrl: off.image_front_url ?? null,
    servingSize,
    servingSizeUnit,
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    sugarPer100g,
    sodiumPer100g,
    ingredients: off.ingredients_text ?? '',
    allergens,
    nutriscore: off.nutriscore_grade ?? null,
    novaGroup:
      typeof off.nova_group === 'number'
        ? off.nova_group
        : typeof off.nova_group === 'string'
          ? Number.parseInt(off.nova_group, 10) || null
          : null,
    isVegan,
    isVegetarian,
  };

  if (!product.barcode) {
    return null;
  }

  return product;
}

export async function getCachedProduct(barcode: string): Promise<ProductData | null> {
  try {
    const key = PRODUCT_CACHE_PREFIX + barcode;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as {
      product: ProductData;
      timestamp: number;
    };

    if (!parsed || !parsed.product || !parsed.timestamp) {
      return null;
    }

    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      void AsyncStorage.removeItem(key);
      return null;
    }

    return parsed.product;
  } catch {
    return null;
  }
}

export async function cacheProduct(barcode: string, product: ProductData): Promise<void> {
  try {
    const key = PRODUCT_CACHE_PREFIX + barcode;
    const payload = JSON.stringify({
      product,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(key, payload);
  } catch {
    // sessizce yut
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductData | null> {
  const cached = await getCachedProduct(barcode);
  if (cached) {
    // Still update the recent scans list (moves item to top, updates timestamp)
    await addRecentScan(cached);
    return cached;
  }

  const url =
    `${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(
      barcode,
    )}.json` +
    '?fields=code,product_name,product_name_en,brands,image_front_url,' +
    'serving_size,nutriments,ingredients_text,allergens_tags,labels_tags,' +
    'nutriscore_grade,nova_group';

  try {
    const response = await withTimeout(fetch(url), 8000);

    if (!response.ok) {
      // 404 durumunu "ürün bulunamadı" olarak kabul et
      if (response.status === 404) {
        return null;
      }
      throw new Error(`OFF product request failed: ${response.status}`);
    }

    const json = (await response.json()) as {
      status: number;
      product?: any;
    };

    if (json.status === 0 || !json.product) {
      return null;
    }

    const normalized = normalizeProduct(json.product);
    if (!normalized) {
      return null;
    }

    // Heuristic: real food products have at least one macro value.
    // If ALL are null, this is likely a non-food item (medicine, cosmetic, etc.)
    // that someone added to OFF. Reject it so medicine barcodes don't show in food mode.
    const hasAnyNutrition =
      normalized.caloriesPer100g !== null ||
      normalized.proteinPer100g !== null ||
      normalized.carbsPer100g !== null ||
      normalized.fatPer100g !== null;

    if (!hasAnyNutrition) {
      return null;
    }

    await cacheProduct(barcode, normalized);
    await addRecentScan(normalized);

    return normalized;
  } catch (error) {
    const cachedFallback = await getCachedProduct(barcode);
    if (cachedFallback) {
      return cachedFallback;
    }
    throw error;
  }
}

export function calculateNutrition(product: ProductData, grams: number): NutritionInfo {
  const ratio = grams / 100;

  function scale(value: number | null): number | null {
    if (value == null) return null;
    const scaled = value * ratio;
    return Number.isFinite(scaled) ? Number.parseFloat(scaled.toFixed(1)) : null;
  }

  return {
    calories: scale(product.caloriesPer100g),
    protein: scale(product.proteinPer100g),
    carbs: scale(product.carbsPer100g),
    fat: scale(product.fatPer100g),
    fiber: scale(product.fiberPer100g),
    sugar: scale(product.sugarPer100g),
    sodium: scale(product.sodiumPer100g),
  };
}

export async function searchProductByName(query: string): Promise<ProductData[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url =
    `${OFF_BASE_URL}/api/v2/search` +
    `?search_terms=${encodeURIComponent(trimmed)}` +
    '&page=1&page_size=10' +
    '&fields=code,product_name,product_name_en,brands,image_front_url,' +
    'serving_size,nutriments,ingredients_text,allergens_tags,labels_tags,' +
    'nutriscore_grade,nova_group';

  const response = await withTimeout(fetch(url), 8000);
  if (!response.ok) {
    throw new Error(`OFF search request failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    products?: any[];
  };

  const products = Array.isArray(json.products) ? json.products : [];
  const normalized = products
    .map((p) => normalizeProduct(p))
    .filter((p): p is ProductData => p !== null);

  return normalized.slice(0, 10);
}

export interface RecentScanItem {
  barcode: string;
  type: 'food' | 'medicine';
  name: string;
  imageUrl: string | null;
  timestamp: number;
}

export async function getRecentScans(): Promise<RecentScanItem[]> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SCANS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as RecentScanItem[];
    if (!Array.isArray(parsed)) return [];
    // Handle legacy ProductData[] format (migrate on the fly)
    return parsed.filter((item) => item.barcode && item.type);
  } catch {
    return [];
  }
}

export async function addRecentScan(product: ProductData): Promise<void> {
  try {
    const existing = await getRecentScans();
    const filtered = existing.filter((p) => p.barcode !== product.barcode);
    const item: RecentScanItem = {
      barcode: product.barcode,
      type: 'food',
      name: product.name,
      imageUrl: product.imageUrl,
      timestamp: Date.now(),
    };
    const updated = [item, ...filtered].slice(0, 20);
    await AsyncStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
  } catch {
    // sessizce yut
  }
}

export async function addRecentMedicineScan(medicine: import('./medicineService').MedicineData): Promise<void> {
  try {
    const existing = await getRecentScans();
    const filtered = existing.filter((p) => p.barcode !== medicine.barcode);
    const item: RecentScanItem = {
      barcode: medicine.barcode,
      type: 'medicine',
      name: medicine.brandName || medicine.genericName || 'Unknown',
      imageUrl: medicine.imageUrl,
      timestamp: Date.now(),
    };
    const updated = [item, ...filtered].slice(0, 20);
    await AsyncStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
  } catch {
    // sessizce yut
  }
}

