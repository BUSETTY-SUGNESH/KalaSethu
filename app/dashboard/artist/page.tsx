import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";

export default function ArtistStudioPage() {
  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <div className="flex items-center gap-8 text-primary" style={{ marginBottom: 8 }}>
            <Icon name="palette" size={24} />
            <span className="text-label-md uppercase tracking-wider">Artist Studio</span>
          </div>
          <h1 className="text-headline-lg text-primary">Your Workspace</h1>
        </div>
        <div className="flex gap-12">
          <Button variant="outline" icon="visibility" iconPosition="left">
            View Public Profile
          </Button>
          <Button variant="primary" icon="add" iconPosition="left">
            Upload Artwork
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
        <div className="metric-card">
          <Icon name="inventory_2" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Total Artworks</span>
          <span className="text-display-lg text-primary">34</span>
        </div>
        <div className="metric-card">
          <Icon name="visibility" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Profile Views</span>
          <span className="text-display-lg text-primary">1.2K</span>
        </div>
        <div className="metric-card">
          <Icon name="payments" className="metric-card-watermark" />
          <span className="text-label-md text-on-surface-variant uppercase mb-4" style={{ marginBottom: 16, display: "block" }}>Sales This Month</span>
          <span className="text-display-lg text-primary">₹2.4L</span>
        </div>
      </div>

      <h2 className="text-headline-md text-primary mb-4" style={{ marginBottom: 24 }}>Manage Inventory</h2>
      
      <div className="card overflow-hidden">
        <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-outline-variant" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <div className="header-search" style={{ margin: 0 }}>
            <Icon name="search" size={20} />
            <input type="text" placeholder="Search your artworks..." />
          </div>
          <div className="flex gap-8">
            <button className="btn btn-ghost text-label-md"><Icon name="filter_list" size={18} /> Filter</button>
          </div>
        </div>
        
        <div className="mod-table-header px-6 bg-surface-container-lowest text-label-sm text-on-surface-variant uppercase" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <div>Artwork</div>
          <div>Status</div>
          <div>Price</div>
          <div>Actions</div>
        </div>
        
        <div className="flex flex-col">
          {[
            { title: "Mysore Wood Panel", status: "Live", price: "₹45,000", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWx3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" },
            { title: "Stone Nandi Sculpture", status: "Sold", price: "₹12,500", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcNBvNpjoNCXN3_DTmWH8FCRsaZS6Y-NeM9u1f2QYgFAW55nc_vSj3AURYFhU7eOp9Ls0ppvzGrc9S5LsM0yyZ1TAWWQMaV-7fuX33A3boRrs4pB1lm405TQSEBEO15HkpktgXGhwQbN9w31EpSAVGG7MadEgFnasIIh2HiO2fO1h-Gx_geS14u92B2H0CsWEh_0dRTNh4FygCVPnBsAmNZAgRJW7UdaK4RFzN288zCoMoZkd5KRwplfp8GPV9DjM15htM8YcEflBb" },
          ].map((item) => (
            <div key={item.title} className="mod-table-row px-6 hover:bg-surface-container-low transition-colors" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
              <div className="flex items-center gap-12">
                <img src={item.img} alt={item.title} style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />
                <span className="text-title-md text-primary">{item.title}</span>
              </div>
              <div>
                <span className={`verified-badge ${item.status === 'Sold' ? 'bg-surface-container-highest text-on-surface-variant' : ''}`}>{item.status}</span>
              </div>
              <div className="text-body-md text-primary font-bold">{item.price}</div>
              <div className="flex gap-8">
                <button className="btn-icon bg-surface-container-high rounded-full hover:bg-surface-container-highest transition-colors text-primary"><Icon name="edit" size={20} /></button>
                <button className="btn-icon bg-surface-container-high rounded-full hover:bg-surface-container-highest transition-colors text-primary"><Icon name="more_vert" size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
