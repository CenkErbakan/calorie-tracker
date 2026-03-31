import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/context/UserContext';
import { initializeAds } from '@/lib/ads';
import { initializeRevenueCat } from '@/lib/revenuecat';
import { MealsProvider } from '@/context/MealsContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { DietProvider } from '@/context/DietContext';
import { WaterProvider } from '@/context/WaterContext';
import { StepsProvider } from '@/context/StepsContext';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    void initializeAds();
    void initializeRevenueCat();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <SubscriptionProvider>
            <DietProvider>
            <WaterProvider>
            <StepsProvider>
            <MealsProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.background },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="paywall/index" />
                <Stack.Screen name="subscription/index" />
                <Stack.Screen name="meal/[id]" />
                <Stack.Screen name="barcode-scanner" />
                <Stack.Screen name="product-detail" />
                <Stack.Screen name="medicine-detail" />
              </Stack>
              <StatusBar style="light" />
            </MealsProvider>
            </StepsProvider>
            </WaterProvider>
            </DietProvider>
          </SubscriptionProvider>
        </UserProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
