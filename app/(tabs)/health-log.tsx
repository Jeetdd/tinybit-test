/**
 * Health Log Hub — TinyBit
 * Elder-friendly comprehensive one-tap health tracking
 *
 * DB MIGRATION — run once in Supabase SQL Editor:
 * ────────────────────────────────────────────────
 * create table if not exists health_logs (
 *   id          uuid primary key default gen_random_uuid(),
 *   user_id     uuid references auth.users(id) on delete cascade not null,
 *   type        text not null,
 *   value       jsonb,
 *   note        text,
 *   logged_at   timestamptz default now() not null,
 *   created_at  timestamptz default now()
 * );
 * alter table health_logs enable row level security;
 * create policy "users own health logs" on health_logs
 *   using (auth.uid() = user_id)
 *   with check (auth.uid() = user_id);
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Modal, Pressable,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

// ── Types ──────────────────────────────────────────────────────────────────────
type ModalType =
  | 'medicine' | 'mood' | 'water' | 'bp_sugar' | 'pain'
  | 'sleep' | 'checkin' | 'voice' | 'activity' | 'meal' | 'doctor'
  | null;

interface HealthLog {
  id: string;
  type: string;
  value: any;
  note?: string;
  logged_at: string;
}

interface Medicine {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const MOODS = [
  { emoji: '😀', label: 'Happy',   value: 'happy',   color: '#10B981' },
  { emoji: '😊', label: 'Good',    value: 'good',    color: '#3B82F6' },
  { emoji: '😐', label: 'Normal',  value: 'normal',  color: '#F59E0B' },
  { emoji: '😔', label: 'Sad',     value: 'sad',     color: '#8B5CF6' },
  { emoji: '😰', label: 'Anxious', value: 'anxious', color: '#F97316' },
  { emoji: '😴', label: 'Tired',   value: 'tired',   color: '#64748B' },
];

const SYMPTOMS = [
  { icon: '🌀', label: 'Dizziness',       value: 'dizziness',       emergency: true  },
  { icon: '💔', label: 'Chest Pain',       value: 'chest_pain',      emergency: true  },
  { icon: '😵', label: 'Weakness',         value: 'weakness',        emergency: true  },
  { icon: '😮‍💨', label: 'Breathlessness', value: 'breathlessness',  emergency: true  },
  { icon: '🌡️', label: 'Fever',            value: 'fever',           emergency: false },
  { icon: '🤕', label: 'Headache',         value: 'headache',        emergency: false },
  { icon: '🤢', label: 'Nausea',           value: 'nausea',          emergency: false },
  { icon: '🦵', label: 'Leg Pain',         value: 'leg_pain',        emergency: false },
  { icon: '👁️', label: 'Blurred Vision',  value: 'blurred_vision',  emergency: true  },
  { icon: '🤧', label: 'Cold / Cough',     value: 'cold_cough',      emergency: false },
];

const SLEEP_OPTIONS = [
  { emoji: '😴', label: 'Slept Well',      value: 'good',        color: '#10B981' },
  { emoji: '😐', label: 'Average',          value: 'average',     color: '#F59E0B' },
  { emoji: '😫', label: "Couldn't Sleep",  value: 'poor',        color: '#EF4444' },
  { emoji: '🌙', label: 'Woke Often',      value: 'interrupted', color: '#8B5CF6' },
];

const WATER_GOAL = 8;

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function logTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function logIcon(type: string): string {
  const map: Record<string, string> = {
    medicine: '💊', mood: '😊', water: '💧', bp: '❤️', sugar: '🩸',
    symptom: '😣', sleep: '😴', checkin: '🌟', voice_note: '🎤',
    activity: '🚶', meal: '🍽️', doctor: '👨‍⚕️',
  };
  return map[type] ?? '📝';
}

// ══════════════════════════════════════════════════════════════════════════════
export default function HealthLogScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, profile } = useAuth();

  // ── UI state
  const [activeModal,  setActiveModal]  = useState<ModalType>(null);
  const [saving,       setSaving]       = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  // ── Data
  const [todayLogs,    setTodayLogs]    = useState<HealthLog[]>([]);
  const [medicines,    setMedicines]    = useState<Medicine[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<HealthLog[]>([]);
  const [waterCount,   setWaterCount]   = useState(0);
  const waterAnim = useRef(new Animated.Value(0)).current;

  // ── BP / Sugar form
  const [bpTab,       setBpTab]       = useState<'bp' | 'sugar'>('bp');
  const [systolic,    setSystolic]    = useState('');
  const [diastolic,   setDiastolic]   = useState('');
  const [sugarValue,  setSugarValue]  = useState('');
  const [bpQuick,     setBpQuick]     = useState<'normal' | 'high' | 'low' | null>(null);
  const [sugarQuick,  setSugarQuick]  = useState<'normal' | 'high' | 'low' | null>(null);

  // ── Pain / Symptoms
  const [painLevel,        setPainLevel]        = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  // ── Sleep
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);
  const [sleepHours,   setSleepHours]   = useState(7);

  // ── Mood / Check-in
  const [selectedMood,   setSelectedMood]   = useState<string | null>(null);
  const [checkinStatus,  setCheckinStatus]  = useState<string | null>(null);

  // ── Voice
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceRecording,  setVoiceRecording]  = useState(false);
  const [voiceParsed,     setVoiceParsed]     = useState<string | null>(null);

  // ── Doctor
  const [doctorName,  setDoctorName]  = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  useEffect(() => { loadTodayData(); }, [user?.id]);

  // ── Load today's logs + medicines ────────────────────────────────────────────
  const loadTodayData = useCallback(async () => {
    if (!user?.id) return;
    const { start, end } = todayRange();
    try {
      const [logsRes, medRes] = await Promise.all([
        supabase
          .from('health_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', start)
          .lte('logged_at', end)
          .order('logged_at', { ascending: false }),
        supabase
          .from('medicines')
          .select('id, name, dosage, frequency')
          .eq('user_id', user.id),
      ]);

      if (logsRes.data) {
        setTodayLogs(logsRes.data);
        const meds = logsRes.data.filter(l => l.type === 'medicine');
        setMedicineLogs(meds);
        const wTotal = logsRes.data
          .filter(l => l.type === 'water')
          .reduce((s, l) => s + (l.value?.glasses ?? 1), 0);
        setWaterCount(wTotal);
        animateWater(wTotal);
      }
      if (medRes.data) setMedicines(medRes.data);
    } catch { /* graceful fail */ }
  }, [user?.id]);

  const animateWater = (count: number) => {
    Animated.timing(waterAnim, {
      toValue: Math.min(count / WATER_GOAL, 1),
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  // ── Save any log ─────────────────────────────────────────────────────────────
  const saveLog = async (type: string, value: any, note?: string): Promise<boolean> => {
    if (!user?.id) return false;
    setSaving(true);
    try {
      const { error } = await supabase.from('health_logs').insert({
        user_id: user.id, type, value, note: note || null,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
      await loadTodayData();
      return true;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save log.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ── Guardian notification ────────────────────────────────────────────────────
  const notifyGuardian = async (message: string) => {
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) return;
      await fetch(`${API_BASE_URL}/guardian/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, type: 'emergency' }),
      });
    } catch { /* fail silently */ }
  };

  // ── Medicine log ─────────────────────────────────────────────────────────────
  const logMedicine = async (med: Medicine, status: 'taken' | 'skipped' | 'later') => {
    const ok = await saveLog('medicine', {
      id: med.id, name: med.name, dosage: med.dosage, status, time: nowTime(),
    });
    if (ok && status === 'skipped') {
      notifyGuardian(`${profile?.firstName ?? 'Elder'} skipped medicine: ${med.name}`);
    }
  };

  // ── Symptom submit ───────────────────────────────────────────────────────────
  const handleSymptomsSubmit = async () => {
    if (selectedSymptoms.length === 0 && painLevel === 0) {
      Alert.alert('Please select a symptom or set pain level.');
      return;
    }
    const emergency = SYMPTOMS.filter(s => selectedSymptoms.includes(s.value) && s.emergency);
    const ok = await saveLog('symptom', {
      painLevel, symptoms: selectedSymptoms, emergency: emergency.length > 0,
    });
    if (!ok) return;
    if (emergency.length > 0) {
      notifyGuardian(
        `⚠️ ALERT: ${profile?.firstName ?? 'Elder'} reported emergency symptoms: ${emergency.map(s => s.label).join(', ')}`
      );
      Alert.alert('🚨 Guardian Notified',
        'Your guardian has been alerted. For emergencies call 112.',
        [{ text: 'OK', onPress: () => { setActiveModal(null); setSelectedSymptoms([]); setPainLevel(0); } }]
      );
    } else {
      Alert.alert('✅ Symptoms logged.');
      setActiveModal(null);
      setSelectedSymptoms([]);
      setPainLevel(0);
    }
  };

  // ── Voice parse ──────────────────────────────────────────────────────────────
  const parseVoiceLog = async (text: string) => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    let parsed = '';
    if (/medicine|tablet|pill|दवाई|दवा|capsule/.test(lower)) {
      parsed = '💊 Medicine taken logged';
      await saveLog('medicine', { status: 'taken', voiceNote: text, time: nowTime() });
    } else if (/water|glass|पानी/.test(lower)) {
      parsed = '💧 Water intake logged (+1 glass)';
      await saveLog('water', { glasses: 1, voiceNote: text });
    } else if (/pain|hurt|ache|दर्द/.test(lower)) {
      parsed = '😣 Pain note logged';
      await saveLog('symptom', { voiceNote: text, source: 'voice' });
    } else if (/happy|good|fine|great|खुश|ठीक/.test(lower)) {
      parsed = '😊 Feeling good logged';
      await saveLog('mood', { mood: 'good', voiceNote: text });
    } else if (/sad|tired|unwell|थका|बुरा/.test(lower)) {
      parsed = '😔 Mood logged';
      await saveLog('mood', { mood: 'tired', voiceNote: text });
    } else {
      parsed = '📝 Note saved';
      await saveLog('voice_note', { note: text });
    }
    setVoiceParsed(parsed);
  };

  // ── Reset form on open ───────────────────────────────────────────────────────
  const openModal = (id: ModalType) => {
    setSelectedMood(null); setSleepQuality(null); setCheckinStatus(null);
    setPainLevel(0); setSelectedSymptoms([]); setBpQuick(null); setSugarQuick(null);
    setSystolic(''); setDiastolic(''); setSugarValue('');
    setVoiceTranscript(''); setVoiceParsed(null);
    setDoctorName(''); setDoctorNotes('');
    setShowFollowUp(false);
    setActiveModal(id);
  };

  // ── Derived stats ────────────────────────────────────────────────────────────
  const todayMood    = todayLogs.find(l => l.type === 'mood');
  const todaySleep   = todayLogs.find(l => l.type === 'sleep');
  const todayCheckin = todayLogs.find(l => l.type === 'checkin');
  const medTaken     = medicineLogs.filter(l => l.value?.status === 'taken').length;
  const medSkipped   = medicineLogs.filter(l => l.value?.status === 'skipped').length;

  const MAIN_CARDS = [
    {
      id: 'medicine' as ModalType,
      emoji: '💊', title: 'Medicine Log',
      subtitle: medicineLogs.length ? `${medTaken} taken · ${medSkipped} skipped` : 'Log your medicines',
      gradient: ['#1E3A5F', '#2B7FC0'] as [string, string],
      done: medTaken > 0,
    },
    {
      id: 'mood' as ModalType,
      emoji: todayMood ? (MOODS.find(m => m.value === todayMood.value?.mood)?.emoji ?? '😊') : '😊',
      title: 'Mood',
      subtitle: todayMood ? `Feeling ${todayMood.value?.mood}` : 'How do you feel?',
      gradient: ['#5B21B6', '#7C3AED'] as [string, string],
      done: !!todayMood,
    },
    {
      id: 'water' as ModalType,
      emoji: '💧', title: 'Water Intake',
      subtitle: `${waterCount} / ${WATER_GOAL} glasses`,
      gradient: ['#0369A1', '#0EA5E9'] as [string, string],
      done: waterCount >= WATER_GOAL,
    },
    {
      id: 'bp_sugar' as ModalType,
      emoji: '❤️', title: 'BP & Sugar',
      subtitle: todayLogs.some(l => l.type === 'bp' || l.type === 'sugar') ? 'Logged today ✓' : 'Log vitals',
      gradient: ['#9F1239', '#E11D48'] as [string, string],
      done: todayLogs.some(l => l.type === 'bp' || l.type === 'sugar'),
    },
    {
      id: 'pain' as ModalType,
      emoji: '😣', title: 'Pain & Symptoms',
      subtitle: todayLogs.some(l => l.type === 'symptom') ? 'Symptoms saved' : 'Any pain today?',
      gradient: ['#C2410C', '#EA580C'] as [string, string],
      done: todayLogs.some(l => l.type === 'symptom'),
    },
    {
      id: 'sleep' as ModalType,
      emoji: '😴', title: 'Sleep Log',
      subtitle: todaySleep ? `${todaySleep.value?.quality} · ${todaySleep.value?.hours}h` : 'How did you sleep?',
      gradient: ['#1E1B4B', '#4338CA'] as [string, string],
      done: !!todaySleep,
    },
    {
      id: 'checkin' as ModalType,
      emoji: '🌟', title: 'Daily Check-In',
      subtitle: todayCheckin ? `Status: ${todayCheckin.value?.status}` : "Today's status",
      gradient: ['#14532D', '#16A34A'] as [string, string],
      done: !!todayCheckin,
    },
    {
      id: 'voice' as ModalType,
      emoji: '🎤', title: 'Voice Log',
      subtitle: 'Speak to log health',
      gradient: ['#92400E', '#D97706'] as [string, string],
      done: todayLogs.some(l => l.type === 'voice_note'),
    },
  ];

  const MORE_CARDS = [
    { id: 'activity' as ModalType, emoji: '🚶', title: 'Activity',      color: '#10B981' },
    { id: 'meal'     as ModalType, emoji: '🍽️', title: 'Meals',         color: '#F59E0B' },
    { id: 'doctor'   as ModalType, emoji: '👨‍⚕️', title: 'Doctor Visit', color: '#3B82F6' },
  ];

  const completedCount = MAIN_CARDS.filter(c => c.done).length;

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Medicine
  // ════════════════════════════════════════════════════════════════════════════
  const renderMedicineModal = () => (
    <Modal visible={activeModal === 'medicine'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>💊 Medicine Log</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={m.body} showsVerticalScrollIndicator={false}>
          {medicines.length === 0 ? (
            <View style={m.empty}>
              <Text style={m.emptyEmoji}>💊</Text>
              <Text style={m.emptyTitle}>No medicines found</Text>
              <Text style={m.emptySub}>Add medicines in the Medicine tab first.</Text>
            </View>
          ) : medicines.map(med => {
            const log    = medicineLogs.find(l => l.value?.id === med.id || l.value?.name === med.name);
            const status = log?.value?.status as string | undefined;
            return (
              <View key={med.id} style={m.medCard}>
                <View style={m.medInfo}>
                  <Text style={m.medName}>{med.name}</Text>
                  {med.dosage ? <Text style={m.medDose}>{med.dosage}</Text> : null}
                </View>
                {status ? (
                  <View style={[m.statusBadge, {
                    backgroundColor: status === 'taken' ? '#DCFCE7' : status === 'skipped' ? '#FEE2E2' : '#FEF3C7',
                  }]}>
                    <Text style={[m.statusText, {
                      color: status === 'taken' ? '#15803D' : status === 'skipped' ? '#DC2626' : '#D97706',
                    }]}>
                      {status === 'taken' ? '✅ Taken' : status === 'skipped' ? '⏭️ Skipped' : '⏰ Reminded'}
                    </Text>
                  </View>
                ) : (
                  <View style={m.medBtns}>
                    <Pressable style={[m.medBtn, { backgroundColor: '#16A34A' }]} onPress={() => logMedicine(med, 'taken')}>
                      <Text style={m.medBtnTxt}>✅ Taken</Text>
                    </Pressable>
                    <Pressable style={[m.medBtn, { backgroundColor: '#DC2626' }]} onPress={() => logMedicine(med, 'skipped')}>
                      <Text style={m.medBtnTxt}>⏭️ Skip</Text>
                    </Pressable>
                    <Pressable style={[m.medBtn, { backgroundColor: '#D97706' }]} onPress={() => logMedicine(med, 'later')}>
                      <Text style={m.medBtnTxt}>⏰ Later</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Mood
  // ════════════════════════════════════════════════════════════════════════════
  const renderMoodModal = () => (
    <Modal visible={activeModal === 'mood'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>😊 How Are You Feeling?</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={m.body}>
          <View style={m.moodGrid}>
            {MOODS.map(mood => (
              <Pressable key={mood.value}
                style={[m.moodBtn, selectedMood === mood.value && { borderColor: mood.color, borderWidth: 3, backgroundColor: mood.color + '22' }]}
                onPress={() => setSelectedMood(mood.value)}
              >
                <Text style={m.moodEmoji}>{mood.emoji}</Text>
                <Text style={m.moodLabel}>{mood.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[m.saveBtn, (!selectedMood || saving) && m.saveBtnOff]}
            disabled={!selectedMood || saving}
            onPress={async () => {
              if (!selectedMood) return;
              const ok = await saveLog('mood', { mood: selectedMood });
              if (ok) { Alert.alert('✅ Mood saved!'); setActiveModal(null); }
            }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnTxt}>Save Mood</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Water
  // ════════════════════════════════════════════════════════════════════════════
  const renderWaterModal = () => (
    <Modal visible={activeModal === 'water'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>💧 Water Intake</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={[m.body, { alignItems: 'center' }]}>
          {/* Animated bottle */}
          <View style={m.bottle}>
            <Animated.View style={[m.bottleFill, {
              height: waterAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
            <View style={m.bottleLabel}>
              <Text style={m.bottleNum}>{waterCount}</Text>
              <Text style={m.bottleGoal}>/ {WATER_GOAL}</Text>
            </View>
          </View>
          <Text style={m.waterGoalTxt}>Daily Goal: {WATER_GOAL} glasses</Text>
          {waterCount >= WATER_GOAL && (
            <Text style={m.waterComplete}>🎉 Goal reached! Great job!</Text>
          )}
          <View style={m.waterCtrl}>
            <Pressable style={m.waterMinus} onPress={async () => {
              if (waterCount <= 0) return;
              const last = todayLogs.find(l => l.type === 'water');
              if (last) { await supabase.from('health_logs').delete().eq('id', last.id); await loadTodayData(); }
            }}>
              <Ionicons name="remove" size={28} color="#64748B" />
            </Pressable>
            <Pressable style={m.waterPlus} onPress={async () => {
              const ok = await saveLog('water', { glasses: 1 });
              if (ok) animateWater(waterCount + 1);
            }}>
              <Text style={m.waterPlusTxt}>+ 1 Glass 💧</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: BP / Sugar
  // ════════════════════════════════════════════════════════════════════════════
  const renderBPSugarModal = () => (
    <Modal visible={activeModal === 'bp_sugar'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>❤️ BP & Blood Sugar</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={m.body}>
          {/* Tabs */}
          <View style={m.tabRow}>
            {(['bp', 'sugar'] as const).map(t => (
              <Pressable key={t} style={[m.tab, bpTab === t && m.tabOn]} onPress={() => setBpTab(t)}>
                <Text style={[m.tabTxt, bpTab === t && m.tabTxtOn]}>
                  {t === 'bp' ? '🩺 Blood Pressure' : '🩸 Blood Sugar'}
                </Text>
              </Pressable>
            ))}
          </View>

          {bpTab === 'bp' ? (
            <>
              <Text style={m.label}>Quick Entry</Text>
              <View style={m.quickRow}>
                {(['normal', 'high', 'low'] as const).map(q => (
                  <Pressable key={q} style={[m.quickBtn,
                    bpQuick === q && { borderWidth: 2, borderColor: q === 'normal' ? '#10B981' : q === 'high' ? '#EF4444' : '#3B82F6',
                      backgroundColor: q === 'normal' ? '#DCFCE7' : q === 'high' ? '#FEE2E2' : '#DBEAFE' }
                  ]} onPress={() => { setBpQuick(q); setSystolic(''); setDiastolic(''); }}>
                    <Text style={m.quickEmoji}>{q === 'normal' ? '✅' : q === 'high' ? '⬆️' : '⬇️'}</Text>
                    <Text style={m.quickTxt}>{q[0].toUpperCase() + q.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={m.orLine}>— or enter reading —</Text>
              <View style={m.bpRow}>
                <View style={m.bpBox}>
                  <Text style={m.bpBoxLabel}>Systolic</Text>
                  <TextInput style={m.bpField} keyboardType="number-pad" value={systolic} maxLength={3}
                    onChangeText={v => { setSystolic(v); setBpQuick(null); }} placeholder="120" placeholderTextColor="#94A3B8" />
                  <Text style={m.bpUnit}>mmHg</Text>
                </View>
                <Text style={m.bpSlash}>/</Text>
                <View style={m.bpBox}>
                  <Text style={m.bpBoxLabel}>Diastolic</Text>
                  <TextInput style={m.bpField} keyboardType="number-pad" value={diastolic} maxLength={3}
                    onChangeText={v => { setDiastolic(v); setBpQuick(null); }} placeholder="80" placeholderTextColor="#94A3B8" />
                  <Text style={m.bpUnit}>mmHg</Text>
                </View>
              </View>
              <Pressable style={m.saveBtn} disabled={saving} onPress={async () => {
                const val: any = {};
                if (bpQuick) val.status = bpQuick;
                if (systolic)  val.systolic  = parseInt(systolic);
                if (diastolic) val.diastolic = parseInt(diastolic);
                const ok = await saveLog('bp', val);
                if (ok) { Alert.alert('✅ Blood pressure logged!'); setActiveModal(null); }
              }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnTxt}>Save BP</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={m.label}>Quick Entry</Text>
              <View style={m.quickRow}>
                {(['normal', 'high', 'low'] as const).map(q => (
                  <Pressable key={q} style={[m.quickBtn,
                    sugarQuick === q && { borderWidth: 2, borderColor: q === 'normal' ? '#10B981' : q === 'high' ? '#EF4444' : '#3B82F6',
                      backgroundColor: q === 'normal' ? '#DCFCE7' : q === 'high' ? '#FEE2E2' : '#DBEAFE' }
                  ]} onPress={() => { setSugarQuick(q); setSugarValue(''); }}>
                    <Text style={m.quickEmoji}>{q === 'normal' ? '✅' : q === 'high' ? '⬆️' : '⬇️'}</Text>
                    <Text style={m.quickTxt}>{q[0].toUpperCase() + q.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={m.orLine}>— or enter reading —</Text>
              <View style={m.sugarWrap}>
                <TextInput style={m.sugarField} keyboardType="number-pad" value={sugarValue} maxLength={4}
                  onChangeText={v => { setSugarValue(v); setSugarQuick(null); }} placeholder="100" placeholderTextColor="#94A3B8" />
                <Text style={m.sugarUnit}>mg/dL</Text>
              </View>
              <Pressable style={m.saveBtn} disabled={saving} onPress={async () => {
                const val: any = {};
                if (sugarQuick) val.status = sugarQuick;
                if (sugarValue) val.value  = parseInt(sugarValue);
                const ok = await saveLog('sugar', val);
                if (ok) { Alert.alert('✅ Blood sugar logged!'); setActiveModal(null); }
              }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnTxt}>Save Sugar</Text>}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Pain & Symptoms
  // ════════════════════════════════════════════════════════════════════════════
  const renderPainModal = () => {
    const hasEmergency = selectedSymptoms.some(sv => SYMPTOMS.find(s => s.value === sv)?.emergency);
    return (
      <Modal visible={activeModal === 'pain'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
        <View style={m.sheet}>
          <View style={m.handle} />
          <View style={m.head}>
            <Text style={m.headTitle}>😣 Pain & Symptoms</Text>
            <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
          </View>
          <ScrollView style={m.body} showsVerticalScrollIndicator={false}>
            <Text style={m.label}>Pain Level (0 = None · 10 = Severe)</Text>
            <View style={m.painScale}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <Pressable key={n} style={[m.painDot,
                  painLevel === n && { backgroundColor: n <= 3 ? '#10B981' : n <= 6 ? '#F59E0B' : '#EF4444', transform: [{ scale: 1.25 }] }
                ]} onPress={() => setPainLevel(n)}>
                  <Text style={[m.painDotTxt, painLevel === n && { color: '#fff', fontWeight: '900' }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={m.painDesc}>
              {painLevel === 0 ? '😊 No pain' : painLevel <= 3 ? '🟡 Mild' : painLevel <= 6 ? '🟠 Moderate' : '🔴 Severe pain'}
            </Text>

            <Text style={[m.label, { marginTop: 22 }]}>Symptoms (tap to select)</Text>
            <View style={m.symptomGrid}>
              {SYMPTOMS.map(s => (
                <Pressable key={s.value}
                  style={[m.symptomChip,
                    selectedSymptoms.includes(s.value) && {
                      backgroundColor: s.emergency ? '#FEE2E2' : '#DBEAFE',
                      borderColor:     s.emergency ? '#EF4444' : '#3B82F6',
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => setSelectedSymptoms(p =>
                    p.includes(s.value) ? p.filter(x => x !== s.value) : [...p, s.value]
                  )}
                >
                  <Text style={m.symptomIcon}>{s.icon}</Text>
                  <Text style={m.symptomTxt}>{s.label}</Text>
                  {s.emergency && <View style={m.emergencyDot} />}
                </Pressable>
              ))}
            </View>

            {hasEmergency && (
              <View style={m.emergencyBox}>
                <Ionicons name="warning-outline" size={20} color="#DC2626" />
                <Text style={m.emergencyTxt}>Emergency symptoms selected — guardian will be notified immediately!</Text>
              </View>
            )}

            <Pressable style={[m.saveBtn, { marginTop: 20 }]} disabled={saving} onPress={handleSymptomsSubmit}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnTxt}>Save Symptoms</Text>}
            </Pressable>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Sleep
  // ════════════════════════════════════════════════════════════════════════════
  const renderSleepModal = () => (
    <Modal visible={activeModal === 'sleep'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>😴 Sleep Log</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={m.body}>
          <Text style={m.label}>How did you sleep last night?</Text>
          <View style={m.sleepGrid}>
            {SLEEP_OPTIONS.map(opt => (
              <Pressable key={opt.value}
                style={[m.sleepBtn, sleepQuality === opt.value && { borderColor: opt.color, borderWidth: 3, backgroundColor: opt.color + '22' }]}
                onPress={() => setSleepQuality(opt.value)}
              >
                <Text style={m.sleepEmoji}>{opt.emoji}</Text>
                <Text style={m.sleepTxt}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[m.label, { marginTop: 22 }]}>Hours slept: {sleepHours}h</Text>
          <View style={m.hoursRow}>
            <Pressable style={m.hoursBtn} onPress={() => setSleepHours(h => Math.max(1, h - 1))}>
              <Ionicons name="remove-circle-outline" size={36} color="#64748B" />
            </Pressable>
            <Text style={m.hoursVal}>{sleepHours}h</Text>
            <Pressable style={m.hoursBtn} onPress={() => setSleepHours(h => Math.min(14, h + 1))}>
              <Ionicons name="add-circle-outline" size={36} color="#4338CA" />
            </Pressable>
          </View>
          <Pressable style={[m.saveBtn, (!sleepQuality || saving) && m.saveBtnOff]}
            disabled={!sleepQuality || saving}
            onPress={async () => {
              const ok = await saveLog('sleep', { quality: sleepQuality, hours: sleepHours });
              if (ok) { Alert.alert('✅ Sleep logged!'); setActiveModal(null); }
            }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnTxt}>Save Sleep Log</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Daily Check-In
  // ════════════════════════════════════════════════════════════════════════════
  const renderCheckinModal = () => (
    <Modal visible={activeModal === 'checkin'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>🌟 Daily Check-In</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={m.body}>
          <Text style={m.checkinQ}>How are you today?</Text>
          <View style={m.checkinRow}>
            {[
              { label: 'Good',     emoji: '😊', value: 'good',     color: '#10B981' },
              { label: 'Okay',     emoji: '😐', value: 'okay',     color: '#F59E0B' },
              { label: 'Not Well', emoji: '😔', value: 'not_well', color: '#EF4444' },
            ].map(opt => (
              <Pressable key={opt.value}
                style={[m.checkinBtn, checkinStatus === opt.value && { borderColor: opt.color, borderWidth: 3, backgroundColor: opt.color + '22' }]}
                onPress={async () => {
                  setCheckinStatus(opt.value);
                  if (opt.value === 'not_well') { setShowFollowUp(true); return; }
                  const ok = await saveLog('checkin', { status: opt.value });
                  if (ok) { Alert.alert(`${opt.emoji} Logged! Take care.`); setActiveModal(null); }
                }}
              >
                <Text style={m.checkinEmoji}>{opt.emoji}</Text>
                <Text style={m.checkinTxt}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {showFollowUp && (
            <View style={m.followBox}>
              <Text style={m.followQ}>What's bothering you?</Text>
              <View style={m.followChips}>
                {['Headache', 'Fever', 'Tiredness', 'Body Pain', 'Chest Pain', 'Nausea', 'Other'].map(s => (
                  <Pressable key={s} style={m.followChip} onPress={async () => {
                    const ok = await saveLog('checkin', { status: 'not_well', complaint: s });
                    if (s === 'Chest Pain') notifyGuardian(`⚠️ ${profile?.firstName ?? 'Elder'} is not well: ${s}`);
                    if (ok) { Alert.alert('😔 Noted. Please rest and stay safe.'); setActiveModal(null); setShowFollowUp(false); }
                  }}>
                    <Text style={m.followChipTxt}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Voice Log
  // ════════════════════════════════════════════════════════════════════════════
  const renderVoiceModal = () => (
    <Modal visible={activeModal === 'voice'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>🎤 Voice Log</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={[m.body, { alignItems: 'center' }]}>
          <Text style={m.voiceHint}>Speak or type to log your health</Text>
          <View style={m.voiceExamples}>
            {['"I took my medicine"', '"Drank 2 glasses of water"', '"I have a headache"', '"Feeling happy today"'].map(e => (
              <View key={e} style={m.voiceEx}><Text style={m.voiceExTxt}>{e}</Text></View>
            ))}
          </View>
          <Pressable style={[m.micBtn, voiceRecording && m.micBtnOn]} onPress={() => {
            setVoiceRecording(r => !r);
            if (voiceRecording) return;
            setTimeout(() => {
              setVoiceRecording(false);
              Alert.alert('Voice', 'Full voice recording is available when connected to the backend. Type your log below.');
            }, 2000);
          }}>
            <Ionicons name={voiceRecording ? 'stop-circle' : 'mic'} size={52} color="#fff" />
            <Text style={m.micTxt}>{voiceRecording ? 'Listening...' : 'Tap to Speak'}</Text>
          </Pressable>

          <Text style={m.orLine}>— or type below —</Text>
          <TextInput style={m.voiceInput} multiline value={voiceTranscript} onChangeText={setVoiceTranscript}
            placeholder='"I took my metformin tablet"' placeholderTextColor="#94A3B8" />
          {voiceParsed ? (
            <View style={m.parsedBox}>
              <Text style={m.parsedTxt}>✅ {voiceParsed}</Text>
            </View>
          ) : null}
          <Pressable style={[m.saveBtn, { marginTop: 14, width: '100%' }, (!voiceTranscript.trim() || saving) && m.saveBtnOff]}
            disabled={!voiceTranscript.trim() || saving}
            onPress={() => parseVoiceLog(voiceTranscript)}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnTxt}>Log This</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Activity
  // ════════════════════════════════════════════════════════════════════════════
  const renderActivityModal = () => (
    <Modal visible={activeModal === 'activity'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>🚶 Activity Log</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={m.body}>
          <Text style={m.label}>What did you do today?</Text>
          <View style={m.actGrid}>
            {[
              { emoji: '🚶', label: 'Walked',    value: 'walk'     },
              { emoji: '🏃', label: 'Jogged',    value: 'jog'      },
              { emoji: '🧘', label: 'Yoga',      value: 'yoga'     },
              { emoji: '🏋️', label: 'Exercise',  value: 'exercise' },
              { emoji: '🚴', label: 'Cycling',   value: 'cycling'  },
              { emoji: '💃', label: 'Dancing',   value: 'dance'    },
            ].map(act => (
              <Pressable key={act.value} style={m.actBtn} onPress={async () => {
                const ok = await saveLog('activity', { activity: act.value, label: act.label });
                if (ok) { Alert.alert(`${act.emoji} ${act.label} logged! Keep it up!`); setActiveModal(null); }
              }}>
                <Text style={m.actEmoji}>{act.emoji}</Text>
                <Text style={m.actTxt}>{act.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Meal
  // ════════════════════════════════════════════════════════════════════════════
  const renderMealModal = () => (
    <Modal visible={activeModal === 'meal'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>🍽️ Meal Log</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={m.body}>
          <Text style={m.label}>Which meal did you have?</Text>
          {[
            { emoji: '🌅', label: 'Breakfast', value: 'breakfast', time: 'Morning'  },
            { emoji: '☀️', label: 'Lunch',     value: 'lunch',     time: 'Afternoon'},
            { emoji: '🌙', label: 'Dinner',    value: 'dinner',    time: 'Evening'  },
            { emoji: '🍎', label: 'Snack',     value: 'snack',     time: 'Any time' },
          ].map(meal => {
            const done = todayLogs.some(l => l.type === 'meal' && l.value?.meal === meal.value);
            return (
              <Pressable key={meal.value} style={[m.mealRow, done && { opacity: 0.6 }]} onPress={async () => {
                if (done) return;
                const ok = await saveLog('meal', { meal: meal.value, label: meal.label, time: nowTime() });
                if (ok) { Alert.alert(`${meal.emoji} ${meal.label} logged!`); setActiveModal(null); }
              }}>
                <Text style={m.mealEmoji}>{meal.emoji}</Text>
                <View style={m.mealInfo}>
                  <Text style={m.mealTxt}>{meal.label}</Text>
                  <Text style={m.mealTime}>{meal.time}</Text>
                </View>
                {done
                  ? <View style={m.doneBadge}><Text style={m.doneTxt}>✅ Done</Text></View>
                  : <Ionicons name="add-circle-outline" size={30} color="#16A34A" />
                }
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODAL: Doctor Visit
  // ════════════════════════════════════════════════════════════════════════════
  const renderDoctorModal = () => (
    <Modal visible={activeModal === 'doctor'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal(null)}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.head}>
          <Text style={m.headTitle}>👨‍⚕️ Doctor Visit</Text>
          <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={28} color="#64748B" /></Pressable>
        </View>
        <View style={m.body}>
          <Text style={m.label}>Doctor Name</Text>
          <TextInput style={m.textField} value={doctorName} onChangeText={setDoctorName}
            placeholder="e.g. Dr. Sharma" placeholderTextColor="#94A3B8" />
          <Text style={[m.label, { marginTop: 16 }]}>Visit Notes</Text>
          <TextInput style={[m.textField, { height: 110, textAlignVertical: 'top' }]}
            value={doctorNotes} onChangeText={setDoctorNotes} multiline
            placeholder="What did the doctor say? Any new medicines or advice?" placeholderTextColor="#94A3B8" />
          <Pressable style={[m.saveBtn, (!doctorName.trim() || saving) && m.saveBtnOff]}
            disabled={!doctorName.trim() || saving}
            onPress={async () => {
              const ok = await saveLog('doctor', { doctorName, notes: doctorNotes, date: new Date().toDateString() });
              if (ok) { Alert.alert('✅ Doctor visit logged!'); setActiveModal(null); }
            }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnTxt}>Save Visit</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient colors={['#1E3A5F', '#2B7FC0']} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>🏥 Health Log</Text>
            <Text style={s.headerDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <Pressable style={s.backBtn} onPress={loadTodayData}>
            <Ionicons name="refresh-outline" size={22} color="#fff" />
          </Pressable>
        </View>
        {/* Progress */}
        <View style={s.progWrap}>
          <View style={s.progBar}>
            <View style={[s.progFill, { width: `${Math.round((completedCount / MAIN_CARDS.length) * 100)}%` as any }]} />
          </View>
          <Text style={s.progTxt}>{completedCount}/{MAIN_CARDS.length} logs done today</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 90 }]}>

        {/* ── Main 8 cards ── */}
        <Text style={s.secTitle}>Quick Log</Text>
        <View style={s.grid}>
          {MAIN_CARDS.map(card => (
            <Pressable key={card.id} style={s.card} onPress={() => openModal(card.id)}>
              <LinearGradient colors={card.gradient} style={s.cardGrad}>
                {card.done && (
                  <View style={s.doneCheck}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </View>
                )}
                <Text style={s.cardEmoji}>{card.emoji}</Text>
                <Text style={s.cardTitle}>{card.title}</Text>
                <Text style={s.cardSub} numberOfLines={1}>{card.subtitle}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* ── More logs ── */}
        <Text style={s.secTitle}>More Logs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moreRow}>
          {MORE_CARDS.map(card => (
            <Pressable key={card.id} style={[s.moreCard, { borderLeftColor: card.color }]} onPress={() => openModal(card.id)}>
              <Text style={s.moreEmoji}>{card.emoji}</Text>
              <Text style={s.moreTxt}>{card.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginTop: 4 }} />
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Today's Timeline ── */}
        {todayLogs.length > 0 && (
          <>
            <Text style={s.secTitle}>Today's Timeline</Text>
            <View style={s.timeline}>
              {todayLogs.slice(0, 12).map((log, i) => (
                <View key={log.id} style={s.tlItem}>
                  <View style={s.tlLeft}>
                    <View style={s.tlDot} />
                    {i < Math.min(todayLogs.length - 1, 11) && <View style={s.tlLine} />}
                  </View>
                  <View style={s.tlContent}>
                    <View style={s.tlRow}>
                      <Text style={s.tlIcon}>{logIcon(log.type)}</Text>
                      <Text style={s.tlType}>{log.type.replace(/_/g, ' ').toUpperCase()}</Text>
                      <Text style={s.tlTime}>{logTime(log.logged_at)}</Text>
                    </View>
                    <Text style={s.tlDetail} numberOfLines={1}>
                      {log.value
                        ? Object.entries(log.value)
                            .filter(([k]) => !['id', 'source'].includes(k))
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')
                            .substring(0, 70)
                        : log.note || '—'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {todayLogs.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🌅</Text>
            <Text style={s.emptyTitle}>No logs yet today</Text>
            <Text style={s.emptySub}>Tap any card above to start tracking your health</Text>
          </View>
        )}
      </ScrollView>

      {/* ── All Modals ── */}
      {renderMedicineModal()}
      {renderMoodModal()}
      {renderWaterModal()}
      {renderBPSugarModal()}
      {renderPainModal()}
      {renderSleepModal()}
      {renderCheckinModal()}
      {renderVoiceModal()}
      {renderActivityModal()}
      {renderMealModal()}
      {renderDoctorModal()}
    </View>
  );
}

// ── Main screen styles ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F0F4F8' },
  header:      { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerDate:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  progWrap: { gap: 6 },
  progBar:  { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  progTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textAlign: 'right' },

  body:    { paddingHorizontal: 14, paddingTop: 18 },
  secTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 12, marginTop: 4 },

  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card:    { width: '47%', borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
  cardGrad:  { padding: 16, minHeight: 110, justifyContent: 'flex-end', position: 'relative' },
  doneCheck: { position: 'absolute', top: 10, right: 10 },
  cardEmoji: { fontSize: 32, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
  cardSub:   { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },

  moreRow:  { paddingRight: 14, gap: 10, paddingBottom: 24 },
  moreCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, minWidth: 130, alignItems: 'center', borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  moreEmoji: { fontSize: 30, marginBottom: 6 },
  moreTxt:   { fontSize: 13, fontWeight: '800', color: '#1E293B' },

  timeline:  { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  tlItem:    { flexDirection: 'row', marginBottom: 4 },
  tlLeft:    { alignItems: 'center', marginRight: 12, width: 16 },
  tlDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2B7FC0', marginTop: 4 },
  tlLine:    { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginVertical: 2 },
  tlContent: { flex: 1, paddingBottom: 14 },
  tlRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tlIcon:    { fontSize: 16 },
  tlType:    { fontSize: 11, fontWeight: '900', color: '#2B7FC0', flex: 1 },
  tlTime:    { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  tlDetail:  { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  emptySub:   { fontSize: 14, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
});

// ── Modal styles ───────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  sheet:  { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  head:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  body:      { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  label:     { fontSize: 14, fontWeight: '800', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  saveBtn:    { backgroundColor: '#1E3A5F', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  saveBtnOff: { backgroundColor: '#CBD5E1' },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },

  empty:      { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: '#1E293B' },
  emptySub:   { fontSize: 14, color: '#94A3B8', marginTop: 4, textAlign: 'center' },

  // Medicine
  medCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginBottom: 10 },
  medInfo:    { flex: 1 },
  medName:    { fontSize: 17, fontWeight: '900', color: '#1E293B' },
  medDose:    { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '600' },
  medBtns:    { flexDirection: 'row', gap: 6 },
  medBtn:     { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  medBtnTxt:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  statusBadge:{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '800' },

  // Mood
  moodGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 },
  moodBtn:   { width: '28%', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, paddingVertical: 18, borderWidth: 2, borderColor: 'transparent' },
  moodEmoji: { fontSize: 38 },
  moodLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 6 },

  // Water bottle
  bottle:     { width: 120, height: 200, borderRadius: 24, borderWidth: 3, borderColor: '#0EA5E9', backgroundColor: '#F0F9FF', overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 12, position: 'relative' },
  bottleFill: { width: '100%', backgroundColor: '#38BDF8', position: 'absolute', bottom: 0 },
  bottleLabel: { position: 'absolute', width: '100%', alignItems: 'center', justifyContent: 'center', top: '35%' },
  bottleNum:  { fontSize: 42, fontWeight: '900', color: '#0369A1' },
  bottleGoal: { fontSize: 16, fontWeight: '700', color: '#0369A1' },
  waterGoalTxt: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  waterComplete:{ fontSize: 16, fontWeight: '900', color: '#10B981', marginBottom: 16 },
  waterCtrl:  { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  waterMinus: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  waterPlus:  { backgroundColor: '#0EA5E9', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 16 },
  waterPlusTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },

  // BP/Sugar
  tabRow:   { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 20 },
  tab:      { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  tabOn:    { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabTxt:   { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabTxtOn: { color: '#1E293B', fontWeight: '900' },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  quickBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  quickEmoji:{ fontSize: 22 },
  quickTxt: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 4 },
  orLine:   { textAlign: 'center', fontSize: 13, color: '#94A3B8', fontWeight: '700', marginVertical: 12 },
  bpRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bpBox:    { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14 },
  bpBoxLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  bpField:  { fontSize: 32, fontWeight: '900', color: '#1E293B', textAlign: 'center', width: '100%' },
  bpUnit:   { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 4 },
  bpSlash:  { fontSize: 32, fontWeight: '300', color: '#CBD5E1' },
  sugarWrap:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, marginBottom: 10, gap: 10 },
  sugarField:{ fontSize: 40, fontWeight: '900', color: '#1E293B', textAlign: 'center', minWidth: 100 },
  sugarUnit: { fontSize: 16, fontWeight: '700', color: '#64748B' },

  // Pain
  painScale: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  painDot:   { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  painDotTxt:{ fontSize: 16, fontWeight: '700', color: '#1E293B' },
  painDesc:  { fontSize: 15, fontWeight: '800', color: '#64748B', marginTop: 4 },
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symptomChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  symptomIcon: { fontSize: 20 },
  symptomTxt:  { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  emergencyDot:{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444', position: 'absolute', top: 6, right: 6 },
  emergencyBox:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 14, padding: 12, marginTop: 16 },
  emergencyTxt:{ flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '700', lineHeight: 18 },

  // Sleep
  sleepGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  sleepBtn:  { width: '47%', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, paddingVertical: 18, borderWidth: 2, borderColor: 'transparent' },
  sleepEmoji:{ fontSize: 34 },
  sleepTxt:  { fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 6 },
  hoursRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20 },
  hoursBtn:  { padding: 4 },
  hoursVal:  { fontSize: 40, fontWeight: '900', color: '#4338CA', minWidth: 80, textAlign: 'center' },

  // Check-in
  checkinQ:   { fontSize: 22, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: 28 },
  checkinRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
  checkinBtn: { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, paddingVertical: 22, borderWidth: 2, borderColor: 'transparent' },
  checkinEmoji: { fontSize: 38 },
  checkinTxt: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 8 },
  followBox:  { backgroundColor: '#FEF9C3', borderRadius: 18, padding: 16 },
  followQ:    { fontSize: 15, fontWeight: '800', color: '#92400E', marginBottom: 12 },
  followChips:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  followChip: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  followChipTxt: { fontSize: 13, fontWeight: '700', color: '#92400E' },

  // Voice
  voiceHint:  { fontSize: 16, fontWeight: '700', color: '#64748B', textAlign: 'center', marginBottom: 16 },
  voiceExamples: { gap: 6, marginBottom: 24, width: '100%' },
  voiceEx:    { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  voiceExTxt: { fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'center', fontStyle: 'italic' },
  micBtn:     { width: 120, height: 120, borderRadius: 60, backgroundColor: '#2B7FC0', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 20, elevation: 6, shadowColor: '#2B7FC0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
  micBtnOn:   { backgroundColor: '#DC2626' },
  micTxt:     { fontSize: 12, fontWeight: '800', color: '#fff' },
  voiceInput: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, fontSize: 15, color: '#1E293B', minHeight: 70, fontWeight: '600' },
  parsedBox:  { backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12, marginTop: 10, width: '100%' },
  parsedTxt:  { fontSize: 14, fontWeight: '800', color: '#15803D', textAlign: 'center' },

  // Activity
  actGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actBtn:   { width: '30%', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 16, paddingVertical: 18, borderWidth: 2, borderColor: '#BBF7D0' },
  actEmoji: { fontSize: 32 },
  actTxt:   { fontSize: 12, fontWeight: '800', color: '#15803D', marginTop: 6 },

  // Meal
  mealRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 10, gap: 12 },
  mealEmoji: { fontSize: 30, width: 40, textAlign: 'center' },
  mealInfo:  { flex: 1 },
  mealTxt:   { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  mealTime:  { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  doneBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  doneTxt:   { fontSize: 13, fontWeight: '800', color: '#15803D' },

  // Doctor
  textField: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, fontSize: 15, color: '#1E293B', fontWeight: '600', marginBottom: 4 },
});
