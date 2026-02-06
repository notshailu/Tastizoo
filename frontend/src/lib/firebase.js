import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration - fallback to hardcoded values if env vars are not available
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "tastizo-fdb3f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tastizo-fdb3f",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "tastizo-fdb3f.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "559856129787",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:559856129787:web:d51406216a9a9c7d07025e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DNKLW804MV",
};

// Fetch config from backend
const fetchFirebaseConfig = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/env/public");
    if (response.ok) {
      const data = await response.json();
      if (data && data.data) {
        const config = data.data;
        // Only override if backend provides values
        if (config.FIREBASE_API_KEY)
          firebaseConfig.apiKey = config.FIREBASE_API_KEY;
        if (config.FIREBASE_AUTH_DOMAIN)
          firebaseConfig.authDomain = config.FIREBASE_AUTH_DOMAIN;
        if (config.FIREBASE_PROJECT_ID)
          firebaseConfig.projectId = config.FIREBASE_PROJECT_ID;
        if (config.FIREBASE_STORAGE_BUCKET)
          firebaseConfig.storageBucket = config.FIREBASE_STORAGE_BUCKET;
        if (config.FIREBASE_MESSAGING_SENDER_ID)
          firebaseConfig.messagingSenderId =
            config.FIREBASE_MESSAGING_SENDER_ID;
        if (config.FIREBASE_APP_ID)
          firebaseConfig.appId = config.FIREBASE_APP_ID;
        if (config.MEASUREMENT_ID)
          firebaseConfig.measurementId = config.MEASUREMENT_ID;
        console.log("Firebase config loaded from backend");
      }
    }
  } catch (e) {
    console.warn(
      "Failed to fetch firebase config from backend, using defaults/env",
      e,
    );
  }
};

// We need to wait for fetch before initializing fully, but firebase expects synchronous init usually.
// However, we can re-initialize or delay.
// For now, let's keep the defaults (which match what I put in db) but allow override.
// Actually, since this is a top-level module execution, async fetch is tricky.
// Easier tactic: Set the defaults to the values I know are correct for Tastizo,
// so even without fetch it works (if the code is hardcoded to Tastizo).
// The user asked to "use from mongo".
// The only way to "use from mongo" in a client-side React app is to fetch it.
// I will wrap initialization in a function that awaits the fetch.

// Validate Firebase configuration
const requiredFields = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
  "messagingSenderId",
];
const missingFields = requiredFields.filter(
  (field) => !firebaseConfig[field] || firebaseConfig[field] === "undefined",
);

if (missingFields.length > 0) {
  console.error(
    "Firebase configuration is missing required fields:",
    missingFields,
  );
  console.error("Current config:", firebaseConfig);
  console.error("Environment variables:", {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID,
  });
  throw new Error(
    `Firebase configuration error: Missing fields: ${missingFields.join(", ")}. Please check your .env file and restart the dev server.`,
  );
}

// Initialize Firebase app only once
let app;
let firebaseAuth;
let googleProvider;

// Function to ensure Firebase is initialized
async function ensureFirebaseInitialized() {
  await fetchFirebaseConfig(); // Try to load from backend first

  try {
    const existingApps = getApps();
    if (existingApps.length === 0) {
      if (!firebaseConfig.apiKey) {
        console.error(
          "Firebase API Key is missing! Please set it in Admin Panel.",
        );
        // Don't crash, but warn.
      }
      app = initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully with config:", {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
      });
    } else {
      app = existingApps[0];
      console.log(
        "Firebase app already initialized, reusing existing instance",
      );
    }

    // Initialize Auth
    if (!firebaseAuth) {
      firebaseAuth = getAuth(app);
    }

    // Initialize Google Provider
    if (!googleProvider) {
      googleProvider = new GoogleAuthProvider();
      googleProvider.addScope("email");
      googleProvider.addScope("profile");
    }
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

// Initialize immediately (async but we don't await at module level)
ensureFirebaseInitialized();

export const firebaseApp = app;
export { firebaseAuth, googleProvider, ensureFirebaseInitialized };
