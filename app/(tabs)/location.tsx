import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Linking, Platform, Pressable,
  ScrollView, StatusBar, StyleSheet, Switch, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import MapWebView from '../../components/MapWebView';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_H = 300;

const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

const SAFE_ZONES = [
  {
    id: 'z1', name: 'Home',              note: 'Primary safe zone · 300m radius',
    icon: 'home-outline',     iconBg: '#D1FADF', iconColor: '#16A34A',
    badge: { text: 'Primary', bg: '#D1FADF', fg: '#16A34A' },
  },
  {
    id: 'z2', name: 'Hospital / Clinic', note: 'Doctor visits',
    icon: 'medkit-outline',   iconBg: '#E9D5FF', iconColor: '#7C3AED',
    badge: { text: 'Medical',  bg: '#E9D5FF', fg: '#7C3AED' },
  },
  {
    id: 'z3', name: 'Place of Worship',  note: 'Regular morning visits',
    icon: 'sunny-outline',    iconBg: '#FFF3E0', iconColor: '#F97316',
    badge: { text: 'Trusted',  bg: '#D1FADF', fg: '#16A34A' },
  },
  {
    id: 'z4', name: 'Local Market',      note: 'Grocery shopping nearby',
    icon: 'cart-outline',     iconBg: '#D8F0FF', iconColor: '#0284C7',
    badge: { text: 'Allowed',  bg: '#D1FADF', fg: '#16A34A' },
  },
];

