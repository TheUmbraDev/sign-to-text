import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Optional explicit toggle to disable Firebase usage even if config values exist.
// Add NEXT_PUBLIC_DISABLE_FIREBASE=true to .env.local to force fallback to custom auth.
const firebaseDisabled = process.env.NEXT_PUBLIC_DISABLE_FIREBASE === "true";

// Helper to check if required firebase config values exist
export function isFirebaseConfigured() {
  if (firebaseDisabled) return false;
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

export function initFirebase() {
  // Avoid initializing when config is missing so manual auth can fallback cleanly
  if (!isFirebaseConfigured()) return;
  if (!getApps().length) initializeApp(firebaseConfig);
}

export function getFirebaseApp() {
  if (!getApps().length) initFirebase();
  return getApp();
}

export function getFirebaseAuth() {
  if (typeof window === "undefined") return null;
  initFirebase();
  return getAuth();
}

export async function signInWithGooglePopup() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not available on the server");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  // Use the user's instance method to get the ID token (works with modular SDK)
  const idToken = await result.user.getIdToken();
  return { result, idToken };
}

// Email/password sign in helper
export async function signInEmailPassword(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not available");
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    return { user: credential.user, idToken };
  } catch (e: any) {
    throw new Error(mapFirebaseAuthError(e));
  }
}

// Email/password sign up helper (optionally sets display name)
export async function signUpEmailPassword(name: string, email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not available");
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try {
        await updateProfile(credential.user, { displayName: name });
      } catch (_) {
        // ignore profile update errors
      }
    }
    const idToken = await credential.user.getIdToken();
    return { user: credential.user, idToken };
  } catch (e: any) {
    throw new Error(mapFirebaseAuthError(e));
  }
}

function mapFirebaseAuthError(e: any): string {
  const code = e?.code || "unknown";
  switch (code) {
    case "auth/operation-not-allowed":
      return "Firebase Email/Password provider disabled. Either enable it in Firebase Console > Authentication > Sign-in method, or set NEXT_PUBLIC_DISABLE_FIREBASE=true to use custom backend authentication.";
    case "auth/user-not-found":
      return "No account found for this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials and try again.";
    case "auth/email-already-in-use":
      return "Email already registered.";
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/weak-password":
      return "Password is too weak.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return e?.message || "Authentication error";
  }
}
