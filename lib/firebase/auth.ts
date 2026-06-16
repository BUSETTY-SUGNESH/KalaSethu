// ============================================================
// KalaSetu — Firebase Authentication Helpers
// ============================================================
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  RecaptchaVerifier,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  deleteUser,
  type User,
  type Auth,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';
import { app } from './config';

// Auth instance singleton
const auth: Auth = getAuth(app);

// Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// --- Email/Password Auth ---
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await sendEmailVerification(credential.user);
  return credential;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// --- Google OAuth ---
export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

// --- Phone OTP ---
let recaptchaVerifier: RecaptchaVerifier | null = null;

export function initRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
  return recaptchaVerifier;
}

export async function signInWithPhone(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

// --- Email Verification ---
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await sendEmailVerification(user);
  }
}

// --- Password Reset ---
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export async function changePassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await updatePassword(user, newPassword);
  }
}

// --- Profile Updates ---
export async function updateUserProfile(data: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await updateProfile(user, data);
  }
}

// --- Sign Out ---
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

// --- Delete Account ---
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await deleteUser(user);
  }
}

// --- Auth State Listener ---
export function onAuthStateChanged(
  callback: (user: User | null) => void
): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

// --- Get Current User ---
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export { auth };
export type { User, UserCredential, ConfirmationResult };
