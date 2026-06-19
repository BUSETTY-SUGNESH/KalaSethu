'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useCartStore } from "@/lib/stores/cart-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";

import { createOrder, verifyPayment } from "@/lib/services/payment-service";
import { getUserAddresses, createUserAddress } from "@/lib/services/user-service";
import type { UserAddress } from "@/app/types";

// Mock Razorpay interface since we load it via script tag
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, clearCart, itemCount } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India"
  });
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/checkout");
    } else if (itemCount === 0) {
      router.push("/cart");
    }
  }, [isAuthenticated, itemCount, router]);

  useEffect(() => {
    if (user) {
      getUserAddresses(user.id)
        .then((addresses) => {
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find(a => a.isDefault);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            setShippingAddress({
              name: defaultAddr.fullName,
              address: defaultAddr.addressLine1 + (defaultAddr.addressLine2 ? `, ${defaultAddr.addressLine2}` : ""),
              city: defaultAddr.city,
              state: defaultAddr.state,
              pincode: defaultAddr.pincode,
              country: defaultAddr.country
            });
          }
        })
        .catch((err) => console.error("Error loading saved addresses:", err));
    }
  }, [user]);

  if (!isAuthenticated || itemCount === 0) return null;

  const handleAddressChange = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setShippingAddress({
        name: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        country: "India"
      });
    } else {
      const addr = savedAddresses.find(a => a.id === id);
      if (addr) {
        setShippingAddress({
          name: addr.fullName,
          address: addr.addressLine1 + (addr.addressLine2 ? `, ${addr.addressLine2}` : ""),
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          country: addr.country
        });
      }
    }
  };

  async function loadRazorpay() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // 1. Load Razorpay Script
      const res = await loadRazorpay();
      if (!res) {
        addToast({ type: 'error', title: 'Payment Error', message: 'Razorpay SDK failed to load. Please check your connection.' });
        setIsProcessing(false);
        return;
      }

      // If user selected "new" address and checked "Save to Profile"
      if (selectedAddressId === "new" && saveToProfile && user) {
        try {
          await createUserAddress(user.id, {
            fullName: shippingAddress.name,
            addressLine1: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            country: shippingAddress.country,
            phone: user.phone || "",
            isDefault: false
          });
        } catch (addrErr) {
          console.error("Failed to save address to profile:", addrErr);
          // Don't block payment if only profile address saving fails
        }
      }

      // 2. Create Order via Cloud Function
      const orderParams = await createOrder(totalAmount);

      // 3. Configure Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderParams.amount, // in paise
        currency: orderParams.currency,
        name: "KalaSetu",
        description: "Purchase of Authentic Heritage Art",
        order_id: orderParams.id,
        handler: async function (response: any) {
          try {
            // 4. Verify Payment via Cloud Function
            const orderDetails = {
              totalAmount,
              shippingAddress,
              items: items.map(item => ({
                artworkId: item.artworkId,
                artworkTitle: item.artworkTitle,
                price: item.price,
                artistId: item.artistId,
                artistName: item.artistName,
                artworkImageUrl: item.artworkImageUrl,
                quantity: item.quantity || 1
              }))
            };

            const verification = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              orderDetails
            );
            
            if (verification.success) {
              addToast({ 
                type: 'success', 
                title: 'Payment Successful', 
                message: 'Your order has been placed successfully.' 
              });
              clearCart();
              router.push(`/dashboard/orders/${verification.orderId || ''}`);
            } else {
              throw new Error(verification.error || "Verification failed");
            }
          } catch (err) {
            console.error("Verification error:", err);
            addToast({ type: 'error', title: 'Verification Failed', message: 'There was an issue confirming your payment. Please contact support.' });
          }
        },
        prefill: {
          name: user?.displayName || shippingAddress.name,
          email: user?.email || "",
          contact: user?.phone || ""
        },
        theme: {
          color: "#8B4513"
        }
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response: any) {
        addToast({ type: 'error', title: 'Payment Failed', message: response.error.description });
      });

      paymentObject.open();

    } catch (error) {
      console.error("Payment setup error:", error);
      addToast({ type: 'error', title: 'Error', message: 'Could not initialize payment gateway.' });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="container section-gap">
      <h1 className="text-display-sm text-primary" style={{ marginBottom: 48 }}>Checkout</h1>

      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 64 }}>
        {/* Left Column: Form */}
        <form onSubmit={handlePayment} className="flex flex-col gap-32">
          <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Shipping Address</h2>

            {savedAddresses.length > 0 && (
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ marginBottom: 8, display: "block" }}>Select Shipping Address</label>
                <select 
                  className="form-input" 
                  value={selectedAddressId}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--outline)" }}
                >
                  {savedAddresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.fullName} - {addr.addressLine1}, {addr.city} {addr.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                  <option value="new">+ Add a new address</option>
                </select>
              </div>
            )}
            
            <div className="flex flex-col gap-24">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                  disabled={selectedAddressId !== "new"}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 1</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={shippingAddress.address}
                  onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                  disabled={selectedAddressId !== "new"}
                  required 
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    disabled={selectedAddressId !== "new"}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                    disabled={selectedAddressId !== "new"}
                    required 
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={shippingAddress.pincode}
                    onChange={(e) => setShippingAddress({...shippingAddress, pincode: e.target.value})}
                    disabled={selectedAddressId !== "new"}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input type="text" className="form-input" value="India" disabled />
                </div>
              </div>

              {selectedAddressId === "new" && (
                <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
                  <input 
                    type="checkbox" 
                    id="saveToProfile" 
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <label htmlFor="saveToProfile" style={{ cursor: "pointer", fontSize: "14px", color: "var(--on-surface-variant)" }}>
                    Save this address to my profile
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <Button variant="primary" size="lg" type="submit" disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Pay Securely with Razorpay"}
          </Button>
        </form>

        {/* Right Column: Order Summary */}
        <div>
          <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)", position: "sticky", top: 120 }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Order Summary</h2>
            
            <ul className="flex flex-col gap-16 mb-24 border-b border-outline-variant pb-24">
              {items.map(item => (
                <li key={item.artworkId} className="flex gap-16">
                  <div style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0 }}>
                    <img src={item.artworkImageUrl} alt={item.artworkTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div className="flex flex-col grow justify-center">
                    <span className="text-label-md text-primary truncate">{item.artworkTitle}</span>
                    <span className="text-body-sm text-on-surface-variant">₹{item.price.toLocaleString('en-IN')}</span>
                  </div>
                </li>
              ))}
            </ul>
            
            <ul className="flex flex-col gap-16 text-body-md text-on-surface">
              <li className="flex justify-between">
                <span className="text-on-surface-variant">Subtotal</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-on-surface-variant">Shipping</span>
                <span className="text-accent-emerald font-bold">Free</span>
              </li>
              <li className="flex justify-between border-t border-outline-variant pt-16 mt-8">
                <span className="font-bold text-primary">Total to pay</span>
                <span className="text-headline-sm text-primary">₹{totalAmount.toLocaleString('en-IN')}</span>
              </li>
            </ul>

            <div className="flex items-center gap-12 mt-32 p-16 rounded" style={{ backgroundColor: "rgba(15, 118, 110, 0.1)" }}>
              <Icon name="verified_user" className="text-accent-emerald" size={24} />
              <p className="text-caption text-on-surface">
                Payments are securely processed. KalaSetu protects your transaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
