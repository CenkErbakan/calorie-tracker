import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserProfile,
  DEFAULT_PROFILE,
  AppSettings,
  DEFAULT_SETTINGS,
  calculateDailyCalorieGoal,
  calculateMacroGoals,
  calculateAge,
} from '@/types';
import { i18n } from '@/lib/i18n';

const PROFILE_KEY = '@nutrilens_profile';
const SETTINGS_KEY = '@nutrilens_settings';

interface UserContextValue {
  profile: UserProfile;
  settings: AppSettings;
  isLoading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  updateNotificationSettings: (notifications: AppSettings['notifications']) => Promise<void>;
  recalculateGoals: () => Promise<void>;
  completeOnboarding: (onboardingData: Partial<UserProfile>) => Promise<void>;
  getGreeting: () => string;
  getRemainingScans: () => number;
}

export const [UserProvider, useUser] = createContextHook<UserContextValue>(() => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, settingsData] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
      ]);

      if (profileData) {
        const parsed = JSON.parse(profileData);
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
      }

      if (settingsData) {
        const parsed = JSON.parse(settingsData);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await saveProfile(updated);
  }, [profile]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const updateNotificationSettings = useCallback(async (notifications: AppSettings['notifications']) => {
    await updateSettings({ notifications });
  }, [updateSettings]);

  const recalculateGoals = useCallback(async () => {
    if (!profile.dateOfBirth) return;

    const age = calculateAge(profile.dateOfBirth);
    const newCalorieGoal = calculateDailyCalorieGoal(
      profile.weightKg,
      profile.heightCm,
      age,
      profile.gender,
      profile.activityLevel,
      profile.goal
    );

    const macros = calculateMacroGoals(newCalorieGoal, profile.goal);

    await updateProfile({
      dailyCalorieGoal: newCalorieGoal,
      dailyProteinGoal: macros.protein,
      dailyCarbsGoal: macros.carbs,
      dailyFatGoal: macros.fat,
    });
  }, [profile, updateProfile]);

  const completeOnboarding = useCallback(async (onboardingData: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...onboardingData, isOnboarded: true };

    // Calculate initial goals
    if (newProfile.dateOfBirth) {
      const age = calculateAge(newProfile.dateOfBirth);
      const calorieGoal = calculateDailyCalorieGoal(
        newProfile.weightKg,
        newProfile.heightCm,
        age,
        newProfile.gender,
        newProfile.activityLevel,
        newProfile.goal
      );
      const macros = calculateMacroGoals(calorieGoal, newProfile.goal);

      newProfile.dailyCalorieGoal = calorieGoal;
      newProfile.dailyProteinGoal = macros.protein;
      newProfile.dailyCarbsGoal = macros.carbs;
      newProfile.dailyFatGoal = macros.fat;
    }

    setProfile(newProfile);
    await saveProfile(newProfile);

    // Set language preference
    if (newProfile.language && newProfile.language !== 'auto') {
      await i18n.setLanguage(newProfile.language);
    }
  }, [profile]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    const greetingKey = hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening';
    const greeting = i18n.t(greetingKey);
    return profile.name ? `${greeting}, ${profile.name}` : greeting;
  }, [profile.name]);

  const getRemainingScans = useCallback(() => {
    // This will be implemented with subscription context
    // For now return a default
    return 1;
  }, []);

  const value = useMemo(() => ({
    profile,
    settings,
    isLoading,
    updateProfile,
    updateSettings,
    updateNotificationSettings,
    recalculateGoals,
    completeOnboarding,
    getGreeting,
    getRemainingScans,
  }), [profile, settings, isLoading, updateProfile, updateSettings, updateNotificationSettings, recalculateGoals, completeOnboarding, getGreeting, getRemainingScans]);

  return value;
});
