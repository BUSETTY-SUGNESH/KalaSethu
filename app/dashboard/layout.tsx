import Header from "@/app/components/layout/Header";
import Sidebar from "@/app/components/layout/Sidebar";
import AuthGuard from "@/app/components/guards/AuthGuard";

const dashboardNav = [
  { label: "Overview", href: "/dashboard", icon: "dashboard" },
  { label: "My Collection", href: "/dashboard/collector", icon: "collections" },
  { label: "Artist Studio", href: "/dashboard/artist", icon: "palette" },
  { label: "Sales Orders", href: "/dashboard/artist/orders", icon: "local_shipping" },
  { label: "Active Bids", href: "/bids", icon: "gavel" },
  { label: "Saved Artworks", href: "/dashboard/saved", icon: "favorite" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="user" redirectTo="/login">
      <Header />
      <div className="container dashboard-layout">
        <Sidebar items={dashboardNav} />
        <main className="dashboard-content px-8" style={{ padding: "32px" }}>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
