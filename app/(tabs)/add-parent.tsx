import { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const RELATIONS = ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Other'];
const GENDERS   = ['Male', 'Female', 'Other'];

type Flow = null | 'registered' | 'unregistered';

type Link = {
  id: string;
  parent_name: string;
  relation: string;
  elder_email: string;
  status: 'pending' | 'connected' | 'declined';
};

type SuccessState = {
  type: 'linked' | 'created';
  name: string;
};

// ─── Small helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || 'A').charCodeAt(0) % AVATAR_COLORS.length];

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={[
      { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name), alignItems: 'center', justifyContent: 'center' },
    ]}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '900', color: '#fff' }}>
        {(name || '?')[0].toUpperCase()}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: Link['status'] }) {
  const map = {
    connected: { bg: '#DCFCE7', fg: '#15803D', label: 'Connected ✓' },
    pending:   { bg: '#FEF9C3', fg: '#92400E', label: 'Pending'       },
    declined:  { bg: '#FEE2E2', fg: '#DC2626', label: 'Declined'      },
  };
  const { bg, fg, label } = map[status];
  return (
    <View style={[s.statusBadge, { backgroundColor: bg }]}>
      <Text style={[s.statusBadgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function ChipRow({
  options, value, onSelect,
}: { options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={s.chipRow}>
      {options.map(o => (
        <Pressable
          key={o}
          style={[s.chip, value === o && s.chipActive]}
          onPress={() => onSelect(o)}
        >
          <Text style={[s.chipText, value === o && s.chipTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor="#B0BEC5"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddParentScreen() {
  const { user }  = useAuth();
  const insets    = useSafeAreaInsets();

  const [links,   setLinks]   = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [flow,    setFlow]    = useState<Flow>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Registered flow state
  const [regForm, setRegForm] = useState({
    parentName: '',
    relation:   'Father',
    elderEmail: '',
  });
  const [sending, setSending] = useState(false);

  // Unregistered flow state
  const [unregForm, setUnregForm] = useState({
    elderName:    '',
    age:          '',
    gender:       'Male',
    phone:        '',
    relation:     'Father',
    medicalNotes: '',
  });
  const [creating, setCreating] = useState(false);

  const loadLinks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('guardian_elder_links')
        .select('id, parent_name, relation, elder_email, status')
        .eq('guardian_id', user.id)
        .order('created_at', { ascending: false });
      setLinks((data ?? []) as Link[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { loadLinks(); }, [loadLinks]));

  // Real-time: update list when any link changes (status accepted/declined, new invite sent)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`guardian-links-${user.id}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'guardian_elder_links',
        filter: `guardian_id=eq.${user.id}`,
      }, () => loadLinks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadLinks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send invitation (registered flow) ────────────────────────────────────
  const sendInvitation = async () => {
    if (!regForm.parentName.trim())
      return Alert.alert('Missing', 'Please enter the parent / elder\'s name.');
    if (!regForm.elderEmail.trim() || !regForm.elderEmail.includes('@'))
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    if (!user) return;

    setSending(true);
    try {
      const email = regForm.elderEmail.trim().toLowerCase();

      // Try to find if the elder already has a TinyBit account
      const { data: elderProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      const { error } = await supabase.from('guardian_elder_links').insert({
        guardian_id: user.id,
        parent_name: regForm.parentName.trim(),
        relation:    regForm.relation,
        elder_email: email,
        elder_id:    elderProfile?.id ?? null,
        status:      'pending',
      });
      if (error) throw error;
      setSuccess({ type: 'linked', name: regForm.parentName.trim() });
      setRegForm({ parentName: '', relation: 'Father', elderEmail: '' });
      setFlow(null);
      loadLinks();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send invitation.');
    } finally {
      setSending(false);
    }
  };

  // ── Create elder manually (unregistered flow) ─────────────────────────────
  const createElder = async () => {
    if (!unregForm.elderName.trim())
      return Alert.alert('Missing', 'Please enter the elder\'s name.');
    if (!user) return;

    setCreating(true);
    try {
      const contact = unregForm.phone.trim()
        ? `phone:${unregForm.phone.trim()}`
        : `manual:${Date.now()}`;

      const { error } = await supabase.from('guardian_elder_links').insert({
        guardian_id: user.id,
        parent_name: unregForm.elderName.trim(),
        relation:    unregForm.relation,
        elder_email: contact,
        status:      'pending',
      });
      if (error) throw error;
      setSuccess({ type: 'created', name: unregForm.elderName.trim() });
      setUnregForm({ elderName: '', age: '', gender: 'Male', phone: '', relation: 'Father', medicalNotes: '' });
      setFlow(null);
      loadLinks();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not create elder profile.');
    } finally {
      setCreating(false);
    }
  };

  const removeLink = async (id: string) => {
    Alert.alert('Remove', 'Remove this parent connection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await supabase.from('guardian_elder_links').delete().eq('id', id);
          loadLinks();
        },
      },
    ]);
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={[G.headerStart, G.headerEnd]}
          style={[s.successHeader, { paddingTop: insets.top + 16 }]}
        >
          <View style={s.successIcon}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
        </LinearGradient>
        <View style={s.successBody}>
          <Text style={s.successTitle}>
            {success.type === 'linked'
              ? 'Invitation Sent! 🎉'
              : 'Elder Added! 🎉'}
          </Text>
          <Text style={s.successName}>{success.name}</Text>
          <Text style={s.successDesc}>
            {success.type === 'linked'
              ? `${success.name} will receive a connection request in their TinyBit app. Once they accept, you'll be able to monitor their health and wellbeing.`
              : `${success.name}'s profile has been created. When they register on TinyBit, you can link their account for real-time updates.`}
          </Text>
          <View style={s.successActions}>
            <Pressable
              style={s.successPrimaryBtn}
              onPress={() => setSuccess(null)}
            >
              <Ionicons name="people" size={18} color="#fff" />
              <Text style={s.successPrimaryBtnText}>View My Parents</Text>
            </Pressable>
            <Pressable
              style={s.successSecondaryBtn}
              onPress={() => {
                setSuccess(null);
                setFlow(null);
              }}
            >
              <Text style={s.successSecondaryBtnText}>Add Another</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Registered flow ────────────────────────────────────────────────────────
  if (flow === 'registered') {
    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={[G.headerStart, G.headerEnd]}
          style={[s.flowHeader, { paddingTop: insets.top + 14 }]}
        >
          <Pressable onPress={() => setFlow(null)} style={s.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.flowHeaderTitle}>Already on TinyBit</Text>
            <Text style={s.flowHeaderSub}>Search and send a connection request</Text>
          </View>
        </LinearGradient>

        <View style={s.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.flowContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[s.infoCard, CARD_SHADOW]}>
              <View style={s.infoIconWrap}>
                <Ionicons name="information-circle" size={20} color={G.accent} />
              </View>
              <Text style={s.infoText}>
                Enter your parent's TinyBit email address. They'll receive a connection request that they can accept in their app.
              </Text>
            </View>

            <View style={[s.formCard, CARD_SHADOW]}>
              <Field
                label="Parent / Elder Name *"
                value={regForm.parentName}
                onChangeText={v => setRegForm(f => ({ ...f, parentName: v }))}
                placeholder="e.g. Ramesh Patel"
              />

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Relationship *</Text>
                <ChipRow
                  options={RELATIONS}
                  value={regForm.relation}
                  onSelect={v => setRegForm(f => ({ ...f, relation: v }))}
                />
              </View>

              <Field
                label="Their TinyBit Email *"
                value={regForm.elderEmail}
                onChangeText={v => setRegForm(f => ({ ...f, elderEmail: v }))}
                placeholder="parent@email.com"
                keyboardType="email-address"
              />

              <Pressable
                style={[s.primaryBtn, sending && s.primaryBtnDisabled]}
                onPress={sendInvitation}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={s.primaryBtnText}>Send Connection Request</Text>
                    </>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Unregistered flow ──────────────────────────────────────────────────────
  if (flow === 'unregistered') {
    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={[G.headerStart, G.headerEnd]}
          style={[s.flowHeader, { paddingTop: insets.top + 14 }]}
        >
          <Pressable onPress={() => setFlow(null)} style={s.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.flowHeaderTitle}>Create Elder Profile</Text>
            <Text style={s.flowHeaderSub}>Add your parent's basic information</Text>
          </View>
        </LinearGradient>

        <View style={s.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.flowContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[s.infoCard, CARD_SHADOW]}>
              <View style={s.infoIconWrap}>
                <Ionicons name="information-circle" size={20} color="#10B981" />
              </View>
              <Text style={s.infoText}>
                Create a profile for your parent. When they sign up on TinyBit later, you can link their account to start real-time monitoring.
              </Text>
            </View>

            <View style={[s.formCard, CARD_SHADOW]}>
              <Field
                label="Elder Name *"
                value={unregForm.elderName}
                onChangeText={v => setUnregForm(f => ({ ...f, elderName: v }))}
                placeholder="e.g. Ramesh Patel"
              />

              <View style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Age"
                    value={unregForm.age}
                    onChangeText={v => setUnregForm(f => ({ ...f, age: v }))}
                    placeholder="e.g. 68"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>Gender</Text>
                    <ChipRow
                      options={GENDERS}
                      value={unregForm.gender}
                      onSelect={v => setUnregForm(f => ({ ...f, gender: v }))}
                    />
                  </View>
                </View>
              </View>

              <Field
                label="Phone Number"
                value={unregForm.phone}
                onChangeText={v => setUnregForm(f => ({ ...f, phone: v }))}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Relationship *</Text>
                <ChipRow
                  options={RELATIONS}
                  value={unregForm.relation}
                  onSelect={v => setUnregForm(f => ({ ...f, relation: v }))}
                />
              </View>

              <Field
                label="Medical Notes (optional)"
                value={unregForm.medicalNotes}
                onChangeText={v => setUnregForm(f => ({ ...f, medicalNotes: v }))}
                placeholder="e.g. Diabetic, takes blood pressure medication..."
                multiline
              />

              <Pressable
                style={[s.primaryBtn, { backgroundColor: '#10B981' }, creating && s.primaryBtnDisabled]}
                onPress={createElder}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="person-add" size={18} color="#fff" />
                      <Text style={s.primaryBtnText}>Add Elder</Text>
                    </>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Default: Choice screen ─────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[G.headerStart, G.headerEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 14 }]}
      >
        <Text style={s.headerTitle}>Add Parent / Elder</Text>
        <Text style={s.headerSub}>
          Connect with your parent to monitor their health and wellbeing
        </Text>

        {/* Question card */}
        <View style={s.questionCard}>
          <Text style={s.questionText}>
            Is your parent already registered on TinyBit?
          </Text>
          <View style={s.choiceRow}>
            <Pressable
              style={[s.choiceBtn, s.choiceBtnYes]}
              onPress={() => setFlow('registered')}
            >
              <View style={s.choiceIcon}>
                <Ionicons name="phone-portrait-outline" size={26} color="#2563EB" />
              </View>
              <Text style={s.choiceBtnTitle}>Yes</Text>
              <Text style={s.choiceBtnSub}>Search & Connect</Text>
              <Ionicons name="chevron-forward" size={16} color="#2563EB" />
            </Pressable>
            <Pressable
              style={[s.choiceBtn, s.choiceBtnNo]}
              onPress={() => setFlow('unregistered')}
            >
              <View style={[s.choiceIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="person-add-outline" size={26} color="#15803D" />
              </View>
              <Text style={s.choiceBtnTitle}>No</Text>
              <Text style={s.choiceBtnSub}>Create Profile</Text>
              <Ionicons name="chevron-forward" size={16} color="#15803D" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Connected parents list */}
      <View style={s.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          <Text style={s.listTitle}>
            Connected Parents ({links.filter(l => l.status === 'connected').length})
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={G.accent} />
          ) : links.length === 0 ? (
            <View style={[s.emptyCard, CARD_SHADOW]}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="people-outline" size={34} color={G.muted} />
              </View>
              <Text style={s.emptyTitle}>No Parents Added Yet</Text>
              <Text style={s.emptySub}>
                Use the options above to connect with your parent or create their profile.
              </Text>
            </View>
          ) : (
            <View style={s.linksList}>
              {links.map(link => (
                <View key={link.id} style={[s.linkCard, CARD_SHADOW]}>
                  <Avatar name={link.parent_name} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.linkName}>{link.parent_name}</Text>
                    <Text style={s.linkRelEmail} numberOfLines={1}>
                      {link.relation} · {link.elder_email.startsWith('phone:')
                        ? link.elder_email.replace('phone:', '')
                        : link.elder_email.startsWith('manual:')
                          ? 'Not registered yet'
                          : link.elder_email}
                    </Text>
                    <StatusBadge status={link.status} />
                  </View>
                  <Pressable
                    onPress={() => removeLink(link.id)}
                    hitSlop={10}
                    style={s.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={G.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },

  // ── Header ────────────────────────────────────────────────────────────────
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSub:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 20 },

  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  questionText: {
    fontSize: 16, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 16,
  },
  choiceRow: { flexDirection: 'row', gap: 12 },
  choiceBtn: {
    flex: 1, borderRadius: 18, padding: 16,
    alignItems: 'center', gap: 6,
    backgroundColor: '#fff',
  },
  choiceBtnYes: { borderWidth: 2, borderColor: '#BFDBFE' },
  choiceBtnNo:  { borderWidth: 2, borderColor: '#BBF7D0' },
  choiceIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  choiceBtnTitle: { fontSize: 20, fontWeight: '900', color: G.text },
  choiceBtnSub:   { fontSize: 12, fontWeight: '700', color: G.muted },

  // ── Sheet ─────────────────────────────────────────────────────────────────
  sheet: {
    flex: 1, marginTop: -20,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: G.bg, overflow: 'hidden',
  },
  content: { padding: 16, paddingBottom: 120 },

  listTitle: { fontSize: 20, fontWeight: '900', color: G.text, marginBottom: 14 },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 28,
    alignItems: 'center', gap: 10,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: G.text, textAlign: 'center' },
  emptySub:   { fontSize: 13, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 20 },

  // ── Links list ────────────────────────────────────────────────────────────
  linksList: { gap: 12 },
  linkCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  linkName:     { fontSize: 16, fontWeight: '900', color: G.text },
  linkRelEmail: { fontSize: 12, fontWeight: '600', color: G.muted, marginTop: 2, marginBottom: 6 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: '900' },
  removeBtn: { padding: 6 },

  // ── Flow header ───────────────────────────────────────────────────────────
  flowHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 54,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  flowHeaderTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  flowHeaderSub:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  flowContent: { padding: 16, paddingBottom: 120 },

  // ── Info card ─────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: '#EFF6FF', borderRadius: 18,
    flexDirection: 'row', padding: 14, gap: 10, marginBottom: 16,
  },
  infoIconWrap: { paddingTop: 1 },
  infoText:     { flex: 1, fontSize: 13, fontWeight: '600', color: '#1E40AF', lineHeight: 19 },

  // ── Form card ─────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: '#fff', borderRadius: 22,
    padding: 18, gap: 16,
  },
  fieldWrap:  {},
  fieldLabel: { fontSize: 13, fontWeight: '800', color: G.text, marginBottom: 8 },
  fieldInput: {
    borderWidth: 1.5, borderColor: G.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontWeight: '600', color: G.text, backgroundColor: '#FAFBFF',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: G.border,
    backgroundColor: '#F8FAFC',
  },
  chipActive: { backgroundColor: G.accent + '18', borderColor: G.accent },
  chipText:       { fontSize: 13, fontWeight: '700', color: G.muted },
  chipTextActive: { color: G.accent, fontWeight: '900' },
  twoCol: { flexDirection: 'row', gap: 12 },

  primaryBtn: {
    backgroundColor: G.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, borderRadius: 27, marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // ── Success screen ────────────────────────────────────────────────────────
  successHeader: {
    paddingHorizontal: 20, paddingBottom: 60,
    alignItems: 'center',
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },
  successBody: {
    flex: 1, backgroundColor: G.bg,
    marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, alignItems: 'center', gap: 12,
  },
  successTitle: { fontSize: 28, fontWeight: '900', color: G.text, textAlign: 'center', marginTop: 8 },
  successName:  { fontSize: 20, fontWeight: '900', color: G.accent },
  successDesc: {
    fontSize: 14, fontWeight: '600', color: G.muted,
    textAlign: 'center', lineHeight: 22, marginTop: 4,
  },
  successActions: { width: '100%', gap: 12, marginTop: 16 },
  successPrimaryBtn: {
    backgroundColor: G.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, borderRadius: 28,
  },
  successPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  successSecondaryBtn: {
    height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: G.border, backgroundColor: '#fff',
  },
  successSecondaryBtnText: { fontSize: 16, fontWeight: '800', color: G.text },
});
