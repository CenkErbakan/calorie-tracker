import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { Lock, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface PremiumGateProps {
  titleKey: string;
  subtitleKey: string;
}

export function PremiumGate({ titleKey, subtitleKey }: PremiumGateProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleUpgrade = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/paywall');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.gradientGold}
        style={styles.lockIconContainer}
      >
        <Lock size={40} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.premiumTitle}>{t(titleKey)}</Text>
      <Text style={styles.premiumSubtitle}>{t(subtitleKey)}</Text>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={handleUpgrade}
        activeOpacity={0.8}
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
  );
}

const styles = StyleSheet.create({
  container: {
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
    ...Shadows.md,
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
});
