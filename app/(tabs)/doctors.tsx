import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking,
  Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { notifyElderOf, notifyGuardiansOf } from '../../services/notifications';
import { supabase } from '../../utils/supabase';

const C = { headerStart: '#304B76', headerEnd: '#4B99CA', white: '#FFFFFF', bg: '#F7F9FC', text: '#1A3050', muted: '#8A9BB0', blue: '#4AA5D9', border: '#E8EDF2' };

// Common country codes
const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India' },
  { code: '+1',  flag: '🇺🇸', label: 'USA'   },
  { code: '+44', flag: '🇬🇧', label: 'UK'    },
  { code: '+61', flag: '🇦🇺', label: 'AU'    },
  { code: '+971',flag: '🇦🇪', label: 'UAE'   },
  { code: '+65', flag: '🇸🇬', label: 'SG'    },
  { code: '+60', flag: '🇲🇾', label: 'MY'    },
  { code: '+880',flag: '🇧🇩', label: 'BD'    },
  { code: '+92', flag: '🇵🇰', label: 'PK'    },
  { code: '+94', flag: '🇱🇰', label: 'LK'    },
];

type Doctor = {
  id: string;
  name: string;
  phone: string | null;
  country_code: string;
  specialization: string | null;
  user_id: string;
};

type Category = { id: string; name: string; usage_count: number };

// Icon + colour per specialization keyword (falls back to stethoscope)
const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; desc: string }> = {
  'General Physician':    { icon: '🩺', color: '#0284C7', bg: '#E0F2FE', desc: 'Primary care, common illnesses' },
  'Cardiologist':         { icon: '❤️', color: '#DC2626', bg: '#FEE2E2', desc: 'Heart & blood vessels' },
  'Orthopedic':           { icon: '🦴', color: '#7C3AED', bg: '#EDE9FE', desc: 'Bones, joints & muscles' },
  'Neurologist':          { icon: '🧠', color: '#6D28D9', bg: '#EDE9FE', desc: 'Brain, nerves & spine' },
  'Diabetologist':        { icon: '💉', color: '#D97706', bg: '#FEF3C7', desc: 'Diabetes & blood sugar' },
  'Ophthalmologist':      { icon: '👁️', color: '#0891B2', bg: '#CFFAFE', desc: 'Eyes & vision' },
  'Dentist':              { icon: '🦷', color: '#059669', bg: '#D1FAE5', desc: 'Teeth & oral health' },
  'Physiotherapist':      { icon: '🏃', color: '#16A34A', bg: '#D1FAE5', desc: 'Rehabilitation & movement' },
  'Pulmonologist':        { icon: '🫁', color: '#2563EB', bg: '#DBEAFE', desc: 'Lungs & breathing' },
  'Gastroenterologist':   { icon: '🔬', color: '#9333EA', bg: '#F3E8FF', desc: 'Stomach & digestive system' },
  'Urologist':            { icon: '🧪', color: '#0369A1', bg: '#E0F2FE', desc: 'Kidney & urinary tract' },
  'Dermatologist':        { icon: '🌿', color: '#15803D', bg: '#D1FAE5', desc: 'Skin, hair & nails' },
  'Psychiatrist':         { icon: '💆', color: '#7E22CE', bg: '#F3E8FF', desc: 'Mental health & behaviour' },
  'ENT Specialist':       { icon: '👂', color: '#B45309', bg: '#FEF3C7', desc: 'Ear, nose & throat' },
  'Oncologist':           { icon: '🎗️', color: '#BE185D', bg: '#FCE7F3', desc: 'Cancer treatment' },
  'Rheumatologist':       { icon: '🦿', color: '#92400E', bg: '#FEF3C7', desc: 'Arthritis & autoimmune' },
  'Endocrinologist':      { icon: '⚗️', color: '#065F46', bg: '#D1FAE5', desc: 'Hormones & metabolism' },
  'Nephrologist':         { icon: '🫘', color: '#1D4ED8', bg: '#DBEAFE', desc: 'Kidneys & renal health' },
  'Geriatrician':         { icon: '👴', color: '#6B7280', bg: '#F1F5F9', desc: 'Elderly & age-related care' },
  'Hematologist':         { icon: '🩸', color: '#B91C1C', bg: '#FEE2E2', desc: 'Blood disorders' },
};

function getCategoryMeta(name: string) {
  const key = Object.keys(CATEGORY_META).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? CATEGORY_META[key] : { icon: '🏥', color: '#64748B', bg: '#F1F5F9', desc: 'Medical specialist' };
}

