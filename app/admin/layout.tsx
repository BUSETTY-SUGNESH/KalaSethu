import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Sidebar from "@/app/components/layout/Sidebar";
import AuthGuard from "@/app/components/guards/AuthGuard";

const adminNav = [
  { label: "Platform Overview", href: "/admin", icon: "monitoring" },
  { label: "Content Moderation", href: "/admin/moderation", icon: "gavel" },
  { label: "Artist Verification", href: "/admin/verification", icon: "verified_user" },
  { label: "Transactions", href: "/admin/transactions", icon: "receipt_long" },
  { label: "Dispute Resolution", href: "/admin/disputes", icon: "support_agent" },
  { label: "System Settings", href: "/admin/settings", icon: "settings_system_daydream" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="admin" roleRedirectTo="/dashboard">
      {/* Admin Header (Different from public header) */}
      <header className="site-header" style={{ backgroundColor: "var(--color-primary)" }}>
        <div className="container header-inner">
          <div className="flex items-center gap-16">
            <Link href="/" className="header-brand" style={{ color: "var(--color-surface)" }}>
              KalaSetu <span className="text-label-sm font-manrope uppercase tracking-wider text-surface-variant ml-2" style={{ fontFamily: "var(--font-manrope)", fontSize: 12, letterSpacing: "0.1em", color: "var(--color-surface-container-highest)", marginLeft: 8 }}>Admin Console</span>
            </Link>
          </div>
          <div className="flex items-center gap-16 text-surface">
            <span className="text-label-sm" style={{ color: "var(--color-surface)" }}>Super Admin</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--color-surface-variant)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}>
              <Icon name="shield_person" size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="container dashboard-layout">
        <Sidebar items={adminNav} />
        <main className="dashboard-content px-8" style={{ padding: "32px" }}>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
