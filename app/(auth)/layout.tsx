import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      {/* Left Panel: Image */}
      <div className="auth-image-panel">
        <div className="auth-gradient" />
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKpT1QStD4QUN9YJvPDowhRfY4TjHRgp14IKqTk-dZPf2QVxjhCYF9Do1TBcz9kYIn25JvmAmgMFN4SiTxz-bfiSaKSqY1jZo1SuUkxPUJ6l9P-9Dm_mRR3HsGLvnppZPcalC7fwYjMPSysIjKXjym_Tw38G3BbEDWKTPLy9TFYrwQHataEMqeki-Net3suHauERIeca6ra8pSls3jpNvn9jl3MGYKzoBJJ3wpU2bcZKdffDylUtqXPcAncnx8sFJ5RrX4wOd3iRu5"
          alt="Authentic Indian Art"
          className="auth-bg"
        />
        <div className="auth-brand-overlay">
          <Link href="/" className="text-display-lg" style={{ color: "#fff" }}>
            KalaSetu
          </Link>
          <p className="text-body-lg" style={{ marginTop: 8, opacity: 0.9 }}>
            A portal to authentic Indian heritage.
          </p>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">{children}</div>
      </div>
    </div>
  );
}
