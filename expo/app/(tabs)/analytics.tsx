import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeals } from '@/context/MealsContext';
import { useUser } from '@/context/UserContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { format, subDays, isSameDay } from 'date-fns';
import { Crown, Lock, Flame, Target } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { meals } = useMeals();
  const { profile } = useUser();
  const { isPremium } = useSubscription();

  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);

  const goal = profile.dailyCalorieGoal;

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const days = Array.from({ length: timeRange }, (_, i) => {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayMeals = meals.filter((m) => {
        const mealDate = new Date(m.timestamp);
        return format(mealDate, 'yyyy-MM-dd') === dateStr;
      });
      const calories = dayMeals.reduce((sum, m) => sum + m.total_calories, 0);
      const protein = dayMeals.reduce((sum, m) => sum + m.total_protein_grams, 0);
      const carbs = dayMeals.reduce((sum, m) => sum + m.total_carbs_grams, 0);
      const fat = dayMeals.reduce((sum, m) => sum + m.total_fat_grams, 0);
      return { date, calories, protein, carbs, fat, meals: dayMeals.length };
    }).reverse();

    const avgCalories = days.length > 0 ? Math.round(days.reduce((sum, d) => sum + d.calories, 0) / days.length) : 0;
    const daysHitGoal = days.filter((d) => Math.abs(d.calories - goal) <= 100).length;
    
    const totalMacros = days.reduce(
      (acc, d) => ({ protein: acc.protein + d.protein, carbs: acc.carbs + d.carbs, fat: acc.fat + d.fat }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    const macroTotal = totalMacros.protein + totalMacros.carbs + totalMacros.fat;
    
    // Calculate streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    for (const day of [...days].reverse()) {
      if (day.meals > 0) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
        if (isSameDay(day.date, new Date()) || isSameDay(day.date, subDays(new Date(), 1))) {
          currentStreak = tempStreak;
        }
      } else {
        if (!isSameDay(day.date, new Date())) {
          tempStreak = 0;
        }
      }
    }

    return {
      days,
      avgCalories,
      daysHitGoal,
      macroDistribution: {
        protein: macroTotal > 0 ? (totalMacros.protein / macroTotal) * 100 : 0,
        carbs: macroTotal > 0 ? (totalMacros.carbs / macroTotal) * 100 : 0,
        fat: macroTotal > 0 ? (totalMacros.fat / macroTotal) * 100 : 0,
      },
      currentStreak,
      bestStreak,
    };
  }, [meals, timeRange, goal]);

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('analytics')}</Text>
        </View>
        
        <View style={styles.premiumGate}>
          <LinearGradient
            colors={Colors.gradientGold}
            style={styles.lockIconContainer}
          >
            <Lock size={40} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.premiumTitle}>{t('analyticsPremiumTitle')}</Text>
          <Text style={styles.premiumSubtitle}>{t('analyticsPremiumDesc')}</Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/paywall/index' as never)}
          >
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.upgradeGradient}
            >
              <Crown size={20} color="#FFFFFF" />
              <Text style={styles.upgradeText}>{t('goPremium')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('analytics')}</Text>
        
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {[7, 30, 90].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.timeRangeButton,
                timeRange === days && styles.timeRangeButtonActive,
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(days as 7 | 30 | 90);
              }}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === days && styles.timeRangeTextActive,
                ]}
              >
                {days}D
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calorie Trend Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>{t('calorieTrend')}</Text>
          <View style={styles.lineChart}>
            <Svg width={width - Spacing.lg * 4} height={150}>
              {/* Grid lines */}
              {[0, 1, 2, 3].map((i) => (
                <Line
                  key={i}
                  x1={0}
                  y1={i * 37.5}
                  x2={width - Spacing.lg * 4}
                  y2={i * 37.5}
                  stroke={Colors.border}
                  strokeWidth={1}
                />
              ))}
              
              {/* Goal line */}
              <Line
                x1={0}
                y1={75}
                x2={width - Spacing.lg * 4}
                y2={75}
                stroke={Colors.primary}
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              
              {/* Data line */}
              {analyticsData.days.length > 1 && (
                <Path
                  d={generateSmoothPath(analyticsData.days, goal, width - Spacing.lg * 4, 150)}
                  fill="none"
                  stroke={Colors.accent}
                  strokeWidth={3}
                />
              )}
              
              {/* Data points */}
              {analyticsData.days.map((day, index) => {
                const x = (index / (analyticsData.days.length - 1)) * (width - Spacing.lg * 4);
                const normalizedValue = Math.min(day.calories / (goal * 1.5), 1);
                const y = 150 - normalizedValue * 150;
                return (
                  <Circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={Colors.accent}
                  />
                );
              })}
            </Svg>
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
              <Text style={styles.legendText}>{t('calories')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendText}>{t('goal')}</Text>
            </View>
          </View>
        </View>

        {/* Macros Distribution */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>{t('macrosDistribution')}</Text>
          <View style={styles.donutChart}>
            <Svg width={150} height={150} viewBox="0 0 100 100">
              <Circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={Colors.accentBlue}
                strokeWidth="15"
                strokeDasharray={`${analyticsData.macroDistribution.protein * 2.51} 251`}
                transform="rotate(-90 50 50)"
              />
              <Circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={Colors.accentOrange}
                strokeWidth="15"
                strokeDasharray={`${analyticsData.macroDistribution.carbs * 2.51} 251`}
                strokeDashoffset={-analyticsData.macroDistribution.protein * 2.51}
                transform="rotate(-90 50 50)"
              />
              <Circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={Colors.accentPink}
                strokeWidth="15"
                strokeDasharray={`${analyticsData.macroDistribution.fat * 2.51} 251`}
                strokeDashoffset={-(analyticsData.macroDistribution.protein + analyticsData.macroDistribution.carbs) * 2.51}
                transform="rotate(-90 50 50)"
              />
            </Svg>
            <View style={styles.donutCenter}>
              <Text style={styles.donutValue}>
                {Math.round(analyticsData.avgCalories)}
              </Text>
              <Text style={styles.donutLabel}>{t('avgCalories')}</Text>
            </View>
          </View>
          <View style={styles.macroLegend}>
            <MacroLegendItem color={Colors.accentBlue} label={t('protein')} value={Math.round(analyticsData.macroDistribution.protein)} />
            <MacroLegendItem color={Colors.accentOrange} label={t('carbs')} value={Math.round(analyticsData.macroDistribution.carbs)} />
            <MacroLegendItem color={Colors.accentPink} label={t('fat')} value={Math.round(analyticsData.macroDistribution.fat)} />
          </View>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Flame size={24} color={Colors.accentOrange} />
            <Text style={styles.streakTitle}>{t('currentStreak')}</Text>
          </View>
          <Text style={styles.streakValue}>
            {analyticsData.currentStreak} <Text style={styles.streakUnit}>{t('days')}</Text>
          </Text>
          <Text style={styles.bestStreak}>
            {t('bestStreak')}: {analyticsData.bestStreak} {t('days')}
          </Text>
          
          {/* Last 14 days visualization */}
          <View style={styles.daysRow}>
            {analyticsData.days.slice(-14).map((day, index) => (
              <View
                key={index}
                style={[
                  styles.dayDot,
                  day.meals > 0 && styles.dayDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Goal Achievement */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Target size={24} color={Colors.primary} />
            <Text style={styles.goalTitle}>{t('goalAchievement')}</Text>
          </View>
          <Text style={styles.goalText}>
            {t('daysHitGoal', { count: analyticsData.daysHitGoal })}
          </Text>
          <View style={styles.goalProgress}>
            <View
              style={[
                styles.goalProgressFill,
                { width: `${(analyticsData.daysHitGoal / timeRange) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.goalPercentage}>
            {Math.round((analyticsData.daysHitGoal / timeRange) * 100)}%
          </Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

function MacroLegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.macroLegendItem}>
      <View style={[styles.macroLegendDot, { backgroundColor: color }]} />
      <Text style={styles.macroLegendLabel}>{label}</Text>
      <Text style={styles.macroLegendValue}>{value}%</Text>
    </View>
  );
}

function generateSmoothPath(days: { calories: number }[], goal: number, width: number, height: number): string {
  if (days.length < 2) return '';
  
  const maxCalories = Math.max(...days.map((d) => d.calories), goal * 1.5);
  const points = days.map((day, index) => {
    const x = (index / (days.length - 1)) * width;
    const normalizedValue = Math.min(day.calories / maxCalories, 1);
    const y = height - normalizedValue * height;
    return { x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    path += ` Q ${cpX} ${prev.y}, ${curr.x} ${curr.y}`;
  }
  
  return path;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeRangeText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  premiumTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  premiumSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  upgradeButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  upgradeText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  lineChart: {
    alignItems: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  legendLine: {
    width: 16,
    height: 2,
  },
  legendText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  donutChart: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutValue: {
    ...Typography.h2,
    color: Colors.text,
  },
  donutLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  macroLegendDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
  },
  macroLegendLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  macroLegendValue: {
    ...Typography.smallMedium,
    color: Colors.text,
  },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  streakTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  streakValue: {
    ...Typography.display,
    color: Colors.accentOrange,
  },
  streakUnit: {
    ...Typography.h3,
    color: Colors.textSecondary,
  },
  bestStreak: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  dayDot: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface2,
  },
  dayDotActive: {
    backgroundColor: Colors.accentOrange,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  goalTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  goalText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  goalProgress: {
    height: 8,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  goalPercentage: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  bottomSpacing: {
    height: 100,
  },
});
