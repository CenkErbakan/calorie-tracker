import { Stack } from 'expo-router';

export default function DietLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
