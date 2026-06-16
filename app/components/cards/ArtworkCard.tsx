import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

interface ArtworkCardProps {
  id: string;
  title: string;
  artist: string;
  price: string;
  imageUrl: string;
}

export default function ArtworkCard({
  id,
  title,
  artist,
  price,
  imageUrl,
}: ArtworkCardProps) {
  return (
    <article className="card artwork-card">
      <div className="artwork-card-img-wrap">
        <button className="artwork-card-fav" aria-label="Add to favorites">
          <Icon name="favorite" size={20} />
        </button>
        <Link href={`/artwork/${id}`}>
          <img src={imageUrl} alt={title} className="card-img" />
        </Link>
      </div>
      <div className="artwork-card-meta">
        <Link href={`/artwork/${id}`}>
          <h3 className="text-title-md text-primary truncate">{title}</h3>
        </Link>
        <div className="artwork-card-artist text-label-sm text-on-surface-variant uppercase">
          {artist}
          <Icon name="verified" size={14} className="text-accent-emerald" />
        </div>
        <div className="artwork-card-price-row">
          <span className="text-price text-primary">{price}</span>
          <Link
            href={`/artwork/${id}`}
            className="text-label-sm text-accent-gold uppercase"
            style={{ fontWeight: 700, letterSpacing: "0.05em" }}
          >
            Buy Now
          </Link>
        </div>
      </div>
    </article>
  );
}
