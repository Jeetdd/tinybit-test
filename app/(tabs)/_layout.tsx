import { Tabs } from 'expo-router';
import React from 'react';
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="medicine"
        options={{
          title: 'Medicine',
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Sathi AI',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen name="health-vault" options={{ href: null }} />
      <Tabs.Screen name="daily-check-in" options={{ href: null }} />
      <Tabs.Screen name="modal" options={{ href: null }} />
      <Tabs.Screen name="sos" options={{ href: null }} />
      <Tabs.Screen name="care-calendar" options={{ href: null }} />
      <Tabs.Screen name="family-messages" options={{ href: null }} />
      <Tabs.Screen name="mind-games" options={{ href: null }} />
    </Tabs>
  );
}
