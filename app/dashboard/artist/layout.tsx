'use client';

import type { ReactNode } from 'react';
import AuthGuard from '@/app/components/guards/AuthGuard';

export default function ArtistDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="artist" roleRedirectTo="/dashboard">
      {children}
    </AuthGuard>
  );
}
