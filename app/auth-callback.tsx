import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { deriveNamesFromUser } from '../utils/profileName';

/**
 * Handles the OAuth deep-link redirect on Android.
 *
 * On Android, Chrome Custom Tabs cannot intercept a custom-scheme URL and
 * return it to the caller — instead the OS routes it as a regular deep link.
 * Expo Router picks it up and navigates here with `code` in the params.
 *
 * On iOS the ASWebAuthenticationSession intercepts the redirect directly, so
 * this screen is never shown — oauth.ts handles the exchange inline.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (params.error || !params.code) {
      router.replace('/onboarding/login' as any);
      return;
    }

    (async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code!);

      if (error || !data.session?.user) {
        console.error('[AuthCallback] exchangeCodeForSession error:', error?.message);
        router.replace('/onboarding/login' as any);
        return;
      }

      const user = data.session.user;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileData?.role) {
        router.replace('/(tabs)');
      } else {
        const names = deriveNamesFromUser(user);
        router.replace({
          pathname: '/onboarding/role' as any,
          params: {
            firstName: names.firstName,
            lastName: names.lastName,
            email: user.email ?? '',
          },
        });
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2B3C86" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
