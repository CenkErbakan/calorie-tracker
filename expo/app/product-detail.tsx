import { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import type { ProductData, NutritionInfo } from '@/lib/barcodeService';
import { calculateNutrition, fetchProductByBarcode } from '@/lib/barcodeService';
import { useMeals } from '@/context/MealsContext';
import { useTranslation } from '@/lib/i18n';
import { ChevronLeft, ScanLine } from 'lucide-react-native';

const PLACEHOLDER_IMAGE_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addMeal } = useMeals();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{ product?: string; barcode?: string }>();

  // Parse product from params.product if present; otherwise will be fetched by barcode
  const parsedProduct = useMemo<ProductData | null>(() => {
    if (!params.product) return null;
    try {
      return JSON.parse(params.product as string) as ProductData;
    } catch {
      return null;
    }
  }, [params.product]);

  const [product, setProduct] = useState<ProductData | null>(parsedProduct);
  const [isFetching, setIsFetching] = useState(!parsedProduct && !!params.barcode);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch by barcode when only barcode param is given (e.g. from recent scans)
  useEffect(() => {
    if (parsedProduct || !params.barcode) return;
    setIsFetching(true);
    fetchProductByBarcode(params.barcode as string)
      .then((data) => {
        if (data) {
          setProduct(data);
        } else {
          setFetchError('Ürün bulunamadı.');
        }
      })
      .catch(() => setFetchError('Bir hata oluştu.'))
      .finally(() => setIsFetching(false));
  }, [params.barcode, parsedProduct]);

  const initialPortion =
    product?.servingSize && Number.isFinite(product.servingSize)
      ? product.servingSize
      : 100;

  const [portion, setPortion] = useState(initialPortion);
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(
    product ? calculateNutrition(product, initialPortion) : null,
  );
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'snack';
  });
  const [name, setName] = useState(product?.name ?? '');

  // Update state when product is fetched asynchronously
  useEffect(() => {
    if (!product) return;
    const p = product.servingSize && Number.isFinite(product.servingSize) ? product.servingSize : 100;
    setPortion(p);
    setNutrition(calculateNutrition(product, p));
    setName(product.name);
  }, [product]);

  // Loading state
  if (isFetching) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Ürün yükleniyor…</Text>
      </View>
    );
  }

  // Error / not found state
  if (fetchError || !product || !nutrition) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{fetchError ?? 'Ürün bulunamadı.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePortionChange = (value: number) => {
    const clamped = Math.max(10, Math.min(500, value || 0));
    setPortion(clamped);
    setNutrition(calculateNutrition(product, clamped));
  };

  const quickSetPortion = (value: number) => {
    handlePortionChange(value);
  };

  const stepPortion = (delta: number) => {
    handlePortionChange(portion + delta);
  };

  const totalCalories = nutrition.calories ?? 0;

  const proteinCalories = (nutrition.protein ?? 0) * 4;
  const carbsCalories = (nutrition.carbs ?? 0) * 4;
  const fatCalories = (nutrition.fat ?? 0) * 9;
  const totalMacroCalories = Math.max(
    proteinCalories + carbsCalories + fatCalories,
    1,
  );

  const macroPercent = {
    protein: (proteinCalories / totalMacroCalories) * 100,
    carbs: (carbsCalories / totalMacroCalories) * 100,
    fat: (fatCalories / totalMacroCalories) * 100,
  };

  const handleAddToLog = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await addMeal({
      meal_name: name,
      meal_type: mealType,
      photo_uri: product.imageUrl ?? PLACEHOLDER_IMAGE_URI,
      ingredients: [
        {
          name,
          weight_grams: portion,
          calories: Math.round(totalCalories),
          protein_grams: nutrition.protein ?? 0,
          carbs_grams: nutrition.carbs ?? 0,
          fat_grams: nutrition.fat ?? 0,
        },
      ],
      total_calories: Math.round(totalCalories),
      total_protein_grams: nutrition.protein ?? 0,
      total_carbs_grams: nutrition.carbs ?? 0,
      total_fat_grams: nutrition.fat ?? 0,
      notes: '',
      confidence: 'high',
      source: 'barcode',
      barcode: product.barcode,
      brand: product.brand,
      product_image_url: product.imageUrl ?? undefined,
      portion_grams: portion,
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ürün Detayı</Text>
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={() => router.replace('/barcode-scanner')}
        >
          <ScanLine size={18} color={Colors.primary} />
          <Text style={styles.scanAgainText}>Tekrar Tara</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroImageWrapper}>
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.heroImage}
                />
              ) : (
                <View style={styles.heroImagePlaceholder} />
              )}
            </View>
            <View style={styles.heroInfo}>
              <TextInput
                style={styles.heroName}
                value={name}
                onChangeText={setName}
              />
              {!!product.brand && (
                <Text style={styles.heroBrand}>{product.brand}</Text>
              )}
              <Text style={styles.heroBarcode}>#{product.barcode}</Text>
            </View>
          </View>

          <View style={styles.heroBadgesRow}>
            {product.nutriscore && (
              <View
                style={[
                  styles.nutriscoreBadge,
                  getNutriscoreStyle(product.nutriscore),
                ]}
              >
                <Text style={styles.nutriscoreText}>
                  NutriScore {product.nutriscore.toUpperCase()}
                </Text>
              </View>
            )}
            {product.novaGroup && (
              <View
                style={[
                  styles.novaBadge,
                  getNovaStyle(product.novaGroup),
                ]}
              >
                <Text style={styles.novaText}>NOVA {product.novaGroup}</Text>
              </View>
            )}
          </View>

          {product.nutriscore && (
            <Text style={styles.nutriscoreInfo}>
              NutriScore A en iyi, E en düşük genel besin kalitesini gösterir. Bu ürün {product.nutriscore.toUpperCase()} skoruna sahiptir.
            </Text>
          )}
        </View>

        {/* Portion selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Porsiyon</Text>
          <View style={styles.portionRow}>
            <TextInput
              style={styles.portionInput}
              keyboardType="numeric"
              value={portion.toString()}
              onChangeText={(txt) => handlePortionChange(Number.parseFloat(txt) || 0)}
            />
            <Text style={styles.portionUnit}>{product.servingSizeUnit}</Text>
          </View>

          <View style={styles.quickRow}>
            {[50, 100, 150, 200].map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.quickChip,
                  portion === g && styles.quickChipActive,
                ]}
                onPress={() => quickSetPortion(g)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    portion === g && styles.quickChipTextActive,
                  ]}
                >
                  {g}g
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => stepPortion(-10)}
            >
              <Text style={styles.stepperText}>-10g</Text>
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperValueText}>{portion.toFixed(0)} g</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => stepPortion(10)}
            >
              <Text style={styles.stepperText}>+10g</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nutrition facts */}
        <View style={styles.sectionCard}>
          <Text style={styles.nutritionTitle}>Besin Değerleri</Text>
          <Text style={styles.nutritionSubtitle}>
            {portion.toFixed(0)} g porsiyon için
          </Text>

          <View style={styles.nutritionDivider} />

          <View style={styles.calorieRow}>
            <Text style={styles.calorieLabel}>Kalori</Text>
            <Text style={styles.calorieValue}>{totalCalories.toFixed(1)} kcal</Text>
          </View>

          <View style={styles.nutritionDividerThin} />

          <NutritionRow label="Protein" value={nutrition.protein} unit="g" />
          <NutritionRow label="Karbonhidrat" value={nutrition.carbs} unit="g" />
          <NutritionRow
            label="Şeker"
            value={nutrition.sugar}
            unit="g"
            indent
          />
          <NutritionRow label="Yağ" value={nutrition.fat} unit="g" />
          <NutritionRow label="Lif" value={nutrition.fiber} unit="g" />
          <NutritionRow label="Sodyum" value={nutrition.sodium} unit="g" />
        </View>

        {/* Macros bar */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Makro Dağılımı</Text>
          <View style={styles.macroBar}>
            <View
              style={[
                styles.macroSegment,
                { backgroundColor: Colors.accentBlue, flex: macroPercent.protein },
              ]}
            />
            <View
              style={[
                styles.macroSegment,
                { backgroundColor: Colors.accentOrange, flex: macroPercent.carbs },
              ]}
            />
            <View
              style={[
                styles.macroSegment,
                { backgroundColor: Colors.accentPink, flex: macroPercent.fat },
              ]}
            />
          </View>
          <View style={styles.macroLegendRow}>
            <MacroLegend color={Colors.accentBlue} label="Protein" value={nutrition.protein} />
            <MacroLegend color={Colors.accentOrange} label="Karbonhidrat" value={nutrition.carbs} />
            <MacroLegend color={Colors.accentPink} label="Yağ" value={nutrition.fat} />
          </View>
        </View>

        {/* Ingredients & allergens */}
        {(product.ingredients || product.allergens) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>İçindekiler ve Alerjenler</Text>
            {!!product.ingredients && (
              <Text style={styles.ingredientsText}>{product.ingredients}</Text>
            )}
            {!!product.allergens && (
              <View style={styles.allergenChips}>
                {product.allergens.split(',').map((tag) => (
                  <View key={tag} style={styles.allergenChip}>
                    <Text style={styles.allergenText}>{tag.trim()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Meal type */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('mealType')}</Text>
          <View style={styles.mealTypeRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeChip,
                  mealType === type && styles.mealTypeChipActive,
                ]}
                onPress={() => setMealType(type)}
              >
                <Text
                  style={[
                    styles.mealTypeChipText,
                    mealType === type && styles.mealTypeChipTextActive,
                  ]}
                >
                  {t(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add to log button */}
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToLog}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>
            {portion.toFixed(0)}g — {totalCalories.toFixed(1)} kcal ekle
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NutritionRow({
  label,
  value,
  unit,
  indent,
}: {
  label: string;
  value: number | null;
  unit: string;
  indent?: boolean;
}) {
  return (
    <View style={[styles.nutritionRow, indent && styles.nutritionRowIndent]}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>
        {value == null ? 'N/A' : `${value.toFixed(1)} ${unit}`}
      </Text>
    </View>
  );
}

function MacroLegend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number | null;
}) {
  return (
    <View style={styles.macroLegend}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLegendLabel}>{label}</Text>
      <Text style={styles.macroLegendValue}>
        {value == null ? 'N/A' : `${value.toFixed(1)}g`}
      </Text>
    </View>
  );
}

function getNutriscoreStyle(grade: string) {
  const g = grade.toLowerCase();
  let backgroundColor = '#038141';

  if (g === 'a') backgroundColor = '#038141';
  else if (g === 'b') backgroundColor = '#85BB2F';
  else if (g === 'c') backgroundColor = '#FECB02';
  else if (g === 'd') backgroundColor = '#EE8100';
  else if (g === 'e') backgroundColor = '#E63E11';

  return { backgroundColor };
}

function getNovaStyle(group: number) {
  let backgroundColor = Colors.primary;
  if (group === 1) backgroundColor = '#00D4AA';
  else if (group === 2) backgroundColor = '#85BB2F';
  else if (group === 3) backgroundColor = '#FECB02';
  else if (group === 4) backgroundColor = '#E63E11';
  return { backgroundColor };
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
  },
  headerIcon: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface2,
  },
  scanAgainText: {
    ...Typography.smallMedium,
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface2,
    marginRight: Spacing.md,
  },
  heroImagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    ...Typography.h3,
    color: Colors.text,
  },
  heroBrand: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  heroBarcode: {
    ...Typography.small,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  nutriscoreBadge: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  nutriscoreText: {
    ...Typography.smallMedium,
    color: '#000',
  },
  nutriscoreInfo: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  novaBadge: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  novaText: {
    ...Typography.smallMedium,
    color: '#000',
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionTitle: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  portionInput: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.text,
  },
  portionUnit: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickChip: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  quickChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  quickChipText: {
    ...Typography.smallMedium,
    color: Colors.textSecondary,
  },
  quickChipTextActive: {
    color: Colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  stepperButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  stepperText: {
    ...Typography.smallMedium,
    color: Colors.text,
  },
  stepperValue: {
    flex: 1.2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface2,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  stepperValueText: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  nutritionTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  nutritionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  nutritionDivider: {
    height: 2,
    backgroundColor: Colors.text,
    marginVertical: Spacing.sm,
  },
  nutritionDividerThin: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieLabel: {
    ...Typography.h3,
    color: Colors.text,
  },
  calorieValue: {
    ...Typography.h3,
    color: Colors.accent,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  nutritionRowIndent: {
    paddingLeft: Spacing.lg,
  },
  nutritionLabel: {
    ...Typography.body,
    color: Colors.text,
  },
  nutritionValue: {
    ...Typography.body,
    color: Colors.text,
  },
  macroBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.surface2,
    marginTop: Spacing.sm,
  },
  macroSegment: {
    height: '100%',
  },
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  macroLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLegendLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  macroLegendValue: {
    ...Typography.smallMedium,
    color: Colors.text,
  },
  ingredientsText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  allergenChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  allergenChip: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: '#FFECB3',
  },
  allergenText: {
    ...Typography.small,
    color: '#8B5E00',
  },
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  mealTypeChip: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface2,
  },
  mealTypeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  mealTypeChipText: {
    ...Typography.smallMedium,
    color: Colors.textSecondary,
  },
  mealTypeChipTextActive: {
    color: Colors.primary,
  },
  stickyBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: 0,
  },
  addButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    ...Shadows.glow,
  },
  addButtonText: {
    ...Typography.h3,
    color: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  backBtnText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
});

