import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAbDr7qB_SfVZHLT1qfnN0PnBjGTicOPGg",
  authDomain: "eduverse-ai-3d.firebaseapp.com",
  projectId: "eduverse-ai-3d",
  storageBucket: "eduverse-ai-3d.firebasestorage.app",
  messagingSenderId: "1045705107958",
  appId: "1:1045705107958:web:850388673379b27837bfd7",
  measurementId: "G-4TH2V8FMV6"
};

/**
 * Lấy cấu hình Firebase từ localStorage hoặc biến môi trường .env (Vite)
 */
export function getFirebaseConfig() {
  const localSaved = localStorage.getItem('FIREBASE_CONFIG');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (
        parsed.apiKey &&
        parsed.projectId &&
        !parsed.projectId.includes('your') &&
        !parsed.apiKey.includes('...')
      ) {
        return parsed;
      } else {
        // Tự động xóa bỏ cấu hình placeholder mẫu cũ
        localStorage.removeItem('FIREBASE_CONFIG');
      }
    } catch (_) {}
  }

  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId && !envConfig.projectId.includes('your')) {
    return envConfig;
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function resetFirebaseToDefault() {
  localStorage.removeItem('FIREBASE_CONFIG');
  initFirebase();
  return DEFAULT_FIREBASE_CONFIG;
}

export function parseFirebaseSnippet(snippet) {
  if (!snippet || typeof snippet !== 'string') return null;

  try {
    const obj = JSON.parse(snippet);
    if (obj.apiKey && obj.projectId) return obj;
  } catch (_) {}

  const extract = (key) => {
    const match = snippet.match(new RegExp(`${key}["']?\\s*:\\s*["']([^"']+)["']`));
    return match ? match[1] : '';
  };

  const apiKey = extract('apiKey');
  const projectId = extract('projectId');

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: extract('authDomain'),
      projectId,
      storageBucket: extract('storageBucket'),
      messagingSenderId: extract('messagingSenderId'),
      appId: extract('appId'),
      measurementId: extract('measurementId'),
    };
  }

  return null;
}

export function saveFirebaseConfig(config) {
  localStorage.setItem('FIREBASE_CONFIG', JSON.stringify(config));
  initFirebase();
}

export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId);
}

// Khởi tạo Firebase App an toàn (không gây crash nếu chưa cấu hình)
let app = null;
let auth = null;
let db = null;
let storage = null;
let googleProvider = null;

export function initFirebase() {
  try {
    const config = getFirebaseConfig();
    if (config.apiKey && config.projectId) {
      app = getApps().length === 0 ? initializeApp(config) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      googleProvider = new GoogleAuthProvider();
      return true;
    }
  } catch (err) {
    console.warn('Firebase chưa thể khởi tạo hoặc thông tin cấu hình chưa hợp lệ:', err);
  }
  return false;
}

initFirebase();

export { app, auth, db, storage, googleProvider };
