// Base API URL — override via EXPO_PUBLIC_API_BASE_URL in .env for different networks.
// For Android emulator: http://10.0.2.2:5000/api
// For iOS simulator / Expo Go on same WiFi: http://<YOUR_LOCAL_IP>:5000/api
// URL is set by start-dev.ps1 → .env → EXPO_PUBLIC_API_BASE_URL automatically.
// Fallback is the local IP (works if phone and PC are on same network without AP isolation).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.0.240:5000/api';
