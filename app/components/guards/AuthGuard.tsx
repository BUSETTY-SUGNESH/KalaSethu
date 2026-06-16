// ============================================================
// KalaSetu — Auth Guard Component
// Route protection with role-based access control
// ============================================================
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { UserRole } from '@/app/types';

interface AuthGuardProps {
  children: ReactNode;
  /** Minimum role required to access this content */
  requiredRole?: UserRole;
  /** Redirect URL when not authenticated */
  redirectTo?: string;
  /** If true, shows loading skeleton instead of redirecting while auth loads */
  showLoading?: boolean;
  /** Custom fallback component while loading */
  fallback?: ReactNode;
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 48 }}>
      <div className="skeleton" style={{ width: '40%', height: 32, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '80%', height: 20, marginBottom: 48 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-xl)' }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-xl)' }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-xl)' }} />
      </div>
    </div>
  );
}

export default function AuthGuard({
  children,
  requiredRole = 'user',
  redirectTo = '/login',
  showLoading = true,
  fallback,
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasRole, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }

    if (!isLoading && isAuthenticated && requiredRole && !hasRole(requiredRole)) {
      // User is authenticated but doesn't have the required role
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, requiredRole, hasRole, router, redirectTo]);

  // Still loading auth state
  if (isLoading) {
    return fallback || (showLoading ? <LoadingSkeleton /> : null);
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback || (showLoading ? <LoadingSkeleton /> : null);
  }

  // Doesn't have required role
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (showLoading ? <LoadingSkeleton /> : null);
  }

  return <>{children}</>;
}
