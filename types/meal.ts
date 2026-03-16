import { z } from 'zod';

export const IngredientSchema = z.object({
  name: z.string(),
  weight_grams: z.number(),
  calories: z.number(),
});

export const MealSchema = z.object({
  id: z.string(),
  meal_name: z.string(),
  photo_uri: z.string(),
  ingredients: z.array(IngredientSchema),
  total_calories: z.number(),
  protein_grams: z.number(),
  carbs_grams: z.number(),
  fat_grams: z.number(),
  timestamp: z.number(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Meal = z.infer<typeof MealSchema>;

export interface NutritionData {
  meal_name: string;
  ingredients: Ingredient[];
  total_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
}

export const DAILY_CALORIE_GOAL = 2000;
