'use client';

import { MessagingProvider } from '@/lib/contexts/messaging-context';
import Header from '@/app/components/layout/Header';
import DashboardSidebar from '@/app/components/layout/DashboardSidebar';
import AuthGuard from '@/app/components/guards/AuthGuard';

function DashboardMessagingShell({ children }: { children: React.ReactNode }) {
  return (
    <MessagingProvider>
      <Header />
      <div className="container dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-content px-8" style={{ padding: '32px' }}>
          {children}
        </main>
      </div>
    </MessagingProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="user" redirectTo="/login">
      <DashboardMessagingShell>{children}</DashboardMessagingShell>
    </AuthGuard>
  );
}
