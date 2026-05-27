// Backend base URL — driven by EXPO_PUBLIC_API_BASE_URL in .env
// Production: https://tinybit-test-production.up.railway.app/api  (set in .env)
// Local dev:  http://<YOUR_LOCAL_IP>:5000/api
// Android emulator: http://10.0.2.2:5000/api
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://tinybit-test-production.up.railway.app/api';
