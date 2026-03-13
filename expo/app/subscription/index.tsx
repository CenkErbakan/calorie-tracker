import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { Crown, Check, RefreshCw, Settings2, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

function getManageSubscriptionUrl() {
  if (Platform.OS === 'ios') return 'https://apps.apple.com/account/subscriptions';
  if (Platform.OS === 'android') return 'https://play.google.com/store/account/subscriptions';
  return 'https://example.com/subscription';
}

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { subscription, isPremium, restorePurchases, cancelSubscription } = useSubscription();

  const [isRestoring, setIsRestoring] = useState(false);

  const planLabel = useMemo(() => {
    if (!subscription.plan) return t('freePlan');
    if (subscription.plan === 'monthly') return t('monthlyPlan');
    if (subscription.plan === 'annual') return t('annualPlan');
    return t('lifetimePlan');
  }, [subscription.plan, t]);

  const expiryText = useMemo(() => {
    if (!isPremium) return null;
    if (subscription.plan === 'lifetime') return t('lifetimeAccess');
    if (!subscription.expiryDate) return null;
    return t('expiresOn', { date: format(new Date(subscription.expiryDate), 'PPP') });
  }, [isPremium, subscription.plan, subscription.expiryDate, t]);

  const handleGoPremium = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  const handleRestore = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      if (!restored) {
        Alert.alert(t('subscription'), t('restoreNotFound'));
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageStore = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = getManageSubscriptionUrl();
    await Linking.openURL(url);
  };

  const handleCancel = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('subscription'), t('cancelSubscriptionConfirm'), [
      { text: t('back'), style: 'cancel' },
      {
        text: t('cancelSubscription'),
        style: 'destructive',
        onPress: () => {
          void cancelSubscription();
        },
      },
    ]);
  };

  const benefits = [
    t('unlimitedScans'),
    t('advancedAnalytics'),
    t('noAds'),
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.surface]} style={styles.gradient} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('subscription')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <LinearGradient colors={isPremium ? Colors.gradientGold : Colors.gradientPrimary} style={styles.heroIcon}>
              <Crown size={24} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>
                {isPremium ? t('mySubscription') : t('freePlan')}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isPremium ? planLabel : t('upgradeForPremium')}
              </Text>
            </View>
          </View>

          {expiryText ? <Text style={styles.expiryText}>{expiryText}</Text> : null}

          {!isPremium ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleGoPremium} activeOpacity={0.85}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.primaryGradient}>
                <Text style={styles.primaryText}>{t('goPremium')}</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.premiumActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/paywall')} activeOpacity={0.85}>
                <Text style={styles.secondaryText}>{t('changePlan')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, styles.secondaryDanger]} onPress={handleCancel} activeOpacity={0.85}>
                <Text style={[styles.secondaryText, styles.secondaryDangerText]}>{t('cancelSubscription')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('premiumBenefits')}</Text>
          <View style={styles.benefitsCard}>
            {benefits.map((text, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <Check size={18} color={Colors.primary} />
                </View>
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>

          <TouchableOpacity style={styles.row} onPress={handleRestore} disabled={isRestoring} activeOpacity={0.85}>
            <View style={styles.rowIcon}>
              <RefreshCw size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('restorePurchases')}</Text>
              <Text style={styles.rowSubtitle}>{t('restorePurchasesHint')}</Text>
            </View>
            <Text style={styles.rowRight}>{isRestoring ? t('loading') : ''}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleManageStore} activeOpacity={0.85}>
            <View style={styles.rowIcon}>
              <Settings2 size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('manageSubscription')}</Text>
              <Text style={styles.rowSubtitle}>{t('manageSubscriptionHint')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  heroSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  expiryText: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.lg,
    ...Shadows.glow,
  },
  primaryGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  premiumActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryText: {
    ...Typography.captionMedium,
    color: Colors.text,
  },
  secondaryDanger: {
    backgroundColor: Colors.error + '15',
  },
  secondaryDangerText: {
    color: Colors.error,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  benefitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  benefitText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  rowRight: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});

