import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
// @ts-ignore - getReactNativePersistence exists at runtime but lacks TS types in v12
import { getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCIDvWHJCv7k3c0RLg14aBFj1AnmDWrvBc",
  authDomain: "snapshroom-39671.firebaseapp.com",
  projectId: "snapshroom-39671",
  storageBucket: "snapshroom-39671.firebasestorage.app",
  messagingSenderId: "439538035488",
  appId: "1:439538035488:web:b4b4c44311faa8de7fc545",
  measurementId: "G-PQ1DF4HBEW"
};

// Prevent re-initialization during hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Platform-specific auth initialization
let auth: ReturnType<typeof getAuth>;

if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  // Mobile: use AsyncStorage for persistent auth state
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (e) {
    // Already initialized (hot reload)
    auth = getAuth(app);
  }
}

export { auth };

// 🔍 DEBUG ONLY — remove after debugging
// In the browser console, run: await window.testGoogleSignIn()
if (typeof window !== 'undefined' && __DEV__) {
  (window as any).testGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('SUCCESS!', result.user);
      return result.user;
    } catch (error) {
      console.error('ERROR:', error);
      return error;
    }
  };
}
