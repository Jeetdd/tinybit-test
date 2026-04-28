import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── AUTH ──────────────────────────────────────────────
export const apiRegister = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  password: string;
  role: string;
}) => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const apiLogin = async (data: { email: string; password: string }) => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const apiGetMe = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/auth/me`, { headers });
  return res.json();
};

// ─── USER ──────────────────────────────────────────────
export const apiGetProfile = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/users/profile`, { headers });
  return res.json();
};

export const apiUpdateProfile = async (data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: string;
}) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return res.json();
};
