import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useLanguage, Language } from "../../context/LanguageContext";
import { PLAN_DEFINITIONS, formatPlanPrice, formatRenewalDate, isPlanActive } from "../../services/plan";
import { scaleStyles } from "../../utils/scaleStyles";
import GuardianProfileScreen from "../../components/guardian/GuardianProfileScreen";
import "../../utils/i18n";

const C = {
  headerStart: '#2B3C86',
  headerEnd: '#2E9CD6',
  navy: "#1A3050",
  white: "#FFFFFF",
  bg: "#F7F9FC", 
  muted: "#B2BDCE",
  blue: "#4AA5D9",
  cardBorder: "#F0F4F8",
  text: "#222C3A",
  blueIcon: "#3EA0DC", 
  danger: "#FF3B30",
};

export default function ProfileScreen() {
  const { profile } = useAuth();
  if (profile?.role === "guardian") return <GuardianProfileScreen />;
  return <ElderProfileScreen />;
}

function ElderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, plan, logout, streak } = useAuth();
  const { language, setLanguage, nightMode, setNightMode, fontSizeLabel, setFontSizeLabel, fontScale, colors: themeColors } = useLanguage();
  const { t } = useTranslation();
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);

  // App Settings state
  const [voiceNav, setVoiceNavState] = useState(false);
  const [vibration, setVibrationState] = useState(true);
  const [remindMeds, setRemindMedsState] = useState(true);
  const [remindCheckin, setRemindCheckinState] = useState(true);
  const [remindGames, setRemindGamesState] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const LANGUAGES: Language[] = ["English", "हिंदी", "ਪੰਜਾਬੀ", "हरियाणवी", "ગુજરાતી", "मराठी", "বাংলা", "தமிழ்", "తెలుగు", "മലയാളം"];

  useEffect(() => {
    AsyncStorage.multiGet(['voiceNav', 'vibration', 'remindMeds', 'remindCheckin', 'remindGames']).then((pairs) => {
      const m: Record<string, string | null> = Object.fromEntries(pairs);
      if (m.voiceNav    !== null) setVoiceNavState(m.voiceNav === 'true');
      if (m.vibration   !== null) setVibrationState(m.vibration === 'true');
      if (m.remindMeds  !== null) setRemindMedsState(m.remindMeds === 'true');
      if (m.remindCheckin !== null) setRemindCheckinState(m.remindCheckin === 'true');
      if (m.remindGames !== null) setRemindGamesState(m.remindGames === 'true');
    });
  }, []);

  const toggle = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    AsyncStorage.setItem(key, val ? 'true' : 'false');
  };

  const callNumber = (num: string) => {
    Linking.openURL(`tel:${num}`).catch(err => Alert.alert("Error", "Could not place call"));
  };

  return (
    <View style={[s.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      <LinearGradient
        colors={[C.headerStart, C.headerEnd]}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={C.white} />
          </Pressable>
          <Text style={s.headerTitle} allowFontScaling={false}>{t('profile')}</Text>
        </View>
      </LinearGradient>

      <View style={[s.scrollSheet, { backgroundColor: themeColors.bg }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Full Width Top Profile Cap */}
        <View style={[s.topCard, { backgroundColor: themeColors.card }]}>
          <View style={s.profileHeader}>
            <View style={s.avatarContainer}>
              <Image 
                source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/png?seed=${profile?.fullName || 'User'}&backgroundColor=b6e3f4` }} 
                style={s.avatarImg} 
                resizeMode="cover"
              />
              <Pressable style={s.editAvatarBtn} onPress={() => router.push("/edit-profile")}>
                <Ionicons name="pencil" size={10} color="white" />
              </Pressable>
            </View>
            <View style={s.userInfo}>
              <Text style={[s.userName, { color: themeColors.text }]}>{profile?.fullName || "Update your name"}</Text>
              <Text style={[s.userDetail, { color: themeColors.muted }]}>{profile?.age || "--"} {t('years')} · {profile?.location || "Location not set"}</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCol}>
              <Text style={s.statVal}>{streak}</Text>
              <Text style={[s.statLabel, { color: themeColors.muted }]}>{t('dayStreak')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statVal}>0</Text>
              <Text style={[s.statLabel, { color: themeColors.muted }]}>{t('memories')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statVal}>0</Text>
              <Text style={[s.statLabel, { color: themeColors.muted }]}>{t('score')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statVal}>5.0</Text>
              <Text style={[s.statLabel, { color: themeColors.muted }]}>{t('rating')}</Text>
            </View>
          </View>
        </View>

        {/* ── My Language ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: themeColors.text }]}>{t('myLanguage')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.languageScroll}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[s.languagePill, { backgroundColor: themeColors.card }, language === lang && s.languagePillActive]}
            >
              <Text style={[s.languageText, language === lang && s.languageTextActive]}>
                {lang}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Text Size ── */}
        <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{t('textSize')}</Text>
        </View>
        <View style={[s.card, { backgroundColor: themeColors.card }]}>
          <Text style={[s.textSizeInstruction, { color: themeColors.text }]}>{t('chooseComfortable')}</Text>
          <View style={s.textSizeContainer}>
            {([
              { id: "Small",    label: t('small'),   s: 16 },
              { id: "Medium",   label: t('medium'),  s: 18 },
              { id: "Large",    label: t('large'),   s: 20 },
              { id: "XL Large", label: t('xlLarge'), s: 24 },
            ] as const).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setFontSizeLabel(item.id)}
                style={[s.sizeBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }, fontSizeLabel === item.id && s.sizeBoxActive]}
              >
                <Text style={[s.sizeIcon, { fontSize: item.s }]}>A</Text>
                <Text style={s.sizeLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── My Health Info ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: themeColors.text }]}>{t('myHealthInfo')}</Text>
        </View>
        <View style={[s.card, { backgroundColor: themeColors.card }]}>
          {/* Body metrics */}
          <View style={s.healthGrid}>
            <View style={s.healthCell}>
              <Ionicons name="resize-outline" size={18} color={C.blueIcon} />
              <Text style={s.healthCellVal}>
                {profile?.height ? `${profile.height} ${profile.heightUnit ?? ""}` : "—"}
              </Text>
              <Text style={s.healthCellLabel}>{t('height')}</Text>
            </View>
            <View style={s.healthCellDivider} />
            <View style={s.healthCell}>
              <Ionicons name="barbell-outline" size={18} color={C.blueIcon} />
              <Text style={s.healthCellVal}>
                {profile?.weight ? `${profile.weight} ${profile.weightUnit ?? ""}` : "—"}
              </Text>
              <Text style={s.healthCellLabel}>{t('weight')}</Text>
            </View>
            <View style={s.healthCellDivider} />
            <View style={s.healthCell}>
              <Ionicons name="water-outline" size={18} color={C.blueIcon} />
              <Text style={s.healthCellVal}>{profile?.bloodGroup || "—"}</Text>
              <Text style={s.healthCellLabel}>{t('bloodGroup')}</Text>
            </View>
          </View>

          {/* Medical conditions */}
          {(profile?.medicalConditions?.length ?? 0) > 0 && (
            <>
              <View style={s.itemDivider} />
              <View style={s.rowItem}>
                <View style={s.iconCircle}><Ionicons name="medkit-outline" size={18} color={C.white} /></View>
                <View style={s.itemInfo}>
                  <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('medicalConditions')}</Text>
                  <Text style={[s.itemSub, { color: themeColors.muted }]}>{profile!.medicalConditions!.join(", ")}</Text>
                </View>
              </View>
            </>
          )}

          {/* Medications */}
          {(profile?.medications?.length ?? 0) > 0 && (
            <>
              <View style={s.itemDivider} />
              <View style={s.rowItem}>
                <View style={s.iconCircle}><Ionicons name="medical-outline" size={18} color={C.white} /></View>
                <View style={s.itemInfo}>
                  <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('currentMedications')}</Text>
                  {profile!.medications!.map((med, i) => (
                    <Text key={i} style={s.itemSub}>
                      {med.name}{med.dosage ? ` · ${med.dosage}` : ""}{med.timing ? ` · ${med.timing}` : ""}
                    </Text>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Doctors — tap to open full management */}
          <View style={s.itemDivider} />
          <TouchableOpacity style={s.rowItem} onPress={() => router.push('/(tabs)/doctors' as any)}>
            <View style={s.iconCircle}><Ionicons name="medkit-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>My Doctors</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>
                {profile?.doctorName || 'Tap to manage doctors & contacts'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </TouchableOpacity>

          {/* Emergency contact */}
          {profile?.emergencyPhone ? (
            <>
              <View style={s.itemDivider} />
              <View style={s.rowItem}>
                <TouchableOpacity style={s.iconCircle} onPress={() => callNumber(profile.emergencyPhone!)}>
                  <Ionicons name="call" size={18} color={C.white} />
                </TouchableOpacity>
                <View style={s.itemInfo}>
                  <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('emergencyContact')}</Text>
                  <Text style={[s.itemSub, { color: themeColors.muted }]}>
                    {profile.emergencyPhone}{profile.emergencyName ? ` · ${profile.emergencyName}` : ""}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/edit-profile")}>
                  <Ionicons name="pencil" size={16} color={C.blue} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
             <TouchableOpacity style={[s.rowItem, { paddingVertical: 12 }]} onPress={() => router.push("/edit-profile")}>
                <View style={s.iconCircle}><Ionicons name="add" size={22} color={C.white} /></View>
                <Text style={[s.itemTitle, { color: themeColors.text }]}>Add Emergency Contact</Text>
             </TouchableOpacity>
          )}

          {/* Placeholder when nothing is saved yet */}
          {!profile?.height && !profile?.bloodGroup && (profile?.medicalConditions?.length ?? 0) === 0 && !profile?.doctorName && !profile?.emergencyPhone && (
            <Text style={[s.itemSub, { textAlign: "center", paddingVertical: 8 }]}>
              {t('noHealthInfo')}
            </Text>
          )}
        </View>

        {/* ── App Settings ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: themeColors.text }]}>{t('appSettings')}</Text>
        </View>
        <View style={[s.card, { backgroundColor: themeColors.card }]}>

          {/* Reminders & Alerts — expandable accordion */}
          <Pressable style={s.rowItem} onPress={() => setShowReminders((v) => !v)}>
            <View style={s.iconCircle}><Ionicons name="notifications-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('remindersAlerts')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('medicineReminders')}, {t('dailyCheckin')}, {t('brainGames')}</Text>
            </View>
            <Ionicons name={showReminders ? "chevron-up" : "chevron-down"} size={14} color="#8D9CAE" />
          </Pressable>
          {showReminders && (
            <View style={s.subSection}>
              <View style={s.subRow}>
                <Text style={s.subLabel}>💊 {t('medicineReminders')}</Text>
                <Switch
                  value={remindMeds}
                  onValueChange={(v) => toggle('remindMeds', v, setRemindMedsState)}
                  trackColor={{ false: '#D1D5DB', true: '#5BB5A2' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
              <View style={s.subRow}>
                <Text style={s.subLabel}>📋 {t('dailyCheckin')}</Text>
                <Switch
                  value={remindCheckin}
                  onValueChange={(v) => toggle('remindCheckin', v, setRemindCheckinState)}
                  trackColor={{ false: '#D1D5DB', true: '#5BB5A2' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
              <View style={s.subRow}>
                <Text style={s.subLabel}>🧠 {t('brainGames')}</Text>
                <Switch
                  value={remindGames}
                  onValueChange={(v) => toggle('remindGames', v, setRemindGamesState)}
                  trackColor={{ false: '#D1D5DB', true: '#5BB5A2' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
            </View>
          )}

          <View style={s.itemDivider} />

          {/* Voice Navigation */}
          <View style={s.rowItem}>
            <View style={s.iconCircle}><Ionicons name="mic-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('voiceNavigation')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('navigateByVoice')}</Text>
            </View>
            <Switch
              value={voiceNav}
              onValueChange={(v) => toggle('voiceNav', v, setVoiceNavState)}
              trackColor={{ false: '#DDE3EC', true: C.blue }}
              thumbColor={C.white}
            />
          </View>

          <View style={s.itemDivider} />

          {/* Night Mode */}
          <View style={s.rowItem}>
            <View style={s.iconCircle}><Ionicons name="moon-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('nightMode')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('easierOnEyes')}</Text>
            </View>
            <Switch
              value={nightMode}
              onValueChange={(v) => setNightMode(v)}
              trackColor={{ false: '#DDE3EC', true: C.blue }}
              thumbColor={C.white}
            />
          </View>

          <View style={s.itemDivider} />

          {/* Vibration Alerts */}
          <View style={s.rowItem}>
            <View style={s.iconCircle}><Ionicons name="phone-portrait-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('vibrationAlerts')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('vibrateForAlerts')}</Text>
            </View>
            <Switch
              value={vibration}
              onValueChange={(v) => toggle('vibration', v, setVibrationState)}
              trackColor={{ false: '#DDE3EC', true: C.blue }}
              thumbColor={C.white}
            />
          </View>

          <View style={s.itemDivider} />

          {/* Privacy & Data */}
          <Pressable style={s.rowItem} onPress={() => setShowPrivacy(true)}>
            <View style={s.iconCircle}><Ionicons name="lock-closed-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('privacyData')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('whatTinyBitCollects')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>
        </View>

        {/* ── More ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: themeColors.text }]}>{t('more')}</Text>
        </View>
        <View style={[s.card, { backgroundColor: themeColors.card }]}>
          {/* About us */}
          <Pressable style={s.rowItem} onPress={() => Linking.openURL('https://tinybit.cloud').catch(() => {})}>
            <View style={s.iconCircle}><Ionicons name="information-circle-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('aboutTinyBit')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('missionTeam')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>

          <View style={s.itemDivider} />

          {/* Help & Support */}
          <Pressable style={s.rowItem} onPress={() => Linking.openURL('mailto:support@tinybit.cloud').catch(() => {})}>
            <View style={s.iconCircle}><Ionicons name="help-circle-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('helpSupport')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('getHelpReport')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>

          <View style={s.itemDivider} />

          {/* Rate TinyBit */}
          <Pressable style={s.rowItem} onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=t.i.n.y.b.i.t.E.C').catch(() => {})}>
            <View style={s.iconCircle}><Ionicons name="star-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('rateTinyBit')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('shareFeedback')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>

          <View style={s.itemDivider} />

          {/* Share App */}
          <Pressable
            style={s.rowItem}
            onPress={() =>
              Share.share({
                title: 'TinyBit – Elderly Health Companion',
                message: 'I use TinyBit to manage my medicines and stay healthy. Try it! https://tinybit.cloud',
              })
            }
          >
            <View style={s.iconCircle}><Ionicons name="share-social-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('shareTinyBit')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('inviteFamily')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>

          <View style={s.itemDivider} />

          {/* Delete Account */}
          <Pressable
            style={s.rowItem}
            onPress={() =>
              Alert.alert(
                t('deleteAccount'),
                `${t('deleteConfirm')} ${t('deleteWarning')}`,
                [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('deleteAccount'), style: 'destructive', onPress: () => logout() },
                ],
              )
            }
          >
            <View style={[s.iconCircle, { backgroundColor: '#E05C5C' }]}>
              <Ionicons name="trash-outline" size={18} color={C.white} />
            </View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: '#E05C5C' }]}>{t('deleteAccount')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>{t('permanentlyRemove')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>

          <View style={s.itemDivider} />

          {/* Log out */}
          <Pressable
            style={s.rowItem}
            onPress={() =>
              Alert.alert(t('logOutTitle'), t('logOutMessage'), [
                { text: t('cancel'), style: 'cancel' },
                { text: t('logOut'), style: 'destructive', onPress: () => logout() },
              ])
            }
          >
            <View style={s.iconCircle}><Ionicons name="log-out-outline" size={18} color={C.white} /></View>
            <View style={s.itemInfo}>
              <Text style={[s.itemTitle, { color: themeColors.text }]}>{t('logOut')}</Text>
              <Text style={[s.itemSub, { color: themeColors.muted }]}>Sign out of TinyBit</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>
        </View>

        {/* App version */}
        <Text style={s.versionText}>TinyBit v1.0.0</Text>

        {/* ── Privacy Modal ── */}
        <Modal visible={showPrivacy} animationType="slide" transparent onRequestClose={() => setShowPrivacy(false)}>
          <View style={s.privacyOverlay}>
            <View style={[s.privacySheet, { backgroundColor: themeColors.card }]}>
              <View style={s.privacyHeader}>
                <Text style={s.privacyTitle}>{t('privacyData')}</Text>
                <TouchableOpacity onPress={() => setShowPrivacy(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={C.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { icon: '🔐', title: 'Your data stays private', body: 'TinyBit never sells your personal health information to third parties.' },
                  { icon: '💊', title: 'Medicine data', body: 'Medicine names, doses, and schedules are stored securely and used only to send you reminders.' },
                  { icon: '📓', title: 'Journal & check-in', body: 'Journal entries and daily check-in responses are encrypted and visible only to you.' },
                  { icon: '👨‍👩‍👧', title: 'Family sharing', body: 'Health summaries shared with family members are controlled entirely by you and can be revoked at any time.' },
                  { icon: '🤖', title: 'Sathi AI conversations', body: 'Conversations with Sathi AI are processed by OpenAI. No conversations are stored permanently on our servers.' },
                  { icon: '📍', title: 'Location data', body: 'Location is only used for SOS alerts and is never stored or shared without your consent.' },
                ].map((item) => (
                  <View key={item.title} style={s.privacyItem}>
                    <Text style={s.privacyItemIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.privacyItemTitle}>{item.title}</Text>
                      <Text style={s.privacyItemBody}>{item.body}</Text>
                    </View>
                  </View>
                ))}
                <Text style={s.privacyFooter}>
                  For full details read our Privacy Policy at tinybit.cloud/privacy
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Your Plans ── */}
        {(() => {
          const def = PLAN_DEFINITIONS[plan.planType];
          const active = isPlanActive(plan);
          const renewalDate = formatRenewalDate(plan);
          const isFree = plan.planType === 'free';
          return (
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: themeColors.text }]}>Your Plan</Text>
              </View>
              <View style={[s.planCard, { backgroundColor: themeColors.card }]}>
                <View style={[s.planBadgeActive, { backgroundColor: active ? '#31C34A' : '#E05C5C' }]}>
                  <Text style={s.planBadgeActiveText}>{active ? def.badge : 'Expired'}</Text>
                </View>

                <Text style={s.planSubtitle}>Current Subscription</Text>
                <Text style={s.planTitle}>{def.name} — {formatPlanPrice(def)}</Text>
                {renewalDate ? (
                  <Text style={s.planDesc}>Renews on {renewalDate} · Auto-pay enabled</Text>
                ) : isFree ? (
                  <Text style={s.planDesc}>Upgrade to unlock all features</Text>
                ) : null}

                <View style={s.planDivider} />

                <View style={s.planFeatures}>
                  {def.features.map((feature, i) => (
                    <View key={i} style={s.featureItem}>
                      <Ionicons name="checkmark" size={16} color="#35C26B" style={{marginRight: 12}} />
                      <Text style={s.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {isFree ? (
                  <LinearGradient colors={['#FF8A65', '#E64A19']} style={s.planBtn} start={{x:0, y:0}} end={{x:1, y:0}}>
                    <Text style={s.planBtnText}>Upgrade to Pro — ₹799/month</Text>
                  </LinearGradient>
                ) : (
                  <LinearGradient colors={['#356D9A', '#53ADE1']} style={s.planBtn} start={{x:0, y:0}} end={{x:1, y:0}}>
                    <Text style={s.planBtnText}>Manage Subscription</Text>
                  </LinearGradient>
                )}
              </View>
            </>
          );
        })()}

        </ScrollView>
      </View>
    </View>
  );
}

const RAW_STYLES = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingBottom: 64 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.0)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  headerTitle: { color: C.white, fontSize: 22, fontWeight: '800' },
  scrollSheet: {
    flex: 1,
    marginTop: -42,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  
  topCard: {
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: C.white,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#E6EBF2',
  },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  avatarContainer: { marginRight: 14 },
  avatarImg: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#E2E8F0" },
  editAvatarBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F45B69", 
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.white,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 4 },
  userDetail: { fontSize: 13, color: '#A3B1C6', fontWeight: "600" },
  
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statCol: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 20, fontWeight: "900", color: C.blue },
  statLabel: { fontSize: 11, fontWeight: "600", color: '#A3B1C6', marginTop: 6 },
  statDivider: { width: 1, height: 28, backgroundColor: '#E6EBF2' },

  sectionHeaderRow: { marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: C.text },


  languageScroll: { paddingHorizontal: 16, paddingBottom: 4 },
  languagePill: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: C.white,
    marginRight: 10,
  },
  languagePillActive: { backgroundColor: '#3A5C97' },
  languageText: { fontSize: 13, fontWeight: "800", color: '#6A7E97' },
  languageTextActive: { color: C.white },

  card: {
    marginHorizontal: 16,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
  },
  textSizeInstruction: {
    fontSize: 13,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 20,
  },
  textSizeContainer: { flexDirection: "row", justifyContent: "space-between" },
  sizeBox: {
    flex: 0.23,
    aspectRatio: 0.75,
    borderRadius: 16,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6EBF2", 
  },
  sizeBoxActive: { borderColor: C.text },
  sizeIcon: { color: C.text, fontWeight: "900", marginBottom: 6 },
  sizeLabel: { fontSize: 11, fontWeight: "700", color: '#6A7E97' },

  rowItem: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.blueIcon,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "800", color: C.text, marginBottom: 2 },
  itemSub: { fontSize: 12, fontWeight: "600", color: '#D0D8E5' },
  itemDivider: {
    height: 1,
    backgroundColor: '#F5F7FA',
    marginVertical: 18,
    marginLeft: 52, 
  },

  planCard: {
    marginHorizontal: 16,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    overflow: "hidden",
  },
  planBadgeActive: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#31C34A",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderBottomLeftRadius: 16,
  },
  planBadgeActiveText: { color: C.white, fontSize: 12, fontWeight: "900" },
  planSubtitle: { fontSize: 11, fontWeight: "700", color: C.text, marginBottom: 6 },
  planTitle: { fontSize: 19, fontWeight: "900", color: "#3B5A9F", marginBottom: 4 },
  planDesc: { fontSize: 11, fontWeight: "600", color: '#AAB4CB' },
  planDivider: { height: 1, backgroundColor: '#F5F7FA', marginTop: 18, marginBottom: 18 },
  planFeatures: { gap: 14, marginBottom: 28 },
  featureItem: { flexDirection: "row", alignItems: "center" },
  featureText: { fontSize: 12, color: '#323E4D', fontWeight: "700" },
  planBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  planBtnText: { color: C.white, fontSize: 14, fontWeight: "900" },

  healthGrid:        { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  healthCell:        { flex: 1, alignItems: "center", gap: 4 },
  healthCellVal:     { fontSize: 15, fontWeight: "800", color: C.text },
  healthCellLabel:   { fontSize: 11, fontWeight: "600", color: "#A3B1C6" },
  healthCellDivider: { width: 1, height: 40, backgroundColor: "#F0F4F8" },

  // Reminders sub-section
  subSection: {
    marginTop: 12, marginLeft: 52,
    backgroundColor: '#F7F9FC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  subRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EEF2F7',
  },
  subLabel: { fontSize: 13, fontWeight: '700', color: C.text },

  // Version text
  versionText: {
    textAlign: 'center', fontSize: 12, fontWeight: '600',
    color: '#B2BDCE', marginTop: 16, marginBottom: 8,
  },

  // Privacy modal
  privacyOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  privacySheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  privacyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  privacyTitle: { fontSize: 18, fontWeight: '900', color: C.text },
  privacyItem: {
    flexDirection: 'row', gap: 12, marginBottom: 18,
  },
  privacyItemIcon: { fontSize: 22, marginTop: 2 },
  privacyItemTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 3 },
  privacyItemBody:  { fontSize: 13, fontWeight: '500', color: '#6B7C93', lineHeight: 19 },
  privacyFooter: {
    fontSize: 12, fontWeight: '600', color: '#B2BDCE',
    textAlign: 'center', marginTop: 8, marginBottom: 16,
  },
});
