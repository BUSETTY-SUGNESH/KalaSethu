'use client';

import Link from 'next/link';
import ProfileSettingsForm from '@/app/settings/ProfileSettingsForm';
import CollectorSubpageHero from '@/app/components/dashboard/CollectorSubpageHero';
import Button from '@/app/components/ui/Button';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function DashboardSettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="collector-dashboard-page">
      <CollectorSubpageHero
        eyebrow="Settings"
        title="Account Settings"
        description="Manage your public profile, shipping addresses, security, and notification preferences."
        actions={
          user ? (
            <Link href={`/profile/${user.id}`}>
              <Button variant="outline" icon="visibility" iconPosition="left">
                View Profile
              </Button>
            </Link>
          ) : undefined
        }
        quickLinks={[
          { href: '/dashboard/collector', icon: 'collections', label: 'My Collection' },
          { href: '/dashboard/orders', icon: 'receipt_long', label: 'Orders' },
          { href: '/dashboard/messages', icon: 'chat', label: 'Messages' },
        ]}
      />
      <ProfileSettingsForm embedded />
    </div>
  );
}
