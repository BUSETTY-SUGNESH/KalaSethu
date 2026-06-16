import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

interface ArtistCardProps {
  name: string;
  specialty: string;
  imageUrl: string;
}

export default function ArtistCard({
  name,
  specialty,
  imageUrl,
}: ArtistCardProps) {
  return (
    <Link href="/explore" className="artist-card">
      <div className="artist-avatar-wrap">
        <img src={imageUrl} alt={name} />
      </div>
      <div>
        <h3 className="text-headline-sm text-primary flex items-center justify-center gap-4">
          {name}
          <Icon name="verified" size={16} className="text-accent-emerald" />
        </h3>
        <p
          className="text-label-sm text-on-surface-variant uppercase"
          style={{ marginTop: 4, letterSpacing: "0.05em" }}
        >
          {specialty}
        </p>
      </div>
    </Link>
  );
}
