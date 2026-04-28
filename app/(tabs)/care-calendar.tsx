import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar,
  Modal, TextInput, Alert, Platform, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";

const C = {
  navy:    "#1A2E6A",
  navyDark:"#111D44",
  white:   "#FFFFFF",
  bg:      "#EEF2F7",
  muted:   "#8A9BB0",
  accent:  "#37B1E6",
  border:  "#E4EBF2",
  medical: "#DB5461",
  family:  "#5CB8B2",
  medicine:"#EBA352",
  wellness:"#6B5183",
};

type EventType = "Doctor" | "Family" | "Medicine" | "Wellness";

interface EventItem {
  id: string;
  date: number;
  month: string;
  year: number;
  timestamp: number;
  title: string;
  sub: string;
  time: string;
  type: EventType;
  color: string;
  emoji: string;
  schedule?: { time: string; text: string }[];
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DEFAULT_EVENTS: EventItem[] = [
  {
    id: "1", date: 10, month: "SEP", year: 2025,
    timestamp: new Date(2025, 8, 10).getTime(),
    title: "Dr. Mehta Checkup", sub: "Sterling Hospital, Vadodara",
    time: "11:00", type: "Doctor", color: C.medical, emoji: "🏥",
    schedule: [
      { time: "8:00",  text: "Take Morning medicines before leaving" },
      { time: "9:00",  text: "Arrive at Sterling Hospital" },
      { time: "11:00", text: "Appointment with Dr Mehta Gupta" },
      { time: "15:00", text: "Afternoon medicine after Lunch" },
    ],
  },
  {
    id: "2", date: 14, month: "SEP", year: 2025,
    timestamp: new Date(2025, 8, 14).getTime(),
    title: "Rahul's Visit", sub: "Son coming from Mumbai",
    time: "5:00 PM", type: "Family", color: C.family, emoji: "🏡",
  },
  {
    id: "3", date: 21, month: "SEP", year: 2025,
    timestamp: new Date(2025, 8, 21).getTime(),
    title: "Yoga Class", sub: "Community Center, Alkapuri",
    time: "7:00 AM", type: "Wellness", color: C.wellness, emoji: "🧘",
  },
];

function getEventDefaults(type: EventType) {
  switch (type) {
    case "Doctor":   return { color: C.medical,  emoji: "🏥" };
    case "Family":   return { color: C.family,   emoji: "🏡" };
    case "Medicine": return { color: C.medicine, emoji: "💊" };
    case "Wellness": return { color: C.wellness, emoji: "🧘" };
  }
}

export default function CareCalendarScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const [viewDate,     setViewDate]     = useState(new Date(2025, 8, 1)); // Sep 2025
  const [selectedDate, setSelectedDate] = useState(10);
  const [events,       setEvents]       = useState<EventItem[]>(DEFAULT_EVENTS);
  const [showModal,    setShowModal]    = useState(false);
  const [selectingTime, setSelectingTime] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", sub: "", time: "", type: "Doctor" as EventType });

