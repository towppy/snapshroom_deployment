import axios from 'axios';

<<<<<<< HEAD
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
=======
// Always use the base URL WITHOUT /api at the end in .env
// Append /api in code only
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
>>>>>>> fff455e2be6777a8a426efa95cec942c877f9a41

export interface Farm {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmsResponse {
  success: boolean;
  count: number;
  farms: Farm[];
  error?: string;
  message?: string;
}

export const farmsService = {
  // Get all farms
  getFarms: async (type: string = 'farm'): Promise<FarmsResponse> => {
    try {
<<<<<<< HEAD
      const response = await axios.get(`${API_URL}/api/farms`, {
=======
      const response = await axios.get(`${API_BASE_URL}/api/farms`, {
>>>>>>> fff455e2be6777a8a426efa95cec942c877f9a41
        params: { type },
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching farms:', error);
      return {
        success: false,
        count: 0,
        farms: [],
        error: error.response?.data?.error || 'Failed to fetch farms'
      };
    }
  },

  // Get specific farm by ID
  getFarm: async (farmId: string): Promise<{ success: boolean; farm?: Farm; error?: string }> => {
    try {
<<<<<<< HEAD
      const response = await axios.get(`${API_URL}/api/farms/${farmId}`, {
=======
      const response = await axios.get(`${API_BASE_URL}/api/farms/${farmId}`, {
>>>>>>> fff455e2be6777a8a426efa95cec942c877f9a41
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching farm:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch farm'
      };
    }
  }
};