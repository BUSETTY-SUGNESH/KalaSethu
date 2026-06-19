'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getFeatureFlags, setFeatureFlag } from "@/lib/services/admin-service";
import type { FeatureFlag } from "@/app/types";
import { useUIStore } from "@/lib/stores/ui-store";

const DEFAULT_FLAGS = [
  { id: "maintenance_mode", enabled: false, description: "Put the entire platform into read-only maintenance mode." },
  { id: "enable_auctions", enabled: true, description: "Toggle bidding features and live artisan auctions." },
  { id: "enable_social_feed", enabled: true, description: "Enable the CharchaSabha community social feed." },
  { id: "enable_artwork_uploads", enabled: true, description: "Allow artists and galleries to upload new items." },
];

export default function SettingsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    setIsLoading(true);
    try {
      let currentFlags = await getFeatureFlags();
      
      // Seed default flags if database is empty
      if (currentFlags.length === 0) {
        for (const flag of DEFAULT_FLAGS) {
          await setFeatureFlag(flag.id, flag.enabled, flag.description);
        }
        currentFlags = await getFeatureFlags();
      }
      
      setFlags(currentFlags);
    } catch (error) {
      console.error("Failed to load feature flags", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggle(id: string, currentStatus: boolean, description?: string) {
    try {
      const nextStatus = !currentStatus;
      await setFeatureFlag(id, nextStatus, description);
      
      setFlags(flags.map(f => {
        if (f.id === id) {
          return { ...f, enabled: nextStatus };
        }
        return f;
      }));

      addToast({
        type: 'success',
        title: 'Feature Updated',
        message: `Feature '${id}' is now ${nextStatus ? 'enabled' : 'disabled'}.`
      });
    } catch (error) {
      console.error("Failed to update feature flag", error);
      addToast({ type: 'error', title: 'Error', message: 'Could not toggle feature flag.' });
    }
  }

  return (
    <div className="flex flex-col gap-32">
      <div>
        <h1 className="text-display-sm text-primary mb-8">System Settings</h1>
        <p className="text-body-md text-on-surface-variant">Configure platform features, toggles, and system behaviors.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-16">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-24">
          <div className="bg-surface-container-lowest p-32 rounded-lg border border-outline-variant">
            <h2 className="text-headline-sm text-primary mb-16">Platform Feature Toggles</h2>
            <p className="text-body-md text-on-surface-variant mb-24">Enable or disable core application modules instantly for all users.</p>

            <div className="flex flex-col gap-24">
              {flags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between p-16 rounded-lg border border-outline-variant hover:bg-surface-container-low/20 transition-all">
                  <div style={{ paddingRight: 24 }}>
                    <div className="font-bold text-primary capitalize flex items-center gap-8">
                      {flag.id.replace(/_/g, ' ')}
                      <span className={`status-pill ${flag.enabled ? 'completed' : 'cancelled'}`} style={{ transform: "scale(0.85)" }}>
                        {flag.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-4">{flag.description}</p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Button 
                      variant={flag.enabled ? "outline" : "primary"} 
                      size="sm" 
                      onClick={() => handleToggle(flag.id, flag.enabled, flag.description)}
                    >
                      {flag.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
