import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import SectionHeader from "@/app/components/ui/SectionHeader";
import ArtistCard from "@/app/components/cards/ArtistCard";

export default function ExplorePage() {
  return (
    <>
      <div className="bg-surface-container-highest border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <h1 className="text-display-lg text-primary text-center">Explore Artists & Styles</h1>
          <p className="text-body-lg text-on-surface-variant text-center max-w-2xl mx-auto" style={{ maxWidth: 600, margin: "0 auto" }}>
            Journey through India&apos;s rich tapestry of traditional arts. Discover verified artisans, learn about historic techniques, and find the perfect addition to your collection.
          </p>
          
          <div className="flex justify-center" style={{ marginTop: 24 }}>
            <div className="header-search" style={{ width: "100%", maxWidth: 480, padding: "12px 24px" }}>
              <Icon name="search" size={24} className="text-on-surface-variant" />
              <input type="text" placeholder="Search artists, styles, or regions..." style={{ width: "100%", fontSize: 16 }} />
            </div>
          </div>
        </div>
      </div>

      <section className="container section-gap">
        <SectionHeader title="Browse by Region" />
        <div className="category-grid" style={{ gridAutoRows: 160 }}>
          <div className="category-item">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKpT1QStD4QUN9YJvPDowhRfY4TjHRgp14IKqTk-dZPf2QVxjhCYF9Do1TBcz9kYIn25JvmAmgMFN4SiTxz-bfiSaKSqY1jZo1SuUkxPUJ6l9P-9Dm_mRR3HsGLvnppZPcalC7fwYjMPSysIjKXjym_Tw38G3BbEDWKTPLy9TFYrwQHataEMqeki-Net3suHauERIeca6ra8pSls3jpNvn9jl3MGYKzoBJJ3wpU2bcZKdffDylUtqXPcAncnx8sFJ5RrX4wOd3iRu5" alt="South India" />
            <div className="category-overlay">
              <h3 className="text-title-md text-on-primary">South India</h3>
            </div>
          </div>
          <div className="category-item">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" alt="East India" />
            <div className="category-overlay">
              <h3 className="text-title-md text-on-primary">East India</h3>
            </div>
          </div>
          <div className="category-item">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfV8vS5h5VOyr5bH1vMXxhFlMIctImbzswi0rpFLIxUlOlvN6PEWJ4_L-XbD_nLEzkUM1TTOVEFoXiPg72403DPokjRM-L0_HBNz4URAwWbgdK8YN_6R7LtODUqdscYBsiwYOFTjMh7QGmg6T8i05hAlWcXldwNHJHu0XT-BLj15I0EMibTx0rrZulL2vZBAnZKbcYYUVrqeRFH-pWKxAbeh68aft4agkEoWNyqDqKVtvgR9DPhQTFd4oPNBiEIYX3WFSi8fzExVi5" alt="West India" />
            <div className="category-overlay">
              <h3 className="text-title-md text-on-primary">West India</h3>
            </div>
          </div>
          <div className="category-item">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWx3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" alt="North India" />
            <div className="category-overlay">
              <h3 className="text-title-md text-on-primary">North India</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 80 }}>
        <SectionHeader title="Featured Artisans" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 32 }}>
          {[
            { name: "Anjali Devi", specialty: "Mithila Painting", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" },
            { name: "Vikram Seth", specialty: "Stone Carving", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcNBvNpjoNCXN3_DTmWH8FCRsaZS6Y-NeM9u1f2QYgFAW55nc_vSj3AURYFhU7eOp9Ls0ppvzGrc9S5LsM0yyZ1TAWWQMaV-7fuX33A3boRrs4pB1lm405TQSEBEO15HkpktgXGhwQbN9w31EpSAVGG7MadEgFnasIIh2HiO2fO1h-Gx_geS14u92B2H0CsWEh_0dRTNh4FygCVPnBsAmNZAgRJW7UdaK4RFzN288zCoMoZkd5KRwplfp8GPV9DjM15htM8YcEflBb" },
            { name: "Meera Rao", specialty: "Ikat Weaving", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfV8vS5h5VOyr5bH1vMXxhFlMIctImbzswi0rpFLIxUlOlvN6PEWJ4_L-XbD_nLEzkUM1TTOVEFoXiPg72403DPokjRM-L0_HBNz4URAwWbgdK8YN_6R7LtODUqdscYBsiwYOFTjMh7QGmg6T8i05hAlWcXldwNHJHu0XT-BLj15I0EMibTx0rrZulL2vZBAnZKbcYYUVrqeRFH-pWKxAbeh68aft4agkEoWNyqDqKVtvgR9DPhQTFd4oPNBiEIYX3WFSi8fzExVi5" },
            { name: "Arun Sharma", specialty: "Wood Inlay", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWx3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" },
            { name: "Rajesh Kumar", specialty: "Terracotta", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsdFo70kErTEDvPaRL7WwodLQTmlA9-wTvmbfm-AqQ-RI5v_b5k-NdfPiaiSZcJFVsIZxvnE2MZ8wiI93Omnsz7Mc-z5nRpDMXMSH1aomjNtWuZC9Dk26SATL9-QopeaIEoGTOrVmkW8N2Zqx5kRowR-No7DlWeVi9rGJ-u-IwL8mL6VPZb5_gGh6dG7hQah0EL7H6BmafM0oXsBT18iJ0fTo4aHFYxLKeWv0DD2JzsW-OyH-OG4UPbqN3p4jrW1iNwCPGRrjAaprj" }
          ].map((artist) => (
            <ArtistCard key={artist.name} name={artist.name} specialty={artist.specialty} imageUrl={artist.img} />
          ))}
        </div>
      </section>
    </>
  );
}
