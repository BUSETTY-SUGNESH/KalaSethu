"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { updateUserProfile } from "@/lib/services/user-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { UserRole } from "@/app/types";

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { addToast } = useUIStore();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  async function chooseRole(role: "user" | "artist") {
    if (!user) {
      router.push("/login?redirect=/role");
      return;
    }

    setSelectedRole(role);
    try {
      await updateUserProfile(user.id, { role });
      setUser({ ...user, role });
      router.push(role === "artist" ? "/dashboard/artist" : "/dashboard");
    } catch (error) {
      console.error("Failed to update role", error);
      addToast({
        type: "error",
        title: "Role Not Saved",
        message: "We could not save your role. Please try again.",
      });
    } finally {
      setSelectedRole(null);
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl" style={{ margin: "0 auto" }}>
      <div className="text-center" style={{ marginBottom: 48 }}>
        <h1 className="text-display-lg text-primary">Choose Your Path</h1>
        <p className="text-body-lg text-on-surface-variant" style={{ marginTop: 16, maxWidth: 600, margin: "16px auto 0" }}>
          How would you like to experience KalaSetu? You can always change this later in your settings.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32, width: "100%" }}>
        {/* Collector Role */}
        <button
          type="button"
          className="role-card"
          onClick={() => chooseRole("user")}
          disabled={selectedRole !== null}
        >
          <div className="flex flex-col items-center text-center gap-16">
            <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--color-surface-container-high)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}>
              <Icon name="account_balance" size={40} />
            </div>
            <div>
              <h2 className="text-headline-md text-primary" style={{ marginBottom: 8 }}>Art Collector</h2>
              <p className="text-body-md text-on-surface-variant">
                Discover, bid on, and collect verified heritage artworks from master artisans across India.
              </p>
            </div>
          </div>
        </button>

        {/* Artist Role */}
        <button
          type="button"
          className="role-card"
          onClick={() => chooseRole("artist")}
          disabled={selectedRole !== null}
        >
          <div className="flex flex-col items-center text-center gap-16">
            <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--color-surface-container-high)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}>
              <Icon name="palette" size={40} />
            </div>
            <div>
              <h2 className="text-headline-md text-primary" style={{ marginBottom: 8 }}>Artisan / Creator</h2>
              <p className="text-body-md text-on-surface-variant">
                Showcase your portfolio, host live auctions, and connect directly with global collectors.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
