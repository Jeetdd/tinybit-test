import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { G } from './theme';

type Props = {
  title: string;
  showBack?: boolean;
  /** Show a notification bell icon that navigates to /alerts */
  showNotifications?: boolean;
  /** Badge count shown on the notification bell */
  notificationCount?: number;
  /** Right-side slot for custom action buttons */
  rightSlot?: React.ReactNode;
};

export function GuardianHeader({
  title,
  showBack,
  showNotifications = false,
  notificationCount = 0,
  rightSlot,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const canGoBack    = router.canGoBack();
  const displayBack  = showBack !== undefined ? showBack : canGoBack;

  return (
    <LinearGradient
      colors={[G.headerStart, G.headerEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.header, { paddingTop: insets.top + 12 }]}
    >
      <View style={s.row}>
        {displayBack && (
          <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>
        )}

        <Text
          style={[s.title, !displayBack && { marginLeft: 4 }]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={s.rightRow}>
          {rightSlot}
          {showNotifications && (
            <Pressable
              style={s.iconBtn}
              onPress={() => router.push('/alerts' as any)}
              hitSlop={10}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {notificationCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 54 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    flex: 1, color: '#fff',
    fontSize: 24, fontWeight: '900',
  },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: G.headerEnd,
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
});
