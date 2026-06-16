import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import ArtworkCard from "@/app/components/cards/ArtworkCard";

export default function CollectorPage() {
  return (
    <>
      <div className="flex justify-between items-end mb-8" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Your Collection</h1>
          <p className="text-body-md text-on-surface-variant mt-2" style={{ marginTop: 8 }}>
            Browse and manage your acquired heritage pieces.
          </p>
        </div>
        <div className="flex gap-12">
          <div className="header-search">
            <Icon name="search" size={20} />
            <input type="text" placeholder="Search collection..." />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
        {[
          { id: "2", title: "Terracotta Vessel", artist: "Indus Reproduction", price: "Acquired", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsdFo70kErTEDvPaRL7WwodLQTmlA9-wTvmbfm-AqQ-RI5v_b5k-NdfPiaiSZcJFVsIZxvnE2MZ8wiI93Omnsz7Mc-z5nRpDMXMSH1aomjNtWuZC9Dk26SATL9-QopeaIEoGTOrVmkW8N2Zqx5kRowR-No7DlWeVi9rGJ-u-IwL8mL6VPZb5_gGh6dG7hQah0EL7H6BmafM0oXsBT18iJ0fTo4aHFYxLKeWv0DD2JzsW-OyH-OG4UPbqN3p4jrW1iNwCPGRrjAaprj" },
          { id: "3", title: "Madhubani Krishna", artist: "Sita Devi", price: "Acquired", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" },
          { id: "6", title: "Stone Nandi", price: "Acquired", artist: "Vikram Seth", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcNBvNpjoNCXN3_DTmWH8FCRsaZS6Y-NeM9u1f2QYgFAW55nc_vSj3AURYFhU7eOp9Ls0ppvzGrc9S5LsM0yyZ1TAWWQMaV-7fuX33A3boRrs4pB1lm405TQSEBEO15HkpktgXGhwQbN9w31EpSAVGG7MadEgFnasIIh2HiO2fO1h-Gx_geS14u92B2H0CsWEh_0dRTNh4FygCVPnBsAmNZAgRJW7UdaK4RFzN288zCoMoZkd5KRwplfp8GPV9DjM15htM8YcEflBb" }
        ].map((item) => (
          <ArtworkCard
            key={item.id}
            id={item.id}
            title={item.title}
            artist={item.artist}
            price={item.price}
            imageUrl={item.img}
          />
        ))}
      </div>
    </>
  );
}
