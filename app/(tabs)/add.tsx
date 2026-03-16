import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useMeals } from '@/context/MealsContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { NutritionData, Ingredient } from '@/types';
import {
  Camera,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ChevronLeft,
  Trash2,
  Plus,
  Sparkles,
} from 'lucide-react-native';

const round1 = (n: number) => Math.round(n * 10) / 10;

// Manuel ekleme için placeholder (1x1 şeffaf PNG)
const PLACEHOLDER_IMAGE_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Reset state when screen is focused
export default function AddMealScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { addMeal, analyzePhoto } = useMeals();
  const { useScan, isPremium } = useSubscription();
  const autoActionFiredRef = useRef(false);

  // Always reset state on mount
  const [step, setStep] = useState<'select' | 'preview' | 'analyzing' | 'edit'>('select');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingText, setLoadingText] = useState(t('detectingIngredients'));

  // Force reset when screen is focused
  useFocusEffect(
    useCallback(() => {
      setStep('select');
      setPhotoUri(null);
      setNutritionData(null);
      setError(null);
      setIsSaving(false);
      setLoadingText(t('detectingIngredients'));
      autoActionFiredRef.current = false;
    }, [t])
  );

  // Auto-trigger camera/gallery when action param is set
  useEffect(() => {
    if (!action || autoActionFiredRef.current) return;
    autoActionFiredRef.current = true;

    if (action === 'camera') {
      void takePhoto();
    } else if (action === 'gallery') {
      void pickFromGallery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  // Cycle through loading texts
  useEffect(() => {
    if (step !== 'analyzing') return;

    const texts = [
      t('detectingIngredients'),
      t('estimatingPortions'),
      t('calculatingNutrition'),
    ];
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, [step, t]);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(t('error'), t('cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      void handlePhotoSelected(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) {
      Alert.alert(t('error'), t('galleryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      void handlePhotoSelected(result.assets[0].uri);
    }
  };

  const handlePhotoSelected = async (uri: string) => {
    // Check scan quota for free users
    if (!isPremium) {
      const canProceed = await useScan();
      if (!canProceed) {
        router.push('/paywall');
        return;
      }
    }

    setPhotoUri(uri);
    setStep('preview');
  };

  const handleAnalyze = async () => {
    if (!photoUri) return;

    setStep('analyzing');
    setError(null);

    try {
      const data = await analyzePhoto(photoUri);
      const rounded = {
        ...data,
        total_protein_grams: round1(data.total_protein_grams),
        total_carbs_grams: round1(data.total_carbs_grams),
        total_fat_grams: round1(data.total_fat_grams),
        ingredients: data.ingredients.map((ing) => ({
          ...ing,
          calories: Math.round(ing.calories),
          protein_grams: round1(ing.protein_grams),
          carbs_grams: round1(ing.carbs_grams),
          fat_grams: round1(ing.fat_grams),
          original_weight_grams: ing.original_weight_grams ?? ing.weight_grams,
          original_calories: ing.original_calories ?? ing.calories,
          original_protein_grams: ing.original_protein_grams ?? ing.protein_grams,
          original_carbs_grams: ing.original_carbs_grams ?? ing.carbs_grams,
          original_fat_grams: ing.original_fat_grams ?? ing.fat_grams,
        })),
      };
      setNutritionData(rounded);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('edit');
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError(t('aiAnalysisFailed'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Create empty template for manual entry
      setNutritionData({
        meal_name: '',
        meal_type: 'lunch',
        ingredients: [],
        total_calories: 0,
        total_protein_grams: 0,
        total_carbs_grams: 0,
        total_fat_grams: 0,
      });
      setStep('edit');
    }
  };

  const handleChangePhoto = () => {
    setPhotoUri(null);
    setNutritionData(null);
    setStep('select');
  };

  const handleManualAdd = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotoUri(PLACEHOLDER_IMAGE_URI);
    setNutritionData({
      meal_name: '',
      meal_type: 'lunch',
      ingredients: [
        {
          name: '',
          weight_grams: 0,
          calories: 0,
          protein_grams: 0,
          carbs_grams: 0,
          fat_grams: 0,
        },
      ],
      total_calories: 0,
      total_protein_grams: 0,
      total_carbs_grams: 0,
      total_fat_grams: 0,
    });
    setError(null);
    setStep('edit');
  };

  // Auto-recalculate when weight changes
  const handleWeightChange = (index: number, newWeight: string) => {
    if (!nutritionData) return;

    const weightNum = parseFloat(newWeight) || 0;
    const ingredient = nutritionData.ingredients[index];
    if (!ingredient) return;

    const origWeight = ingredient.original_weight_grams ?? ingredient.weight_grams;
    const origCalories = ingredient.original_calories ?? ingredient.calories;
    const origProtein = ingredient.original_protein_grams ?? ingredient.protein_grams;
    const origCarbs = ingredient.original_carbs_grams ?? ingredient.carbs_grams;
    const origFat = ingredient.original_fat_grams ?? ingredient.fat_grams;

    const updatedIngredients = [...nutritionData.ingredients];

    // Manuel malzeme: AI'dan gelen original_* yoksa sadece gramajı güncelle, makrolara dokunma
    const hasAiOrigins =
      ingredient.original_protein_grams != null ||
      ingredient.original_carbs_grams != null ||
      ingredient.original_fat_grams != null;

    if (origWeight === 0 || !hasAiOrigins) {
      updatedIngredients[index] = {
        ...ingredient,
        weight_grams: weightNum,
        original_weight_grams: weightNum,
      };
    } else {
      const ratio = weightNum / origWeight;
      updatedIngredients[index] = {
        ...ingredient,
        weight_grams: weightNum,
        calories: Math.round(origCalories * ratio),
        protein_grams: round1(origProtein * ratio),
        carbs_grams: round1(origCarbs * ratio),
        fat_grams: round1(origFat * ratio),
      };
    }

    recalculateTotals(updatedIngredients);
  };

  // Auto-recalculate when calories change
  const handleCaloriesChange = (index: number, newCalories: string) => {
    if (!nutritionData) return;

    const calNum = parseFloat(newCalories) || 0;
    const ingredient = nutritionData.ingredients[index];
    if (!ingredient) return;

    const origCalories = ingredient.original_calories ?? ingredient.calories;
    const updatedIngredients = [...nutritionData.ingredients];

    // Manuel malzeme: AI'dan gelen original_* yoksa sadece kaloriyi güncelle, makrolara dokunma
    const hasAiOrigins =
      ingredient.original_protein_grams != null ||
      ingredient.original_carbs_grams != null ||
      ingredient.original_fat_grams != null;

    if (origCalories === 0 || !hasAiOrigins) {
      updatedIngredients[index] = {
        ...ingredient,
        calories: calNum,
        original_calories: calNum,
      };
    } else {
      const ratio = calNum / origCalories;
      updatedIngredients[index] = {
        ...ingredient,
        calories: calNum,
        protein_grams: round1((ingredient.original_protein_grams ?? ingredient.protein_grams) * ratio),
        carbs_grams: round1((ingredient.original_carbs_grams ?? ingredient.carbs_grams) * ratio),
        fat_grams: round1((ingredient.original_fat_grams ?? ingredient.fat_grams) * ratio),
      };
    }

    recalculateTotals(updatedIngredients);
  };

  const recalculateTotals = (ingredients: Ingredient[]) => {
    if (!nutritionData) return;

    const totals = ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + (ing.calories || 0),
        protein: acc.protein + (ing.protein_grams || 0),
        carbs: acc.carbs + (ing.carbs_grams || 0),
        fat: acc.fat + (ing.fat_grams || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    setNutritionData({
      ...nutritionData,
      ingredients,
      total_calories: Math.round(totals.calories),
      total_protein_grams: round1(totals.protein),
      total_carbs_grams: round1(totals.carbs),
      total_fat_grams: round1(totals.fat),
    });
  };

  const updateIngredientField = (index: number, field: keyof Ingredient, value: string) => {
    if (!nutritionData) return;

    const updatedIngredients = [...nutritionData.ingredients];
    const numVal = parseFloat(value) || 0;
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: field === 'name' ? value : round1(numVal),
    };

    setNutritionData({ ...nutritionData, ingredients: updatedIngredients });
    recalculateTotals(updatedIngredients);
  };

  const addIngredient = () => {
    if (!nutritionData) return;

    const newIngredient: Ingredient = {
      name: '',
      weight_grams: 0,
      calories: 0,
      protein_grams: 0,
      carbs_grams: 0,
      fat_grams: 0,
    };

    const updatedIngredients = [...nutritionData.ingredients, newIngredient];
    setNutritionData({ ...nutritionData, ingredients: updatedIngredients });
  };

  const removeIngredient = (index: number) => {
    if (!nutritionData) return;

    const updated = nutritionData.ingredients.filter((_, i) => i !== index);
    setNutritionData({ ...nutritionData, ingredients: updated });
    recalculateTotals(updated);
  };

  const handleSave = async () => {
    if (!photoUri || !nutritionData) return;

    if (!nutritionData.meal_name.trim()) {
      Alert.alert(t('error'), t('missingMealName'));
      return;
    }

    setIsSaving(true);
    try {
      await addMeal({
        meal_name: nutritionData.meal_name,
        meal_type: nutritionData.meal_type,
        photo_uri: photoUri,
        ingredients: nutritionData.ingredients.filter((ing) => ing.name.trim()),
        total_calories: nutritionData.total_calories,
        total_protein_grams: nutritionData.total_protein_grams,
        total_carbs_grams: nutritionData.total_carbs_grams,
        total_fat_grams: nutritionData.total_fat_grams,
        notes: nutritionData.notes,
        confidence: nutritionData.confidence,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert(t('error'), t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (step !== 'select') {
      Alert.alert(t('discard'), t('discardConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('discard'), style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addMeal')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Selection */}
        {step === 'select' && (
          <View style={styles.selectContainer}>
            <TouchableOpacity style={styles.optionCard} onPress={takePhoto}>
              <LinearGradient
                colors={[Colors.primary, Colors.accentBlue]}
                style={styles.optionIcon}
              >
                <Camera size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.optionTitle}>{t('takePhoto')}</Text>
              <Text style={styles.optionSubtitle}>{t('captureWithCamera')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={pickFromGallery}>
              <LinearGradient
                colors={[Colors.accentPink, Colors.accent]}
                style={styles.optionIcon}
              >
                <ImageIcon size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.optionTitle}>{t('chooseFromGallery')}</Text>
              <Text style={styles.optionSubtitle}>{t('selectExisting')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.manualButton} onPress={handleManualAdd}>
              <Text style={styles.manualButtonText}>{t('orAddManually')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Photo Preview */}
        {step === 'preview' && photoUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity onPress={handleChangePhoto}>
              <Text style={styles.changePhotoText}>{t('changePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
              <LinearGradient
                colors={Colors.gradientPrimary}
                style={styles.analyzeGradient}
              >
                <Sparkles size={20} color="#FFFFFF" />
                <Text style={styles.analyzeText}>{t('analyzeWithAI')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Analyzing */}
        {step === 'analyzing' && (
          <View style={styles.analyzingContainer}>
            <View style={styles.analyzingIcon}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
            <Text style={styles.analyzingText}>{t('analyzingMeal')}</Text>
            <Text style={styles.loadingSubtext}>{loadingText}</Text>
          </View>
        )}

        {/* Step 4: Edit Results */}
        {step === 'edit' && nutritionData && (
          <View style={styles.editContainer}>
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Meal Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('mealName')}</Text>
              <TextInput
                style={styles.textInput}
                value={nutritionData.meal_name}
                onChangeText={(text) =>
                  setNutritionData({ ...nutritionData, meal_name: text })
                }
                placeholder={t('mealName')}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {/* Meal Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('mealType')}</Text>
              <View style={styles.mealTypeContainer}>
                {mealTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      nutritionData.meal_type === type && styles.mealTypeButtonActive,
                    ]}
                    onPress={() =>
                      setNutritionData({ ...nutritionData, meal_type: type })
                    }
                  >
                    <Text
                      style={[
                        styles.mealTypeText,
                        nutritionData.meal_type === type && styles.mealTypeTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Totals Card */}
            <View style={styles.totalsCard}>
              <View style={styles.totalCalories}>
                <Text style={styles.totalCaloriesValue}>
                  {nutritionData.total_calories}
                </Text>
                <Text style={styles.totalCaloriesLabel}>{t('calories')}</Text>
              </View>
              <View style={styles.macroTotals}>
                <MacroTotal label={t('protein')} value={nutritionData.total_protein_grams} color={Colors.accentBlue} />
                <MacroTotal label={t('carbs')} value={nutritionData.total_carbs_grams} color={Colors.accentOrange} />
                <MacroTotal label={t('fat')} value={nutritionData.total_fat_grams} color={Colors.accentPink} />
              </View>
            </View>

            {/* Ingredients Table */}
            <View style={styles.tableSection}>
              <Text style={styles.tableSectionTitle}>{t('ingredients')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.tableScrollContent}
              >
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCellName}>{t('ingredient')}</Text>
                    <Text style={styles.tableHeaderCellNum}>{t('weight')}</Text>
                    <Text style={styles.tableHeaderCellNum}>{t('calories')}</Text>
                    <Text style={styles.tableHeaderCellNum}>{t('proteinShort')}</Text>
                    <Text style={styles.tableHeaderCellNum}>{t('carbsShort')}</Text>
                    <Text style={styles.tableHeaderCellNum}>{t('fatShort')}</Text>
                    <View style={styles.tableHeaderCellDelete} />
                  </View>

                  {nutritionData.ingredients.map((ingredient, index) => (
                    <View key={index} style={styles.tableRow}>
                      <TextInput
                        style={styles.tableCellName}
                        value={ingredient.name}
                        onChangeText={(text) => updateIngredientField(index, 'name', text)}
                        placeholder={t('ingredientNamePlaceholder')}
                        placeholderTextColor={Colors.textTertiary}
                      />
                      <TextInput
                        style={styles.tableCellNum}
                        value={ingredient.weight_grams ? String(ingredient.weight_grams) : ''}
                        onChangeText={(text) => handleWeightChange(index, text)}
                        keyboardType="decimal-pad"
                        placeholder={t('weightPlaceholder')}
                        placeholderTextColor={Colors.textTertiary}
                      />
                      <TextInput
                        style={styles.tableCellNum}
                        value={ingredient.calories ? String(ingredient.calories) : ''}
                        onChangeText={(text) => handleCaloriesChange(index, text)}
                        keyboardType="decimal-pad"
                        placeholder={t('caloriesPlaceholder')}
                        placeholderTextColor={Colors.textTertiary}
                      />
                      <TextInput
                        style={styles.tableCellNum}
                        value={ingredient.protein_grams !== 0 && ingredient.protein_grams ? String(ingredient.protein_grams) : ''}
                        onChangeText={(text) => updateIngredientField(index, 'protein_grams', text)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textTertiary}
                      />
                      <TextInput
                        style={styles.tableCellNum}
                        value={ingredient.carbs_grams !== 0 && ingredient.carbs_grams ? String(ingredient.carbs_grams) : ''}
                        onChangeText={(text) => updateIngredientField(index, 'carbs_grams', text)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textTertiary}
                      />
                      <TextInput
                        style={styles.tableCellNum}
                        value={ingredient.fat_grams !== 0 && ingredient.fat_grams ? String(ingredient.fat_grams) : ''}
                        onChangeText={(text) => updateIngredientField(index, 'fat_grams', text)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textTertiary}
                      />
                      <TouchableOpacity
                        style={styles.deleteRowButton}
                        onPress={() => removeIngredient(index)}
                      >
                        <Trash2 size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addRowButton} onPress={addIngredient}>
                    <Plus size={18} color={Colors.primary} />
                    <Text style={styles.addRowText}>{t('addIngredient')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t('notes')} <Text style={styles.optionalLabel}>({t('optional')})</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={nutritionData.notes || ''}
                onChangeText={(text) => setNutritionData({ ...nutritionData, notes: text })}
                placeholder={t('notes')}
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>{t('aiEstimateEdit')}</Text>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <LinearGradient colors={Colors.gradientPrimary} style={styles.saveGradient}>
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('logThisMeal')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Discard Button */}
            <TouchableOpacity style={styles.discardButton} onPress={handleCancel}>
              <Text style={styles.discardButtonText}>{t('discard')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MacroTotal({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.macroTotal}>
      <Text style={[styles.macroTotalValue, { color }]}>{value.toFixed(1)}g</Text>
      <Text style={styles.macroTotalLabel}>{label}</Text>
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
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  selectContainer: {
    gap: Spacing.md,
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  optionTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  optionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  manualButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
  },
  manualButtonText: {
    ...Typography.body,
    color: Colors.primary,
  },
  previewContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
  },
  changePhotoText: {
    ...Typography.body,
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  analyzeButton: {
    width: '100%',
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  analyzeText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  analyzingIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  analyzingText: {
    ...Typography.h2,
    color: Colors.text,
  },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  editContainer: {
    gap: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    flex: 1,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalLabel: {
    color: Colors.textTertiary,
    textTransform: 'none',
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mealTypeButton: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  mealTypeText: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mealTypeTextActive: {
    color: Colors.primary,
  },
  totalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  totalCalories: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalCaloriesValue: {
    ...Typography.display,
    color: Colors.accent,
  },
  totalCaloriesLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  macroTotals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroTotal: {
    alignItems: 'center',
  },
  macroTotalValue: {
    ...Typography.h3,
  },
  macroTotalLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  tableSection: {
    gap: Spacing.sm,
  },
  tableSectionTitle: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableScrollContent: {
    paddingBottom: Spacing.sm,
  },
  tableContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    minWidth: 560,
    ...Shadows.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tableHeaderCellName: {
    ...Typography.smallMedium,
    color: Colors.textSecondary,
    width: 180,
    marginRight: Spacing.xs,
  },
  tableHeaderCellNum: {
    ...Typography.smallMedium,
    color: Colors.textSecondary,
    width: 56,
    textAlign: 'center',
    marginHorizontal: 2,
  },
  tableHeaderCellDelete: {
    width: 44,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tableCellName: {
    width: 180,
    marginRight: Spacing.xs,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    textAlign: 'left',
  },
  tableCellNum: {
    width: 56,
    marginHorizontal: 2,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    ...Typography.small,
    color: Colors.text,
    textAlign: 'center',
  },
  deleteRowButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    alignSelf: 'stretch',
  },
  addRowText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
  disclaimer: {
    ...Typography.small,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.lg,
    ...Shadows.glow,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  saveButtonText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  discardButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
  },
  discardButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
