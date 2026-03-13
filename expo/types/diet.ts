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
