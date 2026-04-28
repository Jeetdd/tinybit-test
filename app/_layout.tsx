import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
// StatusBar is managed per-screen via expo-status-bar
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import AppSplashScreen from '../components/AppSplashScreen';


export const unstable_settings = {
  initialRouteName: 'onboarding',
};

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const { nightMode } = useLanguage();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Enable iOS recording globally
    setupAudio();

    if (isLoading) return;
    const inAuthGroup = segments[0] === '(tabs)';
    if (!user && inAuthGroup) {
      router.replace('/onboarding');
    }
  }, [user, isLoading, segments]);

  const setupAudio = async () => {
    try {
      const { Audio } = require('expo-audio');
      if (Audio && Audio.setAudioModeAsync) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
    } catch (e) {
      console.log('Global Audio Setup Error:', e);
    }
  };

  if (isLoading) {
    return <AppSplashScreen />;
  }

  const navTheme = nightMode
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#0D1117', card: '#161B22' } }
    : DefaultTheme;

  return (
    <ThemeProvider value={navTheme}>
      {/* StatusBar managed per-screen */}
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="memory-history" options={{ headerShown: false }} />
        <Stack.Screen name="mood-lift" options={{ headerShown: false }} />
        <Stack.Screen name="mood-library" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <RootLayoutNav />
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
