import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

export default function RoleSelectionPage() {
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
        <Link href="/dashboard" className="role-card">
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
        </Link>

        {/* Artist Role */}
        <Link href="/dashboard/artist" className="role-card">
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
        </Link>
      </div>
    </div>
  );
}
