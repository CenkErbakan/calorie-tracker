import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDiet } from '@/context/DietContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { ChevronLeft, ChevronRight, Clock, Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { DietDay, DietMeal } from '@/types/diet';

const MEAL_TYPE_KEYS = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
} as const;

export default function DietPlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan, getPlanForDay, clearPlan } = useDiet();
  const [dayIndex, setDayIndex] = useState(0);

  const goBack = () => router.replace('/(tabs)');

  if (!plan) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
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
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dietPlan')}</Text>
      </View>

      {/* Day selector */}
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

      {/* Day summary */}
      {dayPlan && (
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

      {/* Meals - saat saat */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {dayPlan?.meals.map((meal, i) => (
          <MealCard key={i} meal={meal} t={t} />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: { ...Typography.h1, color: Colors.text, marginLeft: Spacing.sm },
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
