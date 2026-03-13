import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as Pedometer from 'expo-sensors/build/Pedometer';
import { AppState, Platform } from 'react-native';
import { getTodayKey } from '@/types';
import { useUser } from '@/context/UserContext';

const STEPS_STORAGE_KEY = '@nutrilens_steps';

/** ~0.04 kcal per step for 70kg person, adjusted by weight */
function stepsToCalories(steps: number, weightKg: number): number {
  const baseKcalPerStep = 0.04;
  const weightFactor = weightKg / 70;
  return Math.round(steps * baseKcalPerStep * weightFactor);
}

interface StepsContextValue {
  todaysSteps: number;
  burnedCalories: number;
  isAvailable: boolean;
  isLoading: boolean;
}

export const [StepsProvider, useSteps] = createContextHook<StepsContextValue>(() => {
  const { profile } = useUser();
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastDateRef = useRef<string>(getTodayKey());
  const androidBaseRef = useRef(0);

  const weightKg = profile.weightKg ?? 70;

  const loadStoredSteps = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STEPS_STORAGE_KEY);
      if (stored) {
        const { date, steps } = JSON.parse(stored);
        if (date === getTodayKey()) {
          return steps;
        }
      }
    } catch (e) {
      console.error('Failed to load steps:', e);
    }
    return 0;
  }, []);

  const saveSteps = useCallback(async (steps: number) => {
    try {
      await AsyncStorage.setItem(
        STEPS_STORAGE_KEY,
        JSON.stringify({ date: getTodayKey(), steps })
      );
    } catch (e) {
      console.error('Failed to save steps:', e);
    }
  }, []);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const init = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);

        if (!available) {
          setIsLoading(false);
          return;
        }

        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm?.granted) {
          setIsAvailable(false);
          setIsLoading(false);
          return;
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        lastDateRef.current = getTodayKey();

        // iOS: getStepCountAsync gives today's total (no watch needed)
        if (Platform.OS === 'ios') {
          try {
            const result = await Pedometer.getStepCountAsync(startOfToday, new Date());
            if (result?.steps != null) {
              setTodaysSteps(result.steps);
              await saveSteps(result.steps);
            }
          } catch {
            // Fallback to watchStepCount
          }
        }

        // Android: watchStepCount (steps since subscription) + persisted base
        if (Platform.OS !== 'ios') {
          const storedSteps = await loadStoredSteps();
          androidBaseRef.current = storedSteps;
          if (storedSteps > 0) {
            setTodaysSteps(storedSteps);
          }

          subscription = Pedometer.watchStepCount((result) => {
            const steps = result?.steps ?? 0;
            const newTotal = androidBaseRef.current + steps;
            setTodaysSteps(newTotal);
            void saveSteps(newTotal);
          });
        }
      } catch (e) {
        console.error('Pedometer init failed:', e);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    void init();

    return () => {
      subscription?.remove();
    };
  }, [loadStoredSteps, saveSteps]);

  // iOS: poll getStepCountAsync periodically for accurate count
  useEffect(() => {
    if (!isAvailable || Platform.OS !== 'ios') return;

    const interval = setInterval(async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(startOfToday, new Date());
        if (result?.steps != null) {
          setTodaysSteps(result.steps);
          await saveSteps(result.steps);
        }
      } catch {
        // ignore
      }
    }, 60000); // every minute

    return () => clearInterval(interval);
  }, [isAvailable, saveSteps]);

  // Gün değiştiğinde adımları sıfırla (uygulama arka planda kalıp yeni güne geçildiyse)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const today = getTodayKey();
      if (lastDateRef.current !== today) {
        lastDateRef.current = today;
        androidBaseRef.current = 0;
        setTodaysSteps(0);
        void saveSteps(0);
      }
    });
    return () => sub.remove();
  }, [saveSteps]);

  const burnedCalories = useMemo(
    () => stepsToCalories(todaysSteps, weightKg),
    [todaysSteps, weightKg]
  );

  const value = useMemo(
    () => ({
      todaysSteps,
      burnedCalories,
      isAvailable,
      isLoading,
    }),
    [todaysSteps, burnedCalories, isAvailable, isLoading]
  );

  return value;
});
