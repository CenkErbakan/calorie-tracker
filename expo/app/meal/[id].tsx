import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeals } from '@/context/MealsContext';
import { useUser } from '@/context/UserContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { formatDate } from '@/lib/dateUtils';
import {
  ChevronLeft,
  Trash2,
  Clock,
  Utensils,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function MealDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { meals, deleteMeal } = useMeals();
  useUser();

  const meal = useMemo(() => meals.find((m) => m.id === id), [meals, id]);

  if (!meal) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('mealDetails')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('noData')}</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('deleteMeal'), t('deleteMealConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteMeal(meal.id);
          router.back();
        },
      },
    ]);
  };

  const macroPercentages = useMemo(() => {
    const total = meal.total_protein_grams + meal.total_carbs_grams + meal.total_fat_grams;
    if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
    return {
      protein: (meal.total_protein_grams / total) * 100,
      carbs: (meal.total_carbs_grams / total) * 100,
      fat: (meal.total_fat_grams / total) * 100,
    };
  }, [meal]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('mealDetails')}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Trash2 size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <Image source={{ uri: meal.photo_uri }} style={styles.photo} />

        {/* Content */}
        <View style={styles.content}>
          {/* Title & Time */}
          <View style={styles.titleSection}>
            <View style={styles.mealTypeBadge}>
              <Utensils size={14} color={Colors.primary} />
              <Text style={styles.mealTypeText}>{t(meal.meal_type)}</Text>
            </View>
            <Text style={styles.mealName}>{meal.meal_name}</Text>
            <View style={styles.timeRow}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.timeText}>
                {formatDate(meal.timestamp, 'EEEE, MMMM d • h:mm a')}
              </Text>
            </View>
          </View>

          {/* Macros Summary */}
          <View style={styles.macrosCard}>
            <Text style={styles.sectionTitle}>{t('macrosDistribution')}</Text>
            <View style={styles.macroBars}>
              <View style={styles.macroBarContainer}>
                <View style={styles.macroBarBg}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${macroPercentages.protein}%`,
                        backgroundColor: Colors.accentBlue,
                      },
                    ]}
                  />
                </View>
                <View style={styles.macroInfo}>
                  <Text style={[styles.macroValue, { color: Colors.accentBlue }]}>
                    {meal.total_protein_grams}g
                  </Text>
                  <Text style={styles.macroLabel}>{t('protein')}</Text>
                </View>
              </View>

              <View style={styles.macroBarContainer}>
                <View style={styles.macroBarBg}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${macroPercentages.carbs}%`,
                        backgroundColor: Colors.accentOrange,
                      },
                    ]}
                  />
                </View>
                <View style={styles.macroInfo}>
                  <Text style={[styles.macroValue, { color: Colors.accentOrange }]}>
                    {meal.total_carbs_grams}g
                  </Text>
                  <Text style={styles.macroLabel}>{t('carbs')}</Text>
                </View>
              </View>

              <View style={styles.macroBarContainer}>
                <View style={styles.macroBarBg}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${macroPercentages.fat}%`,
                        backgroundColor: Colors.accentPink,
                      },
                    ]}
                  />
                </View>
                <View style={styles.macroInfo}>
                  <Text style={[styles.macroValue, { color: Colors.accentPink }]}>
                    {meal.total_fat_grams}g
                  </Text>
                  <Text style={styles.macroLabel}>{t('fat')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Total Calories */}
          <View style={styles.caloriesCard}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.caloriesGradient}
            >
              <Text style={styles.caloriesValue}>{meal.total_calories}</Text>
              <Text style={styles.caloriesLabel}>{t('calories')}</Text>
            </LinearGradient>
          </View>

          {/* Ingredients Table */}
          <View style={styles.ingredientsCard}>
            <Text style={styles.sectionTitle}>{t('ingredients')}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>{t('ingredient')}</Text>
                <Text style={styles.tableHeaderCell}>{t('weight')}</Text>
                <Text style={styles.tableHeaderCell}>{t('calories')}</Text>
              </View>
              {meal.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{ingredient.name}</Text>
                  <Text style={styles.tableCell}>{ingredient.weight_grams}g</Text>
                  <Text style={styles.tableCell}>{ingredient.calories}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Notes */}
          {meal.notes && (
            <View style={styles.notesCard}>
              <Text style={styles.sectionTitle}>{t('notes')}</Text>
              <Text style={styles.notesText}>{meal.notes}</Text>
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  titleSection: {
    marginBottom: Spacing.lg,
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  mealTypeText: {
    ...Typography.captionMedium,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  mealName: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  macrosCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  macroBars: {
    gap: Spacing.md,
  },
  macroBarContainer: {
    gap: Spacing.xs,
  },
  macroBarBg: {
    height: 8,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  macroInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroValue: {
    ...Typography.bodyMedium,
  },
  macroLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  caloriesCard: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  caloriesGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  caloriesValue: {
    ...Typography.display,
    color: '#FFFFFF',
  },
  caloriesLabel: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
  },
  ingredientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  table: {
    gap: Spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  tableHeaderCell: {
    ...Typography.smallMedium,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  tableCell: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  notesCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  notesText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  bottomSpacing: {
    height: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
