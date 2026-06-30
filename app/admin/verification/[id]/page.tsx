'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getVerification, verifyArtist } from "@/lib/services/admin-service";
import { safeLogAdminAction } from "@/lib/utils/admin-audit";
import type { ArtistVerification } from "@/app/types";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import VerificationApplicationCard from "../VerificationApplicationCard";

export default function VerificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const verificationId = params.id as string;
  const [app, setApp] = useState<ArtistVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    async function loadApplication() {
      setIsLoading(true);
      try {
        const data = await getVerification(verificationId);
        if (!data) {
          setNotFound(true);
        } else {
          setApp(data);
        }
      } catch (error) {
        console.error("Failed to load verification application", error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (verificationId) {
      loadApplication();
    }
  }, [verificationId]);

  async function handleAction(_verificationId: string, artistId: string, action: 'approve' | 'reject') {
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

      addToast({
        type: 'success',
        title: isVerified ? 'Application Approved' : 'Application Rejected',
        message: 'Artist status has been updated.',
      });

      router.push('/admin/verification');
    } catch (error: unknown) {
      console.error("Verification decision error", error);
      const message = error instanceof Error ? error.message : 'Could not save decision.';
      addToast({ type: 'error', title: 'Error', message });
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-32">
        <div className="skeleton" style={{ width: "40%", height: 40 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 8 }} />
      </div>
    );
  }

  if (notFound || !app) {
    return (
      <div className="flex flex-col gap-24 items-start">
        <h1 className="text-display-sm text-primary">Application Not Found</h1>
        <p className="text-body-md text-on-surface-variant">
          This verification application does not exist or may have already been reviewed.
        </p>
        <Link href="/admin/verification" className="text-label-sm text-primary uppercase hover:underline">
          Back to verification list
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-32">
      <div>
        <Link href="/admin/verification" className="text-label-sm text-primary uppercase hover:underline mb-8 inline-block">
          Back to list
        </Link>
        <h1 className="text-display-sm text-primary mb-8">Verification Application</h1>
        <p className="text-body-md text-on-surface-variant">
          Review application details and approve or reject this artisan.
        </p>
      </div>

      <div className="max-w-2xl">
        <VerificationApplicationCard app={app} onAction={handleAction} />
      </div>
    </div>
  );
}
