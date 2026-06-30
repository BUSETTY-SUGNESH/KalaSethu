'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ARTWORK_PLACEHOLDER } from '@/lib/constants/placeholders';

interface GalleryImage {
  url: string;
}

interface ArtworkImageGalleryProps {
  title: string;
  images: GalleryImage[];
}

export default function ArtworkImageGallery({ title, images }: ArtworkImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryImages = images.length > 0 ? images : [{ url: ARTWORK_PLACEHOLDER }];

  return (
    <div className="flex flex-col gap-16">
      <div
        className="bg-surface-container-low"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1/1',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid rgba(196, 199, 199, 0.2)',
        }}
      >
        <Image
          key={galleryImages[activeImageIndex].url}
          src={galleryImages[activeImageIndex].url}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          style={{ objectFit: 'cover' }}
        />
      </div>
      {galleryImages.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {galleryImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              className="bg-surface-container-lowest"
              onClick={() => setActiveImageIndex(idx)}
              aria-label={`View image ${idx + 1}`}
              style={{
                position: 'relative',
                aspectRatio: '1/1',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border:
                  idx === activeImageIndex
                    ? '2px solid var(--color-primary)'
                    : '1px solid rgba(196, 199, 199, 0.2)',
                overflow: 'hidden',
                padding: 0,
              }}
            >
              <Image
                src={img.url}
                alt={`${title} thumbnail ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 25vw, 12vw"
                style={{ objectFit: 'cover', opacity: idx === activeImageIndex ? 1 : 0.6 }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
