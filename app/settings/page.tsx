'use client';

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import Button from "@/app/components/ui/Button";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    bio: user?.bio || "",
    notifications: true
  });
  
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      addToast({ type: 'success', title: 'Settings Saved', message: 'Your profile has been updated.' });
    }, 1000);
  }

  return (
    <div className="container section-gap" style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 className="text-display-sm text-primary mb-32">Account Settings</h1>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-32" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <form onSubmit={handleSave} className="flex flex-col gap-24">
          <h2 className="text-headline-sm text-primary border-b border-outline-variant pb-16">Profile Information</h2>
          
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.displayName}
              onChange={e => setFormData({...formData, displayName: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={formData.email}
              disabled
            />
            <span className="text-caption text-on-surface-variant mt-4 block">Email cannot be changed directly. Contact support.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea 
              className="form-textarea" 
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
              rows={4}
            />
          </div>

          <h2 className="text-headline-sm text-primary border-b border-outline-variant pb-16 mt-16">Preferences</h2>
          
          <div className="flex items-center gap-12">
            <input 
              type="checkbox" 
              id="notifications" 
              checked={formData.notifications}
              onChange={e => setFormData({...formData, notifications: e.target.checked})}
              style={{ width: 20, height: 20, accentColor: "var(--color-primary)" }}
            />
            <label htmlFor="notifications" className="text-body-md text-on-surface cursor-pointer">
              Receive email notifications for bids and messages
            </label>
          </div>

          <div className="mt-32 border-t border-outline-variant pt-24">
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
