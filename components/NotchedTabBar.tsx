import React, { useEffect, useState } from 'react';
import { Image, Keyboard, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const BAR_HEIGHT   = 60;   // tab bar visible height
const CORNER_R     = 24;   // outer corner radius
const NOTCH_W      = 88;   // width of the U‑notch
const NOTCH_D      = 28;   // depth of the U‑notch
const ORB_SIZE     = 56;   // mascot circle diameter
const ORB_LIFT     = 20;   // px the orb rises above the bar top

function getPath(w: number, h: number) {
  const cx  = w / 2;
  const nl  = cx - NOTCH_W / 2;
  const nr  = cx + NOTCH_W / 2;
  const sh  = 20;   // shoulder blend width
  const cp1 = Math.round(NOTCH_W * 0.28);
  const cp2 = Math.round(NOTCH_W * 0.16);
  return [
    `M 0 ${CORNER_R}`,
    `Q 0 0 ${CORNER_R} 0`,
    `L ${nl - sh} 0`,
    `C ${nl + cp1} 0 ${cx - cp2} ${NOTCH_D} ${cx} ${NOTCH_D}`,
    `C ${cx + cp2} ${NOTCH_D} ${nr - cp1} 0 ${nr + sh} 0`,
    `L ${w - CORNER_R} 0`,
    `Q ${w} 0 ${w} ${CORNER_R}`,
    `L ${w} ${h} L 0 ${h} Z`,
  ].join(' ');
}

function getLabel(title: unknown, route: string) {
  if (typeof title === 'string' && title.trim()) return title;
  if (route === 'index') return 'Home';
  if (route === 'ai')    return 'Sathi AI';
  return route.charAt(0).toUpperCase() + route.slice(1);
}

const TAB_ICONS: Record<string, [string, string]> = {
  index:    ['home-outline',   'home'],
  medicine: ['medkit-outline', 'medkit'],
  journal:  ['book-outline',   'book'],
  profile:  ['person-outline', 'person'],
};

function TabIcon({ route, color, isFocused }: { route: string; color: string; isFocused: boolean }) {
  const [outline, filled] = TAB_ICONS[route] ?? ['home-outline', 'home'];
  return <Ionicons name={(isFocused ? filled : outline) as any} size={22} color={color} />;
}

const GUARDIAN_TABS = [
  { icon: 'home-outline',          iconActive: 'home',           label: 'Home',     name: 'index' },
  { icon: 'location-outline',      iconActive: 'location',       label: 'Location', name: 'location' },
  { icon: 'notifications-outline', iconActive: 'notifications',  label: 'Alerts',   name: 'alerts' },
  { icon: 'document-text-outline', iconActive: 'document-text',  label: 'Reports',  name: 'reports' },
  { icon: 'person-outline',        iconActive: 'person',         label: 'Profile',  name: 'profile' },
] as const;

function GuardianTabBar({ nightMode, state, navigation }: { nightMode: boolean; state: BottomTabBarProps['state']; navigation: BottomTabBarProps['navigation'] }) {
  const insets   = useSafeAreaInsets();

  const tabBg       = nightMode ? '#161B22' : '#FFFFFF';
  const activeClr   = '#2C3E8C';
  const inactiveClr = nightMode ? '#8792A2' : '#9AA3B8';

  return (
    <View style={[gt.bar, { backgroundColor: tabBg, paddingBottom: insets.bottom + 4 }]}>
      {GUARDIAN_TABS.map((tab) => {
        const isFocused = state.index === state.routes.findIndex(r => r.name === tab.name);
        const color     = isFocused ? activeClr : inactiveClr;
        
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes.find(r => r.name === tab.name)?.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name as never);
          }
        };

        return (
          <Pressable
            key={tab.label}
            style={gt.item}
            onPress={onPress}
          >
            <Ionicons
              name={(isFocused ? tab.iconActive : tab.icon) as any}
              size={22}
              color={color}
            />
            <Text style={[gt.label, { color }, isFocused && gt.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const gt = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    boxShadow: '0px -3px 16px rgba(0,0,0,0.08)',
    elevation: 24,
  },
  item:        { flex: 1, alignItems: 'center', gap: 3 },
  label:       { fontSize: 11, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
});

export function NotchedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets    = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { nightMode } = useLanguage();
  const { profile } = useAuth();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;
  if (profile?.role === 'guardian') {
    return <GuardianTabBar nightMode={nightMode} state={state} navigation={navigation} />;
  }

  const tabBg       = nightMode ? '#161B22' : '#FFFFFF';
  const activeClr   = '#2C3E8C';
  const inactiveClr = nightMode ? '#8792A2' : '#9AA3B8';
  const centerClr   = '#3571D8';

  const tabOrder = ['index', 'medicine', 'ai', 'journal', 'profile'] as const;
  const routes = tabOrder
    .map(n => state.routes.find(r => r.name === n))
    .filter((r): r is (typeof state.routes)[number] => Boolean(r));

  const sw   = width > 0 ? width : 390;
  const path = getPath(sw, BAR_HEIGHT + insets.bottom);
  const cx   = sw / 2;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {/* White halo behind the mascot — masks the notch gap */}
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            left: cx - ORB_SIZE / 2 - 8,
            bottom: BAR_HEIGHT + insets.bottom - NOTCH_D - 8,
            backgroundColor: nightMode ? '#161B22' : '#FFFFFF',
          },
        ]}
      />

      {/* SVG notched bar shape */}
      <Svg
        width={sw}
        height={BAR_HEIGHT + insets.bottom}
        style={styles.svg}
      >
        <Path d={path} fill={tabBg} />
      </Svg>

      {/* Tab items row */}
      <View
        style={[
          styles.row,
          { height: BAR_HEIGHT, paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 4 : 6) },
        ]}
      >
        {routes.map((route) => {
          const descriptor = descriptors[route.key];
          const label      = getLabel(descriptor.options.title, route.name);
          const isFocused  = state.index === state.routes.findIndex(r => r.key === route.key);
          const isCenter   = route.name === 'ai';
          const color      = isCenter ? centerClr : (isFocused ? activeClr : inactiveClr);

          const onPress = () => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !ev.defaultPrevented) navigation.navigate(route.name as never);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [
                styles.item,
                isCenter && styles.centerItem,
                pressed && styles.pressed,
              ]}
            >
              {isCenter ? (
                /* ── Raised mascot orb ── */
                <View style={styles.orbWrap}>
                  {/* Empty circle ring — the platform */}
                  <View style={[styles.orbCircle, { backgroundColor: nightMode ? '#0D1A30' : '#FFFFFF' }]} />
                  {/* Mascot ON the circle — rendered after = stacks on top */}
                  <Image
                    source={require('../assets/images/Group 427320054.png')}
                    style={styles.orbImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.label, styles.centerLabel, { color }]} numberOfLines={1} allowFontScaling={false}>
                    {label}
                  </Text>
                </View>
              ) : (
                /* ── Regular tab ── */
                <View style={styles.tabWrap}>
                  <TabIcon route={route.name} color={color} isFocused={isFocused} />
                  <Text
                    style={[styles.label, { color }, isFocused && styles.labelActive]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Tab bar shadow via boxShadow (no deprecated shadow* props)
    boxShadow: '0px -3px 16px rgba(0,0,0,0.08)',
    elevation: 24,
  },

  // White circle behind mascot to fill the notch gap
  halo: {
    position: 'absolute',
    width: ORB_SIZE + 16,
    height: ORB_SIZE + 16,
    borderRadius: (ORB_SIZE + 16) / 2,
    zIndex: 1,
  },

  svg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    position: 'relative',
    zIndex: 2,
  },

  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  centerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  pressed: { opacity: 0.75 },

  // Regular tab icon + label stacked
  tabWrap: {
    alignItems: 'center',
    paddingBottom: 6,
    gap: 3,
  },

  // Center orb wrapper — marginBottom lifts the whole group above the bar
  orbWrap: {
    alignItems: 'center',
    marginBottom: BAR_HEIGHT - 8 - ORB_SIZE + ORB_LIFT,
    position: 'relative',
    zIndex: 3,
  },

  // Empty ring — the circular platform the mascot sits on
  orbCircle: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 3,
    borderColor: '#DEDEDE',
    boxShadow: '0px 4px 14px rgba(0,0,0,0.15)',
    elevation: 8,
  },

  // Mascot icon — pulled UP over the circle with negative marginTop
  // Since it follows the circle in JSX, it renders ON TOP of it
  orbImage: {
    width: ORB_SIZE + 8,
    height: ORB_SIZE + 8,
    marginTop: -(ORB_SIZE + 10),  // overlap the entire circle + peek above it
    marginBottom: 2,
  },

  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  labelActive: {
    fontWeight: '700',
  },

  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