// ─── Country code picker modal ────────────────────────────────────────────────
function CountryCodeModal({
  visible, selected, onSelect, onClose,
}: { visible: boolean; selected: string; onSelect: (c: string) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cm.backdrop} onPress={onClose} />
      <View style={cm.sheet}>
        <Text style={cm.title}>Select Country Code</Text>
        {COUNTRY_CODES.map(c => (
          <Pressable
            key={c.code}
            style={[cm.row, selected === c.code && cm.rowActive]}
            onPress={() => { onSelect(c.code); onClose(); }}
          >
            <Text style={cm.flag}>{c.flag}</Text>
            <Text style={cm.label}>{c.label}</Text>
            <Text style={cm.code}>{c.code}</Text>
            {selected === c.code && <Ionicons name="checkmark" size={18} color={G.accent} />}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

// ─── Specialization autocomplete input ───────────────────────────────────────
function SpecializationInput({
  value, onChange, categories,
}: { value: string; onChange: (v: string) => void; categories: Category[] }) {
  const [focused, setFocused] = useState(false);

  // When empty + focused: show top 8 by usage. When typing: filter by text.
  const suggestions: Category[] = focused
    ? value.trim().length === 0
      ? [...categories].sort((a, b) => b.usage_count - a.usage_count).slice(0, 8)
      : categories.filter(c => c.name.toLowerCase().includes(value.toLowerCase().trim())).slice(0, 8)
    : [];

  // True when user typed something that doesn't exactly match any existing category
  const isNewCategory =
    value.trim().length > 0 &&
    !categories.some(c => c.name.toLowerCase() === value.trim().toLowerCase());

  const showDropdown = focused && (suggestions.length > 0 || isNewCategory);

  return (
    <View style={{ zIndex: 10 }}>
      <View style={sp.inputWrap}>
        <TextInput
          style={sp.input}
          value={value}
          onChangeText={onChange}
          placeholder="e.g. Cardiologist"
          placeholderTextColor="#B0BEC5"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        {value.length > 0 ? (
          <Pressable onPress={() => onChange('')} style={sp.clearBtn} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#B0BEC5" />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={16} color="#B0BEC5" style={sp.chevron} />
        )}
      </View>

      {showDropdown && (
        <View style={sp.dropdown}>
          {/* Section header */}
          <View style={sp.dropHeader}>
            <Ionicons name={value.trim().length === 0 ? 'star-outline' : 'search-outline'} size={12} color={G.muted} />
            <Text style={sp.dropHeaderText}>
              {value.trim().length === 0 ? 'Popular specializations' : 'Matching specializations'}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map((s, idx) => {
              const meta = getCategoryMeta(s.name);
              return (
                <Pressable
                  key={s.id}
                  style={[sp.suggRow, idx !== 0 && sp.suggBorder]}
                  onPress={() => { onChange(s.name); setFocused(false); }}
                >
                  <View style={[sp.suggIcon, { backgroundColor: meta.bg }]}>
                    <Text style={sp.suggEmoji}>{meta.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sp.suggName}>{s.name}</Text>
                    <Text style={sp.suggDesc}>{meta.desc}</Text>
                  </View>
                  <View style={sp.usageChip}>
                    <Text style={sp.usageText}>{s.usage_count} added</Text>
                  </View>
                </Pressable>
              );
            })}

            {/* "Add new category" row */}
            {isNewCategory && (
              <Pressable
                style={[sp.suggRow, suggestions.length > 0 && sp.suggBorder, sp.newRow]}
                onPress={() => setFocused(false)}
              >
                <View style={[sp.suggIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="add-circle-outline" size={20} color={G.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sp.suggName, { color: G.accent }]}>Add "{value.trim()}"</Text>
                  <Text style={sp.suggDesc}>Save as a new category for everyone</Text>
                </View>
                <View style={[sp.usageChip, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={[sp.usageText, { color: G.accent }]}>New</Text>
                </View>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Add / Edit Doctor Modal ──────────────────────────────────────────────────
function DoctorFormModal({
  visible, onClose, onSaved, targetUserId, categories,
  editDoctor,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  targetUserId: string;
  categories: Category[];
  editDoctor: Doctor | null;
}) {
  const { user } = useAuth();
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [code,    setCode]    = useState('+91');
  const [spec,    setSpec]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [showCCP, setShowCCP] = useState(false);

  useEffect(() => {
    if (editDoctor) {
      setName(editDoctor.name);
      setPhone(editDoctor.phone || '');
      setCode(editDoctor.country_code || '+91');
      setSpec(editDoctor.specialization || '');
    } else {
      setName(''); setPhone(''); setCode('+91'); setSpec('');
    }
  }, [editDoctor, visible]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Doctor name is required.'); return; }
    setSaving(true);
    try {
      if (editDoctor) {
        const { error } = await supabase
          .from('user_doctors')
          .update({ name: name.trim(), phone: phone.trim() || null, country_code: code, specialization: spec.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', editDoctor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_doctors').insert({
          user_id: targetUserId,
          name: name.trim(),
          phone: phone.trim() || null,
          country_code: code,
          specialization: spec.trim() || null,
        });
        if (error) throw error;

        // Upsert category if it's new
        if (spec.trim()) {
          const existing = categories.find(c => c.name.toLowerCase() === spec.trim().toLowerCase());
          if (!existing) {
            await supabase.from('doctor_categories').insert({ name: spec.trim(), created_by: user?.id });
          } else {
            await supabase.from('doctor_categories').update({ usage_count: existing.usage_count + 1 }).eq('id', existing.id);
          }
        }
      }
      // ── Notifications ──────────────────────────────────────────────
      const isForElder = targetUserId !== user?.id;
      const docLabel   = name.trim();
      if (editDoctor) {
        if (isForElder) {
          notifyElderOf(targetUserId, user!.id, 'doctor_updated', '🩺 Doctor Updated', `Dr. ${docLabel} was updated by your guardian`);
        } else {
          notifyGuardiansOf(user!.id, user!.id, 'doctor_updated', '🩺 Doctor Updated', `Dr. ${docLabel} was updated in their records`);
        }
      } else {
        if (isForElder) {
          notifyElderOf(targetUserId, user!.id, 'doctor_added', '🩺 Doctor Added', `Dr. ${docLabel} was added to your doctors by your guardian`);
        } else {
          notifyGuardiansOf(user!.id, user!.id, 'doctor_added', '🩺 Doctor Added', `Dr. ${docLabel} was added to their doctors`);
        }
      }

      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save doctor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fm.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View style={fm.sheet}>
            <View style={fm.handle} />
            <Text style={fm.title}>{editDoctor ? 'Edit Doctor' : 'Add Doctor'}</Text>

            <Text style={fm.label}>Doctor Name *</Text>
            <TextInput style={fm.input} value={name} onChangeText={setName} placeholder="Dr. Ramesh Patel" placeholderTextColor="#B0BEC5" />

            <Text style={fm.label}>Mobile Number</Text>
            <View style={fm.phoneRow}>
              <Pressable style={fm.codeBtn} onPress={() => setShowCCP(true)}>
                <Text style={fm.codeBtnText}>{code}</Text>
                <Ionicons name="chevron-down" size={14} color={G.muted} />
              </Pressable>
              <TextInput
                style={fm.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="98765 43210"
                placeholderTextColor="#B0BEC5"
                keyboardType="phone-pad"
              />
            </View>

            <Text style={fm.label}>Specialization / Category</Text>
            <SpecializationInput value={spec} onChange={setSpec} categories={categories} />

            <View style={fm.actions}>
              <Pressable style={fm.cancelBtn} onPress={onClose}>
                <Text style={fm.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[fm.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={fm.saveText}>{editDoctor ? 'Update' : 'Add Doctor'}</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      <CountryCodeModal visible={showCCP} selected={code} onSelect={setCode} onClose={() => setShowCCP(false)} />
    </Modal>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
function DoctorCard({ doc, onEdit, onDelete }: { doc: Doctor; onEdit: () => void; onDelete: () => void }) {
  const fullPhone = doc.phone ? `${doc.country_code}${doc.phone}` : null;
  const initial = doc.name[0]?.toUpperCase() ?? 'D';
  return (
    <View style={[dc.card, CARD_SHADOW]}>
      <View style={dc.avatar}>
        <Text style={dc.avatarText}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={dc.name}>{doc.name}</Text>
        {doc.specialization ? <Text style={dc.spec}>{doc.specialization}</Text> : null}
        {fullPhone ? (
          <Pressable onPress={() => Linking.openURL(`tel:${fullPhone}`)} style={dc.phoneRow}>
            <Ionicons name="call-outline" size={13} color={G.accent} />
            <Text style={dc.phone}>{fullPhone}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={dc.actions}>
        <Pressable onPress={onEdit} hitSlop={8} style={dc.actionBtn}>
          <Ionicons name="create-outline" size={18} color={G.accent} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={dc.actionBtn}>
          <Ionicons name="trash-outline" size={18} color={G.danger} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Linked Elder Picker (guardian only) ─────────────────────────────────────
type ElderLink = { elder_id: string; parent_name: string };

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DoctorsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const isGuardian = profile?.role === 'guardian';

  // Optional param: guardian navigated here for a specific elder
  const { elderUserId, elderName } = useLocalSearchParams<{ elderUserId?: string; elderName?: string }>();

  const [doctors,    setDoctors]    = useState<Doctor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [elders,     setElders]     = useState<ElderLink[]>([]);
  const [targetId,   setTargetId]   = useState<string>(elderUserId || user?.id || '');
  const [targetLabel,setTargetLabel]= useState<string>(elderName || (isGuardian ? 'My Account' : ''));
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editDoc,    setEditDoc]    = useState<Doctor | null>(null);

  // Keep targetId in sync with user id once auth loads
  useEffect(() => {
    if (!targetId && user?.id) setTargetId(user.id);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('doctor_categories')
      .select('id, name, usage_count')
      .order('usage_count', { ascending: false });
    setCategories((data ?? []) as Category[]);
  }, []);

  const loadElders = useCallback(async () => {
    if (!user || !isGuardian) return;
    const { data } = await supabase
      .from('guardian_elder_links')
      .select('elder_id, parent_name')
      .eq('guardian_id', user.id)
      .eq('status', 'connected');
    setElders((data ?? []) as ElderLink[]);
  }, [user, isGuardian]);

  const loadDoctors = useCallback(async (uid: string) => {
    if (!uid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_doctors')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDoctors((data ?? []) as Doctor[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadCategories();
    loadElders();
    if (targetId) loadDoctors(targetId);
  }, [loadCategories, loadElders, loadDoctors, targetId]));

  // Real-time: doctor list for the active user/elder
  useEffect(() => {
    if (!targetId) return;
    const channel = supabase
      .channel(`doctors-${targetId}`)
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table: 'user_doctors', filter: `user_id=eq.${targetId}`,
      }, () => loadDoctors(targetId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [targetId, loadDoctors]);

  // Real-time: category suggestions — any user adding a new category updates everyone's list
  useEffect(() => {
    const channel = supabase
      .channel('doctor-categories-global')
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table: 'doctor_categories',
      }, () => loadCategories())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadCategories]);

  const deleteDoctor = (id: string, name: string) => {
    Alert.alert('Remove Doctor', `Remove Dr. ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await supabase.from('user_doctors').delete().eq('id', id);
          // Notify the affected party
          const isForElder = targetId !== user?.id;
          if (isForElder && user?.id) {
            notifyElderOf(targetId, user.id, 'doctor_deleted', '🩺 Doctor Removed', `Dr. ${name} was removed from your doctors by your guardian`);
          } else if (user?.id) {
            notifyGuardiansOf(user.id, user.id, 'doctor_deleted', '🩺 Doctor Removed', `Dr. ${name} was removed from their doctors`);
          }
          loadDoctors(targetId);
        },
      },
    ]);
  };

  const switchElder = (id: string, name: string) => {
    setTargetId(id);
    setTargetLabel(name);
    loadDoctors(id);
  };

  // ── Guardian elder selector pill row ──
  const renderElderPills = () => {
    if (!isGuardian || elders.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll} contentContainerStyle={s.pillRow}>
        {user && (
          <Pressable
            style={[s.pill, targetId === user.id && s.pillActive]}
            onPress={() => switchElder(user.id, 'My Account')}
          >
            <Text style={[s.pillText, targetId === user.id && s.pillTextActive]}>My Account</Text>
          </Pressable>
        )}
        {elders.map(e => (
          <Pressable
            key={e.elder_id}
            style={[s.pill, targetId === e.elder_id && s.pillActive]}
            onPress={() => switchElder(e.elder_id, e.parent_name)}
          >
            <Text style={[s.pillText, targetId === e.elder_id && s.pillTextActive]}>{e.parent_name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {isGuardian ? (
        <GuardianHeader title={targetLabel ? `${targetLabel}'s Doctors` : 'Doctors'} />
      ) : (
        <LinearGradient colors={[C.headerStart, C.headerEnd]} style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>My Doctors</Text>
              <Text style={s.headerSub}>Manage your healthcare providers</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {renderElderPills()}

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={G.accent} />
          </View>
        ) : doctors.length === 0 ? (
          <View style={s.center}>
            <View style={s.emptyIcon}>
              <Ionicons name="medkit-outline" size={36} color="#B0BEC5" />
            </View>
            <Text style={s.emptyTitle}>No Doctors Added Yet</Text>
            <Text style={s.emptySub}>
              {targetId !== user?.id
                ? `Add a doctor for ${targetLabel}`
                : 'Add your doctors to keep their contacts handy'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={doctors}
            keyExtractor={d => d.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => (
              <DoctorCard
                doc={item}
                onEdit={() => { setEditDoc(item); setShowForm(true); }}
                onDelete={() => deleteDoctor(item.id, item.name)}
              />
            )}
          />
        )}
      </View>

      {/* FAB — Add Doctor */}
      <Pressable
        style={[s.fab, CARD_SHADOW]}
        onPress={() => { setEditDoc(null); setShowForm(true); }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <DoctorFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => loadDoctors(targetId)}
        targetUserId={targetId}
        categories={categories}
        editDoctor={editDoc}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  header:     { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub:  { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  pillScroll: { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF2F7' },
  pillRow:    { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent' },
  pillActive: { backgroundColor: '#EEF2FF', borderColor: G.accent },
  pillText:   { fontSize: 13, fontWeight: '700', color: G.muted },
  pillTextActive: { color: G.accent, fontWeight: '900' },
  list:       { padding: 16, paddingBottom: 100, gap: 12 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: G.text },
  emptySub:   { fontSize: 13, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: G.primary, alignItems: 'center', justifyContent: 'center',
  },
});

// Doctor card
const dc = StyleSheet.create({
  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D8F0FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#0284C7' },
  name:       { fontSize: 16, fontWeight: '900', color: G.text },
  spec:       { fontSize: 12, fontWeight: '700', color: G.accent, marginTop: 2 },
  phoneRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  phone:      { fontSize: 13, fontWeight: '700', color: G.accent },
  actions:    { flexDirection: 'row', gap: 6 },
  actionBtn:  { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
});

// Doctor form modal
const fm = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 10 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDE3ED', alignSelf: 'center', marginBottom: 8 },
  title:      { fontSize: 20, fontWeight: '900', color: G.text, marginBottom: 4 },
  label:      { fontSize: 13, fontWeight: '800', color: G.text },
  input:      { borderWidth: 1.5, borderColor: G.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: G.text, backgroundColor: '#FAFBFF' },
  phoneRow:   { flexDirection: 'row', gap: 10 },
  codeBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: G.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FAFBFF' },
  codeBtnText:{ fontSize: 15, fontWeight: '700', color: G.text },
  phoneInput: { flex: 1, borderWidth: 1.5, borderColor: G.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: G.text, backgroundColor: '#FAFBFF' },
  actions:    { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelBtn:  { flex: 1, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: G.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '800', color: G.muted },
  saveBtn:    { flex: 2, height: 52, borderRadius: 26, backgroundColor: G.primary, alignItems: 'center', justifyContent: 'center' },
  saveText:   { fontSize: 15, fontWeight: '900', color: '#fff' },
});

// Specialization dropdown
const sp = StyleSheet.create({
  inputWrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: G.border, borderRadius: 14, backgroundColor: '#FAFBFF' },
  input:        { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: G.text },
  clearBtn:     { paddingRight: 12 },
  chevron:      { paddingRight: 12 },
  dropdown:     { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: G.border, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, marginTop: 4 },
  dropHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#EEF2F7' },
  dropHeaderText:{ fontSize: 11, fontWeight: '800', color: G.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  suggBorder:   { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  newRow:       { backgroundColor: '#FAFEFF' },
  suggIcon:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  suggEmoji:    { fontSize: 18 },
  suggName:     { fontSize: 14, fontWeight: '800', color: G.text },
  suggDesc:     { fontSize: 12, fontWeight: '600', color: G.muted, marginTop: 2 },
  usageChip:    { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  usageText:    { fontSize: 11, fontWeight: '800', color: G.muted },
});

// Country code modal
const cm = StyleSheet.create({
  backdrop:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 4 },
  title:     { fontSize: 18, fontWeight: '900', color: G.text, marginBottom: 8 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2F7' },
  rowActive: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 8 },
  flag:      { fontSize: 24 },
  label:     { flex: 1, fontSize: 15, fontWeight: '700', color: G.text },
  code:      { fontSize: 15, fontWeight: '800', color: G.accent },
});
