import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { useTranslation, i18n } from '@/lib/i18n';
import { useUser } from '@/context/UserContext';
import { Gender, ACTIVITY_LEVELS, GOALS, OnboardingData } from '@/types';
import { Leaf, Camera, ChevronRight, User, Activity, Target } from 'lucide-react-native';

import * as Haptics from 'expo-haptics';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { completeOnboarding } = useUser();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    gender: 'male',
    dateOfBirth: '',
    heightCm: 170,
    weightKg: 70,
    targetWeightKg: null,
    activityLevel: 'moderately_active',
    goal: 'maintain',
  });

  const totalSlides = 5;

  const handleNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      void handleComplete();
    }
  };

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding(data);
    router.replace('/(tabs)/home');
  };

  const canProceed = () => {
    switch (currentSlide) {
      case 0:
        return true;
      case 1:
        return data.name.trim().length > 0;
      case 2:
        return data.dateOfBirth.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return <WelcomeSlide t={t} />;
      case 1:
        return <NameGenderSlide t={t} data={data} setData={setData} />;
      case 2:
        return <StatsSlide t={t} data={data} setData={setData} />;
      case 3:
        return <ActivitySlide t={t} data={data} setData={setData} />;
      case 4:
        return <GoalSlide t={t} data={data} setData={setData} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={styles.gradient}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {Array.from({ length: totalSlides }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentSlide && styles.progressDotActive,
                index < currentSlide && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Slide Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderSlide()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.footer}>
          {currentSlide > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>{t('back')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentSlide === totalSlides - 1 ? t('getStarted') : t('next')}
              </Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// Slide 1: Welcome
function WelcomeSlide({ t }: { t: (key: Parameters<typeof i18n.t>[0]) => string }) {
  return (
    <View style={styles.slideContainer}>
      <View style={styles.logoContainer}>
        <LinearGradient
          colors={Colors.gradientPrimary}
          style={styles.logoGradient}
        >
          <Leaf size={48} color="#FFFFFF" />
          <Camera size={24} color="#FFFFFF" style={styles.cameraIcon} />
        </LinearGradient>
      </View>

      <Text style={styles.appName}>{t('appName')}</Text>
      <Text style={styles.title}>{t('onboardingWelcomeTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboardingWelcomeSubtitle')}</Text>

      <View style={styles.featureList}>
        <FeatureItem icon="📸" text={t('analyzeWithAI')} />
        <FeatureItem icon="📊" text={t('advancedAnalytics')} />
        <FeatureItem icon="🎯" text={t('detailedMacros')} />
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// Slide 2: Name & Gender
function NameGenderSlide({
  t,
  data,
  setData,
}: {
  t: (key: Parameters<typeof i18n.t>[0]) => string;
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  const genders: { value: Gender; label: string; icon: string }[] = [
    { value: 'male', label: t('male'), icon: '👨' },
    { value: 'female', label: t('female'), icon: '👩' },
    { value: 'other', label: t('other'), icon: '🧑' },
  ];

  return (
    <View style={styles.slideContainer}>
      <View style={styles.slideIcon}>
        <User size={32} color={Colors.primary} />
      </View>

      <Text style={styles.title}>{t('onboardingNameTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboardingNameSubtitle')}</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('yourName')}</Text>
        <TextInput
          style={styles.textInput}
          value={data.name}
          onChangeText={(text) => setData({ ...data, name: text })}
          placeholder={t('yourName')}
          placeholderTextColor={Colors.textTertiary}
          autoFocus
        />
      </View>

      <Text style={styles.inputLabel}>{t('gender')}</Text>
      <View style={styles.genderContainer}>
        {genders.map((gender) => (
          <TouchableOpacity
            key={gender.value}
            style={[
              styles.genderButton,
              data.gender === gender.value && styles.genderButtonActive,
            ]}
            onPress={() => setData({ ...data, gender: gender.value })}
          >
            <Text style={styles.genderIcon}>{gender.icon}</Text>
            <Text style={[
              styles.genderLabel,
              data.gender === gender.value && styles.genderLabelActive,
            ]}>
              {gender.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Slide 3: Physical Stats
function StatsSlide({
  t,
  data,
  setData,
}: {
  t: (key: Parameters<typeof i18n.t>[0]) => string;
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  const formatDate = (text: string) => {
    // Simple date formatting: DD/MM/YYYY
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  return (
    <View style={styles.slideContainer}>
      <Text style={styles.title}>{t('onboardingStatsTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboardingStatsSubtitle')}</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('dateOfBirth')}</Text>
          <TextInput
            style={styles.textInput}
            value={data.dateOfBirth}
            onChangeText={(text) => setData({ ...data, dateOfBirth: formatDate(text) })}
            placeholder={t('dateFormatPlaceholder')}
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('height')}</Text>
          <View style={styles.sliderContainer}>
            <TextInput
              style={[styles.textInput, styles.numberInput]}
              value={String(data.heightCm)}
              onChangeText={(text) => setData({ ...data, heightCm: parseInt(text) || 0 })}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.unitLabel}>cm</Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('weight')}</Text>
          <View style={styles.sliderContainer}>
            <TextInput
              style={[styles.textInput, styles.numberInput]}
              value={String(data.weightKg)}
              onChangeText={(text) => setData({ ...data, weightKg: parseInt(text) || 0 })}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.unitLabel}>kg</Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('targetWeight')}</Text>
          <View style={styles.sliderContainer}>
            <TextInput
              style={[styles.textInput, styles.numberInput]}
              value={data.targetWeightKg ? String(data.targetWeightKg) : ''}
              onChangeText={(text) => setData({ ...data, targetWeightKg: text ? parseInt(text) : null })}
              keyboardType="numeric"
              maxLength={3}
              placeholder={t('optionalPlaceholder')}
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.unitLabel}>kg</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Slide 4: Activity Level
function ActivitySlide({
  t,
  data,
  setData,
}: {
  t: (key: Parameters<typeof i18n.t>[0]) => string;
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  return (
    <View style={styles.slideContainer}>
      <View style={styles.slideIcon}>
        <Activity size={32} color={Colors.primary} />
      </View>

      <Text style={styles.title}>{t('onboardingActivityTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboardingActivitySubtitle')}</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll}>
        {ACTIVITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.optionCard,
              data.activityLevel === level.value && styles.optionCardActive,
            ]}
            onPress={() => setData({ ...data, activityLevel: level.value })}
          >
            <View style={styles.optionHeader}>
              <Text style={[
                styles.optionTitle,
                data.activityLevel === level.value && styles.optionTitleActive,
              ]}>
                {t(level.labelKey as Parameters<typeof i18n.t>[0])}
              </Text>
              {data.activityLevel === level.value && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.optionDescription}>{t(level.descriptionKey as Parameters<typeof i18n.t>[0])}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Slide 5: Goal
function GoalSlide({
  t,
  data,
  setData,
}: {
  t: (key: Parameters<typeof i18n.t>[0]) => string;
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  return (
    <View style={styles.slideContainer}>
      <View style={styles.slideIcon}>
        <Target size={32} color={Colors.primary} />
      </View>

      <Text style={styles.title}>{t('onboardingGoalTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboardingGoalSubtitle')}</Text>

      {GOALS.map((goal) => (
        <TouchableOpacity
          key={goal.value}
          style={[
            styles.goalCard,
            data.goal === goal.value && styles.goalCardActive,
          ]}
          onPress={() => setData({ ...data, goal: goal.value })}
        >
          <View style={styles.goalIconContainer}>
            <Text style={styles.goalEmoji}>
              {goal.value === 'lose_weight' ? '🔥' : goal.value === 'maintain' ? '⚖️' : '💪'}
            </Text>
          </View>
          <View style={styles.goalTextContainer}>
            <Text style={[
              styles.goalTitle,
              data.goal === goal.value && styles.goalTitleActive,
            ]}>
              {t(goal.labelKey as Parameters<typeof i18n.t>[0])}
            </Text>
            <Text style={styles.goalDescription}>{t(goal.descriptionKey as Parameters<typeof i18n.t>[0])}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface3,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: Colors.primary,
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.xxl,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  appName: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  slideIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
  featureList: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  featureText: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  inputContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  numberInput: {
    flex: 1,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  unitLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    width: 40,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  genderButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  genderIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  genderLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  genderLabelActive: {
    color: Colors.primary,
  },
  optionsScroll: {
    width: '100%',
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  optionTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  optionTitleActive: {
    color: Colors.primary,
  },
  optionDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    width: '100%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  goalIconContainer: {
    marginRight: Spacing.md,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 2,
  },
  goalTitleActive: {
    color: Colors.primary,
  },
  goalDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  backButtonText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  nextButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  nextButtonText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
