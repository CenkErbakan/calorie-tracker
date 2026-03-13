import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMeals } from '@/context/MealsContext';
import { useUser } from '@/context/UserContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks, getDaysInMonth } from 'date-fns';
import { formatDate } from '@/lib/dateUtils';
import { ChevronLeft, ChevronRight, X, Target, TrendingUp, TrendingDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getMealsForDate } = useMeals();
  const { profile } = useUser();

  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const goal = profile.dailyCalorieGoal;

  const navigatePrevious = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const navigateNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const weekData = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayMeals = getMealsForDate(dateStr);
      const calories = dayMeals.reduce((sum, m) => sum + m.total_calories, 0);
      const diff = calories - goal;

      return {
        date: day,
        dateStr,
        calories,
        meals: dayMeals,
        status: diff < -100 ? 'under' : diff > 100 ? 'over' : 'on_track',
      };
    });
  }, [currentDate, getMealsForDate, goal]);

  const monthData = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);

    const days: Record<number, { calories: number; status: string; meals: number }> = {};
    let totalCalories = 0;
    let daysTracked = 0;
    let daysUnder = 0;
    let daysOver = 0;
    let totalMeals = 0;
    let bestDay = { day: 0, calories: 0 };
    let worstDay = { day: 0, calories: Infinity };

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayMeals = getMealsForDate(dateStr);
      const calories = dayMeals.reduce((sum, m) => sum + m.total_calories, 0);

      if (dayMeals.length > 0) {
        totalCalories += calories;
        daysTracked++;
        totalMeals += dayMeals.length;

        const diff = calories - goal;
        if (diff < -100) daysUnder++;
        else if (diff > 100) daysOver++;

        if (calories > bestDay.calories) bestDay = { day: i, calories };
        if (calories < worstDay.calories) worstDay = { day: i, calories };
      }

      const status = calories === 0 ? 'empty' : calories < goal - 100 ? 'under' : calories > goal + 100 ? 'over' : 'on_track';
      days[i] = { calories, status, meals: dayMeals.length };
    }

    return {
      days,
      summary: {
        avgDaily: daysTracked > 0 ? Math.round(totalCalories / daysTracked) : 0,
        daysUnder,
        daysOver,
        daysTracked,
        totalMeals,
        bestDay: bestDay.day > 0 ? bestDay : null,
        worstDay: worstDay.day > 0 && worstDay.calories !== Infinity ? worstDay : null,
      },
    };
  }, [currentDate, getMealsForDate, goal]);

  const handleDayPress = useCallback((day: Date) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(day);
    setShowDayModal(true);
  }, []);

  const selectedDayMeals = useMemo(() => {
    if (!selectedDay) return [];
    return getMealsForDate(format(selectedDay, 'yyyy-MM-dd'));
  }, [selectedDay, getMealsForDate]);

  const weekAverage = useMemo(() => {
    const total = weekData.reduce((sum, d) => sum + d.calories, 0);
    const tracked = weekData.filter((d) => d.calories > 0).length;
    return tracked > 0 ? Math.round(total / tracked) : 0;
  }, [weekData]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('history')}</Text>

        {/* View Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
              {t('weekView')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'month' && styles.toggleButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>
              {t('monthView')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity onPress={navigatePrevious} style={styles.navButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.currentPeriod}>
            {viewMode === 'week'
              ? `${formatDate(weekData[0].date, 'MMM d')} - ${formatDate(weekData[6].date, 'MMM d')}`
              : formatDate(currentDate, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={navigateNext} style={styles.navButton}>
            <ChevronRight size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Week View */}
        {viewMode === 'week' && (
          <View style={styles.weekView}>
            {/* Bar Chart */}
            <View style={styles.chartContainer}>
              <View style={styles.chartBars}>
                {weekData.map((day, index) => {
                  const maxCalories = Math.max(...weekData.map((d) => d.calories), goal);
                  const height = day.calories > 0 ? (day.calories / maxCalories) * 150 : 4;
                  const goalHeight = (goal / maxCalories) * 150;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.barWrapper}
                      onPress={() => handleDayPress(day.date)}
                    >
                      <View style={styles.barContainer}>
                        <View style={[styles.goalLine, { bottom: goalHeight }]} />
                        <View
                          style={[
                            styles.bar,
                            {
                              height,
                              backgroundColor:
                                day.status === 'under'
                                  ? Colors.success
                                  : day.status === 'over'
                                  ? Colors.error
                                  : Colors.accentOrange,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{formatDate(day.date, 'EEE')}</Text>
                      <Text style={styles.barValue}>{day.calories > 0 ? day.calories : '-'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Average */}
            <View style={styles.averageCard}>
              <Text style={styles.averageLabel}>{t('avgCalories')}</Text>
              <Text style={styles.averageValue}>{weekAverage}</Text>
            </View>

            {/* Selected Day Meals */}
            <View style={styles.dayMealsSection}>
              <Text style={styles.sectionTitle}>
                {selectedDay ? formatDate(selectedDay, 'EEEE, MMM d') : t('todaysMeals')}
              </Text>
              {selectedDayMeals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>{t('noMealsYet')}</Text>
                </View>
              ) : (
                selectedDayMeals.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={styles.mealCard}
                    onPress={() => router.push(`/meal/${meal.id}`)}
                  >
                    <Text style={styles.mealName}>{meal.meal_name}</Text>
                    <Text style={styles.mealCalories}>{meal.total_calories} kcal</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <View style={styles.monthView}>
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const d = new Date(2024, 0, day);
                return (
                  <Text key={day} style={styles.calendarHeader}>
                    {formatDate(d, 'EEE')}
                  </Text>
                );
              })}
              {Object.entries(monthData.days).map(([day, data]) => (
                <TouchableOpacity
                  key={day}
                  style={styles.calendarDay}
                  onPress={() => {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(day));
                    handleDayPress(date);
                  }}
                >
                  <View
                    style={[
                      styles.dayDot,
                      data.status === 'under' && styles.dayDotUnder,
                      data.status === 'over' && styles.dayDotOver,
                      data.status === 'on_track' && styles.dayDotOnTrack,
                    ]}
                  />
                  <Text style={styles.dayNumber}>{day}</Text>
                  {data.calories > 0 && (
                    <Text style={styles.dayCalories}>{data.calories}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>{t('monthlySummary')}</Text>
              <View style={styles.summaryRow}>
                <SummaryItem
                  icon={<TrendingUp size={20} color={Colors.primary} />}
                  label={t('avgCalories')}
                  value={monthData.summary.avgDaily}
                />
                <SummaryItem
                  icon={<Target size={20} color={Colors.success} />}
                  label={t('daysUnderGoal')}
                  value={monthData.summary.daysUnder}
                />
              </View>
              <View style={styles.summaryRow}>
                <SummaryItem
                  icon={<TrendingDown size={20} color={Colors.error} />}
                  label={t('daysOverGoal')}
                  value={monthData.summary.daysOver}
                />
                <SummaryItem
                  icon={<Target size={20} color={Colors.accentOrange} />}
                  label={t('totalMeals')}
                  value={monthData.summary.totalMeals}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Day Modal */}
      <Modal visible={showDayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDay && formatDate(selectedDay, 'EEEE, MMMM d')}
              </Text>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selectedDayMeals.length === 0 ? (
                <Text style={styles.emptyText}>{t('noMealsYet')}</Text>
              ) : (
                selectedDayMeals.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={styles.mealCard}
                    onPress={() => {
                      setShowDayModal(false);
                      router.push(`/meal/${meal.id}`);
                    }}
                  >
                    <Text style={styles.mealName}>{meal.meal_name}</Text>
                    <Text style={styles.mealCalories}>{meal.total_calories} kcal</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <View style={styles.summaryItem}>
      {icon}
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  navButton: {
    padding: Spacing.sm,
  },
  currentPeriod: {
    ...Typography.h3,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  weekView: {
    gap: Spacing.lg,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    width: 30,
    height: 150,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  goalLine: {
    position: 'absolute',
    left: -5,
    right: -5,
    height: 2,
    backgroundColor: Colors.textTertiary,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.textTertiary,
  },
  bar: {
    width: '100%',
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  barLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  barValue: {
    ...Typography.smallMedium,
    color: Colors.text,
    marginTop: 2,
  },
  averageCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  averageLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  averageValue: {
    ...Typography.display,
    color: Colors.primary,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  dayMealsSection: {
    marginTop: Spacing.lg,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mealCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  mealName: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  mealCalories: {
    ...Typography.bodyMedium,
    color: Colors.accent,
  },
  monthView: {
    gap: Spacing.lg,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  calendarHeader: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 7,
    textAlign: 'center',
    ...Typography.smallMedium,
    color: Colors.textSecondary,
    paddingVertical: Spacing.sm,
  },
  calendarDay: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 7,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface2,
    marginBottom: 2,
  },
  dayDotUnder: {
    backgroundColor: Colors.success,
  },
  dayDotOver: {
    backgroundColor: Colors.error,
  },
  dayDotOnTrack: {
    backgroundColor: Colors.accentOrange,
  },
  dayNumber: {
    ...Typography.small,
    color: Colors.text,
  },
  dayCalories: {
    ...Typography.small,
    color: Colors.textSecondary,
    fontSize: 9,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryValue: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  bottomSpacing: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
});
