// Get configuration from environment variables
// Default to localhost so Expo web in the browser can reach
// the backend running on the same machine by default.
const BACKEND_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";
const BACKEND_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT || "5000";
const NGROK_URL = process.env.EXPO_PUBLIC_NGROK_URL || "https://eastwardly-retreatal-kerstin.ngrok-free.dev";

// Local development (localhost)
export const API_URL_LOCAL = "http://localhost:5000";

// Local network IP (from .env)
export const API_URL_NETWORK = `http://${BACKEND_IP}:${BACKEND_PORT}`;

// ngrok forwarding (from .env)
export const API_URL_NGROK = NGROK_URL;

// Active API URL - now uses ngrok by default, falls back to localhost if not set
export const API_URL = process.env.EXPO_PUBLIC_API_URL || API_URL_NGROK || API_URL_LOCAL;

// Alternative configurations:
// export const API_URL = API_URL_LOCAL;      // Use localhost
// export const API_URL = API_URL_NGROK;       // Use ngrok forwarding
