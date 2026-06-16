import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home — Discover Authentic Indian Art",
};

export default function HomePage() {
  return (
    <>
      {/* Ticker */}
      <div className="ticker-bar">
        <div className="container ticker-inner">
          <span className="text-label-sm ticker-label">Live Updates</span>
          <div className="ticker-scroll-area">
            <div className="text-caption ticker-content" style={{ color: "var(--color-on-surface-variant)" }}>
              National Gallery announces new residency program for indigenous weavers. &nbsp;&nbsp; | &nbsp;&nbsp; Record-breaking bid on Raja Ravi Varma lithograph in KalaMarket. &nbsp;&nbsp; | &nbsp;&nbsp; Upcoming webinar: Preserving Terracotta in high-humidity environments. &nbsp;&nbsp; | &nbsp;&nbsp; Call for submissions: The Annual Kalent Crafts Fair 2024.
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="hero-section">
          <div className="hero-text">
            <div className="flex flex-col gap-16">
              <span className="text-label-md hero-badge">
                <span className="hero-badge-line" />
                Art of the Week
              </span>
              <h1 className="text-display-lg text-primary">The Silent Ascetic</h1>
              <p className="text-body-lg text-on-surface-variant">
                A masterful mid-18th century bronze casting from the deep south of India. This piece exemplifies the lost-wax technique, capturing an unparalleled sense of stillness and devotion that has defined regional spiritual art for centuries.
              </p>
            </div>
            <div className="hero-provenance">
              <span className="text-label-sm text-outline uppercase">Provenance</span>
              <span className="text-body-md text-on-surface">Acquired from the personal collection of the Tanjore Royal lineage, authenticated 2023.</span>
            </div>
            <div>
              <Link href="/artwork/the-silent-ascetic" className="btn btn-primary btn-lg">
                View Masterpiece
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </Link>
            </div>
          </div>
          <div className="hero-image-wrap">
            <div className="hero-image-overlay" />
            <img
              alt="The Silent Ascetic — 18th century bronze casting"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKpT1QStD4QUN9YJvPDowhRfY4TjHRgp14IKqTk-dZPf2QVxjhCYF9Do1TBcz9kYIn25JvmAmgMFN4SiTxz-bfiSaKSqY1jZo1SuUkxPUJ6l9P-9Dm_mRR3HsGLvnppZPcalC7fwYjMPSysIjKXjym_Tw38G3BbEDWKTPLy9TFYrwQHataEMqeki-Net3suHauERIeca6ra8pSls3jpNvn9jl3MGYKzoBJJ3wpU2bcZKdffDylUtqXPcAncnx8sFJ5RrX4wOd3iRu5"
            />
          </div>
        </div>
      </section>

      {/* Trending Artists */}
      <section className="container" style={{ paddingBottom: 80 }}>
        <div className="section-header">
          <h2 className="text-headline-lg text-primary">Trending Artists</h2>
          <Link href="/explore" className="section-link">
            Discover More <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </Link>
        </div>
        <div className="horizontal-scroll">
          {[
            { name: "Anjali Devi", specialty: "Mithila Painting", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" },
            { name: "Vikram Seth", specialty: "Stone Carving", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcNBvNpjoNCXN3_DTmWH8FCRsaZS6Y-NeM9u1f2QYgFAW55nc_vSj3AURYFhU7eOp9Ls0ppvzGrc9S5LsM0yyZ1TAWWQMaV-7fuX33A3boRrs4pB1lm405TQSEBEO15HkpktgXGhwQbN9w31EpSAVGG7MadEgFnasIIh2HiO2fO1h-Gx_geS14u92B2H0CsWEh_0dRTNh4FygCVPnBsAmNZAgRJW7UdaK4RFzN288zCoMoZkd5KRwplfp8GPV9DjM15htM8YcEflBb" },
            { name: "Meera Rao", specialty: "Ikat Weaving", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfV8vS5h5VOyr5bH1vMXxhFlMIctImbzswi0rpFLIxUlOlvN6PEWJ4_L-XbD_nLEzkUM1TTOVEFoXiPg72403DPokjRM-L0_HBNz4URAwWbgdK8YN_6R7LtODUqdscYBsiwYOFTjMh7QGmg6T8i05hAlWcXldwNHJHu0XT-BLj15I0EMibTx0rrZulL2vZBAnZKbcYYUVrqeRFH-pWKxAbeh68aft4agkEoWNyqDqKVtvgR9DPhQTFd4oPNBiEIYX3WFSi8fzExVi5" },
            { name: "Arun Sharma", specialty: "Wood Inlay", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWx3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" },
          ].map((artist) => (
            <Link key={artist.name} href="/explore" className="artist-card">
              <div className="artist-avatar-wrap">
                <img alt={artist.name} src={artist.img} />
              </div>
              <div>
                <h3 className="text-headline-sm text-primary">{artist.name}</h3>
                <p className="text-label-sm text-on-surface-variant uppercase" style={{ marginTop: 4, letterSpacing: "0.05em" }}>{artist.specialty}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Auctions + Community Sidebar */}
      <section className="container" style={{ paddingBottom: 80 }}>
        <div className="split-layout">
          {/* Auctions */}
          <div className="flex flex-col gap-32">
            <div className="section-header" style={{ marginBottom: 0 }}>
              <h2 className="text-headline-lg text-primary">Live Auctions Ending Soon</h2>
              <Link href="/marketplace" className="section-link">
                View KalaMarket <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
            <div className="auction-grid">
              {[
                { title: "Pahari Miniature: Radha & Krishna", price: "₹4,50,000", artist: "By Master Nainsukh (School of)", time: "02h 14m remaining", urgent: true, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBB7u702BB1v7JwSVmh1y9duJ8Debddr0-GQ57m2B672TkgVxoGwpT6QwfOoMOwKiuUJchvHoo_6ae-fhyTToAudrX4yaHyYIO2keY0_V9COdZYGxUVz6gOzXqNbTwVVH5kgG5SlXAILEQqHtA9i4k4iCqn0azl9JRCSXEHvwCKtd6LRa_GpXwrrOXDdGsDUHN7gZuCFHY0uCtznmawy6HPHerkA5JG5kdjnfVWRkr-u0YYDKMk7mH_89kOfH-I9-LwJpb58q7BSAo8" },
                { title: "Harappan Style Terracotta Vessel", price: "₹85,000", artist: "Indus Valley Reproduction", time: "05h 30m remaining", urgent: false, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsdFo70kErTEDvPaRL7WwodLQTmlA9-wTvmbfm-AqQ-RI5v_b5k-NdfPiaiSZcJFVsIZxvnE2MZ8wiI93Omnsz7Mc-z5nRpDMXMSH1aomjNtWuZC9Dk26SATL9-QopeaIEoGTOrVmkW8N2Zqx5kRowR-No7DlWeVi9rGJ-u-IwL8mL6VPZb5_gGh6dG7hQah0EL7H6BmafM0oXsBT18iJ0fTo4aHFYxLKeWv0DD2JzsW-OyH-OG4UPbqN3p4jrW1iNwCPGRrjAaprj" },
              ].map((item) => (
                <article key={item.title} className="auction-card">
                  <div className="auction-img-wrap">
                    <div className="status-badge">
                      <div className={`status-dot ${item.urgent ? "pulse" : "active"}`} />
                      <span className="text-label-sm text-primary">{item.time}</span>
                    </div>
                    <img alt={item.title} src={item.img} />
                  </div>
                  <div className="auction-info">
                    <div className="auction-title-row">
                      <h3 className="text-headline-sm text-primary auction-title">{item.title}</h3>
                      <span className="text-headline-sm text-accent-gold shrink-0">{item.price}</span>
                    </div>
                    <p className="text-label-sm text-on-surface-variant auction-author uppercase">{item.artist}</p>
                    <button className="auction-btn" suppressHydrationWarning>Place Bid</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-48">
            {/* CharchaSabha */}
            <div>
              <div className="panel-header">
                <span className="material-symbols-outlined text-accent-terracotta">forum</span>
                <h2 className="text-headline-md text-primary">CharchaSabha</h2>
              </div>
              <div className="thread-item active-thread">
                <span className="text-caption text-on-surface-variant" style={{ display: "block", marginBottom: 4 }}>Trending Discussion • 42 replies</span>
                <h4 className="text-headline-sm text-primary">Sourcing Authentic Natural Dyes in 2024</h4>
                <p className="text-body-md text-on-surface-variant line-clamp-2">I&apos;ve been struggling to find reliable sources for genuine Indigo and Madder root that haven&apos;t been mixed with synthetics. Does anyone have verified contacts in Gujarat?</p>
              </div>
              <div className="thread-item inactive-thread">
                <span className="text-caption text-on-surface-variant" style={{ display: "block", marginBottom: 4 }}>Provenance & Legal • 18 replies</span>
                <h4 className="text-headline-sm text-primary">Navigating Antiquities Export Laws</h4>
                <p className="text-body-md text-on-surface-variant line-clamp-2">A brief guide on the latest updates from the Ministry of Culture regarding the export of items over 100 years old.</p>
              </div>
            </div>

            {/* Kalent */}
            <div className="kalent-box">
              <div className="panel-header">
                <span className="material-symbols-outlined text-accent-emerald">event</span>
                <h2 className="text-headline-md text-primary">Kalent</h2>
              </div>
              <div className="flex flex-col gap-16">
                <div className="event-item">
                  <div className="event-date-box">
                    <span className="text-label-sm text-accent-emerald" style={{ lineHeight: 1 }}>Oct</span>
                    <span className="text-headline-sm text-primary" style={{ lineHeight: 1, marginTop: 4 }}>12</span>
                  </div>
                  <div>
                    <h4 className="text-label-md text-primary" style={{ textTransform: "none" }}>Masterclass: Tanjore Gold Leafing</h4>
                    <p className="text-caption text-on-surface-variant" style={{ marginTop: 4 }}>Virtual Workshop • 2 Hours</p>
                  </div>
                </div>
                <div className="event-item">
                  <div className="event-date-box">
                    <span className="text-label-sm text-status-urgency" style={{ lineHeight: 1 }}>Oct</span>
                    <span className="text-headline-sm text-primary" style={{ lineHeight: 1, marginTop: 4 }}>15</span>
                  </div>
                  <div>
                    <h4 className="text-label-md text-primary" style={{ textTransform: "none" }}>Heritage Grant Submission Deadline</h4>
                    <p className="text-caption text-on-surface-variant" style={{ marginTop: 4 }}>Application Close • Midnight IST</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
