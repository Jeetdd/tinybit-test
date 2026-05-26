import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { broadcastGuardianUpdate, notifyElder } from '../services/pushNotifications';
import { supabase } from '../utils/supabase';

type Section = 'Morning' | 'Afternoon' | 'Night';

export type MedicineRow = {
  id: string;
  name?: string | null;
  dosage?: string | null;
  dosage_unit?: string | null;
  instruction?: string | null;
  time?: string | null;
  schedule_time?: string | null;
  days_of_week?: number[] | null;
  stock?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  prescribed_by?: string | null;
  doctor_phone?: string | null;
};

const SECTION_TIMES: Record<Section, string[]> = {
  Morning:   ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM'],
  Afternoon: ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
  Night:     ['7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'],
};

const SECTION_CONFIG = {
  Morning:   { icon: '🌅', color: '#FF8C42', gradient: ['#FF8C42', '#FFA96A'] as [string, string] },
  Afternoon: { icon: '☀️', color: '#1F7BD7', gradient: ['#1F7BD7', '#4FA3E0'] as [string, string] },
  Night:     { icon: '🌙', color: '#6B5CD9', gradient: ['#4A3A8C', '#6B5CD9'] as [string, string] },
};

const DURATION_OPTIONS = [
  { label: 'Ongoing',  days: null },
  { label: '7 Days',   days: 7    },
  { label: '14 Days',  days: 14   },
  { label: '1 Month',  days: 30   },
  { label: '3 Months', days: 90   },
  { label: 'Custom',   days: -1   },
];

const DOSE_UNITS = ['tablet', 'capsule', 'mg', 'ml', 'drop'];
const DAYS_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function resolveSection(value: unknown): Section {
  if (value === 'Morning' || value === 'Afternoon' || value === 'Night') return value;
  return 'Morning';
}

function detectDurationKey(start?: string | null, end?: string | null): { key: string; custom: string } {
  if (!end) return { key: 'Ongoing', custom: '' };
  const s = start ? new Date(start) : new Date();
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const match = DURATION_OPTIONS.find((o) => o.days === days);
  if (match) return { key: match.label, custom: '' };
  return { key: 'Custom', custom: String(days) };
}

async function cancelNotifications(notesJson: string | null | undefined) {
  if (!notesJson || Constants.executionEnvironment === 'storeClient') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const ids: string[] = JSON.parse(notesJson)?.notif_ids ?? [];
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  } catch {}
}

async function scheduleNotification(
  medicineName: string,
  detail: string,
  timeStr: string,
  days: number[],
): Promise<string[]> {
  try {
    if (Constants.executionEnvironment === 'storeClient') return [];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    const perms = await Notifications.requestPermissionsAsync();
    if (!(perms as any).granted) return [];

    const [timePart, period] = timeStr.split(' ');
    const [rawH, rawM] = timePart.split(':').map(Number);
    let hour = rawH;
    if (period === 'PM' && rawH !== 12) hour = rawH + 12;
    if (period === 'AM' && rawH === 12) hour = 0;
    const minute = rawM ?? 0;

    const content = {
      title: '💊 Medicine Reminder',
      body: `${medicineName} — ${detail}`,
      sound: true as const,
      android: { channelId: 'medicine-reminders' },
    };
    const ids: string[] = [];
    if (days.length === 7) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
      ids.push(id);
    } else {
      for (const day of days) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute },
        });
        ids.push(id);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

interface Props {
  visible: boolean;
  medicine: MedicineRow | null;
  onClose: () => void;
  onUpdated: () => void;
  /** When set, guardian is editing/deleting medicine on behalf of this elder */
  targetUserId?: string;
}

