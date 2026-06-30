export const ARTWORK_CATEGORIES = [
  { slug: 'paintings', label: 'Paintings & Miniatures' },
  { slug: 'bronze', label: 'Sculpture & Bronze' },
  { slug: 'textiles', label: 'Textiles & Weaves' },
  { slug: 'woodcraft', label: 'Woodcraft' },
  { slug: 'jewelry', label: 'Heritage Jewelry' },
  { slug: 'other', label: 'Other' },
] as const;

export type ArtworkCategorySlug = (typeof ARTWORK_CATEGORIES)[number]['slug'];

import { ARTWORK_PLACEHOLDER } from '@/lib/constants/placeholders';

export const CATEGORY_PLACEHOLDER_IMAGE = ARTWORK_PLACEHOLDER;

const slugToLabel = new Map(ARTWORK_CATEGORIES.map((c) => [c.slug, c.label]));

export function getCategoryLabel(slug: string): string {
  return slugToLabel.get(slug as ArtworkCategorySlug) ?? slug;
}

export function isValidCategorySlug(slug: string): slug is ArtworkCategorySlug {
  return slugToLabel.has(slug as ArtworkCategorySlug);
}

export function findMatchingCategorySlugs(term: string): ArtworkCategorySlug[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];

  return ARTWORK_CATEGORIES.filter(
    (c) =>
      c.slug.includes(needle) ||
      c.label.toLowerCase().includes(needle) ||
      needle.includes(c.slug)
  ).map((c) => c.slug);
}
