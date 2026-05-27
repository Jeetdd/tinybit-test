/**
 * Wellness Logs Screen — TinyBit
 *
 * Supabase table required (run this migration once):
 * ──────────────────────────────────────────────────
 * create table if not exists wellness_logs (
 *   id          uuid primary key default gen_random_uuid(),
 *   user_id     uuid references auth.users(id) on delete cascade not null,
 *   type        text not null,        -- 'water', 'sleep', 'heart_rate', etc.
 *   value       numeric,              -- primary numeric value
 *   value2      numeric,              -- secondary (e.g. diastolic BP)
 *   unit        text,
 *   note        text,
 *   logged_at   timestamptz default now() not null,
 *   created_at  timestamptz default now()
 * );
 * alter table wellness_logs enable row level security;
 * create policy "users own logs" on wellness_logs using (auth.uid() = user_id) with check (auth.uid() = user_id);
 * ──────────────────────────────────────────────────
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { notifyGuardiansOf } from '../../services/notifications';
import { supabase } from '../../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
type LogType =
  | 'water' | 'sleep' | 'heart_rate' | 'blood_pressure' | 'weight'
  | 'exercise' | 'blood_sugar' | 'spo2' | 'temperature' | 'mood'
  | 'symptoms' | 'doctor_visit' | 'anxiety' | 'depression' | 'custom';

interface LogCategory {
  type: LogType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  unit: string;
  unit2?: string;       // for BP (diastolic)
  placeholder: string;
  placeholder2?: string;
  emoji: string;
  hasNote: boolean;
  isText?: boolean;     // text-only log (symptoms, doctor visit, custom)
}

interface WellnessLog {
  id: string;
  type: LogType;
  value: number | null;
  value2: number | null;
  unit: string | null;
  note: string | null;
  logged_at: string;
}

// ── Log category definitions ───────────────────────────────────────────────────
const CATEGORIES: LogCategory[] = [
  { type: 'water',          label: 'Water Intake',       icon: 'water-outline',        color: '#3B82F6', unit: 'ml',  emoji: '💧', placeholder: 'e.g. 250', hasNote: false },
  { type: 'sleep',          label: 'Sleep',              icon: 'moon-outline',          color: '#8B5CF6', unit: 'hrs', emoji: '😴', placeholder: 'e.g. 7.5', hasNote: true },
  { type: 'heart_rate',     label: 'Heart Rate',         icon: 'heart-outline',         color: '#EF4444', unit: 'bpm', emoji: '❤️', placeholder: 'e.g. 72',  hasNote: false },
  { type: 'blood_pressure', label: 'Blood Pressure',     icon: 'fitness-outline',       color: '#DC2626', unit: 'mmHg(S)', unit2: 'mmHg(D)', emoji: '🩺', placeholder: 'Systolic e.g. 120', placeholder2: 'Diastolic e.g. 80', hasNote: true },
  { type: 'weight',         label: 'Weight',             icon: 'scale-outline',         color: '#F59E0B', unit: 'kg',  emoji: '⚖️', placeholder: 'e.g. 65',  hasNote: false },
  { type: 'exercise',       label: 'Exercise / Walk',    icon: 'walk-outline',          color: '#10B981', unit: 'min', emoji: '🚶', placeholder: 'e.g. 30',  hasNote: true },
  { type: 'blood_sugar',    label: 'Blood Sugar',        icon: 'flask-outline',         color: '#F97316', unit: 'mg/dL', emoji: '🩸', placeholder: 'e.g. 95', hasNote: true },
  { type: 'spo2',           label: 'Oxygen Level (SpO₂)',icon: 'pulse-outline',         color: '#06B6D4', unit: '%',   emoji: '🫁', placeholder: 'e.g. 98',  hasNote: false },
  { type: 'temperature',    label: 'Body Temperature',   icon: 'thermometer-outline',   color: '#EC4899', unit: '°C',  emoji: '🌡️', placeholder: 'e.g. 36.5', hasNote: false },
  { type: 'mood',           label: 'Mood',               icon: 'happy-outline',         color: '#A78BFA', unit: '/5', emoji: '😊', placeholder: '1 – 5',    hasNote: true },
  { type: 'symptoms',       label: 'Symptoms',           icon: 'medkit-outline',        color: '#64748B', unit: '',    emoji: '📋', placeholder: 'Describe symptoms...', hasNote: false, isText: true },
  { type: 'doctor_visit',   label: 'Doctor Visit',       icon: 'person-outline',        color: '#0EA5E9', unit: '',    emoji: '👨‍⚕️', placeholder: 'Doctor name & notes...', hasNote: false, isText: true },
  { type: 'anxiety',        label: 'Anxiety Level',      icon: 'alert-circle-outline',  color: '#F59E0B', unit: '/10', emoji: '😰', placeholder: '1 – 10',   hasNote: true },
  { type: 'depression',     label: 'Mood / Depression',  icon: 'cloudy-night-outline',  color: '#7C3AED', unit: '/10', emoji: '🌧️', placeholder: '1 – 10',   hasNote: true },
  { type: 'custom',         label: 'Custom Log',         icon: 'add-circle-outline',    color: '#6B7280', unit: '',    emoji: '📝', placeholder: 'Enter your log...', hasNote: true, isText: true },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function valueSummary(log: WellnessLog, cat: LogCategory): string {
  if (cat.isText) return log.note ?? '--';
  if (cat.type === 'blood_pressure') {
    if (log.value && log.value2) return `${log.value}/${log.value2} ${cat.unit.split('(')[0]}`;
    return `${log.value ?? '--'} ${cat.unit}`;
  }
  return `${log.value ?? '--'} ${cat.unit}`;
}

function getHealthColor(type: LogType, value: number | null): string {
  if (!value) return '#64748B';
  switch (type) {
    case 'heart_rate': return value < 60 || value > 100 ? '#EF4444' : '#10B981';
    case 'spo2': return value < 95 ? '#EF4444' : '#10B981';
    case 'blood_sugar': return value > 140 ? '#EF4444' : value > 100 ? '#F59E0B' : '#10B981';
    case 'temperature': return value > 37.5 ? '#EF4444' : '#10B981';
    case 'mood': return value >= 4 ? '#10B981' : value >= 3 ? '#F59E0B' : '#EF4444';
    case 'anxiety': case 'depression': return value >= 7 ? '#EF4444' : value >= 4 ? '#F59E0B' : '#10B981';
    default: return '#10B981';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function WellnessLogsScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeType, setActiveType] = useState<LogType | null>(null);
  const [logs, setLogs] = useState<Record<LogType, WellnessLog[]>>({} as any);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [editLog, setEditLog] = useState<WellnessLog | null>(null);

  // Add/Edit form state
  const [formValue, setFormValue] = useState('');
  const [formValue2, setFormValue2] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formCustomName, setFormCustomName] = useState('');

  const activeCat = useMemo(() => CATEGORIES.find(c => c.type === activeType), [activeType]);

  // ── Data loading ───────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    loadAllLogs();
  }, [user?.id]));

  const loadAllLogs = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data, error } = await supabase
        .from('wellness_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', since.toISOString())
        .order('logged_at', { ascending: false });

      if (error) {
        // Table might not exist yet — fail silently
        console.warn('[WellnessLogs] Load error:', error.message);
        setLogs({} as any);
        return;
      }

      const grouped: Record<LogType, WellnessLog[]> = {} as any;
      CATEGORIES.forEach(c => { grouped[c.type] = []; });
      (data ?? []).forEach((row: any) => {
        if (grouped[row.type as LogType]) grouped[row.type as LogType].push(row as WellnessLog);
      });
      setLogs(grouped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const openAdd = (type: LogType) => {
    setActiveType(type);
    setEditLog(null);
    setFormValue('');
    setFormValue2('');
    setFormNote('');
    setFormCustomName('');
    setShowAddModal(true);
  };

  const openEdit = (log: WellnessLog, type: LogType) => {
    setActiveType(type);
    setEditLog(log);
    setFormValue(log.value?.toString() ?? '');
    setFormValue2(log.value2?.toString() ?? '');
    setFormNote(log.note ?? '');
    setShowAddModal(true);
  };

  const saveLog = async () => {
    if (!user || !activeType) return;
    const cat = CATEGORIES.find(c => c.type === activeType)!;
    setSavingLog(true);

    let payload: any = {
      user_id: user.id,
      type: activeType,
      unit: formCustomName.trim() || cat.unit || null,
      note: formNote.trim() || null,
      logged_at: new Date().toISOString(),
    };

    if (cat.isText) {
      payload.note = formValue.trim() || formNote.trim() || null;
      payload.value = null;
    } else {
      const numVal = parseFloat(formValue);
      if (!formValue.trim() || isNaN(numVal)) {
        Alert.alert('Invalid Input', `Please enter a valid ${cat.label} value.`);
        setSavingLog(false);
        return;
      }
      payload.value = numVal;
      if (cat.type === 'blood_pressure') {
        payload.value2 = parseFloat(formValue2) || null;
      }
    }

    try {
      if (editLog) {
        await supabase.from('wellness_logs').update(payload).eq('id', editLog.id);
      } else {
        await supabase.from('wellness_logs').insert(payload);
      }
      setShowAddModal(false);
      await loadAllLogs();

      // ── Notify connected guardians ──────────────────────────────────────────
      if (user?.id && !editLog) {
        const name = profile?.firstName || 'Your elder';
        const notifMap: Record<string, { type: any; title: string; body: (v: any, v2: any, n: string | null) => string; priority?: string }> = {
          blood_pressure: { type: 'health_log_bp',       title: '🩺 BP Logged',
            body: (v, v2) => v && v2 ? `${name}: ${v}/${v2} mmHg` : `${name}: BP recorded`,
            priority: payload.value > 140 ? 'high' : undefined },
          blood_sugar:    { type: 'health_log_sugar',    title: '🩸 Blood Sugar',
            body: (v) => `${name}: ${v} mg/dL`,
            priority: (payload.value > 180 || payload.value < 70) ? 'high' : undefined },
          heart_rate:     { type: 'health_log_bp',       title: '❤️ Heart Rate',        body: (v) => `${name}: ${v} bpm` },
          spo2:           { type: 'health_log_bp',       title: '🫁 SpO₂ Logged',
            body: (v) => `${name}: ${v}%`,
            priority: payload.value < 95 ? 'high' : undefined },
          temperature:    { type: 'health_log_bp',       title: '🌡️ Temperature',
            body: (v) => `${name}: ${v}°C`,
            priority: payload.value > 37.5 ? 'medium' : undefined },
          sleep:          { type: 'health_log_sleep',    title: '😴 Sleep Logged',      body: (v, _v2, n) => `${name}: ${v}h — ${n ?? ''}` },
          mood:           { type: 'health_log_mood',     title: '😊 Mood Update',       body: (v) => `${name}: mood ${v}/5` },
          anxiety:        { type: 'health_log_mood',     title: '😰 Anxiety Level',
            body: (v) => `${name}: anxiety ${v}/10`,
            priority: payload.value >= 7 ? 'high' : payload.value >= 5 ? 'medium' : undefined },
          depression:     { type: 'health_log_mood',     title: '🌧️ Mood / Depression',
            body: (v) => `${name}: depression score ${v}/10`,
            priority: payload.value >= 7 ? 'high' : payload.value >= 5 ? 'medium' : undefined },
          exercise:       { type: 'health_log_exercise', title: '🚶 Exercise Logged',   body: (v) => `${name}: ${v}min of exercise` },
          water:          { type: 'health_log_water',    title: '💧 Water Intake',      body: (v) => `${name}: ${v}ml water` },
          weight:         { type: 'health_log',          title: '⚖️ Weight Logged',     body: (v) => `${name}: ${v}kg` },
          symptoms:       { type: 'health_log_symptom',  title: '😣 Symptoms',          body: (_v, _v2, n) => `${name}: ${n ?? 'symptom logged'}` },
          doctor_visit:   { type: 'health_log_doctor',   title: '👨‍⚕️ Doctor Visit',   body: (_v, _v2, n) => `${name}: ${n ?? 'visited doctor'}` },
        };
        const cfg = notifMap[activeType!];
        if (cfg) {
          notifyGuardiansOf(
            user.id, user.id,
            cfg.type,
            cfg.title,
            cfg.body(payload.value, payload.value2, payload.note),
            cfg.priority ? { priority: cfg.priority } : {},
          );
        }
      }
      // ────────────────────────────────────────────────────────────────────────
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'Could not save log. Please try again.');
    } finally {
      setSavingLog(false);
    }
  };

  const deleteLog = async (id: string, type: LogType) => {
    Alert.alert('Delete Log', 'Are you sure you want to delete this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('wellness_logs').delete().eq('id', id);
          await loadAllLogs();
        },
      },
    ]);
  };

  // ── Category dashboard view ────────────────────────────────────────────────
  const renderCategoryCard = (cat: LogCategory) => {
    const catLogs = logs[cat.type] ?? [];
    const latest = catLogs[0];
    const hasData = catLogs.length > 0;

    return (
      <Pressable
        key={cat.type}
        style={s.catCard}
        onPress={() => setActiveType(activeType === cat.type ? null : cat.type)}
      >
        <View style={[s.catIconWrap, { backgroundColor: cat.color + '18' }]}>
          <Text style={s.catEmoji}>{cat.emoji}</Text>
        </View>
        <View style={s.catInfo}>
          <Text style={s.catLabel}>{cat.label}</Text>
          {hasData ? (
            <Text style={[s.catValue, { color: getHealthColor(cat.type, latest?.value ?? null) }]}>
              {valueSummary(latest, cat)}
            </Text>
          ) : (
            <Text style={s.catEmpty}>No data yet</Text>
          )}
          {hasData && <Text style={s.catDate}>{fmtDate(latest.logged_at)}</Text>}
        </View>
        <View style={s.catRight}>
          <View style={[s.catCount, { backgroundColor: cat.color + '22' }]}>
            <Text style={[s.catCountText, { color: cat.color }]}>{catLogs.length}</Text>
          </View>
          <Pressable
            style={[s.catAddBtn, { backgroundColor: cat.color }]}
            onPress={() => openAdd(cat.type)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // ── Log history rows ───────────────────────────────────────────────────────
  const renderLogRow = (log: WellnessLog, cat: LogCategory) => (
    <View key={log.id} style={s.logRow}>
      <View style={s.logLeft}>
        <Text style={[s.logValue, { color: getHealthColor(cat.type, log.value) }]}>
          {valueSummary(log, cat)}
        </Text>
        {log.note && <Text style={s.logNote} numberOfLines={2}>{log.note}</Text>}
        <Text style={s.logDate}>{fmtDate(log.logged_at)}</Text>
      </View>
      <View style={s.logActions}>
        <Pressable style={s.logEditBtn} onPress={() => openEdit(log, cat.type)}>
          <Ionicons name="pencil-outline" size={14} color="#64748B" />
        </Pressable>
        <Pressable style={s.logDelBtn} onPress={() => deleteLog(log.id, cat.type)}>
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#1E3A5F', '#2B7FC0']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={s.headerTitle}>Health & Wellness Logs</Text>
        <Text style={s.headerSub}>Track your daily health metrics</Text>
      </LinearGradient>

      <View style={s.sheet}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#2B7FC0" />
            <Text style={s.loadingText}>Loading your health logs...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 120 }]}
          >
            {/* ── Quick Stats ── */}
            <View style={s.statsRow}>
              {[
                { label: 'Today', value: Object.values(logs).flat().filter(l => l.logged_at?.startsWith(new Date().toISOString().split('T')[0])).length.toString(), color: '#2B7FC0' },
                { label: 'This Week', value: Object.values(logs).flat().filter(l => { const d = new Date(l.logged_at); return (Date.now() - d.getTime()) < 7 * 86400000; }).length.toString(), color: '#10B981' },
                { label: 'Categories', value: CATEGORIES.filter(c => (logs[c.type]?.length ?? 0) > 0).length.toString(), color: '#F59E0B' },
              ].map(stat => (
                <View key={stat.label} style={[s.statCard, { borderTopColor: stat.color }]}>
                  <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Section: Vitals ── */}
            <Text style={s.sectionTitle}>Vitals</Text>
            {CATEGORIES.filter(c => ['heart_rate', 'blood_pressure', 'spo2', 'temperature', 'weight'].includes(c.type)).map(renderCategoryCard)}

            {/* ── Section: Daily Habits ── */}
            <Text style={s.sectionTitle}>Daily Habits</Text>
            {CATEGORIES.filter(c => ['water', 'sleep', 'exercise'].includes(c.type)).map(renderCategoryCard)}

            {/* ── Section: Health Metrics ── */}
            <Text style={s.sectionTitle}>Health Metrics</Text>
            {CATEGORIES.filter(c => ['blood_sugar', 'mood', 'anxiety', 'depression'].includes(c.type)).map(renderCategoryCard)}

            {/* ── Section: Notes & Visits ── */}
            <Text style={s.sectionTitle}>Notes & Visits</Text>
            {CATEGORIES.filter(c => ['symptoms', 'doctor_visit', 'custom'].includes(c.type)).map(renderCategoryCard)}

            {/* ── Expanded log history ── */}
            {activeType && activeCat && (
              <View style={s.historyCard}>
                <View style={s.historyHeader}>
                  <Text style={s.historyEmoji}>{activeCat.emoji}</Text>
                  <Text style={s.historyTitle}>{activeCat.label} — History</Text>
                  <Pressable onPress={() => openAdd(activeType)}>
                    <View style={[s.addHistoryBtn, { backgroundColor: activeCat.color }]}>
                      <Ionicons name="add" size={14} color="#fff" />
                      <Text style={s.addHistoryText}>Add</Text>
                    </View>
                  </Pressable>
                </View>
                {(logs[activeType] ?? []).length === 0 ? (
                  <View style={s.emptyHistory}>
                    <Ionicons name="clipboard-outline" size={36} color="#CBD5E1" />
                    <Text style={s.emptyHistoryText}>No {activeCat.label.toLowerCase()} logs yet.</Text>
                    <Text style={s.emptyHistoryText2}>Tap "Add" to record your first entry.</Text>
                  </View>
                ) : (
                  (logs[activeType] ?? []).slice(0, 20).map(log => renderLogRow(log, activeCat))
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ── Add / Edit Modal ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={s.modalOverlayBg} onPress={() => setShowAddModal(false)} />
          <View style={s.modalCard}>
            {activeCat && (
              <>
                {/* Modal Header */}
                <View style={s.modalHeader}>
                  <Text style={s.modalEmoji}>{activeCat.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>{editLog ? 'Edit' : 'Log'} {activeCat.label}</Text>
                    <Text style={s.modalSub}>{editLog ? 'Update this log entry' : 'Add a new entry'}</Text>
                  </View>
                  <Pressable onPress={() => setShowAddModal(false)} style={s.modalClose}>
                    <Ionicons name="close" size={20} color="#64748B" />
                  </Pressable>
                </View>

                {/* Custom name (for custom logs) */}
                {activeType === 'custom' && (
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Log Name</Text>
                    <TextInput
                      style={s.input}
                      placeholder="e.g. Steps, Blood Oxygen..."
                      value={formCustomName}
                      onChangeText={setFormCustomName}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                )}

                {/* Main value input */}
                {activeCat.isText ? (
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Details</Text>
                    <TextInput
                      style={[s.input, s.inputMulti]}
                      placeholder={activeCat.placeholder}
                      value={formValue}
                      onChangeText={setFormValue}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                ) : (
                  <>
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>{activeCat.label} {activeCat.unit ? `(${activeCat.unit})` : ''}</Text>
                      <View style={s.inputRow}>
                        <TextInput
                          style={[s.input, s.inputNum]}
                          placeholder={activeCat.placeholder}
                          value={formValue}
                          onChangeText={setFormValue}
                          keyboardType="decimal-pad"
                          placeholderTextColor="#94A3B8"
                        />
                        {activeCat.unit2 && (
                          <TextInput
                            style={[s.input, s.inputNum]}
                            placeholder={activeCat.placeholder2}
                            value={formValue2}
                            onChangeText={setFormValue2}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#94A3B8"
                          />
                        )}
                      </View>
                    </View>
                  </>
                )}

                {/* Note field */}
                {activeCat.hasNote && !activeCat.isText && (
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Note (optional)</Text>
                    <TextInput
                      style={[s.input, { minHeight: 72 }]}
                      placeholder="Add any notes..."
                      value={formNote}
                      onChangeText={setFormNote}
                      multiline
                      textAlignVertical="top"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                )}

                {/* Quick presets for water */}
                {activeType === 'water' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={s.presetsRow}>
                      {['150', '200', '250', '300', '500'].map(v => (
                        <Pressable key={v} style={s.presetBtn} onPress={() => setFormValue(v)}>
                          <Text style={s.presetText}>{v}ml</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {/* Quick presets for mood */}
                {activeType === 'mood' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={s.presetsRow}>
                      {[['1', '😞'], ['2', '😕'], ['3', '😐'], ['4', '🙂'], ['5', '😄']].map(([v, emoji]) => (
                        <Pressable key={v} style={[s.presetBtn, formValue === v && s.presetActive]} onPress={() => setFormValue(v)}>
                          <Text style={s.presetEmoji}>{emoji}</Text>
                          <Text style={s.presetText}>{v}/5</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {/* Save / Cancel */}
                <View style={s.modalActions}>
                  <Pressable style={s.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                    <Text style={s.modalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[s.modalSaveBtn, { backgroundColor: activeCat.color }, savingLog && { opacity: 0.6 }]}
                    onPress={saveLog}
                    disabled={savingLog}
                  >
                    {savingLog
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.modalSaveText}>{editLog ? 'Update' : 'Save Log'}</Text>
                    }
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1 },
  header:     { paddingHorizontal: 20, paddingBottom: 28 },
  headerTitle:{ fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '600' },
  sheet:      { flex: 1, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  loadingWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:{ fontSize: 15, color: '#64748B', fontWeight: '600' },
  content:    { padding: 16 },

  // Stats
  statsRow:   { flexDirection: 'row', gap: 12, marginBottom: 20, marginTop: 8 },
  statCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statValue:  { fontSize: 26, fontWeight: '900' },
  statLabel:  { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 2 },

  // Section titles
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 10, marginTop: 6 },

  // Category card
  catCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12 },
  catIconWrap:{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catEmoji:   { fontSize: 24 },
  catInfo:    { flex: 1 },
  catLabel:   { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  catValue:   { fontSize: 15, fontWeight: '900', marginTop: 2 },
  catEmpty:   { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  catDate:    { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  catRight:   { alignItems: 'center', gap: 6 },
  catCount:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  catCountText:{ fontSize: 12, fontWeight: '900' },
  catAddBtn:  { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // History section
  historyCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  historyEmoji:  { fontSize: 24 },
  historyTitle:  { flex: 1, fontSize: 15, fontWeight: '900', color: '#1E293B' },
  addHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addHistoryText:{ color: '#fff', fontSize: 13, fontWeight: '800' },
  emptyHistory:  { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyHistoryText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  emptyHistoryText2:{ fontSize: 12, color: '#CBD5E1', fontWeight: '600' },

  // Log row
  logRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  logLeft:   { flex: 1 },
  logValue:  { fontSize: 16, fontWeight: '900' },
  logNote:   { fontSize: 13, color: '#64748B', marginTop: 2 },
  logDate:   { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  logActions:{ flexDirection: 'row', gap: 8 },
  logEditBtn:{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  logDelBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay:   { flex: 1, justifyContent: 'flex-end' },
  modalOverlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard:      { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalEmoji:     { fontSize: 28 },
  modalTitle:     { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  modalSub:       { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  modalClose:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  input:      { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: '#1E293B' },
  inputMulti: { minHeight: 96, paddingTop: 12 },
  inputNum:   { flex: 1 },
  inputRow:   { flexDirection: 'row', gap: 12 },

  presetsRow: { flexDirection: 'row', gap: 8 },
  presetBtn:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  presetActive:{ backgroundColor: '#E0F2FE' },
  presetEmoji:{ fontSize: 20 },
  presetText: { fontSize: 12, fontWeight: '800', color: '#475569' },

  modalActions:  { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn:{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText:{ fontSize: 15, fontWeight: '800', color: '#64748B' },
  modalSaveBtn:  { flex: 2, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});
