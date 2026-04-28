import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';

import { supabase } from '../utils/supabase';

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  streak: number;
};

type UserProfile = {
  fullName?: string;
  mobile?: string;
  email?: string;
  role?: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email ?? undefined);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    checkSession();
    loadStreak();

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) await fetchProfile(session.user.id, session.user.email ?? undefined);
    setIsLoading(false);
  };

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile({
        fullName: data?.full_name,
        mobile: data?.mobile,
        role: data?.role,
        email: email ?? user?.email,
      });
    } catch {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const loadStreak = async () => {
    const storedStreak = await AsyncStorage.getItem('userStreak');
    const lastOpen = await AsyncStorage.getItem('lastOpenDate');
    const today = new Date().toDateString();

    if (storedStreak && lastOpen) {
      if (lastOpen === today) {
        setStreak(parseInt(storedStreak, 10));
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const newStreak = lastOpen === yesterday.toDateString()
          ? parseInt(storedStreak, 10) + 1
          : 1;
        setStreak(newStreak);
        await AsyncStorage.setItem('userStreak', newStreak.toString());
      }
    } else {
      setStreak(1);
      await AsyncStorage.setItem('userStreak', '1');
    }
    await AsyncStorage.setItem('lastOpenDate', today);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    await AsyncStorage.multiRemove(['userStreak', 'lastOpenDate']);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, logout, refreshProfile, streak }}>
      {children}
    </AuthContext.Provider>
  );
};
