'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { resetPassword } from '@/lib/firebase/auth';
import { useUIStore } from '@/lib/stores/ui-store';

export default function ForgotPasswordPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
      addToast({
        type: 'success',
        title: 'Email sent!',
        message: 'Check your inbox for the password reset link.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to send',
        message: 'Please check the email address and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
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
            }}
          >
            <span className="material-symbols-outlined text-accent-emerald" style={{ fontSize: 40 }}>
              check_circle
            </span>
          </div>
          <h1 className="text-headline-lg text-primary">Check Your Email</h1>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
            We&apos;ve sent a password reset link to <strong>{email}</strong>.
            Click the link to set a new password.
          </p>
        </div>

        <Link href="/login" style={{ display: 'block' }}>
          <Button variant="primary" size="lg" fullWidth>
            Back to Login
          </Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 48 }}>
        <h1 className="text-headline-lg text-primary">Reset Password</h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form className="flex flex-col gap-24" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            className="form-input"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          type="submit"
          disabled={isLoading || !email}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <p
        className="text-center text-body-md text-on-surface-variant"
        style={{ marginTop: 32 }}
      >
        Remember your password?{' '}
        <Link
          href="/login"
          className="text-primary hover:underline"
          style={{ fontWeight: 600 }}
        >
          Log in
        </Link>
      </p>
    </>
  );
}
