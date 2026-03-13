import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDiet } from '@/context/DietContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { ChevronLeft, ChevronRight, Clock, Utensils, ShoppingCart, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getShoppingListFromPlan } from '@/types/diet';
import type { DietDay, DietMeal, DietExercise } from '@/types/diet';

const MEAL_TYPE_KEYS = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
} as const;

type ViewMode = 'plan' | 'shopping' | 'exercise';

export default function DietPlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan, getPlanForDay, clearPlan } = useDiet();
  const [dayIndex, setDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('plan');

  const shoppingList = plan ? getShoppingListFromPlan(plan) : [];

  if (!plan) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t('dietNoPlan')}</Text>
      </View>
    );
  }

  const dayPlan = getPlanForDay(dayIndex);
  const totalDays = plan.days.length;

  const goPrev = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDayIndex((i) => (i - 1 + totalDays) % totalDays);
  };

  const goNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDayIndex((i) => (i + 1) % totalDays);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('dietPlan')}</Text>
      </View>

      {/* View mode toggle: Plan | Shopping List | Exercise */}
      <View style={styles.viewModeRow}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'plan' && styles.viewModeBtnActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('plan');
          }}
        >
          <Utensils size={18} color={viewMode === 'plan' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.viewModeText, viewMode === 'plan' && styles.viewModeTextActive]}>
            {t('dietPlan')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'shopping' && styles.viewModeBtnActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('shopping');
          }}
        >
          <ShoppingCart size={18} color={viewMode === 'shopping' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.viewModeText, viewMode === 'shopping' && styles.viewModeTextActive]}>
            {t('dietShoppingList')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'exercise' && styles.viewModeBtnActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('exercise');
          }}
        >
          <Dumbbell size={18} color={viewMode === 'exercise' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.viewModeText, viewMode === 'exercise' && styles.viewModeTextActive]}>
            {t('dietExercise')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day selector - when plan or exercise view */}
      {(viewMode === 'plan' || viewMode === 'exercise') && (
        <View style={styles.daySelector}>
          <TouchableOpacity onPress={goPrev} style={styles.dayNavBtn}>
            <ChevronLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.dayLabel}>
            {t('dietDay')} {dayPlan?.dayNumber ?? dayIndex + 1}
          </Text>
          <TouchableOpacity onPress={goNext} style={styles.dayNavBtn}>
            <ChevronRight size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Day summary - only when plan view */}
      {viewMode === 'plan' && dayPlan && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('dietDailyTotal')}</Text>
          <View style={styles.macroRow}>
            <MacroPill label="kcal" value={dayPlan.totalCalories} />
            <MacroPill label="P" value={dayPlan.totalProtein} unit="g" />
            <MacroPill label="K" value={dayPlan.totalCarbs} unit="g" />
            <MacroPill label="Y" value={dayPlan.totalFat} unit="g" />
          </View>
        </View>
      )}

      {/* Exercise view */}
      {viewMode === 'exercise' && (
        <ScrollView
          style={styles.shoppingScroll}
          contentContainerStyle={styles.shoppingScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shoppingCard}>
            <Text style={styles.shoppingTitle}>{t('dietExercise')}</Text>
            <Text style={styles.shoppingSubtitle}>{t('dietExerciseSubtitle')}</Text>
            {(!dayPlan?.exercises || dayPlan.exercises.length === 0) ? (
              <Text style={styles.shoppingEmpty}>{t('dietExerciseEmpty')}</Text>
            ) : (
              <View style={styles.shoppingList}>
                {dayPlan.exercises.map((ex: DietExercise, i: number) => (
                  <View key={i} style={styles.exerciseItem}>
                    <View style={styles.exerciseIcon}>
                      <Dumbbell size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.exerciseContent}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseDuration}>{ex.duration}</Text>
                      {ex.description && (
                        <Text style={styles.exerciseDesc}>{ex.description}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Shopping List view */}
      {viewMode === 'shopping' && (
        <ScrollView
          style={styles.shoppingScroll}
          contentContainerStyle={styles.shoppingScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shoppingCard}>
            <Text style={styles.shoppingTitle}>{t('dietShoppingList')}</Text>
            <Text style={styles.shoppingSubtitle}>{t('dietShoppingListSubtitle')}</Text>
            {shoppingList.length === 0 ? (
              <Text style={styles.shoppingEmpty}>{t('dietShoppingListEmpty')}</Text>
            ) : (
              <View style={styles.shoppingList}>
                {shoppingList.map((item, i) => (
                  <View key={i} style={styles.shoppingItem}>
                    <Text style={styles.shoppingItemName}>
                      {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                    </Text>
                    <Text style={styles.shoppingItemGrams}>
                    {item.totalGrams > 0 ? `${Math.round(item.totalGrams)}g` : '—'}
                  </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Meals - saat saat */}
      {viewMode === 'plan' && (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {dayPlan?.meals.map((meal, i) => (
          <MealCard key={i} meal={meal} t={t as (k: string) => string} />
        ))}
        <TouchableOpacity
          style={styles.createNewBtn}
          onPress={async () => {
            await clearPlan();
            router.replace('/diet');
          }}
        >
          <Text style={styles.createNewText}>{t('dietCreateNew')}</Text>
        </TouchableOpacity>
      </ScrollView>
      )}
    </View>
  );
}

function MacroPill({
  label,
  value,
  unit = '',
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {value}
        {unit}
      </Text>
    </View>
  );
}

function MealCard({ meal, t }: { meal: DietMeal; t: (k: string) => string }) {
  const typeKey = MEAL_TYPE_KEYS[meal.mealType] ?? 'snack';
  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTimeRow}>
          <Clock size={16} color={Colors.primary} />
          <Text style={styles.mealTime}>{meal.time}</Text>
        </View>
        <View style={styles.mealTypeBadge}>
          <Utensils size={14} color={Colors.textSecondary} />
          <Text style={styles.mealTypeText}>{t(typeKey)}</Text>
        </View>
      </View>
      <Text style={styles.mealName}>{meal.name}</Text>
      {meal.description && (
        <Text style={styles.mealDesc}>{meal.description}</Text>
      )}
      <View style={styles.mealMacros}>
        <Text style={styles.mealMacroText}>{meal.calories} kcal</Text>
        <Text style={styles.mealMacroText}>P: {meal.protein}g</Text>
        <Text style={styles.mealMacroText}>K: {meal.carbs}g</Text>
        <Text style={styles.mealMacroText}>Y: {meal.fat}g</Text>
      </View>
      {meal.ingredients && meal.ingredients.length > 0 && (
        <View style={styles.ingredientsRow}>
          <Text style={styles.ingredientsLabel}>{t('ingredients')}: </Text>
          <Text style={styles.ingredientsText}>{meal.ingredients.join(', ')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: { ...Typography.h1, color: Colors.text },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: 60 },
  daySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dayNavBtn: { padding: Spacing.sm },
  dayLabel: { ...Typography.h2, color: Colors.text },
  summaryCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  summaryTitle: { ...Typography.captionMedium, color: Colors.textSecondary, marginBottom: Spacing.sm },
  macroRow: { flexDirection: 'row', gap: Spacing.md },
  macroPill: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  macroLabel: { ...Typography.small, color: Colors.textSecondary },
  macroValue: { ...Typography.h3, color: Colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mealTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mealTime: { ...Typography.captionMedium, color: Colors.primary },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  mealTypeText: { ...Typography.small, color: Colors.textSecondary },
  mealName: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
  mealDesc: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  mealMacros: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  mealMacroText: { ...Typography.small, color: Colors.textTertiary },
  ingredientsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },
  ingredientsLabel: { ...Typography.small, color: Colors.textSecondary },
  ingredientsText: { ...Typography.small, color: Colors.text },
  viewModeRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  viewModeBtnActive: {
    backgroundColor: Colors.primaryGlow,
  },
  viewModeText: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  viewModeTextActive: {
    color: Colors.primary,
  },
  shoppingScroll: {
    flex: 1,
  },
  shoppingScrollContent: {
    paddingBottom: 100,
  },
  shoppingCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  shoppingTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  shoppingSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  shoppingEmpty: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  shoppingList: {
    gap: Spacing.sm,
  },
  shoppingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  shoppingItemName: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  shoppingItemGrams: {
    ...Typography.captionMedium,
    color: Colors.primary,
    marginLeft: Spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    ...Typography.bodyMedium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  exerciseDuration: {
    ...Typography.captionMedium,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  exerciseDesc: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  createNewBtn: {
    marginTop: Spacing.xl,
    marginBottom: 100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  createNewText: { ...Typography.bodyMedium, color: Colors.primary },
});
