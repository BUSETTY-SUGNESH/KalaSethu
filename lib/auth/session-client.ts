'use client';

import type { User } from 'firebase/auth';

export async function syncServerSession(user: User): Promise<void> {
  try {
    const idToken = await user.getIdToken();
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('Failed to sync server session cookie', error);
  }
}

export async function clearServerSession(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('Failed to clear server session cookie', error);
  }
}
