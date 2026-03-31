import { useState, useEffect, useMemo } from 'react';
import { getLocales } from 'expo-localization';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/lib/i18n';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { SubscriptionPlan } from '@/types';
import { fetchPaywallStorePrices } from '@/lib/revenuecat';
import {
  computeFallbackPaywallPrices,
  pickPaywallFallbackRegion,
  type PaywallPriceDisplay,
} from '@/lib/paywallPricing';
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
import { ActivityIndicator } from 'react-native';

export default function PaywallScreen() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { upgradeToPremium, restorePurchases } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('quarterly');
  const [isLoading, setIsLoading] = useState(false);

  const localeTag = useMemo(() => getLocales()[0]?.languageTag ?? 'en-US', []);

  const [prices, setPrices] = useState<PaywallPriceDisplay>(() =>
    computeFallbackPaywallPrices(pickPaywallFallbackRegion(language), localeTag)
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      const store = await fetchPaywallStorePrices(localeTag);
      if (!alive) return;
      if (store) {
        setPrices(store);
      } else {
        setPrices(computeFallbackPaywallPrices(pickPaywallFallbackRegion(language), localeTag));
      }
    })();
    return () => {
      alive = false;
    };
  }, [localeTag, language]);

  const handleSubscribe = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);
    try {
      const result = await upgradeToPremium(selectedPlan);
      if (result === 'success') {
        router.back();
      } else if (result === 'failed') {
        Alert.alert(t('subscription'), t('purchaseFailed'));
      }
    } catch {
      Alert.alert(t('subscription'), t('purchaseFailed'));
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
          keyboardShouldPersistTaps="handled"
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
                {prices.monthlyMain}
                <Text style={styles.planPeriod}>{t('perMonth')}</Text>
              </Text>
              {selectedPlan === 'monthly' && (
                <View style={styles.checkContainer}>
                  <Check size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Quarterly Plan - Featured */}
            <TouchableOpacity
              style={[
                styles.planCard,
                styles.planCardFeatured,
                selectedPlan === 'quarterly' && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan('quarterly')}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>{t('bestValue')}</Text>
              </View>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{t('quarterlyPlan')}</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>
                    {t('savePercent', { percent: prices.quarterlySavingsPercent })}
                  </Text>
                </View>
              </View>
              <Text style={styles.planPrice}>
                {prices.quarterlyMain}
                <Text style={styles.planPeriod}>{t('per3Months')}</Text>
              </Text>
              <Text style={styles.monthlyEquivalent}>
                {prices.quarterlyPerMonth} {t('perMonth')}
              </Text>
              {selectedPlan === 'quarterly' && (
                <View style={styles.checkContainer}>
                  <Check size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Annual Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'annual' && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan('annual')}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{t('annualPlan')}</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>
                    {t('savePercent', { percent: prices.annualSavingsPercent })}
                  </Text>
                </View>
              </View>
              <Text style={styles.planPrice}>
                {prices.annualMain}
                <Text style={styles.planPeriod}>{t('perYear')}</Text>
              </Text>
              <Text style={styles.monthlyEquivalent}>
                {prices.annualPerMonth} {t('perMonth')}
              </Text>
              {selectedPlan === 'annual' && (
                <View style={styles.checkContainer}>
                  <Check size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Aboneliği Al - Paketlerin hemen altında */}
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
              {isLoading ? (
                <View style={styles.ctaLoading}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.ctaText}>{t('loading')}</Text>
                </View>
              ) : (
                <Text style={styles.ctaText}>{t('getSubscription')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaSubtext}>{t('cancelAnytime')}</Text>

          {/* Satın alımları geri yükle, Gizlilik, Koşullar */}
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
    marginBottom: Spacing.lg,
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
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadows.glow,
  },
  ctaGradient: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  ctaLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  ctaSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
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
