'use client';

import Icon from "@/app/components/ui/Icon";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AdminHeaderUser() {
  const { user } = useAuthStore();
  const displayName = user?.displayName || 'Admin';

  return (
    <div className="flex items-center gap-16 text-surface">
      <span className="text-label-sm" style={{ color: "var(--color-surface)" }}>{displayName}</span>
      <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--color-surface-variant)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}>
        <Icon name="shield_person" size={20} />
      </div>
    </div>
  );
}
