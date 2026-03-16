import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
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
  requestPermissions: () => Promise<void>;
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

  const cleanupRef = useRef<(() => void) | null>(null);

  const initPedometer = useCallback(async () => {
    cleanupRef.current?.();
    let subscription: { remove: () => void } | null = null;
    const cleanup = () => {
      subscription?.remove();
    };

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

      if (Platform.OS !== 'ios') {
        const storedSteps = await loadStoredSteps();
        androidBaseRef.current = storedSteps;
        if (storedSteps > 0) setTodaysSteps(storedSteps);
        subscription = Pedometer.watchStepCount((result) => {
          const steps = result?.steps ?? 0;
          const newTotal = androidBaseRef.current + steps;
          setTodaysSteps(newTotal);
          void saveSteps(newTotal);
        });
      }
      cleanupRef.current = cleanup;
    } catch (e) {
      console.error('Pedometer init failed:', e);
      setIsAvailable(false);
    } finally {
      setIsLoading(false);
    }
  }, [loadStoredSteps, saveSteps]);

  const requestPermissions = useCallback(async () => {
    if (isAvailable) return;
    setIsLoading(true);
    try {
      const perm = await Pedometer.requestPermissionsAsync();
      if (perm?.granted) {
        await initPedometer();
      } else {
        setIsAvailable(false);
      }
    } catch (e) {
      console.error('Pedometer permission failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, initPedometer]);

  useEffect(() => {
    void initPedometer();
    return () => cleanupRef.current?.();
  }, [initPedometer]);

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

  // Gün değiştiğinde adımları sıfırla ve pedometer'ı yeniden başlat
  const checkDayChange = useCallback(async () => {
    const today = getTodayKey();
    if (lastDateRef.current !== today) {
      lastDateRef.current = today;
      androidBaseRef.current = 0;
      setTodaysSteps(0);
      await saveSteps(0);
      await initPedometer(); // iOS: yeni gün için getStepCountAsync, Android: yeni subscription
    }
  }, [initPedometer, saveSteps]);

  // 1) Uygulama öne geldiğinde kontrol
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkDayChange();
    });
    return () => sub.remove();
  }, [checkDayChange]);

  // 2) Uygulama açıkken gece yarısı geçerse: her dakika kontrol
  useEffect(() => {
    const interval = setInterval(checkDayChange, 60000);
    return () => clearInterval(interval);
  }, [checkDayChange]);

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
      requestPermissions,
    }),
    [todaysSteps, burnedCalories, isAvailable, isLoading, requestPermissions]
  );

  return value;
});
