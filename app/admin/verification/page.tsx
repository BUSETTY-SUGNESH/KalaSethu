'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getPendingVerifications, verifyArtist } from "@/lib/services/admin-service";
import type { ArtistVerification } from "@/app/types";
import { useUIStore } from "@/lib/stores/ui-store";

export default function VerificationPage() {
  const [apps, setApps] = useState<ArtistVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    try {
      const isVerified = action === 'approve';
      await verifyArtist(artistId, isVerified, verificationId);
      
      setApps(apps.filter(app => app.id !== verificationId));
      addToast({ 
        type: 'success', 
        title: isVerified ? 'Application Approved' : 'Application Rejected', 
        message: `Artist status has been updated.` 
      });
    } catch (error: any) {
      console.error("Verification decision error", error);
      addToast({ type: 'error', title: 'Error', message: error.message || 'Could not save decision.' });
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
              <div key={app.id} className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant hover:border-primary/20 transition-all flex flex-col justify-between">
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

                {app.status === 'pending' && (
                  <div className="flex gap-16 mt-16">
                    <Button 
                      variant="primary" 
                      fullWidth 
                      onClick={() => handleAction(app.id, app.artistId, 'approve')}
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      fullWidth 
                      onClick={() => handleAction(app.id, app.artistId, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
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
