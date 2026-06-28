/**
 * Cloud Functions region for Firestore event triggers.
 * Must match the Firestore (default) database location (asia-south1).
 * Callable/scheduled functions in this project also use asia-south1 for India latency.
 */
export const FIRESTORE_TRIGGER_REGION = 'asia-south1' as const;
