import type { Artwork } from '@/app/types';
import { getCategoryLabel } from '@/lib/constants/artwork-categories';

export default function ArtworkMetadataPanel({ artwork }: { artwork: Artwork }) {
  return (
    <div
      className="bg-surface-container-lowest"
      style={{
        padding: 24,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(196, 199, 199, 0.2)',
      }}
    >
      <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>
        Artwork Details
      </h3>
      <ul className="flex flex-col gap-12 text-body-md text-on-surface">
        {artwork.medium && (
          <li className="flex justify-between border-b border-outline-variant pb-2">
            <span className="text-on-surface-variant">Medium</span>
            <span>{artwork.medium}</span>
          </li>
        )}
        {artwork.dimensions && (
          <li className="flex justify-between border-b border-outline-variant pb-2">
            <span className="text-on-surface-variant">Dimensions</span>
            <span>{artwork.dimensions}</span>
          </li>
        )}
        {artwork.year && (
          <li className="flex justify-between border-b border-outline-variant pb-2">
            <span className="text-on-surface-variant">Year</span>
            <span>{artwork.year}</span>
          </li>
        )}
        <li className="flex justify-between">
          <span className="text-on-surface-variant">Category</span>
          <span>{getCategoryLabel(artwork.category)}</span>
        </li>
      </ul>
    </div>
  );
}
