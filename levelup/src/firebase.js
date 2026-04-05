import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingRequiredConfig = Object.entries({
  VITE_FIREBASE_API_KEY: envConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: envConfig.authDomain,
  VITE_FIREBASE_DATABASE_URL: envConfig.databaseURL,
  VITE_FIREBASE_PROJECT_ID: envConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: envConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: envConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: envConfig.appId,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingRequiredConfig.length) {
  throw new Error(
    `Missing Firebase config: ${missingRequiredConfig.join(", ")}. Create levelup/.env from levelup/.env.example and add your own Firebase project values.`
  );
}

const firebaseConfig = {
  apiKey: envConfig.apiKey,
  authDomain: envConfig.authDomain,
  databaseURL: envConfig.databaseURL,
  projectId: envConfig.projectId,
  storageBucket: envConfig.storageBucket,
  messagingSenderId: envConfig.messagingSenderId,
  appId: envConfig.appId,
  ...(envConfig.measurementId ? { measurementId: envConfig.measurementId } : {}),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);
