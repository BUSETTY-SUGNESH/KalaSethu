import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="onboarding-layout">
      <header className="onboarding-header">
        <div className="container" style={{ padding: 0 }}>
          <div className="flex justify-between items-center">
            <Link href="/" className="header-brand">
              KalaSetu
            </Link>
            <div className="flex items-center gap-8 text-on-surface-variant">
              <Icon name="help_outline" size={20} />
              <span className="text-label-sm uppercase">Need Help?</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar Container (stubbed for future) */}
      <div style={{ width: "100%", height: 4, backgroundColor: "var(--color-surface-container)" }}>
        <div style={{ width: "33%", height: "100%", backgroundColor: "var(--color-primary)", transition: "width 0.3s ease" }} />
      </div>

      <main className="onboarding-content">{children}</main>
    </div>
  );
}
