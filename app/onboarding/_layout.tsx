import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="index"          options={{ headerShown: false }} />
      <Stack.Screen name="signup"         options={{ headerShown: false }} />
      <Stack.Screen name="login"          options={{ headerShown: false }} />
      <Stack.Screen name="otp"            options={{ headerShown: false }} />
      <Stack.Screen name="name"           options={{ headerShown: false }} />
      <Stack.Screen name="about"          options={{ headerShown: false }} />
      <Stack.Screen name="step1"          options={{ headerShown: false }} />
      <Stack.Screen name="role"           options={{ headerShown: false }} />
      <Stack.Screen name="register"       options={{ headerShown: false }} />
      <Stack.Screen name="guardian-setup"  options={{ headerShown: false }} />
      <Stack.Screen name="guardian-about"  options={{ headerShown: false }} />
      <Stack.Screen name="add-parent"      options={{ headerShown: false }} />
      <Stack.Screen name="medical"         options={{ headerShown: false }} />
    </Stack>
  );
}
