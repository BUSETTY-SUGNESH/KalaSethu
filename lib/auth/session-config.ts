export const SESSION_COOKIE_NAME = '__session';
export const AUTH_CONTEXT_COOKIE_NAME = 'ks_auth';
export const SESSION_MAX_AGE_SEC = 5 * 24 * 60 * 60; // 5 days

export interface AuthContextPayload {
  uid: string;
  role: string;
  exp: number;
}
