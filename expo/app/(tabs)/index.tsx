
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMeals } from '@/context/MealsContext';
import { useUser } from '@/context/UserContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { Meal } from '@/types';
import { format } from 'date-fns';
import {
  Plus,
  Flame,
  Target,
  Zap,
  Crown,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';



export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getTodaysMeals, getTodaysCalories, getTodaysMacros, deleteMeal } = useMeals();
  const { profile, getGreeting } = useUser();
  const { isPremium, remainingFreeScans, canScan } = useSubscription();

  const todaysMeals = getTodaysMeals();
  const consumed = getTodaysCalories();
  const macros = getTodaysMacros();
  const goal = profile.dailyCalorieGoal;
  const remaining = Math.max(0, goal - consumed);
  const progress = Math.min(consumed / goal, 1);

  const handleAddMeal = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (canScan) {
      router.push('/add');
    } else {
      router.push('/paywall');
    }
  };

  const handleMealPress = (mealId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/meal/${mealId}`);
  };

  const handleDeleteMeal = async (mealId: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteMeal(mealId);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.date}>
              {format(new Date(), 'EEEE, MMMM d')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.premiumBadge}
            onPress={() => {if (!isPremium) {router.push('/paywall/index' as never);}}}
          >
            <BlurView intensity={20} style={styles.premiumBlur}>
              {isPremium ? (
                <>
                  <Crown size={14} color={Colors.accentOrange} />
                  <Text style={styles.premiumText}>{t('premium')}</Text>
                </>
              ) : (
                <Text style={styles.freePlanText}>{t('freePlan')}</Text>
              )}
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Calorie Ring */}
        <View style={styles.ringContainer}>
          <CalorieRing
            progress={progress}
            remaining={remaining}
            consumed={consumed}
            goal={goal}
          />
        </View>

        {/* Mini Stats */}
        <View style={styles.statsRow}>
          <MiniStat
            icon={<Flame size={18} color={Colors.accent} />}
            value={consumed}
            label={t('consumed')}
            color={Colors.accent}
          />
          <View style={styles.statDivider} />
          <MiniStat
            icon={<Target size={18} color={Colors.primary} />}
            value={goal}
            label={t('goal')}
            color={Colors.primary}
          />
          <View style={styles.statDivider} />
          <MiniStat
            icon={<Zap size={18} color={Colors.accentOrange} />}
            value={0}
            label={t('burned')}
            color={Colors.accentOrange}
          />
        </View>

        {/* Macros Bar */}
        <View style={styles.macrosCard}>
          <MacroBar
            label={t('protein')}
            current={macros.protein}
            goal={profile.dailyProteinGoal}
            color={Colors.accentBlue}
          />
          <MacroBar
            label={t('carbs')}
            current={macros.carbs}
            goal={profile.dailyCarbsGoal}
            color={Colors.accentOrange}
          />
          <MacroBar
            label={t('fat')}
            current={macros.fat}
            goal={profile.dailyFatGoal}
            color={Colors.accentPink}
          />
        </View>

        {/* Meals List */}
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('todaysMeals')}</Text>
            <Text style={styles.mealCount}>{todaysMeals.length}</Text>
          </View>

          {todaysMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Target size={40} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>{t('noMealsYet')}</Text>
              <Text style={styles.emptySubtitle}>{t('logFirstMeal')}</Text>
            </View>
          ) : (
            todaysMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onPress={() => handleMealPress(meal.id)}
                onDelete={() => handleDeleteMeal(meal.id)}
              />
            ))
          )}
        </View>

        {/* Free User Banner */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.banner}
            onPress={() => router.push('/paywall/index' as never)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['rgba(0, 212, 170, 0.1)', 'rgba(0, 212, 170, 0.05)']}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerContent}>
                <Text style={styles.bannerText}>
                  {remainingFreeScans > 0
                    ? t('freeScanRemaining')
                    : t('watchAdForScan')}
                </Text>
                <View style={styles.bannerButton}>
                  <Text style={styles.bannerButtonText}>
                    {remainingFreeScans > 0 ? t('goPremium') : t('watchAd')}
                  </Text>
                  <ChevronRight size={16} color={Colors.primary} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Bottom Spacing for FAB */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddMeal}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={Colors.gradientPrimary}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function CalorieRing({
  progress,
  remaining,
}: {
  progress: number;
  remaining: number;
  consumed?: number;
  goal?: number;
}) {
  const { t } = useTranslation();
  const size = 220;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const staticOffset = circumference * (1 - clampedProgress);

  return (
    <View style={[styles.ringWrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surface2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={staticOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.ringContent}>
        <Text style={styles.ringRemaining}>{remaining.toLocaleString()}</Text>
        <Text style={styles.ringLabel}>kcal {t('kcalLeft')}</Text>
      </View>
    </View>
  );
}

function MiniStat({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.miniStat}>
      <View style={[styles.miniStatIcon, { backgroundColor: `${color}20` }]}>
        {icon}
      </View>
      <Text style={styles.miniStatValue}>{value.toLocaleString()}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function MacroBar({
  label,
  current,
  goal,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
}) {
  const progress = Math.min(current / goal, 1);

  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValues}>
          <Text style={[styles.macroCurrent, { color }]}>{current}g</Text>
          <Text style={styles.macroGoal}> / {goal}g</Text>
        </Text>
      </View>
      <View style={styles.macroBarBg}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${progress * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function MealCard({
  meal,
  onPress,
  onDelete,
}: {
  meal: Meal;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.mealCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: meal.photo_uri }} style={styles.mealImage} />
      <View style={styles.mealInfo}>
        <Text style={styles.mealName} numberOfLines={1}>
          {meal.meal_name}
        </Text>
        <Text style={styles.mealType}>
          {t(meal.meal_type)} • {format(meal.timestamp, 'h:mm a')}
        </Text>
      </View>
      <View style={styles.mealRight}>
        <Text style={styles.mealCalories}>{meal.total_calories}</Text>
        <Text style={styles.mealCalUnit}>kcal</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={18} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    ...Typography.h3,
    color: Colors.text,
  },
  date: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  premiumBadge: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  premiumBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  premiumText: {
    ...Typography.smallMedium,
    color: Colors.accentOrange,
  },
  freePlanText: {
    ...Typography.smallMedium,
    color: Colors.textSecondary,
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  ringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringRemaining: {
    ...Typography.statsLarge,
    color: Colors.text,
  },
  ringLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  miniStat: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  miniStatValue: {
    ...Typography.h3,
    color: Colors.text,
  },
  miniStatLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  macrosCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  macroItem: {
    marginBottom: Spacing.md,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  macroLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  macroValues: {
    flexDirection: 'row',
  },
  macroCurrent: {
    ...Typography.captionMedium,
  },
  macroGoal: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  macroBarBg: {
    height: 6,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  mealsSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  mealCount: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
  },
  mealInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  mealName: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  mealType: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  mealRight: {
    alignItems: 'flex-end',
    marginRight: Spacing.md,
  },
  mealCalories: {
    ...Typography.h3,
    color: Colors.accent,
  },
  mealCalUnit: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  banner: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  bannerGradient: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  bannerText: {
    ...Typography.captionMedium,
    color: Colors.text,
    flex: 1,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bannerButtonText: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
