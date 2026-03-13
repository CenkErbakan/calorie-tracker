import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/context/UserContext';
import { MealsProvider } from '@/context/MealsContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { DietProvider } from '@/context/DietContext';
import { WaterProvider } from '@/context/WaterContext';
import { Colors } from '@/constants/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <SubscriptionProvider>
            <DietProvider>
            <WaterProvider>
            <MealsProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.background },
                }}
              >
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="paywall" />
                <Stack.Screen name="subscription" />
                <Stack.Screen name="diet" />
                <Stack.Screen name="meal/[id]" />
                <Stack.Screen name="add" options={{ presentation: 'modal' }} />
                <Stack.Screen name="barcode-scanner" />
                <Stack.Screen name="product-detail" />
                <Stack.Screen name="medicine-detail" />
              </Stack>
              <StatusBar style="light" />
            </MealsProvider>
            </WaterProvider>
            </DietProvider>
          </SubscriptionProvider>
        </UserProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