  useEffect(() => { if (user) loadEvents(); }, [user]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase.from("care_events").select("*").eq("user_id", user!.id);
      if (!error && data) setEvents([...data, ...DEFAULT_EVENTS].sort((a, b) => a.timestamp - b.timestamp));
    } catch { /* use defaults */ }
  };

  const saveEvent = async () => {
    if (!newEvent.title || !newEvent.time) { Alert.alert("Error", "Please fill title and time."); return; }
    const def = getEventDefaults(newEvent.type);
    const ev: EventItem = {
      id: Date.now().toString(), date: selectedDate,
      month: viewDate.toLocaleString("default", { month: "short" }).toUpperCase(),
      year: viewDate.getFullYear(),
      timestamp: new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDate).getTime(),
      title: newEvent.title, sub: newEvent.sub, time: newEvent.time,
      type: newEvent.type, color: def.color, emoji: def.emoji,
    };
    if (user) await supabase.from("care_events").insert([{ ...ev, user_id: user.id }]);
    setEvents(prev => [...prev, ev].sort((a, b) => a.timestamp - b.timestamp));
    setShowModal(false); setSelectingTime(false);
    setNewEvent({ title: "", sub: "", time: "", type: "Doctor" });
    Alert.alert("Saved!", "Event added to your calendar.");
  };

  /* Calendar generation */
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const daysInPrev   = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  type Cell = { day: number; cur: boolean; hasEvent: boolean; eventColor: string };
  const cells: Cell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, cur: false, hasEvent: false, eventColor: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = viewDate.toLocaleString("default", { month: "short" }).toUpperCase();
    const ev   = events.find(e => e.date === d && e.month === mStr && e.year === year);
    cells.push({ day: d, cur: true, hasEvent: !!ev, eventColor: ev?.color ?? "" });
  }
  const remaining = 7 - (cells.length % 7 === 0 ? 7 : cells.length % 7);
  for (let d = 1; d <= remaining; d++)
    cells.push({ day: d, cur: false, hasEvent: false, eventColor: "" });

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const mStr    = viewDate.toLocaleString("default", { month: "short" }).toUpperCase();
  const selEvt  = events.find(e => e.date === selectedDate && e.month === mStr && e.year === year);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>Care Calendar</Text>
        <Pressable onPress={() => setShowModal(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color={C.white} />
        </Pressable>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date picker bar */}
        <View style={s.datebar}>
          <Text style={s.datebarText}>
            {viewDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
          </Text>
          <Ionicons name="calendar-outline" size={22} color={C.muted} />
        </View>

        {/* Calendar Card */}
        <View style={s.calCard}>
          {/* Month nav */}
          <View style={s.monthRow}>
            <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} style={s.navBtn}>
              <Ionicons name="chevron-back" size={18} color={C.navyDark} />
            </Pressable>
            <Text style={s.monthTitle}>
              {viewDate.toLocaleString("default", { month: "short" })} {year}
            </Text>
            <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} style={s.navBtn}>
              <Ionicons name="chevron-forward" size={18} color={C.navyDark} />
            </Pressable>
          </View>

          {/* Day headers */}
          <View style={s.daysHeader}>
            {DAYS.map(d => (
              <Text key={d} style={s.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Date grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={s.weekRow}>
              {row.map((cell, ci) => {
                const isSel = cell.cur && cell.day === selectedDate;
                return (
                  <Pressable
                    key={ci}
                    onPress={() => cell.cur && setSelectedDate(cell.day)}
                    style={[s.dateCell, isSel && s.dateCellSel]}
                  >
                    <Text style={[
                      s.dateText,
                      !cell.cur && s.dateTextOther,
                      isSel && s.dateTextSel,
                    ]}>
                      {cell.day}
                    </Text>
                    {cell.cur && cell.hasEvent && !isSel && (
                      <View style={[s.eventDot, { backgroundColor: cell.eventColor }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Appointment Section */}
        <View style={s.apptSection}>
          <Text style={s.apptHeading}>
            Checkup . {viewDate.toLocaleString("default", { month: "short" })} {String(selectedDate).padStart(2, "0")} {viewDate.toLocaleString("default", { month: "long" })} {year}
          </Text>

          {/* Doctor Card */}
          <LinearGradient
            colors={["#1B3A5C", "#2B7FC0"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.doctorCard}
          >
            {/* Doctor avatar */}
            <View style={s.doctorAvatarWrap}>
              <View style={s.doctorAvatar}>
                <Ionicons name="person" size={52} color="#FFFFFF" />
              </View>
            </View>

            {/* Doctor info */}
            <View style={s.doctorInfo}>
              <Text style={s.doctorName}>Dr Mehta Gupta</Text>
              <View style={s.doctorRow}>
                <Text style={s.doctorSpec}>Pediatrician</Text>
                <View style={s.doctorSep} />
                <View style={s.starsRow}>
                  {[1,2,3,4,5].map(i => (
                    <Ionicons key={i} name="star" size={12} color="#FFD700" />
                  ))}
                  <Text style={s.ratingText}> 5.0</Text>
                </View>
              </View>
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={s.locationText}>
                  Race Course Rd, opposite Inox Cinema,{"\n"}Sterling Hospital - Vadodara, Gujarat
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Timeline */}
          {(selEvt?.schedule ?? DEFAULT_EVENTS[0].schedule!).map((item, i, arr) => (
            <View key={i} style={s.timelineRow}>
              {/* Time */}
              <Text style={s.timeText}>{item.time}</Text>

              {/* Dot + line */}
              <View style={s.timelineMid}>
                <View style={s.timelineDot} />
                {i < arr.length - 1 && <View style={s.timelineLine} />}
              </View>

              {/* Event text */}
              <Text style={s.timelineText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showModal} transparent animationType="slide"
        onRequestClose={() => { setShowModal(false); setSelectingTime(false); }}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowModal(false); }} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={s.modalSheet}>
                <View style={s.handle} />
                {selectingTime && (
                  <TouchableOpacity onPress={() => setSelectingTime(false)} style={s.modalBack}>
                    <Ionicons name="chevron-back" size={24} color={C.navyDark} />
                  </TouchableOpacity>
                )}
                <Text style={s.modalTitle}>{selectingTime ? "Select Time" : "Add Care Event"}</Text>
                <Text style={s.modalSub}>{selectedDate} {viewDate.toLocaleString("default", { month: "long" })} {year}</Text>

                {selectingTime ? (
                  <ScrollView style={{ height: 320 }} showsVerticalScrollIndicator={false}>
                    {["06:00 AM","07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM",
                      "12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM",
                      "06:00 PM","07:00 PM","08:00 PM","09:00 PM"].map(t => (
                      <TouchableOpacity key={t} style={s.timeOpt} onPress={() => { setNewEvent({...newEvent, time: t}); setSelectingTime(false); }}>
                        <Text style={[s.timeOptText, newEvent.time === t && { color: C.accent, fontWeight: "900" }]}>{t}</Text>
                        {newEvent.time === t && <Ionicons name="checkmark" size={18} color={C.accent} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <>
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Event Title</Text>
                      <TextInput style={s.input} placeholder="e.g. Dr. Appointment" placeholderTextColor={C.muted}
                        value={newEvent.title} onChangeText={t => setNewEvent({...newEvent, title: t})} />
                    </View>
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Time</Text>
                      <TouchableOpacity style={s.timePicker} onPress={() => setSelectingTime(true)}>
                        <Text style={[s.timePickerText, !newEvent.time && { color: C.muted }]}>{newEvent.time || "Select Time"}</Text>
                        <Ionicons name="time-outline" size={18} color={C.muted} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Category</Text>
                      <View style={s.typeRow}>
                        {(["Doctor","Family","Medicine","Wellness"] as EventType[]).map(t => (
                          <TouchableOpacity key={t} style={[s.typeChip, newEvent.type === t && { backgroundColor: getEventDefaults(t).color }]}
                            onPress={() => setNewEvent({...newEvent, type: t})}>
                            <Text style={[s.typeChipText, newEvent.type === t && { color: C.white }]}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Notes</Text>
                      <TextInput style={[s.input, { height: 72, textAlignVertical: "top" }]}
                        placeholder="Location or details..." placeholderTextColor={C.muted}
                        multiline value={newEvent.sub} onChangeText={t => setNewEvent({...newEvent, sub: t})} />
                    </View>
                    <View style={s.modalFooter}>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}>
                        <Text style={s.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.saveBtn} onPress={saveEvent}>
                        <Text style={s.saveText}>Save Event</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingBottom: 18, gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.white, justifyContent: "center", alignItems: "center",
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: C.white },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },

  scroll: { paddingTop: 16 },

  /* Date picker bar */
  datebar: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 2,
  },
  datebarText: { fontSize: 16, fontWeight: "700", color: C.navyDark },

  /* Calendar */
  calCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, padding: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontWeight: "800", color: C.navyDark },
  daysHeader: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  dayLabel: { width: 36, textAlign: "center", fontSize: 12, fontWeight: "700", color: C.muted },
  weekRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 6 },
  dateCell: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  dateCellSel: { backgroundColor: C.navy },
  dateText: { fontSize: 14, fontWeight: "700", color: C.navyDark },
  dateTextOther: { color: "#C2CBD8" },
  dateTextSel: { color: C.white },
  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  /* Appointment section */
  apptSection: { paddingHorizontal: 16 },
  apptHeading: { fontSize: 17, fontWeight: "900", color: C.navyDark, marginBottom: 14 },

  /* Doctor card */
  doctorCard: {
    borderRadius: 20, paddingTop: 20, paddingBottom: 20, paddingRight: 18,
    flexDirection: "row", alignItems: "flex-end", marginBottom: 4,
    overflow: "hidden",
  },
  doctorAvatarWrap: {
    width: 110, justifyContent: "flex-end", alignItems: "center",
    paddingBottom: 0,
  },
  doctorAvatar: {
    width: 90, height: 100, borderRadius: 0,
    justifyContent: "flex-end", alignItems: "center",
    overflow: "hidden",
  },
  doctorInfo: { flex: 1, paddingLeft: 4 },
  doctorName: { fontSize: 20, fontWeight: "900", color: C.white, marginBottom: 4 },
  doctorRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 4 },
  doctorSpec: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  doctorSep: { width: 1, height: 13, backgroundColor: "rgba(255,255,255,0.4)", marginHorizontal: 6 },
  starsRow: { flexDirection: "row", alignItems: "center" },
  ratingText: { color: C.white, fontSize: 12, fontWeight: "700" },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  locationText: { flex: 1, color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500", lineHeight: 17 },

  /* Timeline */
  timelineRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingVertical: 6, minHeight: 52,
  },
  timeText: { width: 50, fontSize: 13, fontWeight: "800", color: C.accent, paddingTop: 2 },
  timelineMid: { width: 20, alignItems: "center", paddingTop: 4 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  timelineLine: {
    flex: 1, width: 1.5, marginTop: 4,
    borderStyle: "dashed", borderWidth: 1, borderColor: "#BDD0E4",
  },
  timelineText: { flex: 1, fontSize: 14, fontWeight: "600", color: C.navyDark, paddingTop: 2, paddingLeft: 8 },

  /* Modal */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  handle: { width: 38, height: 5, backgroundColor: "#D8E4EC", borderRadius: 3, alignSelf: "center", marginBottom: 16 },
  modalBack: { position: "absolute", top: 24, left: 24 },
  modalTitle: { fontSize: 20, fontWeight: "900", color: C.navyDark, textAlign: "center" },
  modalSub: { fontSize: 13, color: C.muted, textAlign: "center", marginTop: 4, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: C.muted, marginBottom: 7, marginLeft: 2 },
  input: { backgroundColor: C.bg, borderRadius: 14, padding: 14, fontSize: 15, fontWeight: "600", color: C.navyDark, borderWidth: 1, borderColor: C.border },
  timePicker: { backgroundColor: C.bg, borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: C.border },
  timePickerText: { fontSize: 15, fontWeight: "600", color: C.navyDark },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", borderWidth: 1, borderColor: C.border },
  typeChipText: { fontSize: 11, fontWeight: "800", color: C.muted },
  timeOpt: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeOptText: { fontSize: 15, fontWeight: "600", color: C.navyDark },
  modalFooter: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 54, borderRadius: 16, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.border },
  cancelText: { fontSize: 15, fontWeight: "800", color: C.muted },
  saveBtn: { flex: 2, height: 54, borderRadius: 16, backgroundColor: C.navy, justifyContent: "center", alignItems: "center" },
  saveText: { fontSize: 15, fontWeight: "800", color: C.white },
});
