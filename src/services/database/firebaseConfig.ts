import firebaseConfigJson from '../../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  firestoreDatabaseId?: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Configuração oficial primária do projeto Firebase "zeta-phoenix-56shk".
 * Garante funcionamento imediato na Web (Vercel) e no APK mesmo sem variáveis de ambiente externas.
 */
export const ZETA_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: 'AIzaSyDAmIY2iq4AuaXKKG7MB3cFvwhW_0H6PDE',
  authDomain: 'zeta-phoenix-56shk.firebaseapp.com',
  projectId: 'zeta-phoenix-56shk',
  firestoreDatabaseId: 'ai-studio-remixremixremixa-4ea6a757-189d-43ba-988b-c06fb2779fff',
  storageBucket: 'zeta-phoenix-56shk.firebasestorage.app',
  messagingSenderId: '241062605571',
  appId: '1:241062605571:web:b3e0dbadb00eb374eb6f36',
};

export const firebaseConfig: FirebaseClientConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    (firebaseConfigJson && firebaseConfigJson.apiKey) ||
    ZETA_FIREBASE_CONFIG.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (firebaseConfigJson && firebaseConfigJson.authDomain) ||
    ZETA_FIREBASE_CONFIG.authDomain,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    (firebaseConfigJson && firebaseConfigJson.projectId) ||
    ZETA_FIREBASE_CONFIG.projectId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    (firebaseConfigJson && firebaseConfigJson.firestoreDatabaseId) ||
    ZETA_FIREBASE_CONFIG.firestoreDatabaseId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (firebaseConfigJson && firebaseConfigJson.storageBucket) ||
    ZETA_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    (firebaseConfigJson && firebaseConfigJson.messagingSenderId) ||
    ZETA_FIREBASE_CONFIG.messagingSenderId,
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    (firebaseConfigJson && firebaseConfigJson.appId) ||
    ZETA_FIREBASE_CONFIG.appId,
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};
