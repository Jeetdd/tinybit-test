import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, profile, isLoading } = useAuth();

  console.log('[DEBUG] Index screen state:', { user: user?.id, profileRole: profile?.role, isLoading });

  if (isLoading || (user && profile === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#5CB8B2" />
      </View>
    );
  }

  if (user) {
    if (profile?.role && profile?.firstName) {
      console.log('[DEBUG] Index redirecting to (tabs)');
      return <Redirect href="/(tabs)" />;
    }
    console.log('[DEBUG] Index redirecting to onboarding/role');
    return <Redirect href="/onboarding/role" />;
  }

  console.log('[DEBUG] Index redirecting to onboarding');
  return <Redirect href="/onboarding" />;
}
