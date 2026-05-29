import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { signInWithGoogle, signInWithApple } from '../../services/oauth';
import { deriveNamesFromUser } from '../../utils/profileName';
import CountryPickerModal from '../../components/CountryPickerModal';
import { DEFAULT_COUNTRY, type Country } from '../../constants/countries';

export default function LoginScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const [phone,         setPhone]         = useState('');
  const [country,       setCountry]       = useState<Country>(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading,       setLoading]       = useState(false);

  const canSend = phone.trim().length >= 6;

  const handleGenerateOtp = async () => {
    if (!canSend) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `${country.dial}${phone.trim()}`,
      });
      if (error) throw error;
      router.push({ pathname: '/onboarding/otp' as any, params: { phone: `${country.dial}${phone.trim()}` } });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateAfterSocialAuth = async (signInResult: { user: import('@supabase/supabase-js').User } | null) => {
    const session = (await supabase.auth.getSession()).data.session;
    const authUser = signInResult?.user ?? session?.user ?? null;
    if (!authUser) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profileData?.role) {
      router.replace('/(tabs)');
      return;
    }

    const names = deriveNamesFromUser(authUser);
    router.replace({
      pathname: '/onboarding/role' as any,
      params: { firstName: names.firstName, lastName: names.lastName, email: authUser.email ?? '' },
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      await navigateAfterSocialAuth(result);
    } catch (err: any) {
      if (err.message !== 'The user canceled the sign-in flow.') {
        Alert.alert('Google Sign-In Error', err.message);
      }
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const result = await signInWithApple();
      await navigateAfterSocialAuth(result);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Error', err.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Gradient header */}
      <LinearGradient
        colors={['#2A4B8C', '#3EA8D8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 24 }]}
      >
        <Text style={s.title}>Get Started Now</Text>
        <Text style={s.subtitle}>
          Create an account or log in to explore{'\n'}about our app
        </Text>
      </LinearGradient>

      {/* Card */}
      <View style={s.sheet}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.heading}>Welcome Back. Log in to Continue</Text>
          <Text style={s.subheading}>Continue with your account</Text>

          {/* Social buttons */}
          {/* Social buttons */}
          <View style={s.socialColumn}>
            <Pressable style={s.socialWideBtn} onPress={handleGoogleSignIn}>
              <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={s.socialLogo} />
              <Text style={s.socialWideBtnText}>Continue with Google</Text>
            </Pressable>
            {Platform.OS === 'ios' && (
              <Pressable style={s.socialWideBtn} onPress={handleAppleSignIn}>
                <Ionicons name="logo-apple" size={24} color="#000" />
                <Text style={s.socialWideBtnText}>Continue with Apple</Text>
              </Pressable>
            )}
          </View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Or</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Phone input */}
          <Text style={s.label}>Phone Number</Text>
          <View style={s.phoneRow}>
            <Pressable style={s.countryPicker} onPress={() => setPickerVisible(true)}>
              <Text style={s.flag}>{country.flag}</Text>
              <Text style={s.dialCode}>{country.dial}</Text>
              <Ionicons name="chevron-down" size={14} color="#8A94A6" />
            </Pressable>
            <View style={s.phoneDivider} />
            <TextInput
              style={s.phoneInput}
              placeholder="Enter phone number"
              placeholderTextColor="#B0BBC8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Generate OTP button */}
          <Pressable
            onPress={handleGenerateOtp}
            disabled={!canSend || loading}
            style={{ marginTop: 28 }}
          >
            <LinearGradient
              colors={canSend && !loading ? ['#2A6FAF', '#3EA8D8'] : ['#C2CDD8', '#C2CDD8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.otpBtn}
            >
              <Text style={s.otpBtnText}>{loading ? 'Sending...' : 'Generate OTP'}</Text>
            </LinearGradient>
          </Pressable>

          {/* Sign up link */}
          <Pressable style={s.signupRow} onPress={() => router.replace('/onboarding/signup' as any)}>
            <Text style={s.signupText}>
              Don't have an account?{' '}
              <Text style={s.signupLink}>Sign Up</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <CountryPickerModal
        visible={pickerVisible}
        onSelect={(c) => setCountry(c)}
        onClose={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F2F4F8' },
  header: { paddingHorizontal: 28, paddingBottom: 48, alignItems: 'center' },
  title:  { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },

  sheet: {
    flex: 1, backgroundColor: '#F2F4F8',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -28, overflow: 'hidden',
  },
  content: { paddingHorizontal: 24, paddingTop: 32 },

  heading:    { fontSize: 20, fontWeight: '900', color: '#1A3050', textAlign: 'center', marginBottom: 6 },
  subheading: { fontSize: 14, fontWeight: '500', color: '#8A94A6', textAlign: 'center', marginBottom: 28 },

  socialRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginBottom: 28 },
  socialBtn: {
    flex: 1, height: 56, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  socialLogo: { width: 26, height: 26, resizeMode: 'contain' },
  socialColumn: { gap: 12, marginBottom: 28 },
  socialWideBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, height: 56, borderRadius: 18, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  socialWideBtnText: { fontSize: 16, fontWeight: '700', color: '#1A3050' },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DDE3EC' },
  dividerText: { fontSize: 14, fontWeight: '600', color: '#9AA5B4' },

  label: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 10 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, paddingHorizontal: 14, height: 56,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  countryPicker: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 10 },
  flag:          { fontSize: 22 },
  dialCode:      { fontSize: 13, fontWeight: '700', color: '#1A3050' },
  phoneDivider:  { width: 1, height: 28, backgroundColor: '#DDE3EC', marginRight: 10 },
  phoneInput:    { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A3050' },

  otpBtn:     { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  otpBtnText: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  signupRow:  { marginTop: 24, alignItems: 'center' },
  signupText: { fontSize: 15, fontWeight: '600', color: '#4A5568' },
  signupLink: { color: '#3EA8D8', fontWeight: '800' },
});
