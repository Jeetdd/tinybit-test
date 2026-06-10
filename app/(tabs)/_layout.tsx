import { Tabs } from 'expo-router';
import { NotchedTabBar } from '../../components/NotchedTabBar';
import { useLanguage } from '../../context/LanguageContext';

export default function TabLayout() {
  const { nightMode } = useLanguage();

  return (
    <Tabs
      tabBar={(props) => <NotchedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: nightMode ? '#0B1220' : '#F4F5F8' },
      }}>
      {/* ── Visible tabs ── */}
      <Tabs.Screen name="index"   options={{ title: 'Home' }} />
      <Tabs.Screen name="medicine" options={{ title: 'Medicine' }} />
      <Tabs.Screen name="ai"      options={{ title: 'Sathi' }} />
      <Tabs.Screen name="journal" options={{ title: 'Memories' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

      {/* ── Guardian screens (hidden from tab bar) ── */}
      <Tabs.Screen name="reports"          options={{ href: null, title: 'Reports' }} />
      <Tabs.Screen name="location"         options={{ href: null, title: 'Location' }} />
      <Tabs.Screen name="alerts"           options={{ href: null, title: 'Alerts' }} />
      <Tabs.Screen name="family-circle"    options={{ href: null, title: 'Family Circle' }} />
      <Tabs.Screen name="caregivers"       options={{ href: null, title: 'Caregivers' }} />
      <Tabs.Screen name="add-parent"       options={{ href: null, title: 'Add Parent' }} />
      <Tabs.Screen name="parent-medicines" options={{ href: null, title: 'Parent Medicines' }} />
      <Tabs.Screen name="guardian-calendar" options={{ href: null, title: 'My Calendar' }} />
      <Tabs.Screen name="guardian-summary"  options={{ href: null, title: 'Daily Summary' }} />
      <Tabs.Screen name="doctors"          options={{ href: null, title: 'Doctors' }} />

      {/* ── Elder feature screens (hidden from tab bar) ── */}
      <Tabs.Screen name="health-vault"     options={{ href: null }} />
      <Tabs.Screen name="daily-check-in"   options={{ href: null }} />
      <Tabs.Screen name="care-calendar"    options={{ href: null }} />
      <Tabs.Screen name="family-messages"  options={{ href: null }} />
      <Tabs.Screen name="mind-games"       options={{ href: null }} />
      <Tabs.Screen name="sos"             options={{ href: null }} />
      <Tabs.Screen name="modal"           options={{ href: null }} />

      {/* ── New feature screens (hidden from tab bar) ── */}
      <Tabs.Screen name="wellness-logs"   options={{ href: null, title: 'Wellness Logs' }} />
      <Tabs.Screen name="health-log"      options={{ href: null, title: 'Health Log' }} />
    </Tabs>
  );
}
