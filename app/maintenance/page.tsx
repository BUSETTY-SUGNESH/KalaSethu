import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <h1 className="text-display-sm text-primary" style={{ marginBottom: 16 }}>
          Maintenance in Progress
        </h1>
        <p className="text-body-md text-on-surface-variant" style={{ marginBottom: 24 }}>
          KalaSetu is temporarily in read-only maintenance mode. Please check back soon.
        </p>
        <Link href="/login" className="text-label-sm text-primary uppercase hover:underline">
          Admin sign in
        </Link>
      </div>
    </main>
  );
}
