/*
 * ============================================================
 * MEDICINE SERVICE — Research Notes
 * ============================================================
 *
 * API STRATEGY
 * ─────────────────────────────────────────────────────────────
 * Primary:  OpenFDA Drug Label API
 *   Endpoint: https://api.fda.gov/drug/label.json
 *   Barcode search:
 *     - UPC:  ?search=openfda.upc:{barcode}
 *     - NDC:  ?search=openfda.package_ndc:{barcode}
 *   Free, no API key required (rate limit: 240 req/min without key)
 *   Returns: brand_name, generic_name, active_ingredient,
 *            inactive_ingredient, purpose, indications_and_usage,
 *            warnings, do_not_use, ask_a_doctor,
 *            dosage_and_administration, storage_and_handling,
 *            keep_out_of_reach_of_children
 *   Coverage: US OTC + Prescription drugs; UPC coverage is partial
 *             (labelers must supply UPC data voluntarily)
 *
 * Fallback: OpenFDA Drug NDC Directory
 *   Endpoint: https://api.fda.gov/drug/ndc.json
 *   Search:   ?search=packaging.package_ndc:{barcode}
 *   Returns product metadata (name, ingredients, form, route)
 *   Updated daily. Does NOT include full label text.
 *
 * Why NOT RxNav?
 *   RxNav is better for drug-drug interactions, not barcode lookup.
 *   OpenFDA is the right tool for product label information.
 *
 * Limitations:
 *   - US drugs only (FDA-regulated)
 *   - UPC barcodes have partial coverage in label API
 *   - Many fields can be null — normalize gracefully
 * ============================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Interfaces ────────────────────────────────────────────────

export interface MedicineData {
  barcode: string;
  brandName: string;
  genericName: string;
  manufacturer: string;
  productType: 'OTC' | 'Prescription' | 'Unknown';
  dosageForm: string;
  route: string;
  activeIngredients: Array<{
    name: string;
    strength: string;
  }>;
  inactiveIngredients: string[];
  purpose: string;
  indicationsAndUsage: string;
  warnings: string;
  doNotUse: string;
  askDoctor: string;
  dosageAndAdministration: string;
  storageInstructions: string;
  keepOutOfReachOfChildren: boolean;
  imageUrl: string | null;
  /** Where the data came from — used to adapt the UI */
  dataSource: 'openfda' | 'off' | 'unknown';
}

// ─── Timeout helper ────────────────────────────────────────────

class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new TimeoutError()), ms)
    ),
  ]);
}

// ─── Text helpers ──────────────────────────────────────────────

function pickText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value.length > 0) {
    return String(value[0]).trim();
  }
  return '';
}

function pickArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return [value];
  return [];
}

function detectProductType(raw: Record<string, unknown>): 'OTC' | 'Prescription' | 'Unknown' {
  const marketingCategory = pickText(raw.marketing_category).toLowerCase();
  const productType = pickText((raw.openfda as Record<string, unknown>)?.product_type).toLowerCase();

  if (
    marketingCategory.includes('otc') ||
    productType.includes('otc') ||
    marketingCategory.includes('over-the-counter')
  ) {
    return 'OTC';
  }
  if (
    marketingCategory.includes('prescription') ||
    productType.includes('prescription') ||
    marketingCategory.includes('nda') ||
    marketingCategory.includes('anda')
  ) {
    return 'Prescription';
  }
  return 'Unknown';
}

function parseActiveIngredients(raw: Record<string, unknown>): Array<{ name: string; strength: string }> {
  const openfdaIngredients = (raw.openfda as Record<string, unknown>)?.substance_name;
  const labelIngredients = raw.active_ingredient;

  // Try to parse from label text first
  if (typeof labelIngredients === 'string' || Array.isArray(labelIngredients)) {
    const text = pickText(labelIngredients);
    // Split by common separators
    const parts = text.split(/[;,\n]/).filter(Boolean);
    if (parts.length > 0) {
      return parts.map((part) => {
        const match = part.match(/^(.+?)\s+(\d[\d.,\s%mgMGmcgMCG/ounceOUNCE]+.*)$/);
        if (match) {
          return { name: match[1].trim(), strength: match[2].trim() };
        }
        return { name: part.trim(), strength: '' };
      });
    }
  }

  // Fallback to openfda substance names
  if (openfdaIngredients && Array.isArray(openfdaIngredients)) {
    return (openfdaIngredients as string[]).map((name) => ({ name, strength: '' }));
  }

  return [];
}

