import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Stack , useRouter, useSegments } from 'expo-router';
// StatusBar is managed per-screen via expo-status-bar
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { setupGlobalErrorHandlers } from '../utils/logger';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { useEffect } from 'react';
import AppSplashScreen from '../components/AppSplashScreen';
import { supabase } from '../utils/supabase';
import { deriveNamesFromUser } from '../utils/profileName';
import { registerPushToken } from '../services/pushNotifications';

// Install global error handlers as early as possible
setupGlobalErrorHandlers();


// Screens where the routing guard should NOT fire an automatic redirect.
// 'login' and 'signup' are intentionally excluded: authenticated users
// (e.g. after social OAuth) must be redirected away from those screens.
const PROFILE_SETUP_SCREENS = new Set([
  'role', 'name', 'about', 'guardian-about', 'add-parent', 'medical', 'otp', 'step1', 'register',
]);

async function setupAudio() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setAudioModeAsync } = require('expo-audio');
    if (setAudioModeAsync) {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    }
  } catch (e) {
    console.log('[RootLayout] Audio Setup Error:', e);
  }
}

async function setupNotifications() {
  if (Constants.executionEnvironment === 'storeClient') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require('react-native');
    if (Platform.OS !== 'android') return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    if (Notifications && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2B3C86',
        sound: 'default',
      });
    }
  } catch (e) {
    console.log('[RootLayout] Notifications Setup Error:', e);
  }
}

function RootLayoutNav() {
  const { user, isLoading, profile } = useAuth();
  const { nightMode } = useLanguage();
  const segments = useSegments();
  const router = useRouter();

  console.log('[DEBUG] RootLayoutNav state:', { 
    user: user?.id, 
    isLoading, 
    profileRole: profile?.role, 
    segments,
  });

  // Fallback OAuth deep-link handler.
  // - Implicit flow (access_token=): handled for both warm and cold-start.
  // - PKCE flow (code=): handled ONLY on cold-start (isInitialUrl=true).
  //   When the app is warm, oauth.ts owns code exchange via its Linking listener.
  //   When Android kills the app and restarts it from the OAuth redirect, oauth.ts
  //   is not running, so we must exchange the code here instead.
  useEffect(() => {
    let active = true;

    const handleAuthUrl = async (url: string, isInitialUrl = false) => {
      const hasAccessToken = url.includes('access_token=');
      const hasPKCECode    = url.includes('code=');
      if (!hasAccessToken && !hasPKCECode) return;
      try {
        let sessionUser = null;

        if (hasPKCECode && isInitialUrl) {
          const qs   = (url.split('?')[1] ?? '').split('#')[0];
          const code = new URLSearchParams(qs).get('code') ?? '';
          if (!code) return;
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data?.session?.user) return;
          sessionUser = data.session.user;
        } else if (hasAccessToken) {
          const separator   = url.includes('#') ? '#' : '?';
          const fragment    = url.split(separator)[1] ?? '';
          const p           = new URLSearchParams(fragment);
          const accessToken = p.get('access_token');
          const refreshToken = p.get('refresh_token') ?? '';
          if (!accessToken) return;
          const { data } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (!data.session?.user) return;
          sessionUser = data.session.user;
        } else {
          return; // PKCE code via warm Linking — oauth.ts handles it
        }

        if (!sessionUser || !active) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sessionUser.id)
          .single();

        if (!active) return;
        if (profileData?.role) {
          router.replace('/(tabs)');
        } else {
          const names = deriveNamesFromUser(sessionUser);
          router.replace({
            pathname: '/onboarding/role' as any,
            params: { firstName: names.firstName, lastName: names.lastName, email: sessionUser.email ?? '' },
          });
        }
      } catch (err) {
        console.log('[RootLayout] Deep Link Auth Error:', err);
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url, false));
    Linking.getInitialURL().then(url => { if (active && url) handleAuthUrl(url, true); });
    return () => { active = false; sub.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Run one-time setup
  useEffect(() => {
    setupAudio();
    setupNotifications();
  }, []);

  // Register push token once user is fully onboarded
  useEffect(() => {
    if (user?.id && profile?.role) {
      registerPushToken(user.id);
    }
  }, [user?.id, profile?.role]);

  // Handle OAuth and routing
  useEffect(() => {
    if (isLoading) return;

    const inTabs         = segments[0] === '(tabs)';
    const inOnboarding    = segments[0] === 'onboarding';
    const currentScreen  = segments[1] as string | undefined;

    if (!user) {
      if (inTabs) {
        setTimeout(() => router.replace('/onboarding/signup' as any), 0);
      } else if (inOnboarding && currentScreen !== 'signup' && currentScreen !== 'login' && currentScreen !== 'otp') {
        setTimeout(() => router.replace('/onboarding/signup' as any), 0);
      }
      return;
    }

    // Auth logic for logged-in users
    if (profile !== null) {
      if (!profile?.role) {
        const onSetupScreen = inOnboarding && PROFILE_SETUP_SCREENS.has(currentScreen ?? '');
        if (!onSetupScreen) {
          const names = deriveNamesFromUser(user);
          setTimeout(() => router.replace({
            pathname: '/onboarding/role' as any,
            params: {
              firstName: names.firstName,
              lastName: names.lastName,
              email: user.email ?? '',
            },
          }), 0);
        }
      } else if (inOnboarding && profile?.firstName) {
        const onSetupScreen = PROFILE_SETUP_SCREENS.has(currentScreen ?? '');
        if (!onSetupScreen) {
          setTimeout(() => router.replace('/(tabs)'), 0);
        }
      }
    }
  }, [user, isLoading, profile, segments]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="memory-history" options={{ headerShown: false }} />
        <Stack.Screen name="mood-lift" options={{ headerShown: false }} />
        <Stack.Screen name="streak" options={{ headerShown: false }} />
        <Stack.Screen name="mood-library" options={{ headerShown: false }} />
        {/* New feature screens */}
        <Stack.Screen name="weather" options={{ headerShown: false }} />
        <Stack.Screen name="calorie-calculator" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
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
