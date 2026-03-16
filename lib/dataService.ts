import AsyncStorage from '@react-native-async-storage/async-storage';

/** Tüm uygulama verilerini kalıcı olarak siler */
export async function clearAllData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter(
    (k) =>
      k.startsWith('@nutrilens_') ||
      k.startsWith('meals_') ||
      k.startsWith('medicine_cache_') ||
      k.startsWith('product_cache_') ||
      k === 'recent_scans'
  );
  if (appKeys.length > 0) {
    await AsyncStorage.multiRemove(appKeys);
  }
}
