/**
 * Builds canonical per-item URLs for textbooks, books, uniforms, and school
 * supplies, plus a parser that extracts the listing ID from any current or
 * legacy URL shape.
 *
 * New URL formats:
 *   /textbook/{slug-title}/{grade-or-year-slug}/{id}
 *   /book/{slug-title}/{slug-author}/{id}
 *   /uniform/{school-slug}/{title-slug}/{id}
 *   /school-supplies/{title-slug}/{id}
 *
 * Legacy formats still supported for backward compatibility:
 *   /books/:id, /book/:id, /textbook/:id, /school-uniform/:id, /supplies/:id
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(value: string | undefined | null): string {
  if (!value) return 'item';
  return value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'item';
}

export interface ItemForUrl {
  id: string;
  title?: string | null;
  author?: string | null;
  itemType?: string | null;
  grade?: string | null;
  universityYear?: string | null;
  schoolName?: string | null;
  category?: string | null;
}

/**
 * Build the canonical URL for a listing.
 */
export function buildItemListingUrl(item: ItemForUrl): string {
  const id = item.id;
  const title = slugify(item.title);
  const type = (item.itemType || '').toLowerCase();

  if (type === 'uniform') {
    const school = slugify(item.schoolName);
    return `/uniform/${school}/${title}/${id}`;
  }
  if (type === 'school_supply' || type === 'school-supply') {
    return `/school-supplies/${title}/${id}`;
  }
  if (type === 'reader') {
    const author = slugify(item.author);
    return `/book/${title}/${author}/${id}`;
  }
  // textbook (default)
  const yearOrGrade = slugify(item.grade || item.universityYear || 'all');
  return `/textbook/${title}/${yearOrGrade}/${id}`;
}

/**
 * Extract the listing UUID from any URL shape — new or legacy. Used by
 * BookDetails to resolve the ID regardless of how the page was reached.
 */
export function extractListingId(pathOrParam: string | undefined | null): string | null {
  if (!pathOrParam) return null;
  if (UUID_RE.test(pathOrParam)) return pathOrParam;
  // Try last segment
  const segments = pathOrParam.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && UUID_RE.test(last)) return last;
  // Try any segment
  for (const s of segments) if (UUID_RE.test(s)) return s;
  return null;
}