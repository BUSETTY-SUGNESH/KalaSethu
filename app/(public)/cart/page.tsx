'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useCartStore } from "@/lib/stores/cart-store";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function CartPage() {
  const router = useRouter();
  const { items, totalAmount, removeItem, clearCart, itemCount } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  if (itemCount === 0) {
    return (
      <div className="container section-gap">
        <h1 className="text-display-sm text-primary" style={{ marginBottom: 48 }}>Your Cart</h1>
        <div className="empty-state">
          <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
            shopping_bag
          </span>
          <p className="text-body-lg text-on-surface-variant">
            Your cart is currently empty.
          </p>
          <Link href="/marketplace">
            <Button variant="primary" style={{ marginTop: 24 }}>Explore KalaMarket</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section-gap">
      <h1 className="text-display-sm text-primary" style={{ marginBottom: 48 }}>Your Cart</h1>

      <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: 64 }}>
        {/* Left Column: Items */}
        <div className="flex flex-col gap-24">
          <div className="flex justify-between items-center border-b border-outline-variant pb-16">
            <span className="text-body-md text-on-surface-variant">{itemCount} items</span>
            <button 
              className="text-label-sm text-status-urgency hover:underline"
              onClick={clearCart}
            >
              Clear Cart
            </button>
          </div>

          <ul className="flex flex-col gap-24">
            {items.map((item) => (
              <li key={item.artworkId} className="flex gap-24 items-start border-b border-outline-variant pb-24">
                <div style={{ width: 120, height: 120, borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0 }}>
                  <img src={item.artworkImageUrl || "https://placehold.co/200x200"} alt={item.artworkTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div className="flex flex-col grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/artwork/${item.artworkId}`}>
                        <h3 className="text-headline-sm text-primary hover:underline">{item.artworkTitle}</h3>
                      </Link>
                      <p className="text-body-md text-on-surface-variant mt-4">By {item.artistName}</p>
                    </div>
                    <span className="text-headline-sm text-primary">₹{item.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-auto pt-16 flex items-center justify-between">
                    <span className="status-pill text-caption">Available</span>
                    <button 
                      className="text-label-md text-status-urgency flex items-center gap-4 hover:underline"
                      onClick={() => removeItem(item.artworkId)}
                    >
                      <Icon name="delete" size={16} /> Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Order Summary */}
        <div>
          <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)", position: "sticky", top: 120 }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Order Summary</h2>
            
            <ul className="flex flex-col gap-16 text-body-md text-on-surface mb-24">
              <li className="flex justify-between">
                <span className="text-on-surface-variant">Subtotal</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-on-surface-variant">Shipping</span>
                <span>Calculated at checkout</span>
              </li>
              <li className="flex justify-between border-t border-outline-variant pt-16 mt-8">
                <span className="font-bold text-primary">Total</span>
                <span className="text-headline-sm text-primary">₹{totalAmount.toLocaleString('en-IN')}</span>
              </li>
            </ul>

            <Button 
              variant="primary" 
              size="lg" 
              fullWidth 
              onClick={() => {
                if (isAuthenticated) {
                  router.push('/checkout');
                } else {
                  router.push('/login?redirect=/checkout');
                }
              }}
            >
              Proceed to Checkout
            </Button>
            
            <p className="text-caption text-on-surface-variant text-center mt-16">
              Secure checkout. Free shipping on authenticated pieces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
