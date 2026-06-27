'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getPendingReports, resolveReport, moderateArtwork } from "@/lib/services/admin-service";
import { getPendingArtworks } from "@/lib/services/artwork-service";
import type { Report, Artwork } from "@/app/types";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";

export default function ModerationPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [pendingArtworks, setPendingArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArtworks, setIsLoadingArtworks] = useState(true);
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    loadReports();
    loadPendingArtworks();
  }, []);

  async function loadReports() {
    setIsLoading(true);
    try {
      const res = await getPendingReports(50);
      setItems(res.data || []);
    } catch (error) {
      console.error("Failed to load reports", error);
      addToast({ type: 'error', title: 'Error', message: 'Could not load pending reports.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPendingArtworks() {
    setIsLoadingArtworks(true);
    try {
      const res = await getPendingArtworks(50);
      setPendingArtworks(res.data || []);
    } catch (error) {
      console.error("Failed to load pending artworks", error);
      addToast({ type: 'error', title: 'Error', message: 'Could not load pending artworks.' });
    } finally {
      setIsLoadingArtworks(false);
    }
  }

  async function handleArtworkAction(artworkId: string, action: 'approve' | 'reject') {
    if (!user) {
      addToast({ type: 'error', title: 'Error', message: 'Authentication required.' });
      return;
    }

    try {
      await moderateArtwork(
        artworkId,
        action === 'approve' ? 'approve' : 'reject',
        action === 'approve' ? 'Approved by administration.' : 'Rejected by administration.'
      );
      setPendingArtworks(pendingArtworks.filter(a => a.id !== artworkId));
      addToast({
        type: 'success',
        title: action === 'approve' ? 'Artwork Approved' : 'Artwork Rejected',
        message: action === 'approve'
          ? 'The artwork is now published in the marketplace.'
          : 'The artwork was rejected.',
      });
    } catch (error: unknown) {
      console.error("Artwork moderation error", error);
      const message = error instanceof Error ? error.message : 'Action failed.';
      addToast({ type: 'error', title: 'Error', message });
    }
  }

  async function handleAction(reportId: string, targetId: string, targetType: string, action: 'approve' | 'remove') {
    if (!user) {
      addToast({ type: 'error', title: 'Error', message: 'Authentication required.' });
      return;
    }

    try {
      if (action === 'approve') {
        // Dismiss the report
        await resolveReport(reportId, user.id, 'dismissed', 'Content reviewed and dismissed.', 'dismissed');
        addToast({ type: 'success', title: 'Report Dismissed', message: 'The report was successfully dismissed.' });
      } else {
        // Remove / Resolve
        if (targetType === 'artwork') {
          // Reject artwork first (via cloud function)
          await moderateArtwork(targetId, 'reject', 'Content flagged and removed by administration.');
        }
        await resolveReport(reportId, user.id, 'resolved', 'Content flagged and removed.', `content_removed_${targetType}`);
        addToast({ type: 'success', title: 'Content Removed', message: 'The content was removed and the report resolved.' });
      }
      
      setItems(items.filter(item => item.id !== reportId));
    } catch (error: unknown) {
      console.error("Moderation action error", error);
      const message = error instanceof Error ? error.message : 'Action failed.';
      addToast({ type: 'error', title: 'Error', message });
    }
  }

  return (
    <div className="flex flex-col gap-32">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-sm text-primary mb-8">Content Moderation</h1>
          <p className="text-body-md text-on-surface-variant">Review reported content and pending artwork submissions.</p>
        </div>
      </div>

      <div>
        <h2 className="text-headline-sm text-primary mb-16">Pending Artwork Submissions</h2>
        {isLoadingArtworks ? (
          <div className="flex flex-col gap-16">
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden mb-32">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-16 text-label-sm uppercase text-on-surface-variant">Title</th>
                  <th className="p-16 text-label-sm uppercase text-on-surface-variant">Artist</th>
                  <th className="p-16 text-label-sm uppercase text-on-surface-variant">Category</th>
                  <th className="p-16 text-label-sm uppercase text-on-surface-variant text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingArtworks.length > 0 ? (
                  pendingArtworks.map(artwork => (
                    <tr key={artwork.id} className="border-b border-outline-variant hover:bg-surface-container-low/20 transition-colors">
                      <td className="p-16 font-bold text-primary">{artwork.title}</td>
                      <td className="p-16 text-on-surface-variant">{artwork.artistName}</td>
                      <td className="p-16 capitalize text-on-surface-variant">{artwork.category}</td>
                      <td className="p-16 text-right">
                        <div className="flex gap-8 justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleArtworkAction(artwork.id, 'reject')}>Reject</Button>
                          <Button variant="primary" size="sm" onClick={() => handleArtworkAction(artwork.id, 'approve')}>Approve</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-32 text-center text-body-md text-on-surface-variant italic">
                      No pending artwork submissions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-headline-sm text-primary mb-16">Reported Content</h2>
      {isLoading ? (
        <div className="flex flex-col gap-16">
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Type</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Reason / Issue</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Details</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Reported By</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Severity</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map(item => (
                  <tr key={item.id} className="border-b border-outline-variant hover:bg-surface-container-low/20 transition-colors">
                    <td className="p-16 capitalize">
                      <span className={`px-8 py-4 rounded text-caption font-bold ${
                        item.targetType === 'artwork' ? 'bg-primary text-white' : 
                        item.targetType === 'comment' ? 'bg-accent-terracotta text-white' : 'bg-surface-container-high'
                      }`} style={{ borderRadius: 4 }}>
                        {item.targetType}
                      </span>
                    </td>
                    <td className="p-16 font-bold text-primary">{item.reason}</td>
                    <td className="p-16 text-on-surface-variant">{item.description}</td>
                    <td className="p-16 text-caption text-on-surface-variant">ID: {item.reporterId.substring(0, 8)}...</td>
                    <td className="p-16 capitalize">
                      <span className={`status-pill ${item.severity === 'high' ? 'cancelled' : item.severity === 'medium' ? 'pending' : 'completed'}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="p-16 text-right">
                      {item.status === 'pending' && (
                        <div className="flex gap-8 justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleAction(item.id, item.targetId, item.targetType, 'approve')}>Dismiss</Button>
                          <Button variant="primary" size="sm" onClick={() => handleAction(item.id, item.targetId, item.targetType, 'remove')}>Remove</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-32 text-center text-body-md text-on-surface-variant italic">
                    No pending moderation reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