export default function EditMedicineModal({ visible, medicine, onClose, onUpdated, targetUserId }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const ownerId = targetUserId ?? user?.id;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState('tablet');
  const [section, setSection] = useState<Section>('Morning');
  const [selectedTime, setSelectedTime] = useState('8:00 AM');
  const [meal, setMeal] = useState('After Meal');
  const [durationKey, setDurationKey] = useState('Ongoing');
  const [customDays, setCustomDays] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>(ALL_DAYS);
  const [stockCount, setStockCount] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!medicine) return;
    setName(medicine.name ?? '');
    const rawDosage = (medicine.dosage ?? '').split(' ')[0] ?? '';
    setDosage(rawDosage);
    setDosageUnit(medicine.dosage_unit ?? 'tablet');
    const sec = resolveSection(medicine.schedule_time);
    setSection(sec);
    const t = medicine.time ?? SECTION_TIMES[sec][2];
    setSelectedTime(SECTION_TIMES[sec].includes(t) ? t : SECTION_TIMES[sec][2]);
    setMeal(medicine.instruction ?? 'After Meal');
    setSelectedDays((medicine.days_of_week ?? ALL_DAYS).filter((d) => d >= 0 && d <= 6));
    const { key, custom } = detectDurationKey(medicine.start_date, medicine.end_date);
    setDurationKey(key);
    setCustomDays(custom);
    setDoctorName(medicine.prescribed_by ?? '');
    setDoctorPhone(medicine.doctor_phone ?? '');
    const s = medicine.stock;
    setStockCount(s != null && s < 99 ? String(s) : '');
  }, [medicine]);

  const handleSectionChange = (s: Section) => {
    setSection(s);
    if (!SECTION_TIMES[s].includes(selectedTime)) {
      setSelectedTime(SECTION_TIMES[s][2]);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim() || selectedDays.length === 0 || !medicine) return;
    setLoading(true);
    try {
      let endDate: string | null = null;
      if (durationKey !== 'Ongoing') {
        const option = DURATION_OPTIONS.find((o) => o.label === durationKey);
        let days = option?.days ?? null;
        if (durationKey === 'Custom' && customDays) days = parseInt(customDays, 10);
        if (days && days > 0) {
          const end = new Date();
          end.setDate(end.getDate() + days - 1);
          endDate = end.toISOString().split('T')[0];
        }
      }

      await cancelNotifications(medicine.notes);
      const detail = `${dosage.trim()} ${dosageUnit} · ${meal}`;
      const notifIds = await scheduleNotification(name.trim(), detail, selectedTime, selectedDays);

      const { error } = await supabase
        .from('medicines')
        .update({
          name:          name.trim(),
          dosage:        `${dosage.trim()} ${dosageUnit}`,
          dosage_unit:   dosageUnit,
          schedule_time: section,
          time:          selectedTime,
          instruction:   meal,
          days_of_week:  selectedDays,
          end_date:      endDate,
          prescribed_by: doctorName.trim() || null,
          doctor_phone:  doctorPhone.trim() || null,
          notes:         notifIds.length ? JSON.stringify({ notif_ids: notifIds }) : null,
          stock:         stockCount.trim() ? parseInt(stockCount, 10) : 0,
        })
        .eq('id', medicine.id)
        .eq('user_id', ownerId);

      if (error) throw error;

      if (targetUserId) {
        broadcastGuardianUpdate(targetUserId, 'medicine-update');
        notifyElder(
          targetUserId,
          '💊 Medicine Updated',
          `${name.trim()} has been updated by your guardian`,
        );
      }

      onUpdated();
      onClose();
    } catch (err) {
      console.error('Update medicine error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medicine',
      `Remove "${medicine?.name}" from your medicines?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!medicine) return;
            setDeleting(true);
            try {
              await cancelNotifications(medicine.notes);
              const { error } = await supabase
                .from('medicines')
                .delete()
                .eq('id', medicine.id)
                .eq('user_id', ownerId);
              if (error) throw error;

              if (targetUserId) {
                broadcastGuardianUpdate(targetUserId, 'medicine-delete');
                notifyElder(
                  targetUserId,
                  '💊 Medicine Removed',
                  `${medicine.name} has been removed from your schedule by your guardian`,
                );
              }

              onUpdated();
              onClose();
            } catch (err) {
              console.error('Delete medicine error', err);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const canSave = name.trim().length > 0 && dosage.trim().length > 0 && selectedDays.length > 0;
  const cfg = SECTION_CONFIG[section];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#2B3C86', '#2E9CD6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Medicine</Text>
          <Pressable onPress={handleDelete} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Medicine Name */}
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Metformin, Vitamin D, Aspirin"
            placeholderTextColor="#B0BBC8"
            value={name}
            onChangeText={setName}
          />

          {/* Dose */}
          <Text style={[styles.label, { marginTop: 20 }]}>Dose *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1, 500, 10"
            placeholderTextColor="#B0BBC8"
            keyboardType="decimal-pad"
            value={dosage}
            onChangeText={setDosage}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
              {DOSE_UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setDosageUnit(u)}
                  style={[styles.chip, dosageUnit === u && styles.chipActive]}
                >
                  <Text style={[styles.chipText, dosageUnit === u && styles.chipTextActive]}>{u}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Time of Day */}
          <Text style={[styles.label, { marginTop: 20 }]}>Time of Day</Text>
          <View style={styles.row3}>
            {(['Morning', 'Afternoon', 'Night'] as Section[]).map((s) => {
              const c = SECTION_CONFIG[s];
              const active = section === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => handleSectionChange(s)}
                  style={[styles.sectionBtn, active && { borderColor: c.color, backgroundColor: `${c.color}18` }]}
                >
                  <Text style={styles.sectionBtnIcon}>{c.icon}</Text>
                  <Text style={[styles.sectionBtnText, active && { color: c.color }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Reminder Time */}
          <Text style={[styles.label, { marginTop: 20 }]}>Reminder Time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10, paddingRight: 4 }}>
              {SECTION_TIMES[section].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setSelectedTime(t)}
                  style={[
                    styles.timeChip,
                    selectedTime === t && { backgroundColor: cfg.color, borderColor: cfg.color },
                  ]}
                >
                  <Text style={[styles.timeChipText, selectedTime === t && { color: '#fff' }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* When to Take */}
          <Text style={[styles.label, { marginTop: 20 }]}>When to Take</Text>
          <View style={styles.row2}>
            {['Before Meal', 'After Meal'].map((m) => (
              <Pressable
                key={m}
                onPress={() => setMeal(m)}
                style={[styles.mealBtn, meal === m && styles.mealBtnActive]}
              >
                <Ionicons
                  name={m === 'Before Meal' ? 'restaurant-outline' : 'restaurant'}
                  size={16}
                  color={meal === m ? '#2E7D32' : '#7B8AA0'}
                />
                <Text style={[styles.mealBtnText, meal === m && styles.mealBtnTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          {/* Stock Count */}
          <Text style={[styles.label, { marginTop: 20 }]}>Current Stock Count (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 30 — leave blank if not tracking"
            placeholderTextColor="#B0BBC8"
            keyboardType="number-pad"
            value={stockCount}
            onChangeText={setStockCount}
          />

          {/* Doctor Info */}
          <Text style={[styles.label, { marginTop: 20 }]}>Doctor Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. Mehta"
            placeholderTextColor="#B0BBC8"
            value={doctorName}
            onChangeText={setDoctorName}
          />
          <Text style={[styles.label, { marginTop: 16 }]}>Doctor Phone (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +91 98765 43210"
            placeholderTextColor="#B0BBC8"
            keyboardType="phone-pad"
            value={doctorPhone}
            onChangeText={setDoctorPhone}
          />

          {/* Duration */}
          <Text style={[styles.label, { marginTop: 20 }]}>Duration</Text>
          <View style={styles.wrapRow}>
            {DURATION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setDurationKey(opt.label)}
                style={[styles.chip, durationKey === opt.label && styles.chipActive]}
              >
                <Text style={[styles.chipText, durationKey === opt.label && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {durationKey === 'Custom' && (
            <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', marginTop: 12 }]}>
              <TextInput
                style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#15253E' }}
                placeholder="Number of days"
                placeholderTextColor="#B0BBC8"
                keyboardType="number-pad"
                value={customDays}
                onChangeText={setCustomDays}
              />
              <Text style={{ color: '#7B8AA0', fontWeight: '700', fontSize: 13 }}>days</Text>
            </View>
          )}

          {/* Days of Week */}
          <Text style={[styles.label, { marginTop: 20 }]}>Repeat on Days</Text>
          <View style={styles.daysRow}>
            {DAYS_LABELS.map((d, idx) => (
              <Pressable
                key={idx}
                onPress={() => toggleDay(idx)}
                style={[
                  styles.dayCircle,
                  selectedDays.includes(idx) && { backgroundColor: cfg.color, borderColor: cfg.color },
                ]}
              >
                <Text style={[styles.dayCircleText, selectedDays.includes(idx) && { color: '#fff' }]}>{d}</Text>
              </Pressable>
            ))}
          </View>

          {/* Save */}
          <Pressable onPress={handleSave} disabled={!canSave || loading} style={{ marginTop: 32 }}>
            <LinearGradient
              colors={canSave && !loading ? ['#2B3C86', '#2E9CD6'] : ['#C2CDD8', '#C2CDD8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </LinearGradient>
          </Pressable>

          {/* Delete */}
          <Pressable onPress={handleDelete} disabled={deleting} style={styles.deleteBtnWrap}>
            <View style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#E53E3E" />
              <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete Medicine'}</Text>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header:    { paddingHorizontal: 18, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },

  scroll: { flex: 1, backgroundColor: '#F2F4F8' },
  form:   { paddingHorizontal: 20, paddingTop: 24 },

  label: { fontSize: 13, fontWeight: '700', color: '#4A5568', marginBottom: 10 },

  input: {
    backgroundColor: '#fff', borderRadius: 14, height: 50,
    paddingHorizontal: 16, fontSize: 15, fontWeight: '600', color: '#15253E',
    borderWidth: 1, borderColor: '#E4EAF2',
  },

  row2: { flexDirection: 'row', gap: 12 },
  row3: { flexDirection: 'row', gap: 10 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 22,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3EC',
  },
  chipActive:     { backgroundColor: '#2B3C86', borderColor: '#2B3C86' },
  chipText:       { fontSize: 13, fontWeight: '700', color: '#4A5568' },
  chipTextActive: { color: '#fff' },

  sectionBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3EC',
  },
  sectionBtnIcon: { fontSize: 22 },
  sectionBtnText: { fontSize: 12, fontWeight: '700', color: '#4A5568' },

  timeChip: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3EC',
  },
  timeChipText: { fontSize: 13, fontWeight: '700', color: '#4A5568' },

  mealBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3EC',
  },
  mealBtnActive:     { backgroundColor: '#E8F5E9', borderColor: '#43A047' },
  mealBtnText:       { fontSize: 13, fontWeight: '700', color: '#4A5568' },
  mealBtnTextActive: { color: '#2E7D32' },

  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3EC',
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleText: { fontSize: 13, fontWeight: '800', color: '#4A5568' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 56, borderRadius: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  deleteBtnWrap: { marginTop: 16, alignItems: 'center', paddingBottom: 8 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 28, borderWidth: 1.5, borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
  },
  deleteBtnText: { color: '#E53E3E', fontSize: 15, fontWeight: '800' },
});
