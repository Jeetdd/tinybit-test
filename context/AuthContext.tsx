import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';

import { buildFullName, deriveNamesFromUser, splitFullName } from '../utils/profileName';
import { consumePendingAppleName } from '../services/oauth';
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
  deleteAccount: () => Promise<void>;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
        // IMPORTANT: do NOT await fetchProfile here. The Supabase SDK awaits
        // every onAuthStateChange callback before resolving exchangeCodeForSession.
        // If fetchProfile awaits a DB query while the SDK holds the auth lock
        // (inside exchangeCodeForSession), it deadlocks. Fire-and-forget lets the
        // callback return immediately so the SDK can release the lock, and
        // fetchProfile's query succeeds once the lock is free.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          Logger.auth(TAG, 'Fetching profile', { event });
          fetchProfile(session.user);
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
      const appleName = consumePendingAppleName();
      const dbNames = splitFullName(data?.full_name);
      const firstName = data?.first_name || authNames.firstName || appleName?.firstName || dbNames.firstName;
      const lastName = data?.last_name || authNames.lastName || appleName?.lastName || dbNames.lastName;
      const fullName = data?.full_name || authNames.fullName || appleName?.fullName || buildFullName(firstName, lastName);

      // Sync fields that are available from Auth but missing in DB
      const authPhone = authUser.phone ?? null;
      const authAvatar =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null;
      const needsSync: Record<string, string> = {};
      if (!data?.first_name  && firstName)   needsSync.first_name   = firstName;
      if (!data?.last_name   && lastName)    needsSync.last_name    = lastName;
      if (!data?.full_name   && fullName)    needsSync.full_name    = fullName;
      if (!data?.mobile      && authPhone)   needsSync.mobile       = authPhone;
      if (!data?.profile_image && authAvatar) needsSync.profile_image = authAvatar;
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
        avatar_url:         data?.profile_image || authAvatar || undefined,
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
    const PENALTY_PER_DAY = 5; // points lost per missed day
    const storedStreak = await AsyncStorage.getItem('userStreak');
    const lastOpen     = await AsyncStorage.getItem('lastOpenDate');
    const today        = new Date().toDateString();

    if (storedStreak && lastOpen) {
      if (lastOpen === today) {
        setStreak(parseInt(storedStreak, 10));
      } else {
        const daysAgo = Math.round(
          (new Date(today).getTime() - new Date(lastOpen).getTime()) / (1000 * 60 * 60 * 24)
        );
        let newStreak: number;
        if (daysAgo === 1) {
          // Opened yesterday — perfect consecutive day
          newStreak = parseInt(storedStreak, 10) + 1;
        } else {
          // Missed (daysAgo - 1) days — apply penalty
          const daysMissed = daysAgo - 1;
          newStreak = Math.max(0, parseInt(storedStreak, 10) - daysMissed * PENALTY_PER_DAY);
        }
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

  const deleteAccount = async () => {
    if (!user) return;
    const uid = user.id;
    Logger.auth(TAG, 'deleteAccount', { userId: uid });
    try {
      // Delete all user data in parallel (RLS allows users to delete own rows)
      await Promise.allSettled([
        supabase.from('medicines').delete().eq('user_id', uid),
        supabase.from('medicine_logs').delete().eq('user_id', uid),
        supabase.from('daily_check_ins').delete().eq('user_id', uid),
        supabase.from('health_logs').delete().eq('user_id', uid),
        supabase.from('ai_conversations').delete().eq('user_id', uid),
        supabase.from('emergency_contacts').delete().eq('user_id', uid),
        supabase.from('sos_alerts').delete().eq('user_id', uid),
        supabase.from('journal').delete().eq('user_id', uid),
        supabase.from('mood_entries').delete().eq('user_id', uid),
        supabase.from('guardian_check_in_shares').delete().eq('elder_id', uid),
        supabase.from('guardian_elder_links').delete().eq('elder_id', uid),
        supabase.from('guardian_elder_links').delete().eq('guardian_id', uid),
        supabase.from('notifications').delete().eq('user_id', uid),
        supabase.from('user_plans').delete().eq('user_id', uid),
      ]);
      // Wipe profile fields so re-login treats this as a brand-new user
      await supabase.from('profiles').update({
        role: null,
        age: null,
        location: null,
        biological_sex: null,
        height: null,
        weight: null,
        blood_group: null,
        emergency_phone: null,
        emergency_name: null,
        emergency_relation: null,
        medical_conditions: null,
        medications: null,
        doctor_name: null,
        doctor_contact: null,
      }).eq('id', uid);
    } catch (err) {
      Logger.error(TAG, 'deleteAccount cleanup error (non-fatal)', err);
    } finally {
      setProfile(null);
      setPlan(DEFAULT_PLAN);
      await AsyncStorage.clear();
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, plan, isLoading, logout, deleteAccount, refreshProfile, streak }}>
      {children}
    </AuthContext.Provider>
  );
};
