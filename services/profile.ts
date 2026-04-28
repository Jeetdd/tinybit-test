import { supabase } from '../utils/supabase';

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  country_code: string;
  date_of_birth: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  role: 'elder' | 'guardian' | 'caregiver' | 'admin';
  profile_image: string | null;
  cover_image: string | null;
  bio: string | null;
  is_active: boolean;
  family_code: string | null;
  settings: {
    notifications: { push: boolean; email: boolean; sms: boolean };
    privacy: { shareLocation: boolean; shareHealthData: boolean };
    language: string;
    theme: 'light' | 'dark' | 'auto';
  };
  last_login: string | null;
  last_active: string;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  mobile?: string;
  country_code?: string;
  date_of_birth?: string;
  gender?: Profile['gender'];
  role?: Profile['role'];
};

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'first_name'
    | 'last_name'
    | 'mobile'
    | 'country_code'
    | 'date_of_birth'
    | 'gender'
    | 'role'
    | 'profile_image'
    | 'cover_image'
    | 'bio'
    | 'is_active'
    | 'settings'
    | 'last_login'
    | 'last_active'
    | 'device_info'
  >
> & { device_info?: object[] };

// ─── READ ────────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfileByFamilyCode(familyCode: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, profile_image, family_code')
    .eq('family_code', familyCode.toUpperCase())
    .single();
  if (error) throw error;
  return data;
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createProfile(profile: ProfileInsert): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function touchLastActive(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_active: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

// ─── AVATAR UPLOAD ───────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, imageUri: string): Promise<Profile> {
  const ext = imageUri.split('.').pop() ?? 'jpg';
  const fileName = `${userId}/avatar_${Date.now()}.${ext}`;

  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return updateProfile(userId, { profile_image: publicUrl });
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export async function updateSettings(
  userId: string,
  settings: Partial<Profile['settings']>
): Promise<Profile> {
  const current = await getProfile(userId);
  return updateProfile(userId, {
    settings: { ...current.settings, ...settings },
  });
}
