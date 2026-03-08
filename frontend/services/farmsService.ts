import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

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
      const response = await axios.get(`${API_URL}/farms`, {
        params: { type }
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
      const response = await axios.get(`${API_URL}/farms/${farmId}`);
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
