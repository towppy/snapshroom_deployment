
// contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { auth } from '@/firebase/config';
import { signOut } from 'firebase/auth';

// ==================================================
// ENV & API URL
// ==================================================
// Build fallback URL from environment variables
// Default to localhost so Expo web in the browser can reach the backend
// running on the same machine without relying on a specific LAN IP.
const BACKEND_IP = process.env.EXPO_PUBLIC_BACKEND_IP || 'localhost';
const BACKEND_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT || '5000';
const FALLBACK_URL = `http://${BACKEND_IP}:${BACKEND_PORT}`;

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.endsWith('/api')
    ? process.env.EXPO_PUBLIC_API_URL
    : `${process.env.EXPO_PUBLIC_API_URL || FALLBACK_URL}/api`;

console.log('Using API URL:', API_URL);

// ==================================================
// TYPES
// ==================================================
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  email_verified?: boolean;
  role?: string;
  created_at?: string;
  profileImage?: string;
  avatar?: string;
  provider?: 'email' | 'google'; // Track authentication provider
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  accessToken: string | null;
  isGoogleLoading: boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  handleGoogleAuth: (idToken: string) => Promise<void>;
  setGoogleLoading: (loading: boolean) => void;
}

// ==================================================
// STORAGE KEYS
// ==================================================
const STORAGE_KEYS = {
  TOKEN: 'snapshroom_access_token',
  USER: 'snapshroom_user',
  PROVIDER: 'snapshroom_auth_provider',
};

// ==================================================
// AXIOS INSTANCE
// ==================================================
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor (fixed TS issue)
api.interceptors.request.use(
  (config) => {
    const authHeader = config.headers?.['Authorization'] as string | undefined;
    if (authHeader) {
      console.log('Sending request with Authorization header');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================================================
// CONTEXT
// ==================================================
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authProvider, setAuthProvider] = useState<'email' | 'google' | null>(null);

  // -------------------------
  // Helpers
  // -------------------------
  const clearAuth = async () => {
    setUser(null);
    setAccessToken(null);
    setAuthProvider(null);
    delete api.defaults.headers.common.Authorization;
    
    // Sign out from Firebase if using Google auth
    try {
      if (auth?.currentUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Firebase signout error:', err);
    }
    
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN, 
      STORAGE_KEYS.USER,
      STORAGE_KEYS.PROVIDER
    ]);
  };

  const storeAuth = async (token: string, userData: User, provider: 'email' | 'google') => {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    await AsyncStorage.setItem(STORAGE_KEYS.PROVIDER, provider);

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setAccessToken(token);
    setUser(userData);
    setAuthProvider(provider);
    setError(null);
  };

  // -------------------------
  // Setup response interceptor for auto-logout on 401
  // -------------------------
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.warn('Unauthorized - token expired or invalid. Logging out...');
          await clearAuth();
          setError('Session expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  // -------------------------
  // Restore auth on start
  // -------------------------
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        const provider = await AsyncStorage.getItem(STORAGE_KEYS.PROVIDER) as 'email' | 'google' | null;

        if (token && userStr && provider) {
          const userData = JSON.parse(userStr);
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          setAccessToken(token);
          setUser(userData);
          setAuthProvider(provider);
          setError(null);
          console.log('Restored auth from storage:', userData.email, 'provider:', provider);
        }
      } catch (err) {
        console.error('Error restoring auth:', err);
        await clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuth();
  }, []);

  // -------------------------
  // LOGIN
  // -------------------------
  const login = async ({ email, password }: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      delete api.defaults.headers.common.Authorization;

      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      }, {
        withCredentials: true,
      });

      if (!res.data.success) throw new Error(res.data.message);

      await storeAuth(res.data.access_token, res.data.user, 'email');
    } catch (err: any) {
      let msg = 'Login failed';
      let code = '';
      let deactivationReason = '';
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        code = data?.code || '';
        if (code === 'email_not_verified') {
          msg = data.message || 'Please verify your email before logging in.';
        } else if (code === 'account_disabled') {
          msg = data.message || 'Your account has been deactivated.';
          deactivationReason = data?.deactivation_reason || '';
        } else {
          msg = data?.message || msg;
        }
      }
      setError(msg);
      // Attach code so callers can differentiate popups
      const error = new Error(msg) as any;
      error.code = code;
      error.deactivation_reason = deactivationReason;
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  // SIGNUP
  // -------------------------
  const signup = async (data: SignupData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', {
        email: data.email.trim().toLowerCase(),
        password: data.password.trim(),
        confirmPassword: data.confirmPassword.trim(),
        username: data.username.trim(),
        name: data.name || data.username.trim(),
      }, {
        withCredentials: true,
      });

      if (!res.data.success) throw new Error(res.data.message);

      // After registration the user must verify their email before logging in.
      // Attempt auto-login; if backend blocks due to unverified email, surface
      // a friendly message rather than a generic "Registration failed" error.
      try {
        await login({ email: data.email, password: data.password });
      } catch (loginErr: any) {
        const msg: string = loginErr?.message || '';
        if (
          msg.toLowerCase().includes('verify') ||
          msg.toLowerCase().includes('verification') ||
          msg.toLowerCase().includes('email_not_verified')
        ) {
          // Registration succeeded – just need to verify email
          setError(null);
          throw new Error('Account created! Please check your email and click the verification link before signing in.');
        }
        throw loginErr;
      }
    } catch (err: any) {
      let msg = 'Registration failed';
      if (err?.message?.startsWith('Account created!')) {
        msg = err.message;
      } else if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || msg;
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  // 🔥 GOOGLE AUTH HANDLER
  // -------------------------
  const handleGoogleAuth = async (idToken: string) => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      // Send the Firebase token to your backend
      const res = await api.post('/auth/google', {
        id_token: idToken,
      }, {
        withCredentials: true,
      });

      if (!res.data.success) throw new Error(res.data.message);

      // Store the backend token and user data
      await storeAuth(res.data.access_token, res.data.user, 'google');
      
      console.log('Google authentication successful');
    } catch (err: any) {
      let msg = 'Google authentication failed';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || msg;
        console.error('Google auth error details:', err.response?.data);
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // -------------------------
  // LOGOUT (Enhanced for Google)
  // -------------------------
  const logout = async () => {
    setIsLoading(true);
    try {
      // Call backend logout endpoint if needed
      if (accessToken) {
        try {
          await api.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } catch (err) {
          console.error('Backend logout error:', err);
        }
      }
      
      await clearAuth();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  // REFRESH USER
  // -------------------------
  const refreshUser = async () => {
    try {
      if (!accessToken) return;

      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        const updatedUser = {
          ...res.data.user,
          provider: authProvider, // Preserve the provider info
        };
        setUser(updatedUser);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const clearError = () => setError(null);
  const setGoogleLoading = (loading: boolean) => setIsGoogleLoading(loading);

  // -------------------------
  // PROVIDER
  // -------------------------
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isGoogleLoading,
        login,
        signup,
        logout,
        refreshUser,
        clearError,
        handleGoogleAuth,
        setGoogleLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==================================================
// HOOK
// ==================================================
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
  };