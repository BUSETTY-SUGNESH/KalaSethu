'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import { signInWithEmail, signInWithGoogle, initRecaptcha, signInWithPhone } from '@/lib/firebase/auth';
import { useUIStore } from '@/lib/stores/ui-store';

export default function LoginPage() {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<import('@/lib/firebase/auth').ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      addToast({ type: 'success', title: 'Welcome back!', message: 'You have logged in successfully.' });
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      if (message.includes('invalid-credential') || message.includes('wrong-password')) {
        setError('Invalid email or password.');
      } else if (message.includes('user-not-found')) {
        setError('No account found with this email.');
      } else if (message.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
      addToast({ type: 'success', title: 'Welcome!', message: 'Signed in with Google.' });
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('popup-closed-by-user')) {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePhoneLogin() {
    setError('');
    setIsLoading(true);

    try {
      const verifier = initRecaptcha('recaptcha-container');
      const result = await signInWithPhone(phone.startsWith('+') ? phone : `+91${phone}`, verifier);
      setConfirmationResult(result);
      addToast({ type: 'info', title: 'OTP Sent', message: 'Check your phone for the verification code.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('invalid-phone-number')) {
        setError('Invalid phone number. Please include country code.');
      } else {
        setError('Failed to send OTP. Please try again.');
      }
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
      addToast({ type: 'success', title: 'Welcome!', message: 'Phone verified successfully.' });
      router.push('/dashboard');
    } catch {
      setError('Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 48 }}>
        <h1 className="text-headline-lg text-primary">Welcome Back</h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
          Log in to continue your journey through authentic Indian art.
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
          <form className="flex flex-col gap-24" onSubmit={handleEmailLogin}>
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
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-label-sm text-accent-terracotta hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Log In'}
            </Button>
          </form>

          <div className="form-divider">
            <span className="form-divider-text">Or continue with</span>
          </div>

          <div className="flex flex-col gap-16">
            <Button
              variant="outline"
              size="lg"
              fullWidth
              icon="mail"
              iconPosition="left"
              onClick={handleGoogleLogin}
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
        </>
      )}

      {showPhoneInput && !confirmationResult && (
        <div className="flex flex-col gap-24">
          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone Number
            </label>
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
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handlePhoneLogin}
            disabled={isLoading || !phone}
          >
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </Button>
          <button
            className="text-body-md text-on-surface-variant text-center"
            onClick={() => setShowPhoneInput(false)}
            style={{ cursor: 'pointer' }}
          >
            ← Back to email login
          </button>
        </div>
      )}

      {confirmationResult && (
        <div className="flex flex-col gap-24">
          <div className="form-group">
            <label htmlFor="otp" className="form-label">
              Enter OTP
            </label>
            <input
              type="text"
              id="otp"
              className="form-input text-center text-headline-sm"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              disabled={isLoading}
              style={{ letterSpacing: '0.3em' }}
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleVerifyOtp}
            disabled={isLoading || otp.length < 6}
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </div>
      )}

      <div id="recaptcha-container" />

      <p
        className="text-center text-body-md text-on-surface-variant"
        style={{ marginTop: 32 }}
      >
        New to KalaSetu?{' '}
        <Link
          href="/signup"
          className="text-primary hover:underline"
          style={{ fontWeight: 600 }}
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
