import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand-section">
          <Link href="/" className="footer-brand-name">
            KalaSetu
          </Link>
          <p className="text-body-md text-on-surface-variant">
            Connecting art lovers with authentic creators. Discover unique pieces
            and support the vibrant artistic heritage of India.
          </p>
          <p className="text-caption text-on-surface-variant">
            © 2024 KalaSetu India. Supporting Heritage.
          </p>
        </div>

        <div className="footer-links-section">
          <div className="footer-col">
            <span className="footer-col-title">Platform</span>
            <Link href="/marketplace">KalaMarket</Link>
            <Link href="/explore">Explore Art</Link>
            <Link href="/community">CharchaSabha</Link>
            <Link href="/events">Kalent Events</Link>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Support</span>
            <Link href="/support">Help Center</Link>
            <Link href="#">Return Policy</Link>
            <Link href="#">Buyer Protection</Link>
            <Link href="#">Authenticity Guide</Link>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Company</span>
            <Link href="#">Our Mission</Link>
            <Link href="#">Artist Directory</Link>
            <Link href="#">Legal & Provenance</Link>
            <Link href="#">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
