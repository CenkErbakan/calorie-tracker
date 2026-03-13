import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTodayKey } from '@/types';

const WATER_STORAGE_KEY = '@nutrilens_water';
const DEFAULT_DAILY_GOAL_ML = 3000; // 12 bardak x 250ml

interface WaterContextValue {
  todaysWaterMl: number;
  dailyGoalMl: number;
  isLoading: boolean;
  addWater: (ml: number) => Promise<void>;
  setWater: (ml: number) => Promise<void>;
  getWaterForDate: (date: string) => number;
}

export const [WaterProvider, useWater] = createContextHook<WaterContextValue>(() => {
  const [records, setRecords] = useState<Record<string, number>>({});
  const [dailyGoalMl, setDailyGoalMl] = useState(DEFAULT_DAILY_GOAL_ML);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadWater();
  }, []);

  const loadWater = async () => {
    try {
      const stored = await AsyncStorage.getItem(WATER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecords(parsed.records ?? {});
        setDailyGoalMl(parsed.dailyGoalMl ?? DEFAULT_DAILY_GOAL_ML);
      }
    } catch (e) {
      console.error('Failed to load water data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWater = useCallback(async (newRecords: Record<string, number>) => {
    try {
      await AsyncStorage.setItem(
        WATER_STORAGE_KEY,
        JSON.stringify({ records: newRecords, dailyGoalMl })
      );
    } catch (e) {
      console.error('Failed to save water data:', e);
    }
  }, [dailyGoalMl]);

  const addWater = useCallback(async (ml: number) => {
    const today = getTodayKey();
    const current = records[today] ?? 0;
    const newTotal = Math.max(0, current + ml);
    const newRecords = { ...records, [today]: newTotal };
    setRecords(newRecords);
    await saveWater(newRecords);
  }, [records, saveWater]);

  const setWater = useCallback(async (ml: number) => {
    const today = getTodayKey();
    const newRecords = { ...records, [today]: ml };
    setRecords(newRecords);
    await saveWater(newRecords);
  }, [records, saveWater]);

  const getWaterForDate = useCallback((date: string) => {
    return records[date] ?? 0;
  }, [records]);

  const todaysWaterMl = useMemo(() => {
    const today = getTodayKey();
    return records[today] ?? 0;
  }, [records]);

  const value = useMemo(() => ({
    todaysWaterMl,
    dailyGoalMl,
    isLoading,
    addWater,
    setWater,
    getWaterForDate,
  }), [todaysWaterMl, dailyGoalMl, isLoading, addWater, setWater, getWaterForDate]);

  return value;
});
