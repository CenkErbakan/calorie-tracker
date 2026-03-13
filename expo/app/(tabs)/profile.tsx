import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/context/UserContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useMeals } from '@/context/MealsContext';
import { useTranslation, Language } from '@/lib/i18n';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { Crown, ChevronRight, Globe, Ruler, Download, Trash2 } from 'lucide-react-native';
import { calculateDailyCalorieGoal, calculateAge } from '@/types';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const { t, setLanguage, language } = useTranslation();
  const router = useRouter();
  const { profile, updateProfile, recalculateGoals } = useUser();
  const { isPremium } = useSubscription();
  const { meals } = useMeals();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);

  useEffect(() => {
    if (isEditing) setEditedProfile(profile);
  }, [isEditing, profile]);

  const formatDateInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const stats = {
    daysTracked: new Set(meals.map(m => new Date(m.timestamp).toDateString())).size,
    mealsLogged: meals.length,
    avgDailyCalories: meals.length > 0
      ? Math.round(meals.reduce((sum, m) => sum + m.total_calories, 0) / Math.max(1, new Set(meals.map(m => new Date(m.timestamp).toDateString())).size))
      : 0,
  };

  const handleSave = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await recalculateGoals(editedProfile);
    setIsEditing(false);
    const p = { ...profile, ...editedProfile };
    const newGoal = calculateDailyCalorieGoal(
      p.weightKg,
      p.heightCm,
      calculateAge(p.dateOfBirth),
      p.gender,
      p.activityLevel,
      p.goal
    );
    Alert.alert(t('success'), t('dailyGoalUpdated', { calories: newGoal }));
  };

  const handleLanguageChange = async (lang: Language) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setLanguage(lang);
    await updateProfile({ language: lang });
  };

  const handleExport = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const _data = JSON.stringify(meals, null, 2);
    Alert.alert(t('exportData'), 'Data ready for export');
  };

  const handleDeleteAll = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t('deleteAllData'),
      t('deleteAllDataConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile')}</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Text style={styles.editButton}>{isEditing ? t('save') : t('edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.name}>{profile.name || t('yourName')}</Text>
          {isPremium ? (
            <View style={styles.premiumBadge}>
              <Crown size={14} color={Colors.accentOrange} />
              <Text style={styles.premiumText}>{t('premium')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/paywall/index' as never)}
            >
              <Text style={styles.upgradeText}>{t('goPremium')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatItem value={stats.daysTracked} label={t('daysTracked')} />
          <View style={styles.statDivider} />
          <StatItem value={stats.mealsLogged} label={t('mealsLogged')} />
          <View style={styles.statDivider} />
          <StatItem value={stats.avgDailyCalories} label={t('avgDailyCalories')} />
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('personalInfo')}</Text>
          
          {isEditing ? (
            <View style={styles.editForm}>
              <EditField
                label={t('yourName')}
                value={editedProfile.name}
                onChange={(text) => setEditedProfile({ ...editedProfile, name: text })}
              />
              <EditField
                label={t('dateOfBirth')}
                value={editedProfile.dateOfBirth}
                onChange={(text) => setEditedProfile({ ...editedProfile, dateOfBirth: formatDateInput(text) })}
                keyboardType="numeric"
                placeholder="DD/MM/YYYY"
                maxLength={10}
              />
              <EditField
                label={t('height')}
                value={String(editedProfile.heightCm)}
                onChange={(text) => setEditedProfile({ ...editedProfile, heightCm: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
              <EditField
                label={t('weight')}
                value={String(editedProfile.weightKg)}
                onChange={(text) => setEditedProfile({ ...editedProfile, weightKg: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.saveGradient}>
                  <Text style={styles.saveText}>{t('save')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoList}>
              <InfoItem label={t('yourName')} value={profile.name} />
              <InfoItem label={t('dateOfBirth')} value={profile.dateOfBirth || '-'} />
              <InfoItem label={t('height')} value={`${profile.heightCm} cm`} />
              <InfoItem label={t('weight')} value={`${profile.weightKg} kg`} />
            </View>
          )}
        </View>

        {/* Daily Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dailyGoal')}</Text>
          <View style={styles.goalCard}>
            <Text style={styles.goalValue}>{profile.dailyCalorieGoal}</Text>
            <Text style={styles.goalUnit}>kcal</Text>
            <Text style={styles.goalExplanation}>{t('dailyGoal')}</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>
          
          {/* Language */}
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Globe size={20} color={Colors.primary} />
            </View>
            <Text style={styles.settingLabel}>{t('language')}</Text>
            <View style={styles.languageSelector}>
              {(['auto', 'en', 'tr'] as Language[]).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageButton,
                    language === lang && styles.languageButtonActive,
                  ]}
                  onPress={() => handleLanguageChange(lang)}
                >
                  <Text
                    style={[
                      styles.languageText,
                      language === lang && styles.languageTextActive,
                    ]}
                  >
                    {lang === 'auto' ? t('auto') : lang === 'en' ? t('english') : t('turkish')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Units */}
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ruler size={20} color={Colors.primary} />
            </View>
            <Text style={styles.settingLabel}>{t('units')}</Text>
            <View style={styles.unitsSelector}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  profile.units === 'metric' && styles.unitButtonActive,
                ]}
                onPress={() => updateProfile({ units: 'metric' })}
              >
                <Text
                  style={[
                    styles.unitText,
                    profile.units === 'metric' && styles.unitTextActive,
                  ]}
                >
                  {t('metric')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  profile.units === 'imperial' && styles.unitButtonActive,
                ]}
                onPress={() => updateProfile({ units: 'imperial' })}
              >
                <Text
                  style={[
                    styles.unitText,
                    profile.units === 'imperial' && styles.unitTextActive,
                  ]}
                >
                  {t('imperial')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionItem} onPress={handleExport}>
            <View style={styles.actionIcon}>
              <Download size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>{t('exportData')}</Text>
            <ChevronRight size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleDeleteAll}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.error + '15' }]}>
              <Trash2 size={20} color={Colors.error} />
            </View>
            <Text style={[styles.actionLabel, { color: Colors.error }]}>{t('deleteAllData')}</Text>
            <ChevronRight size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EditField({
  label,
  value,
  onChange,
  keyboardType = 'default',
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        maxLength={maxLength}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
  },
  editButton: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentOrange + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  premiumText: {
    ...Typography.captionMedium,
    color: Colors.accentOrange,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  upgradeText: {
    ...Typography.captionMedium,
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: Colors.text,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  editForm: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  editField: {
    marginBottom: Spacing.md,
  },
  editLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  editInput: {
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  saveButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  saveGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  goalValue: {
    ...Typography.display,
    color: Colors.primary,
  },
  goalUnit: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  goalExplanation: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingLabel: {
    ...Typography.bodyMedium,
    color: Colors.text,
    flex: 1,
  },
  languageSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  languageButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
  },
  languageButtonActive: {
    backgroundColor: Colors.primary,
  },
  languageText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  unitsSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  unitButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
  },
  unitText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  actionLabel: {
    ...Typography.bodyMedium,
    color: Colors.text,
    flex: 1,
  },
  bottomSpacing: {
    height: 100,
  },
});
