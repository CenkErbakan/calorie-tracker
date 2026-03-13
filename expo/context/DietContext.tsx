import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLocales } from 'expo-localization';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import {
  DietPlan,
  DietPlanSchema,
  DietWizardData,
  getDietSpeedOptions,
  getDietTargetCalories,
} from '@/types/diet';
import { GOALS } from '@/types';
import { useUser } from '@/context/UserContext';
import { i18n } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

const DIET_PLAN_KEY = '@nutrilens_diet_plan';

// API için hafif schema - 7 günlük plan
const DietPlanApiSchema = z.object({
  days: z.array(
    z.object({
      dayNumber: z.number(),
      meals: z.array(
        z.object({
          time: z.string(),
          mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
          name: z.string(),
          description: z.string().optional(),
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
          ingredients: z.array(z.string()).optional(),
        })
      ),
      totalCalories: z.number(),
      totalProtein: z.number(),
      totalCarbs: z.number(),
      totalFat: z.number(),
      notes: z.string().optional(),
      exercises: z.array(
        z.object({
          name: z.string(),
          duration: z.string(),
          description: z.string().optional(),
        })
      ).optional(),
    })
  ),
});

interface DietContextValue {
  plan: DietPlan | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  generatePlan: (data: DietWizardData) => Promise<DietPlan | null>;
  clearPlan: () => Promise<void>;
  getPlanForDay: (dayIndex: number) => DietPlan['days'][0] | null;
}

export const [DietProvider, useDiet] = createContextHook<DietContextValue>(() => {
  const { profile } = useUser();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const stored = await AsyncStorage.getItem(DIET_PLAN_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = DietPlanSchema.safeParse(parsed);
        if (validated.success) setPlan(validated.data);
      }
    } catch (e) {
      console.error('Failed to load diet plan:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const savePlan = async (p: DietPlan) => {
    try {
      await AsyncStorage.setItem(DIET_PLAN_KEY, JSON.stringify(p));
    } catch (e) {
      console.error('Failed to save diet plan:', e);
    }
  };

  const clearPlan = useCallback(async () => {
    setPlan(null);
    setError(null);
    await AsyncStorage.removeItem(DIET_PLAN_KEY);
  }, []);

  const generatePlan = useCallback(
    async (data: DietWizardData): Promise<DietPlan | null> => {
      setError(null);
      setIsGenerating(true);

      try {
        const options = getDietSpeedOptions(data.weightToLoseKg);
        const selected = options.find((o) => o.speed === data.speed);
        const months = selected?.months ?? 1;
        const kgPerMonth = selected?.kgPerMonth ?? 4;

        // Bakım kalorisi (TDEE) - profil hedefinden geri hesapla
        const goalAdjustment = GOALS.find((g) => g.value === profile.goal)?.calorieAdjustment ?? 0;
        const maintenanceCalories = profile.dailyCalorieGoal - goalAdjustment;

        // Hız seçimine göre günlük hedef kalori
        const targetCalories = getDietTargetCalories(maintenanceCalories, kgPerMonth);
        const lang: Language = i18n.getLanguage();
        const effectiveLang =
          lang === 'auto' ? (getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en') : lang;
        const isTurkish = effectiveLang === 'tr';

        const languageInstruction = isTurkish
          ? 'IMPORTANT: Respond in Turkish. Use Turkish for all meal names, descriptions, ingredients, and notes.'
          : 'IMPORTANT: Respond in English. Use English for all meal names, descriptions, ingredients, and notes.';

        const allergiesText =
          data.allergies.length > 0 ? `Allergies to AVOID: ${data.allergies.join(', ')}.` : '';
        const dislikedText =
          data.dislikedFoods.length > 0 ? `Foods the user DISLIKES (do not include): ${data.dislikedFoods.join(', ')}.` : '';

        const result = await generateObject({
          messages: [
            {
              role: 'user',
              content: `You are a professional dietitian. Create a 7-day personalized diet plan (weekly template that repeats).

User profile:
- Maintenance (TDEE): ${maintenanceCalories} kcal
- Target: Lose ${data.weightToLoseKg} kg over ${months} months
- Speed: ${data.speed} (${kgPerMonth} kg/month = ~${Math.round((kgPerMonth * 7700) / 30)} kcal deficit/day)

${allergiesText}
${dislikedText}

${languageInstruction}

Create a balanced 7-day plan. Each day should have:
- Breakfast (around 07:00-08:00)
- Lunch (around 12:00-13:00)
- Dinner (around 18:00-19:00)
- 1-2 optional snacks (between meals)
- exercises: 1-3 daily exercise suggestions (e.g. "30 min walk", "15 min stretching", "20 min light jog"). Simple, achievable activities. Include name and duration.

CRITICAL: Daily total MUST be approximately ${targetCalories} kcal (range: ${targetCalories - 100} to ${targetCalories + 100}). This creates the ${kgPerMonth} kg/month deficit needed for the chosen speed.
Macros: ~30% protein, 40% carbs, 30% fat.

INGREDIENTS RULE: Every ingredient MUST include grams. Use format "Xg ingredient name" (e.g. "100g chicken breast", "50g rice", "30g olive oil", "2 eggs (120g)"). This allows the user to know exactly how much to eat and prepare.

Return ONLY valid JSON matching this structure:
{
  "days": [
    {
      "dayNumber": 1,
      "meals": [
        {
          "time": "08:00",
          "mealType": "breakfast",
          "name": "Meal name",
          "description": "Brief description",
          "calories": 400,
          "protein": 25,
          "carbs": 45,
          "fat": 12,
          "ingredients": ["100g chicken breast", "50g rice", "30g olive oil"]
        }
      ],
      "totalCalories": ${targetCalories},
      "totalProtein": 120,
      "totalCarbs": 180,
      "totalFat": 60,
      "notes": "Optional day notes",
      "exercises": [
        { "name": "Yürüyüş", "duration": "30 dakika", "description": "Orta tempoda yürüyüş" },
        { "name": "Esneme", "duration": "10 dakika", "description": "Hafif esneme hareketleri" }
      ]
    }
  ]
}`,
            },
          ],
          schema: DietPlanApiSchema,
        });

        const fullPlan: DietPlan = {
          id: `diet-${Date.now()}`,
          createdAt: Date.now(),
          targetWeightLossKg: data.weightToLoseKg,
          speed: data.speed,
          monthsDuration: months,
          dailyCalorieTarget: targetCalories,
          allergies: data.allergies,
          dislikedFoods: data.dislikedFoods,
          days: result.days.map((d) => ({
            dayNumber: d.dayNumber,
            meals: d.meals,
            totalCalories: d.totalCalories,
            totalProtein: d.totalProtein,
            totalCarbs: d.totalCarbs,
            totalFat: d.totalFat,
            notes: d.notes,
            exercises: d.exercises ?? [],
          })),
        };

        setPlan(fullPlan);
        await savePlan(fullPlan);
        return fullPlan;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'diet plan generation failed';
        setError(errMsg);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [profile.dailyCalorieGoal, profile.goal]
  );

  const getPlanForDay = useCallback(
    (dayIndex: number) => {
      if (!plan) return null;
      const day = plan.days[dayIndex % plan.days.length];
      return day ?? null;
    },
    [plan]
  );

  const value = useMemo(
    () => ({
      plan,
      isLoading,
      isGenerating,
      error,
      generatePlan,
      clearPlan,
      getPlanForDay,
    }),
    [plan, isLoading, isGenerating, error, generatePlan, clearPlan, getPlanForDay]
  );

  return value;
});
