import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";

export default function DashboardOverviewPage() {
  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Welcome, Aakash</h1>
          <p className="text-body-md text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
            Here is what is happening with your collection and bids.
          </p>
        </div>
        <Button variant="primary" icon="explore" iconPosition="left" href="/explore">
          Discover New Art
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
        <div className="metric-card">
          <Icon name="collections" className="metric-card-watermark" />
          <div className="flex justify-between items-start mb-4" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Total Collection</span>
            <div className="flex items-center gap-4 text-accent-emerald text-label-sm">
              <Icon name="trending_up" size={16} /> +2 this month
            </div>
          </div>
          <span className="text-display-lg text-primary">12</span>
        </div>

        <div className="metric-card">
          <Icon name="gavel" className="metric-card-watermark" />
          <div className="flex justify-between items-start mb-4" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Active Bids</span>
            <div className="flex items-center gap-4 text-accent-terracotta text-label-sm">
              <Icon name="warning" size={16} /> 1 ending soon
            </div>
          </div>
          <span className="text-display-lg text-primary">3</span>
        </div>

        <div className="metric-card">
          <Icon name="account_balance_wallet" className="metric-card-watermark" />
          <div className="flex justify-between items-start mb-4" style={{ marginBottom: 16 }}>
            <span className="text-label-md text-on-surface-variant uppercase">Est. Value</span>
            <div className="flex items-center gap-4 text-accent-emerald text-label-sm">
              <Icon name="trending_up" size={16} /> +5.2%
            </div>
          </div>
          <span className="text-display-lg text-primary">₹8.5L</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Recent Activity */}
        <div className="card p-6" style={{ padding: 24 }}>
          <h3 className="text-headline-sm text-primary mb-4" style={{ marginBottom: 24 }}>Recent Activity</h3>
          <ul className="flex flex-col gap-16">
            <li className="flex items-start gap-12 pb-4 border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", paddingBottom: 16 }}>
              <div className="bg-surface-container-high rounded-full p-2 text-primary" style={{ padding: 8, borderRadius: "50%" }}>
                <Icon name="gavel" size={20} />
              </div>
              <div>
                <p className="text-body-md text-on-surface">You placed a bid of <strong className="text-primary">₹4,50,000</strong> on Pahari Miniature.</p>
                <span className="text-caption text-on-surface-variant">2 hours ago</span>
              </div>
            </li>
            <li className="flex items-start gap-12 pb-4 border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", paddingBottom: 16 }}>
              <div className="bg-surface-container-high rounded-full p-2 text-primary" style={{ padding: 8, borderRadius: "50%" }}>
                <Icon name="local_shipping" size={20} />
              </div>
              <div>
                <p className="text-body-md text-on-surface">Your recent purchase <strong>Terracotta Vessel</strong> has shipped.</p>
                <span className="text-caption text-on-surface-variant">Yesterday</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Saved Artists Updates */}
        <div className="card p-6" style={{ padding: 24 }}>
          <div className="flex justify-between items-center mb-4" style={{ marginBottom: 24 }}>
            <h3 className="text-headline-sm text-primary">Updates from Artists</h3>
            <Link href="/explore" className="text-label-sm text-primary hover:underline uppercase">View All</Link>
          </div>
          <ul className="flex flex-col gap-16">
            <li className="flex items-center gap-12 pb-4 border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", paddingBottom: 16 }}>
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" alt="Artist" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
              <div>
                <p className="text-body-md text-on-surface"><strong>Anjali Devi</strong> published a new Mithila painting.</p>
                <span className="text-caption text-on-surface-variant">3 hours ago</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
