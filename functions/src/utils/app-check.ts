import * as functions from 'firebase-functions/v1';

export function isAppCheckEnforced(): boolean {
  return process.env.ENFORCE_APP_CHECK === 'true';
}

export function assertAppCheck(context: functions.https.CallableContext): void {
  if (!isAppCheckEnforced()) {
    return;
  }
  // For callable functions, the token is under context.app?.appCheck?.token
  const token = (context as any)?.app?.appCheck?.token;
  if (!token) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'App Check token required'
    );
  }
}
