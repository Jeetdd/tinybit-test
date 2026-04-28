import AsyncStorage from '@react-native-async-storage/async-storage';

// UPDATE THIS to your local machine IP if testing on a physical device
// Your current local IP is: 192.168.0.240
const BASE_URL = 'http://192.168.0.240:5000/api';

export const api = {
  async get(endpoint: string) {
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return this.handleResponse(response);
  },

  async post(endpoint: string, data: any) {
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  },

  async put(endpoint: string, data: any) {
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  },

  async handleResponse(response: Response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  }
};
