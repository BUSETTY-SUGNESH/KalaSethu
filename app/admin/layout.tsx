import Link from "next/link";
import Sidebar from "@/app/components/layout/Sidebar";
import AuthGuard from "@/app/components/guards/AuthGuard";
import AdminHeaderUser from "./AdminHeaderUser";

const adminNav = [
  { label: "Platform Overview", href: "/admin", icon: "monitoring" },
  { label: "Content Moderation", href: "/admin/moderation", icon: "gavel" },
  { label: "Artist Verification", href: "/admin/verification", icon: "verified_user" },
  { label: "User Management", href: "/admin/users", icon: "manage_accounts" },
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
      <header className="site-header" style={{ backgroundColor: "var(--color-primary)" }}>
        <div className="container header-inner">
          <div className="flex items-center gap-16">
            <Link href="/" className="header-brand" style={{ color: "var(--color-surface)" }}>
              KalaSetu <span className="text-label-sm font-manrope uppercase tracking-wider text-surface-variant ml-2" style={{ fontFamily: "var(--font-manrope)", fontSize: 12, letterSpacing: "0.1em", color: "var(--color-surface-container-highest)", marginLeft: 8 }}>Admin Console</span>
            </Link>
          </div>
          <AdminHeaderUser />
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
