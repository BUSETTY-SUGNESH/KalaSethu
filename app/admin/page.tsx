import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";

export default function AdminOverviewPage() {
  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Platform Overview</h1>
          <p className="text-body-md text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
            Real-time metrics for KalaSetu operations.
          </p>
        </div>
        <div className="flex gap-12">
          <Button variant="outline" icon="download" iconPosition="left">
            Export Report
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 48 }}>
        <div className="metric-card">
          <Icon name="group" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Total Users</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">12.4K</span>
            <span className="text-label-sm text-accent-emerald flex items-center"><Icon name="arrow_upward" size={14} /> 4.2%</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="storefront" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Verified Artisans</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">842</span>
            <span className="text-label-sm text-accent-emerald flex items-center"><Icon name="arrow_upward" size={14} /> 12</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="payments" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Monthly GMV</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">₹4.2Cr</span>
            <span className="text-label-sm text-accent-emerald flex items-center"><Icon name="arrow_upward" size={14} /> 18%</span>
          </div>
        </div>
        <div className="metric-card">
          <Icon name="report" className="metric-card-watermark" />
          <span className="text-label-md text-status-urgency uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Open Disputes</span>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-status-urgency">14</span>
            <span className="text-label-sm text-status-urgency flex items-center"><Icon name="arrow_upward" size={14} /> 3</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div className="card">
          <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h3 className="text-headline-sm text-primary">Pending Verifications</h3>
            <button className="text-label-sm text-primary uppercase">View All</button>
          </div>
          <div className="flex flex-col">
            {[
              { name: "Ramesh Crafts", type: "Wood Carving", date: "Today" },
              { name: "Sita Weaves", type: "Textiles", date: "Yesterday" },
            ].map((app) => (
              <div key={app.name} className="flex justify-between items-center px-6 py-4 border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
                <div>
                  <h4 className="text-title-md text-primary">{app.name}</h4>
                  <p className="text-caption text-on-surface-variant uppercase">{app.type}</p>
                </div>
                <div className="flex items-center gap-16">
                  <span className="text-caption text-on-surface-variant">{app.date}</span>
                  <button className="btn-ghost text-accent-emerald"><Icon name="check_circle" size={24} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h3 className="text-headline-sm text-primary">Flagged Content</h3>
            <button className="text-label-sm text-primary uppercase">View All</button>
          </div>
          <div className="flex flex-col">
            {[
              { title: "Suspicious provenance claim on Bronze Shiva", reason: "Multiple User Reports", severity: "High" },
              { title: "Offensive comment in CharchaSabha", reason: "Automated Filter", severity: "Medium" },
            ].map((flag) => (
              <div key={flag.title} className="flex flex-col gap-8 px-6 py-4 border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
                <div className="flex justify-between items-start">
                  <h4 className="text-body-md text-primary font-bold pr-8">{flag.title}</h4>
                  <span className={`text-caption uppercase px-2 py-1 rounded ${flag.severity === 'High' ? 'bg-[#ffdad6] text-status-urgency' : 'bg-surface-container-high text-on-surface'}`} style={{ padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{flag.severity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-caption text-on-surface-variant flex items-center gap-4"><Icon name="flag" size={14} /> {flag.reason}</span>
                  <button className="text-label-sm text-primary uppercase hover:text-accent-terracotta">Review</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