type Elder    = { elder_id: string; parent_name: string; relation: string };
type ElderLoc = {
  elder_id: string; latitude: number; longitude: number;
  accuracy: number | null; address: string | null;
  is_sharing: boolean; updated_at: string;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ═══════════════════════════════════════════════════════════
// Reusable map card — WebView on Android, native MapView on iOS
// ═══════════════════════════════════════════════════════════
function ElderMapCard({ lat, lng }: { lat: number; lng: number }) {
  const [ready, setReady] = useState(false);
  return (
    <View style={[s.card, CARD_SHADOW, { padding: 0, overflow: 'hidden', marginBottom: 14 }]}>
      {Platform.OS === 'android' ? (
        <MapWebView lat={lat} lng={lng} height={180} zoom={15} />
      ) : (
        <>
          <MapView
            style={{ height: 180, opacity: ready ? 1 : 0 }}
            region={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
            onMapReady={() => setReady(true)}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} />
          </MapView>
          {!ready && (
            <View style={s.mapFallback}>
              <Ionicons name="map-outline" size={28} color="#94A3B8" />
              <Text style={s.mapFallbackText}>Loading map…</Text>
            </View>
          )}
        </>
      )}
      <View style={s.mapOverlay}>
        <View style={s.mapBadge}>
          <View style={[s.mapLiveDot, { backgroundColor: '#16A34A' }]} />
          <Text style={s.mapLiveText}>Sharing with family</Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// ELDER VIEW — share my location with family
// ═══════════════════════════════════════════════════════════
function ElderLocationView() {
  const { user } = useAuth();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();

  const [sharing,  setSharing]  = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loc, setLoc] = useState<{
    lat: number; lng: number; accuracy?: number | null; address: string; updatedAt: string;
  } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase.from('elder_locations').select('*').eq('elder_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setSharing(data.is_sharing);
        setLoc({ lat: data.latitude, lng: data.longitude, accuracy: data.accuracy, address: data.address ?? '', updatedAt: data.updated_at });
      }
    });
  }, [user]));

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pushLocation = async () => {
    if (!user) return;
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      let address = '';
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo) address = [geo.name, geo.city, geo.region].filter(Boolean).join(', ');
      } catch {}
      const updatedAt = new Date().toISOString();
      setLoc({ lat, lng, accuracy, address, updatedAt });
      await supabase.from('elder_locations').upsert(
        { elder_id: user.id, latitude: lat, longitude: lng, accuracy, address, is_sharing: true, updated_at: updatedAt },
        { onConflict: 'elder_id' },
      );
    } catch (e: any) { console.error('Location push error:', e); }
  };

  const startSharing = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is needed to share your location with family.');
      return;
    }
    await pushLocation();
    intervalRef.current = setInterval(pushLocation, 30_000);
  };

  const stopSharing = async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (user && loc) {
      await supabase.from('elder_locations').upsert(
        { elder_id: user.id, latitude: loc.lat, longitude: loc.lng, is_sharing: false, updated_at: new Date().toISOString() },
        { onConflict: 'elder_id' },
      );
    }
  };

  const handleToggle = async (val: boolean) => {
    setToggling(true);
    try {
      if (val) await startSharing();
      else await stopSharing();
      setSharing(val);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setToggling(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[s.elderHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <Text style={s.elderHeaderTitle}>My Location</Text>
      </View>

      <ScrollView contentContainerStyle={s.elderScroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, CARD_SHADOW]}>
          <View style={s.cardRow}>
            <View style={[s.iconBg, { backgroundColor: sharing ? '#D1FADF' : '#F1F5F9' }]}>
              <Ionicons name="location" size={26} color={sharing ? '#16A34A' : G.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Share My Location</Text>
              <Text style={s.cardSub}>{sharing ? 'Your family can see where you are' : 'Tap to start sharing with family'}</Text>
            </View>
            {toggling ? <ActivityIndicator color={G.accent} /> : (
              <Switch value={sharing} onValueChange={handleToggle} trackColor={{ false: '#D1D5DB', true: '#5BB5A2' }} thumbColor="#FFFFFF" ios_backgroundColor="#D1D5DB" />
            )}
          </View>
        </View>

        {loc ? (
          <View style={[s.card, CARD_SHADOW]}>
            <Text style={s.sectionTitle}>Current Location</Text>
            <View style={s.locRow}>
              <Ionicons name="navigate" size={18} color={G.accent} />
              <Text style={s.locAddress} numberOfLines={2}>{loc.address || 'Address not available'}</Text>
            </View>
            <View style={s.coordRow}>
              <Text style={s.coordText}>Lat: {loc.lat.toFixed(6)}</Text>
              <Text style={s.coordText}>Lng: {loc.lng.toFixed(6)}</Text>
            </View>
            {loc.accuracy != null && <Text style={s.accuracy}>Accuracy: ±{Math.round(loc.accuracy ?? 0)}m</Text>}
            <Text style={s.updatedAtText}>Updated {timeAgo(loc.updatedAt)}</Text>
            <View style={[s.statusBadge, { backgroundColor: sharing ? '#D1FADF' : '#FEE2E2' }]}>
              <Ionicons name={sharing ? 'eye' : 'eye-off'} size={14} color={sharing ? '#16A34A' : '#DC2626'} />
              <Text style={[s.statusText, { color: sharing ? '#16A34A' : '#DC2626' }]}>
                {sharing ? 'Visible to family' : 'Hidden from family'}
              </Text>
            </View>
          </View>
        ) : (
          !sharing && (
            <View style={[s.card, CARD_SHADOW, s.emptyCard]}>
              <Ionicons name="location-outline" size={40} color="#B0BEC5" />
              <Text style={s.emptyTitle}>No location shared yet</Text>
              <Text style={s.emptySub}>Toggle sharing above to let your family know where you are.</Text>
            </View>
          )
        )}

        {loc && sharing && (
          <ElderMapCard lat={loc.lat} lng={loc.lng} />
        )}

        <View style={[s.noteCard, CARD_SHADOW]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#7C3AED" />
          <View style={{ flex: 1 }}>
            <Text style={s.noteTitle}>Your Privacy</Text>
            <Text style={s.noteSub}>Only connected family members can see your location. You can turn it off any time.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// GUARDIAN VIEW — redesigned
// ═══════════════════════════════════════════════════════════
function GuardianLocationView() {
  const { user }    = useAuth();
  const [elders,    setElders]    = useState<Elder[]>([]);
  const [locations, setLocations] = useState<Record<string, ElderLoc>>({});
  const [loading,   setLoading]   = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mapReady,  setMapReady]  = useState(false);

  const loadElders = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('guardian_elder_links')
        .select('elder_id, parent_name, relation')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');
      setElders((data ?? []) as Elder[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  const loadLocations = useCallback(async (elderList: Elder[]) => {
    if (elderList.length === 0) return;
    const ids = elderList.map(e => e.elder_id);
    const { data } = await supabase.from('elder_locations').select('*').in('elder_id', ids);
    const map: Record<string, ElderLoc> = {};
    (data ?? []).forEach((l: any) => { map[l.elder_id] = l; });
    setLocations(map);
  }, []);

  useFocusEffect(useCallback(() => { loadElders(); }, [loadElders]));
  useEffect(() => { if (elders.length > 0) loadLocations(elders); }, [elders, loadLocations]);

  useEffect(() => {
    if (elders.length === 0) return;
    const channels = elders.map(e =>
      supabase
        .channel(`loc-elder-${e.elder_id}`)
        .on('postgres_changes' as any,
          { event: '*', schema: 'public', table: 'elder_locations', filter: `elder_id=eq.${e.elder_id}` },
          () => loadLocations(elders),
        )
        .subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [elders.map(e => e.elder_id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const openMaps = (loc: ElderLoc) => {
    const url = Platform.OS === 'ios'
      ? `maps://app?ll=${loc.latitude},${loc.longitude}&q=Elder+Location`
      : `geo:${loc.latitude},${loc.longitude}?q=${loc.latitude},${loc.longitude}(Elder+Location)`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`));
  };

  const active    = elders[activeIdx];
  const activeLoc = active ? locations[active.elder_id] : undefined;
  const isLive    = activeLoc?.is_sharing ?? false;

  // Reset map ready state when switching between elders
  useEffect(() => { setMapReady(false); }, [activeIdx]);

  return (
    <View style={g.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Live Location" />

      {/* ── Full-width fixed map ── */}
      <View style={g.mapOuter}>
        {loading ? (
          <View style={[g.mapView, g.mapCenter]}>
            <ActivityIndicator color={G.accent} size="large" />
            <Text style={g.mapCenterText}>Loading…</Text>
          </View>
        ) : elders.length === 0 ? (
          <View style={[g.mapView, g.mapCenter, { gap: 10 }]}>
            <View style={g.noLocIconBox}>
              <Ionicons name="location-outline" size={32} color="#B0BEC5" />
            </View>
            <Text style={g.mapCenterText}>No connected parents</Text>
          </View>
        ) : activeLoc ? (
          Platform.OS === 'android' ? (
            <MapWebView
              lat={activeLoc.latitude}
              lng={activeLoc.longitude}
              height={MAP_H}
              zoom={15}
              markerTitle={active?.parent_name}
              scrollEnabled
            />
          ) : (
            <>
              <MapView
                style={[g.mapView, { opacity: mapReady ? 1 : 0 }]}
                region={{
                  latitude:       activeLoc.latitude,
                  longitude:      activeLoc.longitude,
                  latitudeDelta:  0.008,
                  longitudeDelta: 0.008,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                onMapReady={() => setMapReady(true)}
              >
                <Marker
                  coordinate={{ latitude: activeLoc.latitude, longitude: activeLoc.longitude }}
                  title={active?.parent_name}
                  description={activeLoc.address ?? undefined}
                  pinColor={G.accent}
                />
              </MapView>
              {!mapReady && (
                <View style={[g.mapView, g.mapCenter, { position: 'absolute' }]}>
                  <ActivityIndicator color={G.accent} size="large" />
                  <Text style={g.mapCenterText}>Loading map…</Text>
                </View>
              )}
            </>
          )
        ) : (
          <View style={[g.mapView, g.mapCenter, { gap: 10 }]}>
            <View style={g.noLocIconBox}>
              <Ionicons name="location-outline" size={32} color="#B0BEC5" />
            </View>
            <Text style={g.mapCenterText}>Location not shared</Text>
            {active && <Text style={g.mapCenterSub}>Ask {active.parent_name} to enable sharing</Text>}
          </View>
        )}

        {/* Live / Offline badge — top-right */}
        {!loading && elders.length > 0 && activeLoc && (
          <View style={[g.liveBadge, { backgroundColor: isLive ? 'rgba(22,163,74,0.92)' : 'rgba(100,116,139,0.9)' }]}>
            <View style={[g.liveDot, { backgroundColor: isLive ? '#86efac' : '#cbd5e1' }]} />
            <Text style={g.liveText}>
              {isLive ? `Live · ${timeAgo(activeLoc.updated_at)}` : 'Offline'}
            </Text>
          </View>
        )}

        {/* Elder chip selector — overlaid at bottom of map */}
        {!loading && elders.length > 0 && (
          <View style={g.elderBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={g.elderBarInner}>
              {elders.map((e, i) => {
                const loc      = locations[e.elder_id];
                const isActive = i === activeIdx;
                return (
                  <Pressable
                    key={e.elder_id}
                    onPress={() => setActiveIdx(i)}
                    style={[g.elderChip, isActive && g.elderChipActive]}
                  >
                    <View style={[g.elderChipAvatar, { backgroundColor: chipBg(e.parent_name) }]}>
                      <Text style={g.elderChipInitial}>{e.parent_name[0]?.toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={[g.elderChipName, isActive && { color: G.accent }]}>
                        {e.parent_name.split(' ')[0]}
                      </Text>
                      <View style={g.elderChipStatusRow}>
                        <View style={[g.elderChipDot, { backgroundColor: loc?.is_sharing ? '#16A34A' : '#94A3B8' }]} />
                        <Text style={g.elderChipSub}>{loc?.is_sharing ? 'Live' : 'Offline'}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── Scrollable info panel ── */}
      <ScrollView
        style={g.scroll}
        contentContainerStyle={g.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!loading && elders.length === 0 ? (
          <View style={[g.emptyCard, CARD_SHADOW]}>
            <View style={g.emptyIconBox}>
              <Ionicons name="people-outline" size={34} color="#B0BEC5" />
            </View>
            <Text style={g.emptyTitle}>No Connected Parents</Text>
            <Text style={g.emptySub}>Add a parent to track their live location.</Text>
          </View>
        ) : active ? (
          <>
            {/* ── Location info card ── */}
            <View style={[g.infoCard, CARD_SHADOW]}>

              {/* Identity row */}
              <View style={g.identityRow}>
                <View style={[g.identityAvatar, { backgroundColor: chipBg(active.parent_name) }]}>
                  <Text style={g.identityInitial}>{active.parent_name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={g.identityName}>{active.parent_name}</Text>
                  <Text style={g.identityRel}>{active.relation}</Text>
                </View>
                <View style={[g.statusChip, {
                  backgroundColor: isLive ? '#D1FADF' : '#F1F5F9',
                }]}>
                  <View style={[g.statusDot, { backgroundColor: isLive ? '#16A34A' : '#94A3B8' }]} />
                  <Text style={[g.statusText, { color: isLive ? '#16A34A' : '#64748B' }]}>
                    {isLive ? 'Sharing' : 'Not Sharing'}
                  </Text>
                </View>
              </View>

              {activeLoc ? (
                <>
                  <View style={g.separator} />

                  {/* Address block */}
                  <View style={g.addressBlock}>
                    <View style={g.addressIconWrap}>
                      <Ionicons name="location" size={20} color={G.accent} />
                    </View>
                    <Text style={g.addressText} numberOfLines={2}>
                      {activeLoc.address || 'Address not available'}
                    </Text>
                  </View>

                  {/* Meta row */}
                  <View style={g.metaRow}>
                    <View style={g.metaPill}>
                      <Ionicons name="time-outline" size={13} color={G.muted} />
                      <Text style={g.metaPillText}>Updated {timeAgo(activeLoc.updated_at)}</Text>
                    </View>
                    {activeLoc.accuracy != null && (
                      <View style={g.metaPill}>
                        <Ionicons name="radio-outline" size={13} color={G.muted} />
                        <Text style={g.metaPillText}>±{Math.round(activeLoc.accuracy ?? 0)}m accuracy</Text>
                      </View>
                    )}
                  </View>

                  {/* Coordinates */}
                  <Text style={g.coordsText}>
                    {activeLoc.latitude.toFixed(5)}, {activeLoc.longitude.toFixed(5)}
                  </Text>

                  {/* Action buttons */}
                  <View style={g.actionsRow}>
                    <Pressable style={g.btnPrimary} onPress={() => openMaps(activeLoc)}>
                      <Ionicons name="navigate" size={18} color="#fff" />
                      <Text style={g.btnPrimaryText}>Open in Maps</Text>
                    </Pressable>
                    <Pressable style={g.btnSecondary} onPress={() => loadLocations(elders)}>
                      <Ionicons name="refresh-outline" size={18} color={G.accent} />
                      <Text style={g.btnSecondaryText}>Refresh</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={g.offlineBlock}>
                  <Ionicons name="wifi-outline" size={26} color="#94A3B8" />
                  <Text style={g.offlineTitle}>{active.parent_name} is not sharing location</Text>
                  <Text style={g.offlineSub}>Ask them to enable sharing in the TinyBit app</Text>
                </View>
              )}
            </View>

            {/* ── Safe Zones ── */}
            <View style={g.sectionRow}>
              <Text style={g.sectionTitle}>Safe Zones</Text>
              <View style={g.sectionBadge}>
                <Text style={g.sectionBadgeText}>{SAFE_ZONES.length} zones</Text>
              </View>
            </View>
            <View style={[g.safeCard, CARD_SHADOW]}>
              {SAFE_ZONES.map((z, idx) => (
                <View key={z.id} style={[g.safeRow, idx !== 0 && g.safeRowBorder]}>
                  <View style={[g.safeIconBox, { backgroundColor: z.iconBg }]}>
                    <Ionicons name={z.icon as any} size={20} color={z.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={g.safeName}>{z.name}</Text>
                    <Text style={g.safeSub}>{z.note}</Text>
                  </View>
                  <View style={[g.safeBadgePill, { backgroundColor: z.badge.bg }]}>
                    <Text style={[g.safeBadgeText, { color: z.badge.fg }]}>{z.badge.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT — role-based switch
// ═══════════════════════════════════════════════════════════
export default function LocationScreen() {
  const { profile } = useAuth();
  if (profile?.role === 'elder') return <ElderLocationView />;
  return <GuardianLocationView />;
}

// ─── Elder styles ────────────────────────────────────────
const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: G.bg },
  elderHeader:     { backgroundColor: G.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 18, gap: 14 },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  elderHeaderTitle:{ fontSize: 20, fontWeight: '900', color: '#fff' },
  elderScroll:     { padding: 16, paddingBottom: 120 },
  card:            { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 14 },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBg:          { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardTitle:       { fontSize: 16, fontWeight: '900', color: G.text },
  cardSub:         { fontSize: 13, fontWeight: '600', color: G.muted, marginTop: 3 },
  sectionTitle:    { fontSize: 16, fontWeight: '900', color: G.text, marginBottom: 12 },
  locRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  locAddress:      { flex: 1, fontSize: 14, fontWeight: '700', color: '#0284C7', lineHeight: 20 },
  coordRow:        { flexDirection: 'row', gap: 16, marginBottom: 6 },
  coordText:       { fontSize: 13, fontWeight: '700', color: G.muted, fontVariant: ['tabular-nums'] },
  accuracy:        { fontSize: 12, fontWeight: '600', color: G.muted, marginBottom: 6 },
  updatedAtText:   { fontSize: 12, fontWeight: '700', color: G.muted, marginBottom: 12 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  statusText:      { fontSize: 13, fontWeight: '900' },
  emptyCard:       { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyTitle:      { fontSize: 17, fontWeight: '900', color: G.text },
  emptySub:        { fontSize: 13, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 19 },
  noteCard:        { backgroundColor: '#F5F0FF', borderRadius: 22, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noteTitle:       { fontSize: 14, fontWeight: '900', color: '#7C3AED', marginBottom: 4 },
  noteSub:         { fontSize: 13, fontWeight: '600', color: '#6B4FA0', lineHeight: 18 },
  mapFallback:     { position: 'absolute', top: 0, left: 0, right: 0, height: 180, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F1F5F9' },
  mapFallbackText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  mapOverlay:      { position: 'absolute', bottom: 10, left: 12, right: 12 },
  mapBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  mapLiveDot:      { width: 8, height: 8, borderRadius: 4 },
  mapLiveText:     { fontSize: 12, fontWeight: '800', color: '#111' },
});

// ─── Guardian styles ─────────────────────────────────────
const g = StyleSheet.create({
  root:   { flex: 1, backgroundColor: G.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  // Map
  mapOuter: {
    width: SCREEN_W,
    height: MAP_H,
    backgroundColor: '#E8EDF2',
    overflow: 'hidden',
  },
  mapView:   { width: SCREEN_W, height: MAP_H },
  mapCenter: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  mapCenterText: { fontSize: 15, fontWeight: '700', color: '#94A3B8' },
  mapCenterSub:  { fontSize: 13, fontWeight: '600', color: '#B0BEC5', textAlign: 'center', paddingHorizontal: 24 },
  noLocIconBox:  { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

  // Live badge
  liveBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  liveDot:  { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // Elder chip bar (overlaid at bottom of map)
  elderBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 10,
  },
  elderBarInner: { paddingHorizontal: 14, gap: 10 },
  elderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  elderChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: G.accent,
  },
  elderChipAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  elderChipInitial:  { fontSize: 15, fontWeight: '900', color: '#7C3AED' },
  elderChipName:     { fontSize: 13, fontWeight: '900', color: G.text },
  elderChipStatusRow:{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  elderChipDot:      { width: 6, height: 6, borderRadius: 3 },
  elderChipSub:      { fontSize: 11, fontWeight: '700', color: G.muted },

  // Empty state
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 32,
    alignItems: 'center', gap: 12, marginTop: 8,
  },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: G.text },
  emptySub:   { fontSize: 13, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 19 },

  // Info card
  infoCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 18,
    marginBottom: 20,
  },

  // Identity row
  identityRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  identityInitial:{ fontSize: 20, fontWeight: '900', color: '#7C3AED' },
  identityName:   { fontSize: 17, fontWeight: '900', color: G.text },
  identityRel:    { fontSize: 12, fontWeight: '700', color: G.muted, marginTop: 2 },

  // Status chip
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '900' },

  separator:  { height: 1, backgroundColor: '#EEF2F7', marginVertical: 14 },

  // Address block
  addressBlock: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginBottom: 12,
  },
  addressIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  addressText: { flex: 1, fontSize: 15, fontWeight: '700', color: G.text, lineHeight: 21, paddingTop: 8 },

  // Meta row
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  metaPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  metaPillText: { fontSize: 12, fontWeight: '700', color: G.muted },

  coordsText: { fontSize: 12, fontWeight: '700', color: '#B0BEC5', marginBottom: 14, fontVariant: ['tabular-nums'] },

  // Action buttons
  actionsRow:       { flexDirection: 'row', gap: 10 },
  btnPrimary:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: G.primary, borderRadius: 16, paddingVertical: 13 },
  btnPrimaryText:   { color: '#fff', fontSize: 14, fontWeight: '900' },
  btnSecondary:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: G.accent, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 18 },
  btnSecondaryText: { color: G.accent, fontSize: 14, fontWeight: '900' },

  // Offline state
  offlineBlock: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingTop: 14 },
  offlineTitle: { fontSize: 15, fontWeight: '900', color: G.muted, textAlign: 'center' },
  offlineSub:   { fontSize: 13, fontWeight: '600', color: '#B0BEC5', textAlign: 'center', lineHeight: 18 },

  // Section header
  sectionRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle:     { fontSize: 18, fontWeight: '900', color: G.text },
  sectionBadge:     { backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  sectionBadgeText: { fontSize: 12, fontWeight: '900', color: G.accent },

  // Safe zones
  safeCard:      { backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden', marginBottom: 16 },
  safeRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  safeRowBorder: { borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  safeIconBox:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  safeName:      { fontSize: 15, fontWeight: '900', color: G.text },
  safeSub:       { marginTop: 3, fontSize: 12, fontWeight: '700', color: G.muted },
  safeBadgePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  safeBadgeText: { fontSize: 12, fontWeight: '900' },
});
