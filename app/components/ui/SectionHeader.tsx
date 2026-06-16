import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export default function SectionHeader({
  title,
  actionLabel = "View All",
  actionHref,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`section-header ${className}`}>
      <h2 className="text-headline-lg text-primary">{title}</h2>
      {actionHref && (
        <Link href={actionHref} className="section-link">
          {actionLabel} <Icon name="arrow_forward" size={16} />
        </Link>
      )}
    </div>
  );
}
