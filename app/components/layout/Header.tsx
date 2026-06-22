"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCartStore } from "@/lib/stores/cart-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { signOut } from "@/lib/firebase/auth";
import NotificationPanel from "./NotificationPanel";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "KalaMarket", href: "/marketplace" },
  { label: "Explore", href: "/explore" },
  { label: "Bids", href: "/bids" },
  { label: "CharchaSabha", href: "/community" },
  { label: "Kalent", href: "/events" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { user, isAuthenticated, isArtist } = useAuthStore();
  const { itemCount } = useCartStore();
  const { 
    unreadNotificationCount, 
    isNotificationPanelOpen, 
    toggleNotificationPanel, 
    setNotificationPanelOpen,
    searchQuery,
    setSearchQuery 
  } = useUIStore();
  
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    function updateIndicator() {
      const activeIndex = NAV_ITEMS.findIndex(item => pathname === item.href);
      if (activeIndex !== -1 && navRefs.current[activeIndex]) {
        const activeEl = navRefs.current[activeIndex];
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    }

    updateIndicator();
    
    // Update on resize to maintain correct position
    window.addEventListener('resize', updateIndicator);
    // Add small delay to ensure fonts/layout are loaded
    const timeout = setTimeout(updateIndicator, 100);
    
    return () => {
      window.removeEventListener('resize', updateIndicator);
      clearTimeout(timeout);
    };
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  async function handleSignOut() {
    await signOut();
    setDropdownOpen(false);
    router.push("/login");
  }

  return (
    <header className="site-header" style={{ position: "sticky", top: 0, zIndex: 100 }}>
      <div className="container header-inner">
        <div className="flex items-center gap-48">
          <Link href="/" className="header-brand">
            KalaSetu
          </Link>
          <nav className="header-nav">
            {NAV_ITEMS.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => { navRefs.current[index] = el; }}
                className={pathname === item.href ? "active" : ""}
              >
                {item.label}
              </Link>
            ))}
            <div className="nav-indicator" style={indicatorStyle} />
          </nav>
        </div>

        <div className="header-actions">
          <div className="header-search">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: "var(--color-on-surface-variant)" }}
            >
              search
            </span>
            <input 
              type="text" 
              placeholder="Search heritage..." 
              aria-label="Search artworks"
              suppressHydrationWarning 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pathname !== '/marketplace') {
                  router.push('/marketplace');
                }
              }}
            />
          </div>

          {isAuthenticated ? (
            <>
              <div style={{ position: "relative" }}>
                <button 
                  id="notification-btn"
                  className="header-icon-btn relative" 
                  aria-label="Notifications"
                  onClick={toggleNotificationPanel}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadNotificationCount > 0 && (
                    <span className="badge-count">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>
                  )}
                </button>
                <NotificationPanel />
              </div>

              <Link href="/cart" className="header-icon-btn relative" aria-label="Cart">
                <span className="material-symbols-outlined">shopping_cart</span>
                {itemCount > 0 && (
                  <span className="badge-count">{itemCount}</span>
                )}
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button 
                  className="avatar avatar-sm" 
                  style={{ border: "2px solid var(--color-surface-container-high)", cursor: "pointer" }}
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold" }}>
                      {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </button>

                {isDropdownOpen && (
                  <div className="notification-panel" style={{ width: 220, top: "calc(100% + 8px)" }}>
                    <div style={{ padding: "16px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
                      <p className="text-body-md" style={{ fontWeight: 600 }}>{user?.displayName}</p>
                      <p className="text-caption text-on-surface-variant truncate">{user?.email}</p>
                    </div>
                    <div className="flex flex-col py-8">
                      <Link href={`/dashboard${isArtist() ? '/artist' : '/collector'}`} className="notification-item" onClick={() => setDropdownOpen(false)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
                        Dashboard
                      </Link>
                      <Link href={`/profile/${user?.id}`} className="notification-item" onClick={() => setDropdownOpen(false)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person</span>
                        Profile
                      </Link>
                      <Link href="/dashboard/orders" className="notification-item" onClick={() => setDropdownOpen(false)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>receipt_long</span>
                        Orders
                      </Link>
                      <button className="notification-item" onClick={handleSignOut} style={{ color: "var(--color-status-urgency)", width: "100%", textAlign: "left", border: "none", background: "none" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login" className="header-icon-btn" aria-label="Login">
              <span className="material-symbols-outlined">account_circle</span>
            </Link>
          )}

          <button className="mobile-nav-toggle" aria-label="Menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
