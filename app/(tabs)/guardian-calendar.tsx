import { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

type Elder = { elder_id: string; parent_name: string; relation: string };
type EventType = 'Doctor' | 'Family' | 'Therapy' | 'Activity';
type CareEvent = {
  id: string; title: string; sub: string; time: string;
  type: EventType; color: string; emoji: string;
  date: number; month: string; year: number; timestamp: number;
  user_id: string;
};

const TYPE_META: Record<EventType, { color: string; emoji: string; label: string }> = {
  Doctor:   { color: '#DB5461', emoji: '🏥', label: 'Doctor' },
  Family:   { color: '#5CB8B2', emoji: '👨‍👩‍👧', label: 'Family' },
  Therapy:  { color: '#7C5CFC', emoji: '🧘', label: 'Therapy' },
  Activity: { color: '#F4A46A', emoji: '🎯', label: 'Activity' },
};

const EVENT_TYPES: EventType[] = ['Doctor', 'Family', 'Therapy', 'Activity'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function GuardianCalendarScreen() {
  const { user } = useAuth();
  const today = new Date();

  const [elders,    setElders]    = useState<Elder[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [events,    setEvents]    = useState<CareEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [evLoading, setEvLoading] = useState(false);

  const [curYear,  setCurYear]  = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [selDay,   setSelDay]   = useState(today.getDate());

  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ title: '', sub: '', time: '10:00 AM', type: 'Doctor' as EventType });

  const loadElders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guardian_elder_links')
        .select('elder_id, parent_name, relation')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');
      if (error) throw error;
      setElders((data ?? []) as Elder[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  const loadEvents = useCallback(async (elderId: string) => {
    setEvLoading(true);
    try {
      const { data, error } = await supabase
        .from('care_events')
        .select('*')
        .eq('user_id', elderId)
        .eq('year',  curYear)
        .eq('month', MONTHS[curMonth])
        .order('timestamp', { ascending: true });
      if (error) throw error;
      setEvents((data ?? []) as CareEvent[]);
    } catch (e) { console.error(e); }
    finally { setEvLoading(false); }
  }, [curYear, curMonth]);

  useFocusEffect(useCallback(() => { loadElders(); }, [loadElders]));

  useFocusEffect(useCallback(() => {
    const active = elders[activeIdx];
    if (active?.elder_id) loadEvents(active.elder_id);
  }, [elders, activeIdx, loadEvents]));

  // Real-time: refresh events when the active elder's care_events change
  const activeElderId = elders[activeIdx]?.elder_id;
  useEffect(() => {
    if (!activeElderId) return;
    const ch = supabase
      .channel(`cal-events-${activeElderId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'care_events', filter: `user_id=eq.${activeElderId}` },
        () => loadEvents(activeElderId),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeElderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMonth = () => {
    if (curMonth === 0) { setCurYear(y => y - 1); setCurMonth(11); }
    else setCurMonth(m => m - 1);
    setSelDay(1);
  };
  const nextMonth = () => {
    if (curMonth === 11) { setCurYear(y => y + 1); setCurMonth(0); }
    else setCurMonth(m => m + 1);
    setSelDay(1);
  };

  const saveEvent = async () => {
    if (!form.title.trim()) return Alert.alert('Missing', 'Enter event title');
    const active = elders[activeIdx];
    if (!active) return;
    setSaving(true);
    try {
      const meta = TYPE_META[form.type];
      const { error } = await supabase.from('care_events').insert({
        user_id:   active.elder_id,
        title:     form.title.trim(),
        sub:       form.sub.trim(),
        time:      form.time,
        type:      form.type,
        color:     meta.color,
        emoji:     meta.emoji,
        date:      selDay,
        month:     MONTHS[curMonth],
        year:      curYear,
        timestamp: new Date(curYear, curMonth, selDay).getTime(),
      });
      if (error) throw error;
      setModal(false);
      setForm({ title: '', sub: '', time: '10:00 AM', type: 'Doctor' });
      loadEvents(active.elder_id);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = (id: string) => {
    Alert.alert('Delete Event', 'Remove this care event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('care_events').delete().eq('id', id);
          const active = elders[activeIdx];
          if (active) loadEvents(active.elder_id);
        },
      },
    ]);
  };

  const daysInMonth  = getDaysInMonth(curYear, curMonth);
  const firstDayOfMonth = getFirstDayOfMonth(curYear, curMonth);
  const dayEvents    = events.filter(e => e.date === selDay);
  const eventDays    = new Set(events.map(e => e.date));
  const active       = elders[activeIdx];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <GuardianHeader title="My Calendar" />

        <View style={s.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

            {loading ? (
              <ActivityIndicator style={{ margin: 32 }} color={G.accent} />
            ) : elders.length === 0 ? (
              <View style={[s.emptyCard, CARD_SHADOW]}>
                <View style={s.emptyIcon}>
                  <Ionicons name="calendar-outline" size={36} color="#B0BEC5" />
                </View>
                <Text style={s.emptyTitle}>No Connected Parents</Text>
                <Text style={s.emptySub}>Add a parent to manage their care calendar.</Text>
              </View>
            ) : (
              <>
                {/* ── Elder pills ── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.pillRow}>
                    {elders.map((e, i) => (
                      <Pressable
                        key={e.elder_id}
                        style={[s.pill, i === activeIdx && s.pillActive]}
                        onPress={() => setActiveIdx(i)}
                      >
                        <View style={[s.pillAvatar, { backgroundColor: chipBg(e.parent_name) }]}>
                          <Text style={s.pillInitial}>{e.parent_name[0]?.toUpperCase()}</Text>
                        </View>
                        <Text style={[s.pillName, i === activeIdx && s.pillNameActive]}>
                          {e.parent_name.split(' ')[0]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* ── Month nav ── */}
                <View style={[s.monthNav, CARD_SHADOW]}>
                  <Pressable onPress={prevMonth} style={s.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={G.text} />
                  </Pressable>
                  <Text style={s.monthTitle}>{MONTHS[curMonth]} {curYear}</Text>
                  <Pressable onPress={nextMonth} style={s.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={G.text} />
                  </Pressable>
                </View>

                {/* ── Calendar grid ── */}
                <View style={[s.calCard, CARD_SHADOW]}>
                  {/* Day headers */}
                  <View style={s.dayHeaders}>
                    {DAYS_SHORT.map(d => (
                      <Text key={d} style={s.dayHeader}>{d}</Text>
                    ))}
                  </View>

                  {/* Day cells */}
                  <View style={s.calGrid}>
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <View key={`blank-${i}`} style={s.dayCell} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const isToday   = day === today.getDate() && curMonth === today.getMonth() && curYear === today.getFullYear();
                      const isSelected = day === selDay;
                      const hasEvent  = eventDays.has(day);
                      return (
                        <Pressable
                          key={day}
                          style={[s.dayCell, isSelected && s.dayCellSelected, isToday && !isSelected && s.dayCellToday]}
                          onPress={() => setSelDay(day)}
                        >
                          <Text style={[s.dayNum, isSelected && s.dayNumSelected, isToday && !isSelected && s.dayNumToday]}>
                            {day}
                          </Text>
                          {hasEvent && <View style={[s.eventDot, isSelected && { backgroundColor: '#fff' }]} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* ── Selected day events ── */}
                <View style={s.sectionRow}>
                  <Text style={s.h2}>
                    {MONTHS[curMonth]} {selDay} · {active?.parent_name.split(' ')[0]}
                  </Text>
                  <Pressable style={s.addEventBtn} onPress={() => setModal(true)}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={s.addEventText}>Add</Text>
                  </Pressable>
                </View>

                {evLoading ? (
                  <ActivityIndicator style={{ margin: 16 }} color={G.accent} />
                ) : dayEvents.length === 0 ? (
                  <View style={[s.emptyDay, CARD_SHADOW]}>
                    <Ionicons name="calendar-clear-outline" size={28} color="#B0BEC5" />
                    <Text style={s.emptyDayText}>No events for this day</Text>
                    <Pressable onPress={() => setModal(true)} style={s.addDayBtn}>
                      <Text style={s.addDayText}>+ Add Care Event</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {dayEvents.map(ev => (
                      <View key={ev.id} style={[s.eventCard, CARD_SHADOW]}>
                        <View style={[s.eventColorBar, { backgroundColor: ev.color }]} />
                        <View style={s.eventEmoji}>
                          <Text style={{ fontSize: 22 }}>{ev.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.eventTitle}>{ev.title}</Text>
                          {ev.sub ? <Text style={s.eventSub}>{ev.sub}</Text> : null}
                          <View style={s.eventMeta}>
                            <Ionicons name="time-outline" size={12} color={G.muted} />
                            <Text style={s.eventMetaText}>{ev.time}</Text>
                            <View style={[s.typeBadge, { backgroundColor: ev.color + '22' }]}>
                              <Text style={[s.typeBadgeText, { color: ev.color }]}>{ev.type}</Text>
                            </View>
                          </View>
                        </View>
                        <Pressable onPress={() => deleteEvent(ev.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color="#C0C8D4" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* ── Add event modal ── */}
        <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.modalOverlay}>
              <View style={s.modalCard}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Add Care Event</Text>
                  <Pressable onPress={() => setModal(false)} hitSlop={8}>
                    <Ionicons name="close" size={22} color={G.muted} />
                  </Pressable>
                </View>
                <Text style={s.modalFor}>
                  For: {active?.parent_name} · {MONTHS[curMonth]} {selDay}
                </Text>

                <Text style={s.label}>Event Title</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Doctor Appointment"
                  placeholderTextColor="#B0BEC5"
                  value={form.title}
                  onChangeText={v => setForm(p => ({ ...p, title: v }))}
                />

                <Text style={[s.label, { marginTop: 12 }]}>Notes (optional)</Text>
                <TextInput
                  style={s.input}
                  placeholder="Additional details..."
                  placeholderTextColor="#B0BEC5"
                  value={form.sub}
                  onChangeText={v => setForm(p => ({ ...p, sub: v }))}
                />

                <Text style={[s.label, { marginTop: 12 }]}>Time</Text>
                <TextInput
                  style={s.input}
                  placeholder="10:00 AM"
                  placeholderTextColor="#B0BEC5"
                  value={form.time}
                  onChangeText={v => setForm(p => ({ ...p, time: v }))}
                />

                <Text style={[s.label, { marginTop: 12 }]}>Type</Text>
                <View style={s.typeRow}>
                  {EVENT_TYPES.map(t => {
                    const meta = TYPE_META[t];
                    const active = form.type === t;
                    return (
                      <Pressable
                        key={t}
                        style={[s.typeChip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                        onPress={() => setForm(p => ({ ...p, type: t }))}
                      >
                        <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
                        <Text style={[s.typeChipText, active && { color: '#fff' }]}>{meta.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable style={[s.saveBtn, CARD_SHADOW, saving && { opacity: 0.7 }]} onPress={saveEvent} disabled={saving}>
                  <LinearGradient colors={[G.headerStart, G.headerEnd]} style={s.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {saving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.saveBtnText}>Save Event</Text>}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>
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
  h2: { fontSize: 20, fontWeight: '900', color: G.text },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },

  pillRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  pillActive: { borderWidth: 2, borderColor: G.accent, ...CARD_SHADOW },
  pillAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillInitial: { fontSize: 13, fontWeight: '900', color: '#7C3AED' },
  pillName: { fontSize: 13, fontWeight: '900', color: G.text },
  pillNameActive: { color: G.accent },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 18, padding: 12, marginTop: 14,
  },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 18, fontWeight: '900', color: G.text },

  calCard: { backgroundColor: '#fff', borderRadius: 22, padding: 14, marginTop: 14 },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: G.muted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: G.accent, borderRadius: 12 },
  dayCellToday: { borderRadius: 12, borderWidth: 2, borderColor: G.accent },
  dayNum: { fontSize: 14, fontWeight: '700', color: G.text },
  dayNumSelected: { color: '#fff', fontWeight: '900' },
  dayNumToday: { color: G.accent, fontWeight: '900' },
  eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: G.accent, position: 'absolute', bottom: 3 },

  addEventBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: G.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
  },
  addEventText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  emptyDay: {
    backgroundColor: '#fff', borderRadius: 18, padding: 24,
    alignItems: 'center', gap: 10,
  },
  emptyDayText: { fontSize: 14, fontWeight: '700', color: G.muted },
  addDayBtn: { marginTop: 4 },
  addDayText: { fontSize: 14, fontWeight: '900', color: G.accent },

  eventCard: {
    backgroundColor: '#fff', borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden',
  },
  eventColorBar: { width: 5, alignSelf: 'stretch' },
  eventEmoji: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  eventSub: { marginTop: 2, fontSize: 12, fontWeight: '600', color: G.muted },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  eventMetaText: { fontSize: 12, fontWeight: '700', color: G.muted, marginRight: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '900' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 22, padding: 32, marginTop: 24, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: G.text },
  emptySub: { fontSize: 14, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: G.text },
  modalFor: { fontSize: 13, fontWeight: '700', color: G.accent, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '800', color: G.text, marginBottom: 8 },
  input: {
    backgroundColor: '#F4F6FA', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, fontWeight: '600', color: '#111',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#F4F6FA', borderWidth: 1, borderColor: '#E2E8F0',
  },
  typeChipText: { fontSize: 13, fontWeight: '700', color: G.muted },
  saveBtn: { marginTop: 20, borderRadius: 26, overflow: 'hidden' },
  saveBtnGrad: { height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
