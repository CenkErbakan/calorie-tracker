import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';
import { Meal, MealSchema, NutritionData, Ingredient, getTodayKey, getMealStorageKey } from '@/types';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { i18n } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

interface MealsContextValue {
  meals: Meal[];
  isLoading: boolean;
  addMeal: (meal: Omit<Meal, 'id' | 'timestamp'>) => Promise<void>;
  updateMeal: (id: string, updates: Partial<Meal>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  analyzePhoto: (photoUri: string) => Promise<NutritionData>;
  getTodaysMeals: () => Meal[];
  getTodaysCalories: () => number;
  getTodaysMacros: () => { protein: number; carbs: number; fat: number };
  getMealsForDate: (date: string) => Meal[];
  getMealsForDateRange: (startDate: string, endDate: string) => Meal[];
}

const NutritionDataSchema = z.object({
  meal_name: z.string(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  ingredients: z.array(z.object({
    name: z.string(),
    weight_grams: z.number(),
    calories: z.number(),
    protein_grams: z.number(),
    carbs_grams: z.number(),
    fat_grams: z.number(),
  })),
  total_calories: z.number(),
  total_protein_grams: z.number(),
  total_carbs_grams: z.number(),
  total_fat_grams: z.number(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  notes: z.string().optional(),
});

export const [MealsProvider, useMeals] = createContextHook<MealsContextValue>(() => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      // Load meals from the last 30 days
      const loadedMeals: Meal[] = [];
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const storageKey = getMealStorageKey(dateKey);

        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const validMeals = parsed.filter((m: unknown) => {
            try {
              MealSchema.parse(m);
              return true;
            } catch {
              return false;
            }
          });
          loadedMeals.push(...validMeals);
        }
      }

      setMeals(loadedMeals.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Failed to load meals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMealsForDate = async (date: string, mealsToSave: Meal[]) => {
    try {
      const storageKey = getMealStorageKey(date);
      await AsyncStorage.setItem(storageKey, JSON.stringify(mealsToSave));
    } catch (error) {
      console.error('Failed to save meals:', error);
    }
  };

  const addMeal = useCallback(async (mealData: Omit<Meal, 'id' | 'timestamp'>) => {
    const newMeal: Meal = {
      ...mealData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const dateKey = getTodayKey();
    const dateMeals = meals.filter(m => {
      const mealDate = new Date(m.timestamp).toISOString().split('T')[0];
      return mealDate === dateKey;
    });

    const updatedDateMeals = [...dateMeals, newMeal];
    await saveMealsForDate(dateKey, updatedDateMeals);

    setMeals(prev => [newMeal, ...prev]);
  }, [meals]);

  const updateMeal = useCallback(async (id: string, updates: Partial<Meal>) => {
    const mealIndex = meals.findIndex(m => m.id === id);
    if (mealIndex === -1) return;

    const updatedMeal = { ...meals[mealIndex], ...updates };
    const updatedMeals = [...meals];
    updatedMeals[mealIndex] = updatedMeal;

    const dateKey = new Date(updatedMeal.timestamp).toISOString().split('T')[0];
    const dateMeals = updatedMeals.filter(m => {
      const mealDate = new Date(m.timestamp).toISOString().split('T')[0];
      return mealDate === dateKey;
    });

    await saveMealsForDate(dateKey, dateMeals);
    setMeals(updatedMeals);
  }, [meals]);

  const deleteMeal = useCallback(async (id: string) => {
    const mealToDelete = meals.find(m => m.id === id);
    if (!mealToDelete) return;

    const updatedMeals = meals.filter(m => m.id !== id);

    const dateKey = new Date(mealToDelete.timestamp).toISOString().split('T')[0];
    const dateMeals = updatedMeals.filter(m => {
      const mealDate = new Date(m.timestamp).toISOString().split('T')[0];
      return mealDate === dateKey;
    });

    await saveMealsForDate(dateKey, dateMeals);
    setMeals(updatedMeals);
  }, [meals]);

  const analyzePhoto = useCallback(async (photoUri: string): Promise<NutritionData> => {
    const response = await fetch(photoUri);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });

    // Resolve language: 'auto' -> device locale, otherwise use selected language
    const lang: Language = i18n.getLanguage();
    const effectiveLang = lang === 'auto'
      ? (getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en')
      : lang;
    const languageInstruction = effectiveLang === 'tr'
      ? 'IMPORTANT: Respond in Turkish. Use Turkish for meal_name, all ingredient names, and notes (e.g. "Tavuk Izgara", "Pirinç", "Salata").'
      : 'IMPORTANT: Respond in English. Use English for meal_name, all ingredient names, and notes (e.g. "Grilled Chicken", "Rice", "Salad").';

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional nutritionist and dietitian. Analyze the food in the provided image carefully. Identify every visible ingredient and estimate portions based on standard serving sizes and visual cues.

${languageInstruction}

Return ONLY a valid JSON object with no extra text:
{
  "meal_name": string,
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "ingredients": [
    {
      "name": string,
      "weight_grams": number,
      "calories": number,
      "protein_grams": number,
      "carbs_grams": number,
      "fat_grams": number
    }
  ],
  "total_calories": number,
  "total_protein_grams": number,
  "total_carbs_grams": number,
  "total_fat_grams": number,
  "confidence": "high" | "medium" | "low",
  "notes": string
}`,
            },
            {
              type: 'image',
              image: base64,
            },
          ],
        },
      ],
      schema: NutritionDataSchema,
    });

    // Add original values for auto-recalculation
    const ingredientsWithOriginals: Ingredient[] = result.ingredients.map((ing: Ingredient) => ({
      ...ing,
      original_weight_grams: ing.weight_grams,
      original_calories: ing.calories,
      original_protein_grams: ing.protein_grams,
      original_carbs_grams: ing.carbs_grams,
      original_fat_grams: ing.fat_grams,
    }));

    return {
      ...result,
      ingredients: ingredientsWithOriginals,
    };
  }, []);

  const getTodaysMeals = useCallback(() => {
    const today = getTodayKey();
    return meals.filter(meal => {
      const mealDate = new Date(meal.timestamp).toISOString().split('T')[0];
      return mealDate === today;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [meals]);

  const getTodaysCalories = useCallback(() => {
    return getTodaysMeals().reduce((sum, meal) => sum + meal.total_calories, 0);
  }, [getTodaysMeals]);

  const getTodaysMacros = useCallback(() => {
    const todaysMeals = getTodaysMeals();
    return {
      protein: todaysMeals.reduce((sum, meal) => sum + meal.total_protein_grams, 0),
      carbs: todaysMeals.reduce((sum, meal) => sum + meal.total_carbs_grams, 0),
      fat: todaysMeals.reduce((sum, meal) => sum + meal.total_fat_grams, 0),
    };
  }, [getTodaysMeals]);

  const getMealsForDate = useCallback((date: string) => {
    return meals.filter(meal => {
      const mealDate = new Date(meal.timestamp).toISOString().split('T')[0];
      return mealDate === date;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [meals]);

  const getMealsForDateRange = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return meals.filter(meal => {
      const mealDate = new Date(meal.timestamp);
      return mealDate >= start && mealDate <= end;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [meals]);

  const value = useMemo(() => ({
    meals,
    isLoading,
    addMeal,
    updateMeal,
    deleteMeal,
    analyzePhoto,
    getTodaysMeals,
    getTodaysCalories,
    getTodaysMacros,
    getMealsForDate,
    getMealsForDateRange,
  }), [meals, isLoading, addMeal, updateMeal, deleteMeal, analyzePhoto, getTodaysMeals, getTodaysCalories, getTodaysMacros, getMealsForDate, getMealsForDateRange]);

  return value;
});
