import { useState, useEffect, useCallback } from 'react';
import {
  StatusBar, StyleSheet, Text, View, ScrollView,
  Pressable, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { useGuardianElderSync, useRealtimeColumn } from '../../services/realtimeSync';

const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

type Elder = {
  elder_id: string;
  parent_name: string;
  relation: string;
  elder_email: string;
  profile?: { full_name: string | null; age: number | null; location: string | null };
};

function MemberChip({ name, bg }: { name: string; bg: string }) {
  return (
    <View style={s.memberChip}>
      <View style={[s.memberAvatar, { backgroundColor: bg }]}>
        <Text style={s.memberInitial}>{name[0]?.toUpperCase()}</Text>
      </View>
      <Text style={s.memberName}>{name.split(' ')[0]}</Text>
    </View>
  );
}

function ElderCard({ elder }: { elder: Elder }) {
  const name     = elder.profile?.full_name || elder.parent_name;
  const initial  = name[0]?.toUpperCase() ?? '?';
  const bg       = chipBg(name);
  const subtitle = [
    elder.relation,
    elder.profile?.age ? `${elder.profile.age} yrs` : null,
    elder.profile?.location || null,
  ].filter(Boolean).join(' · ');

  return (
    <View style={[s.watchCard, CARD_SHADOW]}>
      <View style={[s.rolePill, { backgroundColor: '#D8F0FF' }]}>
        <Text style={s.roleText}>{elder.relation}</Text>
      </View>
      <View style={s.watchTop}>
        <View style={[s.bigInitial, { backgroundColor: bg }]}>
          <Text style={s.bigInitialText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.watchName}>{name}</Text>
          <Text style={s.watchSub}>{subtitle || elder.elder_email}</Text>
        </View>
      </View>
      <View style={s.watchActions}>
        {[
          { icon: 'call-outline',                label: 'Call'     },
          { icon: 'chatbubble-ellipses-outline', label: 'Chat'     },
          { icon: 'location-outline',            label: 'Location' },
          { icon: 'document-text-outline',       label: 'Task'     },
        ].map((a) => (
          <View key={a.label} style={s.watchAction}>
            <Ionicons name={a.icon as any} size={22} color="#9AA5B4" />
            <Text style={s.watchActionLabel}>{a.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function FamilyCircleScreen() {
  const { user }    = useAuth();
  const [elders,    setElders]    = useState<Elder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [elderIds,  setElderIds]  = useState<string[]>([]);

  const loadElders = useCallback(async () => {
    if (!user) return;
    try {
      const { data: links } = await supabase
        .from('guardian_elder_links')
        .select('elder_id, parent_name, relation, elder_email')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');

      const linkList: Elder[] = links || [];

      const ids = linkList.map(l => l.elder_id).filter(Boolean);
      setElderIds(ids);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, age, location')
          .in('id', ids);
        const pMap: Record<string, any> = {};
        (profiles || []).forEach(p => { pMap[p.id] = p; });
        linkList.forEach(l => { l.profile = pMap[l.elder_id]; });
      }

      setElders(linkList);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadElders(); }, [loadElders]);

  // Re-fetch when new elders connect or existing elder profiles update
  useRealtimeColumn('guardian_elder_links', 'guardian_id', user?.id, loadElders);
  useGuardianElderSync(elderIds, ['profiles'], loadElders);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Family Circle" />

      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ── Family Circle chip row ── */}
          <View style={[s.card, CARD_SHADOW]}>
            <View style={s.cardTop}>
              <Text style={s.cardTitle}>Family Circle</Text>
              <Pressable style={s.inviteBtn}>
                <Text style={s.inviteText}>+ Invite</Text>
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator style={{ margin: 16 }} color={G.accent} />
            ) : (
              <View style={s.memberRow}>
                {elders.map(e => (
                  <MemberChip
                    key={e.elder_id}
                    name={e.profile?.full_name || e.parent_name}
                    bg={chipBg(e.parent_name)}
                  />
                ))}
                <View style={s.memberChip}>
                  <View style={[s.memberAvatar, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[s.memberInitial, { color: '#94A3B8' }]}>+</Text>
                  </View>
                  <Text style={s.memberName}>Add</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Parents I am Watching ── */}
          <Text style={[s.h2, { marginTop: 18 }]}>Parents I am Watching</Text>
          {loading ? (
            <ActivityIndicator style={{ margin: 20 }} color={G.accent} />
          ) : elders.length === 0 ? (
            <View style={[s.card, CARD_SHADOW, { alignItems: 'center', paddingVertical: 32 }]}>
              <Ionicons name="people-outline" size={40} color="#B0BEC5" />
              <Text style={{ marginTop: 12, color: G.muted, fontWeight: '700', fontSize: 15 }}>
                No connected elders yet
              </Text>
              <Text style={{ marginTop: 4, color: G.muted, fontSize: 13 }}>
                Use the Invite button to add family members
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {elders.map(e => <ElderCard key={e.elder_id} elder={e} />)}
            </View>
          )}

          {/* ── Family Activity (static placeholder) ── */}
          <View style={s.sectionRow}>
            <Text style={s.h2}>Family Activity</Text>
            <Pressable><Text style={s.link}>See All</Text></Pressable>
          </View>
          <View style={[s.listCard, CARD_SHADOW]}>
            <View style={s.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>Family circle connected</Text>
                <Text style={s.listSub}>Activity will appear here once family members interact</Text>
              </View>
              <Ionicons name="time-outline" size={18} color="#B0BEC5" />
            </View>
          </View>

          {/* ── Who does what ── */}
          <View style={s.sectionRow}>
            <Text style={s.h2}>Who does what</Text>
            <Pressable><Text style={s.link}>Edit</Text></Pressable>
          </View>
          <View style={[s.card, CARD_SHADOW]}>
            <View style={s.familyRespTag}>
              <Text style={s.familyRespText}>Family Responsibilities</Text>
            </View>
            {elders.length === 0 ? (
              <View style={{ paddingTop: 40, paddingBottom: 12, alignItems: 'center' }}>
                <Text style={{ color: G.muted, fontWeight: '600' }}>Add family members to assign responsibilities</Text>
              </View>
            ) : (
              elders.map((e, idx) => (
                <View key={e.elder_id} style={[s.respRow, idx !== 0 && s.listRowBorder]}>
                  <View style={[s.initialCircle, { backgroundColor: chipBg(e.parent_name) }]}>
                    <Text style={s.initialText}>{e.parent_name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.respName}>{e.profile?.full_name || e.parent_name}</Text>
                    <Text style={s.respSub}>{e.relation}</Text>
                  </View>
                  <Text style={s.when}>Guardian</Text>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },
  sheet: {
    flex: 1, marginTop: -42,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: G.bg, overflow: 'hidden',
  },
  content: { padding: 16, paddingBottom: 120 },
  h2:   { fontSize: 22, fontWeight: '900', color: G.text, marginBottom: 12 },
  link: { fontSize: 14, fontWeight: '900', color: '#0284C7' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 12 },

  card:    { backgroundColor: '#fff', borderRadius: 22, padding: 16, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:  { fontSize: 18, fontWeight: '900', color: '#111' },
  inviteBtn:  { backgroundColor: '#243B80', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  inviteText: { color: '#fff', fontWeight: '900' },

  memberRow:    { flexDirection: 'row', gap: 18, marginTop: 16, flexWrap: 'wrap' },
  memberChip:   { alignItems: 'center', gap: 10 },
  memberAvatar: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberInitial:{ fontSize: 22, fontWeight: '900', color: '#7C3AED' },
  memberName:   { fontSize: 12, fontWeight: '900', color: '#111' },

  watchCard:  { backgroundColor: '#fff', borderRadius: 22, padding: 16, overflow: 'hidden' },
  rolePill:   { position: 'absolute', top: 0, right: 0, paddingHorizontal: 18, paddingVertical: 8, borderBottomLeftRadius: 18 },
  roleText:   { fontSize: 13, fontWeight: '900', color: '#111' },
  watchTop:   { flexDirection: 'row', gap: 12, alignItems: 'center' },
  bigInitial: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  bigInitialText: { fontSize: 22, fontWeight: '900', color: '#0284C7' },
  watchName:  { fontSize: 20, fontWeight: '900', color: '#111' },
  watchSub:   { marginTop: 2, fontSize: 12, fontWeight: '700', color: G.muted },
  watchActions: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-around' },
  watchAction:  { alignItems: 'center', gap: 8 },
  watchActionLabel: { fontSize: 12, fontWeight: '800', color: '#A3AAB6' },

  listCard:     { backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' },
  listRow:      { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'center' },
  listRowBorder:{ borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  listTitle:    { fontSize: 15, fontWeight: '900', color: '#111' },
  listSub:      { marginTop: 4, fontSize: 12, fontWeight: '700', color: G.muted },

  familyRespTag:  { position: 'absolute', top: 0, left: 0, backgroundColor: '#0EA5E9', paddingHorizontal: 18, paddingVertical: 8, borderBottomRightRadius: 18, borderTopLeftRadius: 22 },
  familyRespText: { color: '#fff', fontWeight: '900' },
  respRow:      { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'center', paddingTop: 24 },
  initialCircle:{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  initialText:  { fontSize: 18, fontWeight: '900', color: '#7C3AED' },
  respName:     { fontSize: 16, fontWeight: '900', color: '#111' },
  respSub:      { marginTop: 4, fontSize: 12, fontWeight: '700', color: G.muted },
  when:         { fontSize: 13, fontWeight: '900', color: '#0284C7' },
});
