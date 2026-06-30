'use client';

import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import type { ArtistVerification } from "@/app/types";

interface VerificationApplicationCardProps {
  app: ArtistVerification;
  onAction: (verificationId: string, artistId: string, action: 'approve' | 'reject') => void;
  showDetailLink?: boolean;
}

export default function VerificationApplicationCard({
  app,
  onAction,
  showDetailLink = false,
}: VerificationApplicationCardProps) {
  return (
    <div className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant hover:border-primary/20 transition-all flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-16">
          <div className="flex items-center gap-12">
            <div className="avatar avatar-md bg-primary text-white flex items-center justify-center font-bold">
              {app.artistName ? app.artistName.charAt(0) : '?'}
            </div>
            <div>
              <h3 className="text-headline-sm text-primary">{app.artistName || 'Anonymous Artist'}</h3>
              <span className="text-caption text-on-surface-variant">
                Applied {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
          <span className={`status-pill ${app.status}`}>{app.status}</span>
        </div>

        <div className="flex flex-col gap-8 mb-24">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Specialization</span>
            <span className="font-bold text-primary">{app.artForm}</span>
          </div>
          <div className="flex justify-between flex-wrap gap-8">
            <span className="text-on-surface-variant">Documents</span>
            <div className="flex flex-col items-end gap-4">
              {app.documents && app.documents.length > 0 ? (
                app.documents.map((doc, index) => (
                  <a
                    key={doc.id || index}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-caption text-primary hover:underline flex items-center gap-4"
                  >
                    <Icon name="attachment" size={14} /> {doc.name || `Document #${index + 1}`}
                  </a>
                ))
              ) : (
                <span className="text-caption text-on-surface-variant italic">No documents attached</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDetailLink && (
        <Link
          href={`/admin/verification/${app.id}`}
          className="text-label-sm text-primary uppercase hover:underline mb-16"
        >
          View details
        </Link>
      )}

      {app.status === 'pending' && (
        <div className="flex gap-16 mt-16">
          <Button
            variant="primary"
            fullWidth
            onClick={() => onAction(app.id, app.artistId, 'approve')}
          >
            Approve
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => onAction(app.id, app.artistId, 'reject')}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
