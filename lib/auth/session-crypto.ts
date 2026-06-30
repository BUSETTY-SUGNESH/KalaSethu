import type { AuthContextPayload } from './session-config';

function getSessionSecret(): string | null {
  return process.env.AUTH_SESSION_SECRET || null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function sealAuthContext(payload: AuthContextPayload): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is not configured');
  }

  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function openAuthContext(token: string | undefined | null): Promise<AuthContextPayload | null> {
  if (!token) return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature) as BufferSource,
      new TextEncoder().encode(body)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as AuthContextPayload;
    if (!payload.uid || !payload.role || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
