/**
 * Centralized environment variable accessors for the Next.js app.
 * Secrets must never use the NEXT_PUBLIC_ prefix.
 */

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

/** Firebase client config (browser-safe). */
export const firebaseClientEnv = {
  apiKey: () => required('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: () => required('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: () => required('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: () =>
    required('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: () =>
    required('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: () => required('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: () => optional(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
  databaseURL: () => optional(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL),
} as const;

/** Firebase Admin SDK (server-only). */
export const firebaseAdminEnv = {
  projectId: () => required('FIREBASE_ADMIN_PROJECT_ID', process.env.FIREBASE_ADMIN_PROJECT_ID),
  clientEmail: () => required('FIREBASE_ADMIN_CLIENT_EMAIL', process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
  privateKey: () =>
    required('FIREBASE_ADMIN_PRIVATE_KEY', process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
} as const;

/** Razorpay checkout (public key only in the browser). */
export const razorpayClientEnv = {
  keyId: () => required('NEXT_PUBLIC_RAZORPAY_KEY_ID', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
} as const;

/** Session and middleware secrets (server-only). */
export const serverSecretsEnv = {
  authSessionSecret: () => optional(process.env.AUTH_SESSION_SECRET),
  middlewareSecret: () => optional(process.env.MIDDLEWARE_SECRET),
} as const;

/** App Check / reCAPTCHA (browser-safe site key). */
export const appCheckEnv = {
  recaptchaSiteKey: () => optional(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
  debugToken: () => optional(process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN),
} as const;

/** Canonical app URL for redirects and metadata (optional locally). */
export const appEnv = {
  url: () => optional(process.env.NEXT_PUBLIC_APP_URL) ?? 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
