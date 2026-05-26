import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';

import { buildFullName, deriveNamesFromUser, splitFullName } from '../utils/profileName';
import { supabase } from '../utils/supabase';
import { UserPlan, DEFAULT_PLAN, fetchUserPlan } from '../services/plan';
import { Logger } from '../utils/logger';

const TAG = 'AuthContext';

export type { UserPlan };

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  plan: UserPlan;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  streak: number;
};

export type Medication = { name: string; dosage: string; timing: string };

export type UserProfile = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  role?: string;
  age?: number;
  location?: string;
  country?: string;
  countryCode?: string;
  preferredLanguage?: string;
  biologicalSex?: string;
  biological_sex?: string;
  height?: string;
  heightUnit?: string;
  weight?: string;
  weightUnit?: string;
  bloodGroup?: string;
  emergencyPhone?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  medicalConditions?: string[];
  medications?: Medication[];
  doctorName?: string;
  doctorContact?: string;
  avatar_url?: string;
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
  const [plan, setPlan] = useState<UserPlan>(DEFAULT_PLAN);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      Logger.auth(TAG, 'AuthStateChange', { event, userId: session?.user?.id });
      
      // Only clear the user on an explicit sign-out — never on TOKEN_REFRESHED,
      // USER_UPDATED, or any transient null-session event. On Android, token
      // refresh fires a brief null session which would otherwise redirect to
      // onboarding while the user is mid-session.
      if (event === 'SIGNED_OUT') {
        Logger.auth(TAG, 'User signed out');
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        // Only fetch the profile on initial load or explicit sign-in.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          Logger.auth(TAG, 'Fetching profile', { event });
          await fetchProfile(session.user);
        }
      } else if (event === 'INITIAL_SESSION') {
        Logger.auth(TAG, 'No session on INITIAL_SESSION');
        setUser(null);
      }
      
      if (event === 'INITIAL_SESSION') {
        setIsLoading(false);
      }
    });

    loadStreak();

    return () => subscription.unsubscribe();
  }, []);

  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const fetchProfile = async (authUser: User) => {
    if (isFetchingProfile) return;
    setIsFetchingProfile(true);
    Logger.debug(TAG, 'fetchProfile starting', { userId: authUser.id });
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      Logger.debug(TAG, 'fetchProfile DB result', { data, error });

      // If profile doesn't exist, create a skeleton one immediately.
      // This prevents 'update' calls in onboarding screens from failing silently.
      if (error && error.code === 'PGRST116') {
        const authNames = deriveNamesFromUser(authUser);
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .upsert({
            id: authUser.id,
            email: authUser.email ?? null,
            first_name: authNames.firstName || '',
            last_name: authNames.lastName || '',
            full_name: authNames.fullName || '',
            // NO default role here — let the user pick in onboarding
          }, { onConflict: 'id' })
          .select()
          .single();
        
        if (insertError) throw insertError;
        data = newData;
        error = null;
      }

      if (error) throw error;

      const authNames = deriveNamesFromUser(authUser);
      const dbNames = splitFullName(data?.full_name);
      const firstName = data?.first_name || authNames.firstName || dbNames.firstName;
      const lastName = data?.last_name || authNames.lastName || dbNames.lastName;
      const fullName = data?.full_name || authNames.fullName || buildFullName(firstName, lastName);

      // Sync fields that are available from Auth but missing in DB
      const authPhone = authUser.phone ?? null;
      const needsSync: Record<string, string> = {};
      if (!data?.first_name && firstName)  needsSync.first_name = firstName;
      if (!data?.last_name  && lastName)   needsSync.last_name  = lastName;
      if (!data?.full_name  && fullName)   needsSync.full_name  = fullName;
      if (!data?.mobile     && authPhone)  needsSync.mobile     = authPhone;
      if (Object.keys(needsSync).length > 0) {
        await supabase.from('profiles').update(needsSync).eq('id', authUser.id);
      }

      const mobile = data?.mobile || authPhone || undefined;

      setProfile({
        firstName,
        lastName,
        fullName,
        mobile,
        phone:              data?.phone || mobile,
        role:               data?.role,
        email:              authUser.email || data?.email,
        age:                data?.age,
        location:           data?.location,
        country:            data?.country,
        countryCode:        data?.country_code,
        preferredLanguage:  data?.preferred_language,
        biologicalSex:      data?.biological_sex,
        biological_sex:     data?.biological_sex,
        height:             data?.height,
        heightUnit:         data?.height_unit,
        weight:             data?.weight,
        weightUnit:         data?.weight_unit,
        bloodGroup:         data?.blood_group,
        emergencyPhone:     data?.emergency_phone,
        emergencyName:      data?.emergency_name,
        emergencyRelation:  data?.emergency_relation,
        medicalConditions:  data?.medical_conditions ?? [],
        medications:        data?.medications ?? [],
        doctorName:         data?.doctor_name,
        doctorContact:      data?.doctor_contact,
        avatar_url:         data?.profile_image,
      });

      const userPlan = await fetchUserPlan(authUser.id);
      setPlan(userPlan);
    } catch (err) {
      Logger.error(TAG, 'fetchProfile error', err);
      setProfile(prev => {
        if (prev) return prev;
        const authNames = deriveNamesFromUser(authUser);
        return {
          firstName: authNames.firstName,
          lastName: authNames.lastName,
          fullName: authNames.fullName,
          email: authUser.email || undefined,
        };
      });
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  // Real-time: when the profile row is updated (by the elder or a guardian),
  // re-fetch so both sides see the change instantly.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, () => { fetchProfile(user); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

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
    setPlan(DEFAULT_PLAN);
    await AsyncStorage.multiRemove(['userStreak', 'lastOpenDate']);
  };

  return (
    <AuthContext.Provider value={{ user, profile, plan, isLoading, logout, refreshProfile, streak }}>
      {children}
    </AuthContext.Provider>
  );
};
