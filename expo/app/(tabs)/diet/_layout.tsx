import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function DietLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