function normalizeLabelProduct(raw: Record<string, unknown>, barcode: string): MedicineData {
  const openfda = (raw.openfda as Record<string, unknown>) ?? {};

  return {
    barcode,
    brandName: pickText(openfda.brand_name) || pickText(raw.brand_name) || 'Unknown',
    genericName: pickText(openfda.generic_name) || pickText(raw.generic_name) || '',
    manufacturer: pickText(openfda.manufacturer_name) || pickText(raw.labeler_name) || '',
    productType: detectProductType(raw),
    dosageForm: pickText(openfda.dosage_form) || pickText(raw.dosage_form) || '',
    route: pickText(openfda.route) || pickText(raw.route) || '',
    activeIngredients: parseActiveIngredients(raw),
    inactiveIngredients: pickArray(raw.inactive_ingredient),
    purpose: pickText(raw.purpose),
    indicationsAndUsage: pickText(raw.indications_and_usage),
    warnings: pickText(raw.warnings),
    doNotUse: pickText(raw.do_not_use),
    askDoctor: pickText(raw.ask_doctor ?? raw.ask_a_doctor),
    dosageAndAdministration: pickText(raw.dosage_and_administration),
    storageInstructions: pickText(raw.storage_and_handling),
    keepOutOfReachOfChildren:
      pickText(raw.keep_out_of_reach_of_children).toLowerCase().includes('keep out') ||
      pickText(raw.keep_out_of_reach_of_children).length > 0,
    imageUrl: null,
    dataSource: 'openfda',
  };
}

function normalizeNdcProduct(raw: Record<string, unknown>, barcode: string): MedicineData {
  const activeIngredients = Array.isArray(raw.active_ingredients)
    ? (raw.active_ingredients as Array<{ name: string; strength: string }>).map((ing) => ({
        name: String(ing.name ?? ''),
        strength: String(ing.strength ?? ''),
      }))
    : [];

  return {
    barcode,
    brandName: pickText(raw.brand_name) || 'Unknown',
    genericName: pickText(raw.generic_name) || '',
    manufacturer: pickText(raw.labeler_name) || '',
    productType: 'Unknown',
    dosageForm: pickText(raw.dosage_form) || '',
    route: Array.isArray(raw.route) ? (raw.route as string[]).join(', ') : pickText(raw.route),
    activeIngredients,
    inactiveIngredients: [],
    purpose: '',
    indicationsAndUsage: '',
    warnings: '',
    doNotUse: '',
    askDoctor: '',
    dosageAndAdministration: '',
    storageInstructions: '',
    keepOutOfReachOfChildren: false,
    imageUrl: null,
    dataSource: 'openfda',
  };
}

