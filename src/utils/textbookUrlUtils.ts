/**
 * Utilities for converting between listing filter values and URL-friendly slugs.
 *
 * URL pattern: /listings/:segment1/:segment2/...
 * Segments can be: subject (category), grade, province, university-year, genre, or a listing slug.
 * A listing slug ends with a UUID: "item-name-author/listing-id"
 */

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

const UNIVERSITY_YEARS = [
  "1st Year", "2nd Year", "3rd Year", "4th Year",
  "Honours", "Masters", "Doctorate",
];

const GENRES = [
  "Fiction", "Mystery & Thriller", "Science Fiction", "Fantasy", "Romance",
  "Adventure", "Historical Fiction", "Horror", "Young Adult", "Children's Books",
  "Self-Help", "Wellness & Mind", "Fitness & Health", "Memoir & Biography",
  "History", "Science", "Business & Economics", "Technology", "Psychology",
  "Art & Design", "Cooking", "Travel", "Poetry", "Drama / Plays",
  "Comics & Graphic Novels", "Reference Books", "Educational Books",
  "Study Guides", "Other",
];

// Slug <-> display value helpers
export const toSlug = (value: string): string =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const fromSlug = (slug: string, options: string[]): string | null => {
  const match = options.find((o) => toSlug(o) === slug);
  return match || null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedListingUrl {
  category: string | null;
  grade: string | null;
  province: string | null;
  universityYear: string | null;
  genre: string | null;
  listingId: string | null;
  listingSlug: string | null;
}

/**
 * Parse URL segments after /listings/ into filter values.
 */
export const parseListingSegments = (
  segments: string[],
  allCategories: string[],
): ParsedListingUrl => {
  const result: ParsedListingUrl = {
    category: null,
    grade: null,
    province: null,
    universityYear: null,
    genre: null,
    listingId: null,
    listingSlug: null,
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;

    // Check if it's a UUID (listing ID)
    if (UUID_RE.test(seg)) {
      result.listingId = seg;
      if (i > 0 && segments[i - 1]) {
        result.listingSlug = segments[i - 1];
      }
      continue;
    }

    // If it's the segment before a UUID, it's a listing slug — skip
    if (i + 1 < segments.length && UUID_RE.test(segments[i + 1])) {
      result.listingSlug = seg;
      continue;
    }

    // Try province
    const province = fromSlug(seg, PROVINCES);
    if (province) { result.province = province; continue; }

    // Try grade
    const grade = fromSlug(seg, GRADES);
    if (grade) { result.grade = grade; continue; }

    // Try university year
    const uniYear = fromSlug(seg, UNIVERSITY_YEARS);
    if (uniYear) { result.universityYear = uniYear; continue; }

    // Try genre
    const genre = fromSlug(seg, GENRES);
    if (genre) { result.genre = genre; continue; }

    // Try category/subject
    const category = fromSlug(seg, allCategories);
    if (category) { result.category = category; continue; }
  }

  return result;
};

/**
 * Build a /listings/... URL from active filters.
 */
export const buildListingUrlPath = (filters: {
  category?: string;
  grade?: string;
  province?: string;
  universityYear?: string;
  genre?: string;
}): string => {
  const parts: string[] = ["/listings"];

  // Order: province, category, grade, universityYear, genre
  if (filters.province) parts.push(toSlug(filters.province));
  if (filters.category) parts.push(toSlug(filters.category));
  if (filters.grade) parts.push(toSlug(filters.grade));
  if (filters.universityYear) parts.push(toSlug(filters.universityYear));
  if (filters.genre) parts.push(toSlug(filters.genre));

  return parts.join("/");
};

/**
 * Build a listing URL within the listings path.
 */
export const buildSingleListingUrl = (
  item: { title: string; author?: string; id: string },
  filters?: { category?: string; grade?: string; province?: string; universityYear?: string; genre?: string },
): string => {
  const base = filters ? buildListingUrlPath(filters) : "/listings";
  const itemSlug = toSlug(`${item.title} ${item.author || ""}`);
  return `${base}/${itemSlug}/${item.id}`;
};

/**
 * Generate dynamic SEO title based on active filters.
 */
export const generateFilterTitle = (filters: ParsedListingUrl): string => {
  const parts: string[] = [];

  if (filters.grade) parts.push(filters.grade);
  if (filters.universityYear) parts.push(filters.universityYear);
  if (filters.category) parts.push(filters.category);
  if (filters.genre) parts.push(filters.genre);

  const isReader = !!filters.genre && !filters.grade && !filters.universityYear;
  const itemLabel = isReader ? "Books" : "Items";

  let title = parts.length > 0
    ? `Buy ${parts.join(" ")} ${itemLabel}`
    : "Buy & Sell Used Items, Textbooks & Uniforms";

  if (filters.province) title += ` in ${filters.province}`;

  return `${title} | ReBooked Solutions`;
};

/**
 * Generate dynamic SEO description based on active filters.
 */
export const generateFilterDescription = (
  filters: ParsedListingUrl,
  listingCount?: number,
): string => {
  const parts: string[] = [];
  if (filters.grade) parts.push(filters.grade);
  if (filters.universityYear) parts.push(filters.universityYear);
  if (filters.category) parts.push(filters.category);
  if (filters.genre) parts.push(filters.genre);

  const subject = parts.length > 0 ? parts.join(" ") : "used";
  const label = "listings";
  const location = filters.province ? ` in ${filters.province}` : " in South Africa";
  const count = listingCount !== undefined ? `${listingCount} listings` : "listings";

  return `Looking to buy or sell ${subject} ${label}${location}? ReBooked has ${count} available from verified sellers. Save on your costs.`;
};

/**
 * Generate the SEO content paragraph for filter pages.
 */
export const generateFilterContent = (
  filters: ParsedListingUrl,
  listingCount?: number,
): string => {
  const parts: string[] = [];
  if (filters.grade) parts.push(filters.grade);
  if (filters.universityYear) parts.push(filters.universityYear);
  if (filters.category) parts.push(filters.category);
  if (filters.genre) parts.push(filters.genre);

  const subject = parts.length > 0 ? parts.join(" ") : "";
  const location = filters.province || "South Africa";
  const count = listingCount !== undefined ? String(listingCount) : "many";

  if (subject) {
    return `Looking to buy or sell ${subject} items in ${location}? ReBooked Solutions has ${count} listings available from sellers across South Africa. Browse affordable second-hand ${subject} items and save up to 70% compared to buying new.`;
  }

  if (filters.province) {
    return `Browse ${count} second-hand listings available in ${location}. ReBooked Solutions connects people to buy and sell used uniforms, school supplies and textbooks locally. Find affordable items for every grade and year.`;
  }

  return `Browse all ${count} second-hand listings on ReBooked Solutions. South Africa's trusted marketplace for buying and selling used school uniforms, school supplies and textbooks. Save up to 70% on your school essentials.`;
};

// Backward compatibility aliases
export type ParsedTextbookUrl = ParsedListingUrl;
export const parseTextbookSegments = parseListingSegments;
export const buildTextbookUrl = buildListingUrlPath;
export const buildListingUrl = buildSingleListingUrl;
