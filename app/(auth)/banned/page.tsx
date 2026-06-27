'use client';

import Link from 'next/link';
import Button from '@/app/components/ui/Button';

export default function BannedPage() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-container-high)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'var(--color-status-urgency)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
            block
          </span>
        </div>
        <h1 className="text-display-md text-primary">Account Suspended</h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 16 }}>
          Your account has been suspended. If you believe this is an error, please contact support.
        </p>
      </div>

      <Button variant="primary" size="lg" fullWidth href="/login">
        Return to Login
      </Button>

      <p className="text-body-sm text-on-surface-variant" style={{ textAlign: 'center', marginTop: 24 }}>
        Need help?{' '}
        <Link href="/support" className="text-primary hover:underline">
          Contact Support
        </Link>
      </p>
    </>
  );
}
