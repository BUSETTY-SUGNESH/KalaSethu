'use client';

import { useState, useEffect } from "react";
import { getPendingVerifications, verifyArtist } from "@/lib/services/admin-service";
import { safeLogAdminAction } from "@/lib/utils/admin-audit";
import type { ArtistVerification } from "@/app/types";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import VerificationApplicationCard from "./VerificationApplicationCard";

export default function VerificationPage() {
  const [apps, setApps] = useState<ArtistVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setIsLoading(true);
    try {
      const res = await getPendingVerifications(50);
      setApps(res.data || []);
    } catch (error) {
      console.error("Failed to load applications", error);
      addToast({ type: 'error', title: 'Error', message: 'Could not load pending applications.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction(verificationId: string, artistId: string, action: 'approve' | 'reject') {
    if (!user) {
      addToast({ type: 'error', title: 'Error', message: 'Authentication required.' });
      return;
    }

    try {
      const isVerified = action === 'approve';
      await verifyArtist(artistId, isVerified, verificationId);

      await safeLogAdminAction(
        user.id,
        user.displayName,
        'verify_artist',
        verificationId,
        'artist_verification',
        `${action === 'approve' ? 'Approved' : 'Rejected'} artist ${artistId}`
      );

      setApps(apps.filter(app => app.id !== verificationId));
      addToast({
        type: 'success',
        title: isVerified ? 'Application Approved' : 'Application Rejected',
        message: 'Artist status has been updated.',
      });
    } catch (error: unknown) {
      console.error("Verification decision error", error);
      const message = error instanceof Error ? error.message : 'Could not save decision.';
      addToast({ type: 'error', title: 'Error', message });
    }
  }

  return (
    <div className="flex flex-col gap-32">
      <div>
        <h1 className="text-display-sm text-primary mb-8">Artist Verification</h1>
        <p className="text-body-md text-on-surface-variant">Review and approve applications from artisans seeking the Verified Badge.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          {apps.length > 0 ? (
            apps.map(app => (
              <VerificationApplicationCard
                key={app.id}
                app={app}
                onAction={handleAction}
                showDetailLink
              />
            ))
          ) : (
            <div className="col-span-2 bg-surface-container-lowest p-48 text-center rounded-lg border border-outline-variant">
              <span className="material-symbols-outlined empty-state-icon text-primary/50" style={{ fontSize: 32 }}>verified_user</span>
              <h3 className="text-headline-sm text-primary mt-16">All Caught Up!</h3>
              <p className="text-body-md text-on-surface-variant mt-8">There are no pending artisan verification applications.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
