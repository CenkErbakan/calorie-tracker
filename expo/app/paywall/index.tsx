import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/lib/i18n';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { SubscriptionPlan, SUBSCRIPTION_PRICING } from '@/types';
import {
  Crown,
  Check,
  X,
  Sparkles,
  Zap,
  BarChart3,
  Download,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { upgradeToPremium, restorePurchases } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);
    try {
      await upgradeToPremium(selectedPlan);
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const restored = await restorePurchases();
    if (restored) {
      router.back();
    }
  };

  const features = [
    { icon: <Zap size={20} color={Colors.primary} />, text: t('unlimitedScans') },
    { icon: <Sparkles size={20} color={Colors.primary} />, text: t('noAds') },
    { icon: <BarChart3 size={20} color={Colors.primary} />, text: t('advancedAnalytics') },
    { icon: <Check size={20} color={Colors.primary} />, text: t('detailedMacros') },
    { icon: <Download size={20} color={Colors.primary} />, text: t('exportHistory') },
    { icon: <Clock size={20} color={Colors.primary} />, text: t('priorityAI') },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={Colors.gradientGold}
              style={styles.crownContainer}
            >
              <Crown size={48} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.title}>{t('premiumTitle')}</Text>
            <Text style={styles.subtitle}>{t('premiumSubtitle')}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>{feature.icon}</View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            {/* Monthly Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{t('monthlyPlan')}</Text>
                <Text style={styles.planLabel}>{t('mostFlexible')}</Text>
              </View>
              <Text style={styles.planPrice}>
                ${SUBSCRIPTION_PRICING.monthly.price}
                <Text style={styles.planPeriod}>{t('perMonth')}</Text>
              </Text>
              {selectedPlan === 'monthly' && (
                <View style={styles.checkContainer}>
                  <Check size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Annual Plan - Featured */}
            <TouchableOpacity
              style={[
                styles.planCard,
                styles.planCardFeatured,
                selectedPlan === 'annual' && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan('annual')}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>{t('bestValue')}</Text>
              </View>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{t('annualPlan')}</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>
                    {t('savePercent', { percent: SUBSCRIPTION_PRICING.annual.savings })}
                  </Text>
                </View>
              </View>
              <Text style={styles.planPrice}>
                ${SUBSCRIPTION_PRICING.annual.price}
                <Text style={styles.planPeriod}>{t('perYear')}</Text>
              </Text>
              <Text style={styles.monthlyEquivalent}>
                {SUBSCRIPTION_PRICING.annual.monthlyEquivalent} {t('perMonth')}
              </Text>
              {selectedPlan === 'annual' && (
                <View style={styles.checkContainer}>
                  <Check size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Lifetime Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'lifetime' && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan('lifetime')}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{t('lifetimePlan')}</Text>
                <Text style={[styles.planLabel, { color: Colors.accent }]}>
                  {t('limitedOffer')}
                </Text>
              </View>
              <Text style={styles.planPrice}>
                ${SUBSCRIPTION_PRICING.lifetime.price}
                <Text style={styles.planPeriod}>{t('oneTime')}</Text>
              </Text>
              {selectedPlan === 'lifetime' && (
                <View style={styles.checkContainer}>
                  <Check size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSubscribe}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{t('startFreeTrial')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.ctaSubtext}>{t('cancelAnytime')}</Text>

          {/* Footer Links */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.footerLink}>{t('restorePurchases')}</Text>
            </TouchableOpacity>
            <View style={styles.footerDivider} />
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://example.com/privacy')
              }
            >
              <Text style={styles.footerLink}>{t('privacyPolicy')}</Text>
            </TouchableOpacity>
            <View style={styles.footerDivider} />
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://example.com/terms')
              }
            >
              <Text style={styles.footerLink}>{t('termsOfService')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    ...Typography.body,
    color: Colors.text,
  },
  plansContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  planCardFeatured: {
    borderColor: Colors.primary,
  },
  planCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    right: Spacing.lg,
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  bestValueText: {
    ...Typography.smallMedium,
    color: '#FFFFFF',
  },
  saveBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  saveText: {
    ...Typography.smallMedium,
    color: '#FFFFFF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planName: {
    ...Typography.h3,
    color: Colors.text,
  },
  planLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  planPrice: {
    ...Typography.display,
    color: Colors.text,
  },
  planPeriod: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  monthlyEquivalent: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  checkContainer: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.glow,
  },
  ctaGradient: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  ctaSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerLink: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  footerDivider: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textTertiary,
    marginHorizontal: Spacing.sm,
  },
});
