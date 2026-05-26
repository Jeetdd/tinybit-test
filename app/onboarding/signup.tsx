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
import { signInWithGoogle } from '../../services/oauth';
import { deriveNamesFromUser } from '../../utils/profileName';
import { supabase } from '../../utils/supabase';
import CountryPickerModal from '../../components/CountryPickerModal';
import { DEFAULT_COUNTRY, type Country } from '../../constants/countries';

export default function SignupScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const [phone,         setPhone]         = useState('');
  const [agreed,        setAgreed]        = useState(false);
  const [country,       setCountry]       = useState<Country>(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);

  const digits = phone.trim().replace(/\D/g, '');
  const canContinue = digits.length >= 6 && agreed;

  const handleContinue = () => {
    if (!agreed) return;
    if (digits.length < 7 || digits.length > 15) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number (7–15 digits).');
      return;
    }
    const fullPhone = `${country.dial}${phone.trim()}`;
    console.log('[DEBUG] handleContinue. phone:', fullPhone);
    router.push({ pathname: '/onboarding/otp' as any, params: { phone: fullPhone } });
  };

  const handleGoogleSignIn = async () => {
    console.log('[DEBUG] handleGoogleSignIn starting');
    try {
      const sessionResult = await signInWithGoogle();
      console.log('[DEBUG] signInWithGoogle returned:', sessionResult ? 'session' : 'null');

      const authUser = sessionResult?.user ?? (await supabase.auth.getUser()).data.user;
      console.log('[Auth] authUser:', authUser ? authUser.email : 'null');
      if (!authUser) {
        console.log('[Auth] No user found, staying on signup');
        return;
      }

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();
      console.log('[Auth] profile role:', profileData?.role, '| error:', profileErr?.message);

      if (profileData?.role) {
        console.log('[Auth] Returning user → navigating to tabs');
        router.replace('/(tabs)');
        return;
      }

      console.log('[Auth] New user → navigating to role screen');
      const names = deriveNamesFromUser(authUser);
      router.replace({
        pathname: '/onboarding/role' as any,
        params: {
          firstName: names.firstName,
          lastName: names.lastName,
          email: authUser.email ?? '',
        },
      });
    } catch (err: any) {
      console.log('[Auth] Error:', err.message);
      if (err.message !== 'The user canceled the sign-in flow.') {
        Alert.alert('Google Sign-In Error', err.message);
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
          You will receive a message we send{'\n'}via Email, WhatsApp or SMS.
        </Text>
      </LinearGradient>

      {/* Card */}
      <View style={s.sheet}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.heading}>Let's begin your wellness journey</Text>
          <Text style={s.subheading}>Continue with your account</Text>

          {/* Social buttons */}
          <View style={s.socialRow}>
            <Pressable style={s.socialBtn} onPress={handleGoogleSignIn}>
              <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={s.socialLogo} />
            </Pressable>
            <Pressable style={s.socialBtn}>
              <Ionicons name="logo-facebook" size={26} color="#1877F2" />
            </Pressable>
            <Pressable style={s.socialBtn}>
              <Ionicons name="logo-apple" size={26} color="#000" />
            </Pressable>
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

          {/* Terms */}
          <Pressable style={s.termsRow} onPress={() => setAgreed(v => !v)}>
            <View style={[s.checkbox, agreed && s.checkboxChecked]}>
              {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={s.termsText}>
              By signing up, I agree to the{' '}
              <Text style={s.termsLink}>Terms of Service</Text> and{'\n'}
              <Text style={s.termsLink}>Privacy Policy</Text>
              {', '}including usage of Cookies
            </Text>
          </Pressable>

          {/* Continue button */}
          <Pressable onPress={handleContinue} disabled={!canContinue} style={{ marginTop: 28 }}>
            <LinearGradient
              colors={canContinue ? ['#2A6FAF', '#3EA8D8'] : ['#C2CDD8', '#C2CDD8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.continueBtn}
            >
              <Text style={s.continueBtnText}>Continue</Text>
            </LinearGradient>
          </Pressable>

          {/* Login link */}
          <Pressable style={s.loginRow} onPress={() => router.push('/onboarding/login' as any)}>
            <Text style={s.loginText}>
              Already have an account?{' '}
              <Text style={s.loginLink}>Log In</Text>
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

  heading:    { fontSize: 22, fontWeight: '900', color: '#1A3050', textAlign: 'center', marginBottom: 6 },
  subheading: { fontSize: 14, fontWeight: '500', color: '#8A94A6', textAlign: 'center', marginBottom: 28 },

  socialRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginBottom: 28 },
  socialBtn: {
    flex: 1, height: 56, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  socialLogo: { width: 26, height: 26, resizeMode: 'contain' },

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

  termsRow: { flexDirection: 'row', gap: 12, marginTop: 20, alignItems: 'flex-start' },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#B0BBC8',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#3EA8D8', borderColor: '#3EA8D8' },
  termsText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#6B7A8D', lineHeight: 20 },
  termsLink: { color: '#3EA8D8', fontWeight: '700' },

  continueBtn:     { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  loginRow:  { marginTop: 24, alignItems: 'center' },
  loginText: { fontSize: 15, fontWeight: '600', color: '#4A5568' },
  loginLink: { color: '#3EA8D8', fontWeight: '800' },
});
