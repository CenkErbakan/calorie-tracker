import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/context/UserContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useDiet } from '@/context/DietContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import {
  getDietSpeedOptions,
  type DietWizardData,
} from '@/types/diet';
import { ChevronRight, ChevronLeft, Scale, Zap, AlertCircle, ThumbsDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STEPS = 4;

export default function DietWizardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useUser();
  const { isPremium } = useSubscription();
  const { plan, isLoading, generatePlan, isGenerating, error } = useDiet();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<DietWizardData>({
    weightToLoseKg: 0,
    speed: 'medium',
    allergies: [],
    dislikedFoods: [],
  });

  const weightToLose = Math.max(0, profile.weightKg - (profile.targetWeightKg ?? profile.weightKg));
  const suggestedWeight = weightToLose > 0 ? weightToLose : 5;

  const speedOptions = getDietSpeedOptions(data.weightToLoseKg || suggestedWeight);

  useEffect(() => {
    if (!isLoading && plan && !isGenerating) {
      router.replace('/diet/plan');
    }
  }, [isLoading, plan, isGenerating]);

  const handleNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void handleGenerate();
    }
  };

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 0) setStep((s) => s - 1);
    else router.back();
  };

  const handleGenerate = async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }

    const weightToLose = data.weightToLoseKg || suggestedWeight;
    if (weightToLose <= 0) {
      Alert.alert(t('error'), t('dietEnterWeightToLose'));
      return;
    }

    const planResult = await generatePlan({
      ...data,
      weightToLoseKg: weightToLose,
    });

    if (planResult) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/diet/plan');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return (data.weightToLoseKg || 0) > 0;
      case 1:
      case 2:
      case 3:
        return true;
      default:
        return false;
    }
  };

  const addToList = (list: 'allergies' | 'dislikedFoods', value: string) => {
    const v = value.trim().toLowerCase();
    if (!v) return;
    const arr = data[list];
    if (arr.includes(v)) return;
    setData({ ...data, [list]: [...arr, v] });
  };

  const removeFromList = (list: 'allergies' | 'dislikedFoods', index: number) => {
    const arr = [...data[list]];
    arr.splice(index, 1);
    setData({ ...data, [list]: arr });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: Colors.background }]}
    >
      <LinearGradient colors={[Colors.background, Colors.surface]} style={styles.gradient}>
        {/* Progress */}
        <View style={styles.progressRow}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === step && styles.progressDotActive,
                i < step && styles.progressDotDone,
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 0: Kaç kilo vermek istiyorsun? */}
          {step === 0 && (
            <View style={styles.step}>
              <View style={styles.iconWrap}>
                <Scale size={40} color={Colors.primary} />
              </View>
              <Text style={styles.title}>{t('dietStep0Title')}</Text>
              <Text style={styles.subtitle}>{t('dietStep0Subtitle', { weight: profile.weightKg })}</Text>
              <TextInput
                style={styles.input}
                value={data.weightToLoseKg ? String(data.weightToLoseKg) : ''}
                onChangeText={(txt) => setData({ ...data, weightToLoseKg: parseInt(txt, 10) || 0 })}
                keyboardType="numeric"
                placeholder={String(suggestedWeight)}
                placeholderTextColor={Colors.textTertiary}
              />
              <Text style={styles.unit}>{t('weight')}</Text>
            </View>
          )}

          {/* Step 1: Ayda kaç kilo? (Yavaş / Orta / Hızlı) */}
          {step === 1 && (
            <View style={styles.step}>
              <View style={styles.iconWrap}>
                <Zap size={40} color={Colors.primary} />
              </View>
              <Text style={styles.title}>{t('dietStep1Title')}</Text>
              <Text style={styles.subtitle}>{t('dietStep1Subtitle')}</Text>
              {speedOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.speed}
                  style={[
                    styles.optionCard,
                    data.speed === opt.speed && styles.optionCardActive,
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setData({ ...data, speed: opt.speed });
                  }}
                >
                  <Text style={styles.optionLabel}>{t(opt.speed === 'slow' ? 'dietSpeedSlow' : opt.speed === 'medium' ? 'dietSpeedMedium' : 'dietSpeedFast')}</Text>
                  <Text style={styles.optionDesc}>
                    {opt.kgPerMonth} kg/ay • {opt.months} {t('dietMonths')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 2: Alerji */}
          {step === 2 && (
            <View style={styles.step}>
              <View style={styles.iconWrap}>
                <AlertCircle size={40} color={Colors.primary} />
              </View>
              <Text style={styles.title}>{t('dietStep2Title')}</Text>
              <Text style={styles.subtitle}>{t('dietStep2Subtitle')}</Text>
              <TagInput
                tags={data.allergies}
                onAdd={(v) => addToList('allergies', v)}
                onRemove={(i) => removeFromList('allergies', i)}
                placeholder={t('dietAllergyPlaceholder')}
              />
            </View>
          )}

          {/* Step 3: Sevmediği yemekler */}
          {step === 3 && (
            <View style={styles.step}>
              <View style={styles.iconWrap}>
                <ThumbsDown size={40} color={Colors.primary} />
              </View>
              <Text style={styles.title}>{t('dietStep3Title')}</Text>
              <Text style={styles.subtitle}>{t('dietStep3Subtitle')}</Text>
              <TagInput
                tags={data.dislikedFoods}
                onAdd={(v) => addToList('dislikedFoods', v)}
                onRemove={(i) => removeFromList('dislikedFoods', i)}
                placeholder={t('dietDislikedPlaceholder')}
              />
            </View>
          )}
        </ScrollView>

        {error && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <ChevronLeft size={24} color={Colors.textSecondary} />
            <Text style={styles.backBtnText}>{t('back')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextBtn, (!canProceed() && step === 0) && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={(step === 0 && !canProceed()) || isGenerating}
          >
            <LinearGradient colors={Colors.gradientPrimary} style={styles.nextBtnGrad}>
              {isGenerating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {step === STEPS - 1 ? t('dietGenerate') : t('next')}
                  </Text>
                  <ChevronRight size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input);
      setInput('');
    }
  };

  return (
    <View style={styles.tagContainer}>
      <View style={styles.tagRow}>
        <TextInput
          style={styles.tagInput}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.tagAddBtn} onPress={handleAdd}>
          <Text style={styles.tagAddText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tagList}>
        {tags.map((tag, i) => (
          <TouchableOpacity
            key={i}
            style={styles.tag}
            onPress={() => onRemove(i)}
          >
            <Text style={styles.tagText}>{tag}</Text>
            <Text style={styles.tagRemove}>×</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  gradient: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface3,
  },
  progressDotActive: { backgroundColor: Colors.primary, width: 24 },
  progressDotDone: { backgroundColor: Colors.primary },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 90 },
  step: { alignItems: 'center' },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    minWidth: 120,
  },
  unit: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.sm },
  optionCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  optionLabel: { ...Typography.h3, color: Colors.text },
  optionDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
  tagContainer: { width: '100%' },
  tagRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tagInput: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  tagAddBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagAddText: { fontSize: 24, color: '#FFF', fontWeight: '600' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  tagText: { ...Typography.caption, color: Colors.text },
  tagRemove: { fontSize: 18, color: Colors.textSecondary },
  errorWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  errorText: { ...Typography.caption, color: Colors.error },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backBtnText: { ...Typography.body, color: Colors.textSecondary },
  nextBtn: { overflow: 'hidden', borderRadius: BorderRadius.lg },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  nextBtnText: { ...Typography.h3, color: '#FFF' },
});
