import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Pressable, StatusBar, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";

const C = {
  headerStart: '#304B76',
  headerEnd: '#4B99CA',
  white: '#FFFFFF',
  bg: '#F7F9FC',
  text: '#1A3050',
  muted: '#8A9BB0',
  blue: '#4AA5D9',
  border: '#E8EDF2',
};

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();

  // Optional params: when a Guardian navigates here to edit an Elder's profile
  const { targetUserId, targetName } = useLocalSearchParams<{ targetUserId?: string; targetName?: string }>();
  const isEditingElder = !!targetUserId && targetUserId !== user?.id;
  const editingId = isEditingElder ? targetUserId : user?.id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditingElder);

  const [name, setName] = useState(isEditingElder ? '' : (profile?.fullName || ""));
  const [mobile, setMobile] = useState(isEditingElder ? '' : (profile?.phone || ""));
  const [age, setAge] = useState(isEditingElder ? '' : (profile?.age?.toString() || ""));
  const [location, setLocation] = useState(isEditingElder ? '' : (profile?.location || ""));
  const [email, setEmail] = useState(isEditingElder ? '' : (profile?.email || ""));
  const [gender, setGender] = useState(isEditingElder ? '' : (profile?.biological_sex || ""));
  const [emergencyPhone, setEmergencyPhone] = useState(isEditingElder ? '' : (profile?.emergencyPhone || ""));
  const [emergencyName, setEmergencyName] = useState(isEditingElder ? '' : (profile?.emergencyName || ""));
  const [avatar, setAvatar] = useState(isEditingElder ? '' : (profile?.avatar_url || ""));

  // Fetch the elder's profile data when guardian opens this screen
  useEffect(() => {
    if (!isEditingElder || !targetUserId) return;
    supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.full_name || '');
        setMobile(data.mobile || '');
        setAge(data.age?.toString() || '');
        setLocation(data.location || '');
        setEmail(data.email || '');
        setGender(data.biological_sex || '');
        setEmergencyPhone(data.emergency_phone || '');
        setEmergencyName(data.emergency_name || '');
        setAvatar(data.profile_image || '');
      }
      setFetching(false);
    });
  }, [isEditingElder, targetUserId]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: name,
        mobile: mobile,
        age: parseInt(age) || null,
        location: location,
        email: email,
        biological_sex: gender,
        emergency_phone: emergencyPhone,
        emergency_name: emergencyName,
        profile_image: avatar,
      }).eq('id', editingId);

      if (error) throw error;

      // Only refresh local context when editing own profile
      if (!isEditingElder) await refreshProfile();

      Alert.alert("Success",
        isEditingElder
          ? `${targetName || 'Profile'} updated successfully!`
          : "Profile updated successfully!"
      );
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayName = isEditingElder
    ? (targetName ? `Edit ${targetName}'s Profile` : "Edit Elder's Profile")
    : "Edit Profile";

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.headerStart, C.headerEnd]} style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{displayName}</Text>
            {isEditingElder && (
              <Text style={s.headerSub}>Changes sync to elder's device in real time</Text>
            )}
          </View>
        </View>
      </LinearGradient>

      {fetching ? (
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            <View style={s.avatarSection}>
              <Pressable onPress={pickImage} style={s.avatarContainer}>
                <Image
                  source={{ uri: avatar || `https://api.dicebear.com/7.x/adventurer/png?seed=${name || 'User'}&backgroundColor=b6e3f4` }}
                  style={s.avatar}
                />
                <View style={s.editIcon}><Ionicons name="camera" size={16} color={C.white} /></View>
              </Pressable>
              <Text style={s.avatarHint}>Tap to change photo</Text>
            </View>

            <View style={s.form}>
              <Label>Full Name</Label>
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Enter full name" />

              <Label>Mobile Number</Label>
              <TextInput style={s.input} value={mobile} onChangeText={setMobile} placeholder="Enter mobile number" keyboardType="phone-pad" />

              <View style={s.row}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Label>Age</Label>
                  <TextInput style={s.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="number-pad" />
                </View>
                <View style={{ width: 16 }} />
                <View style={{ flex: 2, gap: 6 }}>
                  <Label>Gender</Label>
                  <View style={s.genderRow}>
                    {['male', 'female'].map(g => (
                      <Pressable key={g} onPress={() => setGender(g)} style={[s.genderBtn, gender === g && s.genderBtnActive]}>
                        <Text style={[s.genderText, gender === g && s.genderTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Label>Location</Label>
              <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="e.g. Vadodara, Gujarat" />

              <Label>Email Address</Label>
              <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" />

              <View style={s.divider} />
              <Text style={s.secTitle}>Emergency Contact</Text>

              <Label>Contact Name</Label>
              <TextInput style={s.input} value={emergencyName} onChangeText={setEmergencyName} placeholder="Name" />

              <Label>Contact Number</Label>
              <TextInput style={s.input} value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="Phone number" keyboardType="phone-pad" />

              <Pressable onPress={handleSave} disabled={loading} style={[s.saveBtn, loading && { opacity: 0.7 }]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 24, paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', elevation: 4, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editIcon: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg },
  avatarHint: { fontSize: 13, color: C.muted, marginTop: 10, fontWeight: '600' },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4, marginLeft: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border },
  row: { flexDirection: 'row' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  genderBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  genderText: { fontSize: 14, fontWeight: '700', color: C.text },
  genderTextActive: { color: '#fff' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  secTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4 },
  saveBtn: { backgroundColor: C.headerStart, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
