import { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface AdBannerProps {
  style?: object;
}

/**
 * Banner ad component. Only renders on native (iOS/Android) with development build.
 * Returns null on web or when ads module unavailable (Expo Go).
 */
export function AdBanner({ style }: AdBannerProps) {
  const [AdModule, setAdModule] = useState<typeof import('react-native-google-mobile-ads') | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    import('react-native-google-mobile-ads')
      .then(setAdModule)
      .catch(() => {});
  }, []);

  if (!AdModule) return null;

  const { BannerAd, BannerAdSize, TestIds } = AdModule;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginVertical: 8,
  },
});
