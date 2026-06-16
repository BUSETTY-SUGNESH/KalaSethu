'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { signUpWithEmail, signInWithGoogle, initRecaptcha, signInWithPhone } from '@/lib/firebase/auth';
import { useUIStore } from '@/lib/stores/ui-store';

export default function SignupPage() {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<import('@/lib/firebase/auth').ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);

    try {
      await signUpWithEmail(email, password, name);
      addToast({
        type: 'success',
        title: 'Account created!',
        message: 'Please verify your email address.',
      });
      router.push('/verify');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (message.includes('weak-password')) {
        setError('Password is too weak. Use at least 8 characters.');
      } else if (message.includes('invalid-email')) {
        setError('Invalid email address.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
      addToast({ type: 'success', title: 'Welcome!', message: 'Account created with Google.' });
      router.push('/role');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('popup-closed-by-user')) {
        setError('Google sign-up failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePhoneSend() {
    setError('');
    setIsLoading(true);
    try {
      const verifier = initRecaptcha('recaptcha-container');
      const result = await signInWithPhone(phone.startsWith('+') ? phone : `+91${phone}`, verifier);
      setConfirmationResult(result);
      addToast({ type: 'info', title: 'OTP Sent', message: 'Check your phone.' });
    } catch {
      setError('Failed to send OTP. Check the phone number.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!confirmationResult) return;
    setError('');
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      addToast({ type: 'success', title: 'Welcome!', message: 'Phone verified.' });
      router.push('/role');
    } catch {
      setError('Invalid OTP.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 48 }}>
        <h1 className="text-headline-lg text-primary">Join KalaSetu</h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
          Create an account to start exploring and collecting authentic heritage.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(185, 28, 28, 0.06)',
            border: '1px solid rgba(185, 28, 28, 0.15)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-status-urgency)',
            fontSize: 14,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
          {error}
        </div>
      )}

      {!showPhoneInput && !confirmationResult && (
        <>
          <div className="flex flex-col gap-16" style={{ marginBottom: 32 }}>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              icon="mail"
              iconPosition="left"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
              Continue with Google
            </Button>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              icon="phone_iphone"
              iconPosition="left"
              onClick={() => setShowPhoneInput(true)}
              disabled={isLoading}
            >
              Continue with Phone
            </Button>
          </div>

          <div className="form-divider">
            <span className="form-divider-text">Or register with email</span>
          </div>

          <form className="flex flex-col gap-24" onSubmit={handleEmailSignup}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

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

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
              <span className="text-caption text-on-surface-variant">
                Minimum 8 characters
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </>
      )}

      {showPhoneInput && !confirmationResult && (
        <div className="flex flex-col gap-24">
          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone Number</label>
            <input
              type="tel"
              id="phone"
              className="form-input"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={handlePhoneSend} disabled={isLoading || !phone}>
            {isLoading ? 'Sending...' : 'Send OTP'}
          </Button>
          <button className="text-body-md text-on-surface-variant text-center" onClick={() => setShowPhoneInput(false)} style={{ cursor: 'pointer' }}>
            ← Back to email signup
          </button>
        </div>
      )}

      {confirmationResult && (
        <div className="flex flex-col gap-24">
          <div className="form-group">
            <label htmlFor="otp" className="form-label">Enter OTP</label>
            <input type="text" id="otp" className="form-input text-center text-headline-sm" placeholder="Enter 6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} disabled={isLoading} style={{ letterSpacing: '0.3em' }} />
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={handleVerifyOtp} disabled={isLoading || otp.length < 6}>
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </div>
      )}

      <div id="recaptcha-container" />

      <p className="text-center text-body-md text-on-surface-variant" style={{ marginTop: 32 }}>
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline" style={{ fontWeight: 600 }}>
          Log in
        </Link>
      </p>
    </>
  );
}
