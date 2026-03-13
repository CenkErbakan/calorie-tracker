import { z } from 'zod';

// Aylık kilo verme hızı seçenekleri (kg/ay)
export type DietSpeed = 'slow' | 'medium' | 'fast';

export const DIET_SPEED_OPTIONS: Record<DietSpeed, { kgPerMonth: number; labelKey: string; descKey: string }> = {
  slow: { kgPerMonth: 2, labelKey: 'dietSpeedSlow', descKey: 'dietSpeedSlowDesc' },
  medium: { kgPerMonth: 4, labelKey: 'dietSpeedMedium', descKey: 'dietSpeedMediumDesc' },
  fast: { kgPerMonth: 6, labelKey: 'dietSpeedFast', descKey: 'dietSpeedFastDesc' },
};

const DIET_SPEEDS: DietSpeed[] = ['slow', 'medium', 'fast'];

/** Hedef kiloya göre 3 hız seçeneğini hesapla (ay sayısı) */
export function getDietSpeedOptions(weightToLoseKg: number): { speed: DietSpeed; months: number; kgPerMonth: number }[] {
  return DIET_SPEEDS.map((speed) => {
    const { kgPerMonth } = DIET_SPEED_OPTIONS[speed];
    const months = Math.max(1, Math.ceil(weightToLoseKg / kgPerMonth));
    return { speed, months, kgPerMonth };
  });
}

/** 1 kg yağ ≈ 7700 kcal */
const KCAL_PER_KG_FAT = 7700;

/**
 * Hız seçimine göre günlük kalori hedefini hesapla.
 * @param maintenanceCalories - Bakım kalorisi (TDEE)
 * @param kgPerMonth - Ayda verilecek kilo (2, 4 veya 6)
 * @returns Günlük hedef kalori (min 1200)
 */
export function getDietTargetCalories(maintenanceCalories: number, kgPerMonth: number): number {
  const dailyDeficit = (kgPerMonth * KCAL_PER_KG_FAT) / 30;
  const target = Math.round(maintenanceCalories - dailyDeficit);
  return Math.max(1200, Math.min(5000, target));
}

// Günlük öğün (saat ve içerik)
export const DietMealSchema = z.object({
  time: z.string(), // HH:mm
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  name: z.string(),
  description: z.string().optional(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  ingredients: z.array(z.string()).optional(),
});

// Günlük plan
export const DietDaySchema = z.object({
  dayNumber: z.number(),
  date: z.string().optional(), // YYYY-MM-DD (program başlangıcına göre)
  meals: z.array(DietMealSchema),
  totalCalories: z.number(),
  totalProtein: z.number(),
  totalCarbs: z.number(),
  totalFat: z.number(),
  notes: z.string().optional(),
});

// Tam diyet programı
export const DietPlanSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  targetWeightLossKg: z.number(),
  speed: z.enum(['slow', 'medium', 'fast']),
  monthsDuration: z.number(),
  dailyCalorieTarget: z.number(),
  allergies: z.array(z.string()),
  dislikedFoods: z.array(z.string()),
  days: z.array(DietDaySchema),
});

export type DietMeal = z.infer<typeof DietMealSchema>;
export type DietDay = z.infer<typeof DietDaySchema>;
export type DietPlan = z.infer<typeof DietPlanSchema>;

// Wizard form verisi
export interface DietWizardData {
  weightToLoseKg: number;
  speed: DietSpeed;
  allergies: string[];
  dislikedFoods: string[];
}

/** Haftalık diyet planından alışveriş listesi çıkarır (gramajlı malzemeleri toplar) */
export interface ShoppingListItem {
  name: string;
  totalGrams: number;
}

interface ParsedIngredient {
  grams: number;
  name: string;
}

/** Pişirme/hazırlama kelimelerini kaldırır - alışverişte ham malzeme alınır */
const PREPARATION_WORDS = [
  'haşlanmış', 'kızarmış', 'pişmiş', 'gril', 'ızgara', 'fırında',
  'baked', 'boiled', 'fried', 'grilled', 'cooked', 'steamed', 'roasted',
  'kavrulmuş', 'buğulama', 'dilimlenmiş', 'doğranmış', 'rendelenmiş',
  'sliced', 'diced', 'grated', 'minced', 'çiğ', 'raw', 'taze', 'fresh',
  'dondurulmuş', 'frozen', 'kurutulmuş', 'dried', 'salamura', 'pickled',
  'organik', 'organic', 'az yağlı', 'low-fat', 'tam yağlı', 'full-fat',
];

function toBaseIngredient(name: string): string {
  let base = name.trim().toLowerCase();
  // "2 yumurta" -> "yumurta", "3 adet domates" -> "domates"
  base = base.replace(/^\d+(?:\.\d+)?\s*(?:adet|ad\.?|x)?\s*/i, '').trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const word of PREPARATION_WORDS) {
      const re = new RegExp(`^${word}\\s+`, 'i');
      if (re.test(base)) {
        base = base.replace(re, '').trim();
        changed = true;
      }
      const re2 = new RegExp(`\\s+${word}$`, 'i');
      if (re2.test(base)) {
        base = base.replace(re2, '').trim();
        changed = true;
      }
    }
  }
  return base.trim() || name.trim().toLowerCase();
}

function parseIngredient(str: string): ParsedIngredient | null {
  const s = str.trim();
  if (!s) return null;

  // "100g chicken breast" veya "100 g chicken breast"
  const m1 = s.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i);
  if (m1) return { grams: parseFloat(m1[1]), name: toBaseIngredient(m1[2]) };

  // "2 eggs (120g)" veya "2 haşlanmış yumurta (120g)"
  const m2 = s.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\s*g\)\s*$/i);
  if (m2) return { grams: parseFloat(m2[2]), name: toBaseIngredient(m2[1]) };

  // "chicken breast 100g" (sonunda)
  const m3 = s.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*g\s*$/i);
  if (m3) return { grams: parseFloat(m3[2]), name: toBaseIngredient(m3[1]) };

  // Gramaj yok - base'e çevir
  return { grams: 0, name: toBaseIngredient(s) };
}

export function getShoppingListFromPlan(plan: DietPlan): ShoppingListItem[] {
  const map = new Map<string, number>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      const ingredients = meal.ingredients ?? [];
      for (const ing of ingredients) {
        const parsed = parseIngredient(ing);
        if (!parsed) continue;
        const key = parsed.name;
        const current = map.get(key) ?? 0;
        map.set(key, current + parsed.grams);
      }
    }
  }

  return Array.from(map.entries())
    .map(([name, totalGrams]) => ({ name, totalGrams }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
