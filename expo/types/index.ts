import { z } from 'zod';

// ============== MEAL TYPES ==============

export const IngredientSchema = z.object({
  name: z.string(),
  weight_grams: z.number(),
  calories: z.number(),
  protein_grams: z.number(),
  carbs_grams: z.number(),
  fat_grams: z.number(),
  // Original values for auto-recalculation
  original_weight_grams: z.number().optional(),
  original_calories: z.number().optional(),
  original_protein_grams: z.number().optional(),
  original_carbs_grams: z.number().optional(),
  original_fat_grams: z.number().optional(),
});

export const MealSchema = z.object({
  id: z.string(),
  meal_name: z.string(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  timestamp: z.number(),
  photo_uri: z.string(),
  ingredients: z.array(IngredientSchema),
  total_calories: z.number(),
  total_protein_grams: z.number(),
  total_carbs_grams: z.number(),
  total_fat_grams: z.number(),
  notes: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

export const NutritionDataSchema = z.object({
  meal_name: z.string(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  ingredients: z.array(IngredientSchema),
  total_calories: z.number(),
  total_protein_grams: z.number(),
  total_carbs_grams: z.number(),
  total_fat_grams: z.number(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  notes: z.string().optional(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type NutritionData = z.infer<typeof NutritionDataSchema>;

// ============== USER PROFILE TYPES ==============

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';
export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle';
export type Language = 'auto' | 'tr' | 'en';
export type Units = 'metric' | 'imperial';

export interface UserProfile {
  name: string;
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  goal: Goal;
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  language: Language;
  units: Units;
  isOnboarded: boolean;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  gender: 'male',
  dateOfBirth: '',
  heightCm: 170,
  weightKg: 70,
  targetWeightKg: null,
  activityLevel: 'moderately_active',
  goal: 'maintain',
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 150,
  dailyCarbsGoal: 250,
  dailyFatGoal: 67,
  language: 'auto',
  units: 'metric',
  isOnboarded: false,
};

// ============== SUBSCRIPTION TYPES ==============

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionPlan = 'monthly' | 'annual' | 'lifetime';

export interface Subscription {
  tier: SubscriptionTier;
  plan: SubscriptionPlan | null;
  expiryDate: number | null; // timestamp
  isTrial: boolean;
  trialEndDate: number | null;
}

export interface ScanQuota {
  date: string; // YYYY-MM-DD
  scans: number;
  adScans: number;
}

export const FREE_DAILY_SCANS = 1;
export const AD_SCANS_PER_DAY = 1;

export const SUBSCRIPTION_PRICING = {
  monthly: { price: 4.99, priceString: '$4.99/month' },
  annual: { price: 29.99, priceString: '$29.99/year', monthlyEquivalent: '$2.50/month', savingsPercent: 50 },
  lifetime: { price: 59.99, priceString: '$59.99 one-time' },
} as const;

// ============== APP SETTINGS TYPES ==============

export interface NotificationSettings {
  breakfastReminder: boolean;
  breakfastTime: string; // HH:mm
  lunchReminder: boolean;
  lunchTime: string;
  dinnerReminder: boolean;
  dinnerTime: string;
}

export interface AppSettings {
  notifications: NotificationSettings;
  hapticsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    breakfastReminder: true,
    breakfastTime: '08:00',
    lunchReminder: true,
    lunchTime: '12:30',
    dinnerReminder: true,
    dinnerTime: '19:00',
  },
  hapticsEnabled: true,
};

// ============== ANALYTICS TYPES ==============

export interface DayStats {
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
  goalMet: boolean;
}

export interface WeeklyStats {
  weekStart: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysTracked: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  avgDailyCalories: number;
  daysUnderGoal: number;
  daysOverGoal: number;
  bestDay: DayStats | null;
  worstDay: DayStats | null;
  totalMeals: number;
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  last14Days: { date: string; logged: boolean }[];
}

// ============== HISTORY VIEW TYPES ==============

export type HistoryViewMode = 'week' | 'month';

export interface WeekData {
  days: DayStats[];
  average: number;
}

export interface MonthData {
  days: Record<string, DayStats>; // key: day number (1-31)
  summary: MonthlyStats;
}

// ============== ONBOARDING TYPES ==============

export interface OnboardingData {
  name: string;
  gender: Gender;
  dateOfBirth: string;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export const ACTIVITY_LEVELS: { value: ActivityLevel; labelKey: string; descriptionKey: string; multiplier: number }[] = [
  { value: 'sedentary', labelKey: 'sedentary', descriptionKey: 'sedentaryDesc', multiplier: 1.2 },
  { value: 'lightly_active', labelKey: 'lightlyActive', descriptionKey: 'lightlyActiveDesc', multiplier: 1.375 },
  { value: 'moderately_active', labelKey: 'moderatelyActive', descriptionKey: 'moderatelyActiveDesc', multiplier: 1.55 },
  { value: 'very_active', labelKey: 'veryActive', descriptionKey: 'veryActiveDesc', multiplier: 1.725 },
  { value: 'athlete', labelKey: 'athlete', descriptionKey: 'athleteDesc', multiplier: 1.9 },
];

export const GOALS: { value: Goal; labelKey: string; descriptionKey: string; calorieAdjustment: number }[] = [
  { value: 'lose_weight', labelKey: 'loseWeight', descriptionKey: 'loseWeightDesc', calorieAdjustment: -500 },
  { value: 'maintain', labelKey: 'maintainWeight', descriptionKey: 'maintainWeightDesc', calorieAdjustment: 0 },
  { value: 'gain_muscle', labelKey: 'gainMuscle', descriptionKey: 'gainMuscleDesc', calorieAdjustment: 300 },
];

// ============== UTILITIES ==============

/** Parse date from DD/MM/YYYY or YYYY-MM-DD format, return age. Returns 30 if invalid/empty. */
export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth || !dateOfBirth.trim()) return 30;

  let dob: Date;
  const cleaned = dateOfBirth.replace(/\D/g, '');

  if (cleaned.length === 8) {
    const day = parseInt(cleaned.slice(0, 2), 10);
    const month = parseInt(cleaned.slice(2, 4), 10) - 1;
    const year = parseInt(cleaned.slice(4, 8), 10);
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
      dob = new Date(year, month, day);
    } else {
      dob = new Date(dateOfBirth);
    }
  } else if (dateOfBirth.includes('-')) {
    dob = new Date(dateOfBirth);
  } else {
    dob = new Date(dateOfBirth);
  }

  if (isNaN(dob.getTime())) return 30;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(18, Math.min(100, age));
}

export function calculateDailyCalorieGoal(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goal: Goal
): number {
  const w = Math.max(30, Math.min(300, weightKg || 70));
  const h = Math.max(100, Math.min(250, heightCm || 170));
  const a = Math.max(18, Math.min(100, age || 30));

  // Mifflin-St Jeor Equation (gold standard for BMR)
  const base = 10 * w + 6.25 * h - 5 * a;
  let bmr: number;
  if (gender === 'male') {
    bmr = base + 5;
  } else if (gender === 'female') {
    bmr = base - 161;
  } else {
    bmr = base - 78; // Average of male (+5) and female (-161)
  }

  const activityMultiplier = ACTIVITY_LEVELS.find(l => l.value === activityLevel)?.multiplier ?? 1.55;
  const tdee = Math.round(bmr * activityMultiplier);

  const goalAdjustment = GOALS.find(g => g.value === goal)?.calorieAdjustment ?? 0;
  return Math.max(1200, Math.min(5000, tdee + goalAdjustment)); // Min 1200, max 5000 kcal
}

export function calculateMacroGoals(dailyCalories: number, goal: Goal): { protein: number; carbs: number; fat: number } {
  // Default macro split: 30% protein, 40% carbs, 30% fat
  // Adjust based on goal
  let proteinRatio = 0.30;
  let carbsRatio = 0.40;
  let fatRatio = 0.30;

  if (goal === 'lose_weight') {
    proteinRatio = 0.40;
    carbsRatio = 0.30;
    fatRatio = 0.30;
  } else if (goal === 'gain_muscle') {
    proteinRatio = 0.35;
    carbsRatio = 0.45;
    fatRatio = 0.20;
  }

  return {
    protein: Math.round((dailyCalories * proteinRatio) / 4), // 4 calories per gram
    carbs: Math.round((dailyCalories * carbsRatio) / 4),
    fat: Math.round((dailyCalories * fatRatio) / 9), // 9 calories per gram
  };
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMealStorageKey(date: string): string {
  return `meals_${date}`;
}
