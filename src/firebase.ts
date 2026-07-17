import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Enable Firebase App Check with support for development and production
export let appCheck: any = null;
if (typeof window !== 'undefined') {
  // If we are not in production, we can use the debug token for security rules testing / local development
  if ((import.meta as any).env.MODE !== 'production' || (import.meta as any).env.DEV) {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  
  try {
    const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY;
    
    // If we have a custom site key configured, use the standard ReCaptchaV3Provider
    if (siteKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true
      });
      console.log('Firebase App Check successfully initialized with ReCaptchaV3.');
    } else {
      // In sandbox, iframe, or development environments where recaptcha site key is not configured,
      // we do not initialize App Check. This prevents Firebase Auth from requesting App Check tokens
      // and completely eliminates HTTP 403 fetch server error warnings.
      console.log('Firebase App Check is inactive (awaiting VITE_RECAPTCHA_SITE_KEY configuration). Security remains fully enforced by Firestore Rules.');
    }
  } catch (error) {
    console.warn('Firebase App Check failed to initialize (this is expected in some iframe/sandbox environments):', error);
  }
}

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Database operations are fully powered by Cloud Firestore.

// Google Sign-In helper
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Authentication Error:', error);
    throw error;
  }
}

// Sign Out helper
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}
