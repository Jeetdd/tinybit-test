import { useState, useCallback } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StatusBar, StyleSheet, Switch, Text, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { useGuardianElderSync, useElderBroadcastSync } from '../../services/realtimeSync';

type AlertCard = {
  id: string;
  tag:   { text: string; bg: string; fg: string };
  who:   string;
  title: string;
  body:  string;
  time:  string;
};

function PrimaryButton({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, s.btnPrimary, CARD_SHADOW]}>
      <Text style={s.btnPrimaryText}>{title}</Text>
    </Pressable>
  );
}

function OutlineButton({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, s.btnOutline]}>
      <Text style={s.btnOutlineText}>{title}</Text>
    </Pressable>
  );
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GuardianAlertsScreen() {
  const { user }    = useAuth();
  const [alerts,    setAlerts]    = useState<AlertCard[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [elderIds,  setElderIds]  = useState<string[]>([]);
  const [prefs,     setPrefs]     = useState({ sos: true, missedMed: true, morning: false, location: true });

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today    = new Date().toISOString().split('T')[0];
      const dayStart = `${today}T00:00:00.000Z`;
      const dayEnd   = `${today}T23:59:59.999Z`;
      const now      = new Date();

      // 1. Connected elders
      const { data: links } = await supabase
        .from('guardian_elder_links')
        .select('elder_id, parent_name')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');
      if (!links || links.length === 0) { setAlerts([]); return; }

      const ids = links.map((l: any) => l.elder_id);
      setElderIds(ids);
      const nameMap: Record<string, string> = {};
      links.forEach((l: any) => { nameMap[l.elder_id] = l.parent_name; });

      // 2. Today's check-ins
      const { data: checkins } = await supabase
        .from('daily_check_ins')
        .select('user_id')
        .eq('date', today)
        .in('user_id', ids);
      const checkinSet = new Set((checkins ?? []).map((c: any) => c.user_id));

      // 3. Medicines due today vs taken
      const { data: meds } = await supabase
        .from('medicines')
        .select('id, user_id, name')
        .in('user_id', ids);

      const { data: logs } = await supabase
        .from('medicine_logs')
        .select('medicine_id, user_id')
        .gte('taken_at', dayStart)
        .lte('taken_at', dayEnd)
        .in('user_id', ids);
      const loggedSet = new Set((logs ?? []).map((l: any) => l.medicine_id));

      const generated: AlertCard[] = [];

      ids.forEach((elderId: string) => {
        const name = nameMap[elderId] ?? 'Elder';

        // Missed check-in
        if (!checkinSet.has(elderId) && now.getHours() >= 10) {
          generated.push({
            id:    `checkin-${elderId}`,
            tag:   { text: 'Check-in', bg: '#FFF3E0', fg: '#F97316' },
            who:   name,
            title: 'No Morning Check-in',
            body:  `${name} has not completed today's health check-in. Tap to remind.`,
            time:  timeLabel(now),
          });
        }

        // Missed medicines
        const elderMeds   = (meds ?? []).filter((m: any) => m.user_id === elderId);
        const missedMeds  = elderMeds.filter((m: any) => !loggedSet.has(m.id));
        const takenMeds   = elderMeds.filter((m: any) =>  loggedSet.has(m.id));

        if (missedMeds.length > 0 && now.getHours() >= 12) {
          const names = missedMeds.slice(0, 2).map((m: any) => m.name).join(', ');
          const extra = missedMeds.length > 2 ? ` +${missedMeds.length - 2} more` : '';
          generated.push({
            id:    `med-${elderId}`,
            tag:   { text: 'Medicine', bg: '#FEE2E2', fg: '#DC2626' },
            who:   name,
            title: `${missedMeds.length} Medicine${missedMeds.length > 1 ? 's' : ''} Missed`,
            body:  `${name} has not taken: ${names}${extra}`,
            time:  timeLabel(now),
          });
        }

        // All taken — positive alert
        if (takenMeds.length > 0 && missedMeds.length === 0) {
          generated.push({
            id:    `done-${elderId}`,
            tag:   { text: 'Good Going', bg: '#D1FADF', fg: '#16A34A' },
            who:   name,
            title: 'All Medicines Taken!',
            body:  `${name} has taken all ${takenMeds.length} medicine${takenMeds.length > 1 ? 's' : ''} for today.`,
            time:  timeLabel(now),
          });
        }
      });

      // If nothing to show, add a calm notice
      if (generated.length === 0) {
        generated.push({
          id:    'all-ok',
          tag:   { text: 'Good Going', bg: '#D1FADF', fg: '#16A34A' },
          who:   'All elders',
          title: 'Everything looks good',
          body:  'No alerts to show. Your elders are on track today.',
          time:  timeLabel(now),
        });
      }

      setAlerts(generated);
    } catch (e) {
      console.error('Alerts load error', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));
  useGuardianElderSync(elderIds, ['medicines', 'medicine_logs'], loadAlerts);
  useElderBroadcastSync(elderIds, ['checkin-update', 'medicine-update'], loadAlerts);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Alerts Centre" showBack={false} />

      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.sectionRow}>
            <Text style={s.h2}>Today's Alerts</Text>
            <Pressable onPress={loadAlerts}>
              <Text style={s.link}>Refresh</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ margin: 24 }} color={G.accent} />
          ) : (
            <View style={s.alertWrap}>
              {alerts.map(a => (
                <View key={a.id} style={[s.alertCard, CARD_SHADOW]}>
                  <View style={[s.tag, { backgroundColor: a.tag.bg }]}>
                    <Text style={[s.tagText, { color: a.tag.fg }]}>{a.tag.text}</Text>
                  </View>
                  <Text style={s.alertTime}>{a.time}</Text>
                  <Text style={s.who}>{a.who.toUpperCase()}</Text>
                  <Text style={s.alertTitle}>{a.title}</Text>
                  <Text style={s.alertBody}>{a.body}</Text>
                  {a.tag.text !== 'Good Going' && (
                    <View style={s.btnRow}>
                      <PrimaryButton title="Call Now" />
                      <OutlineButton
                        title="Dismiss"
                        onPress={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Alert Preferences */}
          <Text style={[s.h2, { marginTop: 24 }]}>Alert Preferences</Text>
          <View style={[s.prefCard, CARD_SHADOW]}>
            {([
              { key: 'sos',       icon: '🆘', title: 'Emergency SOS Alert',  sub: 'Immediate push + call'     },
              { key: 'missedMed', icon: '💊', title: 'Missed Medicine',       sub: 'If not confirmed in 30 min'},
              { key: 'morning',   icon: '🌅', title: 'Morning Check-in',      sub: 'If not done by 9 AM'       },
              { key: 'location',  icon: '📍', title: 'Location Alerts',       sub: 'If elder leaves safe zone' },
            ] as const).map((pref, i, arr) => (
              <View key={pref.key}>
                <View style={s.prefRow}>
                  <View style={s.prefLeft}>
                    <View style={s.prefIcon}>
                      <Text style={{ fontSize: 18 }}>{pref.icon}</Text>
                    </View>
                    <View>
                      <Text style={s.prefTitle}>{pref.title}</Text>
                      <Text style={s.prefSub}>{pref.sub}</Text>
                    </View>
                  </View>
                  <Switch
                    value={prefs[pref.key]}
                    onValueChange={v => setPrefs(p => ({ ...p, [pref.key]: v }))}
                    trackColor={{ false: G.border, true: G.accent }}
                  />
                </View>
                {i < arr.length - 1 && <View style={s.divider} />}
              </View>
            ))}
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
  content:    { padding: 16, paddingBottom: 120 },
  h2:         { fontSize: 22, fontWeight: '900', color: G.text, marginBottom: 12 },
  link:       { fontSize: 14, fontWeight: '900', color: G.accent },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  alertWrap:  { gap: 16 },
  alertCard:  { backgroundColor: '#fff', borderRadius: 22, padding: 16, overflow: 'hidden' },
  tag:        { position: 'absolute', top: 0, left: 0, paddingHorizontal: 18, paddingVertical: 8, borderBottomRightRadius: 18, borderTopLeftRadius: 22 },
  tagText:    { fontSize: 13, fontWeight: '900' },
  alertTime:  { position: 'absolute', top: 12, right: 16, fontSize: 12, fontWeight: '800', color: G.muted },
  who:        { marginTop: 44, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, color: G.muted },
  alertTitle: { marginTop: 4, fontSize: 17, fontWeight: '900', color: G.text },
  alertBody:  { marginTop: 6, fontSize: 13, fontWeight: '600', lineHeight: 18, color: G.muted },
  btnRow:     { flexDirection: 'row', gap: 12, marginTop: 14 },

  btn:            { flex: 1, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  btnPrimary:     { backgroundColor: G.accent },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  btnOutline:     { backgroundColor: '#fff', borderWidth: 1, borderColor: G.border },
  btnOutlineText: { color: G.text, fontSize: 15, fontWeight: '900' },

  prefCard:     { backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' },
  prefRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  prefLeft:     { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  prefIcon:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  prefTitle:    { fontSize: 15, fontWeight: '900', color: G.text },
  prefSub:      { marginTop: 2, fontSize: 12, fontWeight: '700', color: G.muted },
  divider:      { height: 1, backgroundColor: G.border, marginLeft: 68 },
});