// ─── Cache ─────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function getCachedMedicine(barcode: string): Promise<MedicineData | null> {
  try {
    const raw = await AsyncStorage.getItem(`medicine_cache_${barcode}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: MedicineData; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

export async function cacheMedicine(barcode: string, data: MedicineData): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `medicine_cache_${barcode}`,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // storage error is non-fatal
  }
}

// ─── Main fetch ────────────────────────────────────────────────

export async function fetchMedicineByBarcode(barcode: string): Promise<MedicineData | null> {
  // 1. Check cache first
  const cached = await getCachedMedicine(barcode);
  if (cached) return cached;

  const trimmed = barcode.trim();

  // 2. Try OpenFDA Drug Label API with UPC search
  try {
    const upcUrl = `https://api.fda.gov/drug/label.json?search=openfda.upc:"${trimmed}"&limit=1`;
    const response = await withTimeout(fetch(upcUrl), 8000);

    if (response.ok) {
      const json = (await response.json()) as { results?: unknown[] };
      if (json.results && json.results.length > 0) {
        const product = normalizeLabelProduct(json.results[0] as Record<string, unknown>, trimmed);
        await cacheMedicine(trimmed, product);
        return product;
      }
    }
  } catch (e) {
    if (e instanceof TimeoutError) throw e;
    // Network error — try fallback
  }

  // 3. Try OpenFDA Drug Label API with package_ndc search
  try {
    const ndcLabelUrl = `https://api.fda.gov/drug/label.json?search=openfda.package_ndc:"${trimmed}"&limit=1`;
    const response = await withTimeout(fetch(ndcLabelUrl), 8000);

    if (response.ok) {
      const json = (await response.json()) as { results?: unknown[] };
      if (json.results && json.results.length > 0) {
        const product = normalizeLabelProduct(json.results[0] as Record<string, unknown>, trimmed);
        await cacheMedicine(trimmed, product);
        return product;
      }
    }
  } catch (e) {
    if (e instanceof TimeoutError) throw e;
  }

  // 4. Try OpenFDA NDC directory (metadata only, no label text)
  try {
    const ndcUrl = `https://api.fda.gov/drug/ndc.json?search=packaging.package_ndc:"${trimmed}"&limit=1`;
    const response = await withTimeout(fetch(ndcUrl), 8000);

    if (response.ok) {
      const json = (await response.json()) as { results?: unknown[] };
      if (json.results && json.results.length > 0) {
        const product = normalizeNdcProduct(json.results[0] as Record<string, unknown>, trimmed);
        await cacheMedicine(trimmed, product);
        return product;
      }
    }
  } catch (e) {
    if (e instanceof TimeoutError) throw e;
  }

  // 5. Fallback: Open Food Facts (covers non-US products, health items, supplements).
  //    OFF is a general product database that often includes medicines and supplements
  //    outside the US (e.g. Turkish medicines). We fetch extra fields to detect food items.
  //
  //    FOOD GUARD: if the OFF product has meaningful calorie/macro data it is a food product.
  //    Return null so it does NOT appear in medicine mode.
  try {
    const offUrl =
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmed)}.json` +
      '?fields=code,product_name,product_name_en,brands,image_front_url,' +
      'image_url,images,ingredients_text,nutriments,categories_tags';

    const response = await withTimeout(fetch(offUrl), 8000);

    if (response.ok) {
      const json = (await response.json()) as { status: number; product?: Record<string, unknown> };
      if (json.status !== 0 && json.product) {
        const p = json.product;

        // --- FOOD GUARD ---
        // If the product has any significant calorie/macro entry it is a food, not medicine.
        const nutriments = (p.nutriments as Record<string, unknown>) ?? {};
        const calories =
          Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? NaN);
        const protein = Number(nutriments['proteins_100g'] ?? NaN);
        const carbs = Number(nutriments['carbohydrates_100g'] ?? NaN);
        const fat = Number(nutriments['fat_100g'] ?? NaN);

        const isFood =
          (Number.isFinite(calories) && calories > 0) ||
          (Number.isFinite(protein) && protein > 0) ||
          (Number.isFinite(carbs) && carbs > 0) ||
          (Number.isFinite(fat) && fat > 0);

        if (isFood) {
          // This is a food product — do not show it in medicine mode
          return null;
        }

        // --- Extract best available image ---
        // OFF stores images under product.images; image_front_url is the canonical one.
        const imageUrl =
          (p.image_front_url as string | undefined) ||
          (p.image_url as string | undefined) ||
          null;

        const name =
          (p.product_name as string | undefined)?.trim() ||
          (p.product_name_en as string | undefined)?.trim() ||
          '';
        const brand = ((p.brands as string | undefined)?.split(',')[0] ?? '').trim();
        const ingredientsText = (p.ingredients_text as string | undefined) ?? '';

        // Split raw ingredients text into a list for display
        const ingredientsList = ingredientsText
          ? ingredientsText
              .split(/[,;]/)
              .map((s) => s.replace(/^\s*\*/, '').trim())
              .filter(Boolean)
          : [];

        const medicine: MedicineData = {
          barcode: trimmed,
          brandName: brand || name || 'Bilinmiyor',
          genericName: brand && name !== brand ? name : '',
          manufacturer: brand,
          productType: 'Unknown',
          dosageForm: '',
          route: '',
          activeIngredients: [],
          inactiveIngredients: ingredientsList,
          purpose: '',
          indicationsAndUsage: '',
          warnings: '',
          doNotUse: '',
          askDoctor: '',
          dosageAndAdministration: '',
          storageInstructions: '',
          keepOutOfReachOfChildren: false,
          imageUrl,
          dataSource: 'off',
        };

        await cacheMedicine(trimmed, medicine);
        return medicine;
      }
    }
  } catch (e) {
    if (e instanceof TimeoutError) throw e;
  }

  // 6. Product not found in any source
  return null;
}
