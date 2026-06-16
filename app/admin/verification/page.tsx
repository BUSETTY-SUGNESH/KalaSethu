'use client';

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";

// Mock data
const mockApplications = [
  { id: '1', name: 'Sita Devi', type: 'Madhubani Painting', date: '2024-01-15', status: 'pending', docs: 2 },
  { id: '2', name: 'Rajan Sthapati', type: 'Bronze Casting', date: '2024-01-14', status: 'pending', docs: 4 },
];

export default function VerificationPage() {
  const [apps, setApps] = useState(mockApplications);

  function handleAction(id: string, action: 'approve' | 'reject') {
    setApps(apps.map(app => app.id === id ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' } : app));
  }

  return (
    <div className="flex flex-col gap-32">
      <div>
        <h1 className="text-display-sm text-primary mb-8">Artist Verification</h1>
        <p className="text-body-md text-on-surface-variant">Review and approve applications from artisans seeking the Verified Badge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        {apps.map(app => (
          <div key={app.id} className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant">
            <div className="flex justify-between items-start mb-16">
              <div className="flex items-center gap-12">
                <div className="avatar avatar-md bg-primary text-white flex items-center justify-center">
                  {app.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-headline-sm text-primary">{app.name}</h3>
                  <span className="text-caption text-on-surface-variant">Applied {app.date}</span>
                </div>
              </div>
              <span className={`status-pill ${app.status}`}>{app.status}</span>
            </div>
            
            <div className="flex flex-col gap-8 mb-24">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Specialization</span>
                <span className="font-bold">{app.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Documents</span>
                <span className="text-primary hover:underline cursor-pointer">{app.docs} files attached</span>
              </div>
            </div>

            {app.status === 'pending' && (
              <div className="flex gap-16">
                <Button variant="primary" fullWidth onClick={() => handleAction(app.id, 'approve')}>Approve</Button>
                <Button variant="outline" fullWidth onClick={() => handleAction(app.id, 'reject')}>Reject</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
