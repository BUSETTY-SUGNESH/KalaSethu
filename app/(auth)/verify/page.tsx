'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import { resendVerificationEmail, getCurrentUser, onAuthStateChanged } from '@/lib/firebase/auth';
import { useUIStore } from '@/lib/stores/ui-store';

export default function VerifyPage() {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.email) {
      setEmail(user.email);
    }

    // Listen for email verification
    const unsubscribe = onAuthStateChanged((user) => {
      if (user?.emailVerified) {
        addToast({ type: 'success', title: 'Email Verified!', message: 'Redirecting to role selection...' });
        router.push('/role');
      }
    });

    return () => unsubscribe();
  }, [router, addToast]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function handleResend() {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      addToast({ type: 'success', title: 'Email sent!', message: 'Check your inbox for the verification link.' });
      setCooldown(60);
    } catch {
      addToast({ type: 'error', title: 'Failed to send', message: 'Please try again later.' });
    } finally {
      setIsResending(false);
    }
  }

  function handleCheckVerification() {
    // Reload the user to check verification status
    const user = getCurrentUser();
    if (user) {
      user.reload().then(() => {
        // [DEV OVERRIDE] Bypass email verification locally so the user can test without real emails
        if (user.emailVerified || process.env.NODE_ENV === 'development') {
          if (process.env.NODE_ENV === 'development') {
             addToast({ type: 'success', title: 'Dev Bypass', message: 'Bypassed verification for local development.' });
          } else {
             addToast({ type: 'success', title: 'Email Verified!', message: 'Redirecting...' });
          }
          router.push('/role');
        } else {
          addToast({ type: 'info', title: 'Not yet verified', message: 'Please click the link in your email.' });
        }
      });
    }
  }

  return (
    <>
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
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
          }}
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>
            mark_email_read
          </span>
        </div>
        <h1 className="text-headline-lg text-primary">Verify Your Email</h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
          We&apos;ve sent a verification link to{' '}
          <strong>{email || 'your email'}</strong>
        </p>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
          Click the link in the email to verify your account, then come back here.
        </p>
      </div>

      <div className="flex flex-col gap-16">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleCheckVerification}
        >
          I&apos;ve Verified My Email
        </Button>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : isResending
              ? 'Sending...'
              : 'Resend Verification Email'}
        </Button>
      </div>

      <p
        className="text-center text-caption text-on-surface-variant"
        style={{ marginTop: 32 }}
      >
        Check your spam folder if you don&apos;t see the email.
      </p>
    </>
  );
}
