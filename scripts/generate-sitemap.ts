/**
 * Sitemap generator — runs before `vite dev` and `vite build`.
 * Outputs `public/sitemap.xml` with all static routes plus one entry per
 * live listing in the books, uniforms, and school_supplies tables.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://rebookedsolutions.co.za";
const SUPABASE_URL = "https://kbpjqzaqbqukutflwixf.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGpxemFxYnF1a3V0Zmx3aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NjMzNzcsImV4cCI6MjA2MzEzOTM3N30.3EdAkGlyFv1JRaRw9OFMyA5AkkKoXp0hdX1bFWpLVMc";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

function slugify(value: string | null | undefined): string {
  if (!value) return "item";
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "item";
}

async function supaSelect(table: string, query: string): Promise<any[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[sitemap] ${table} fetch failed: ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn(`[sitemap] ${table} fetch error:`, (e as Error).message);
    return [];
  }
}

async function buildEntries(): Promise<SitemapEntry[]> {
  const staticPaths: SitemapEntry[] = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/listings", changefreq: "daily", priority: "0.9" },
    { path: "/textbooks-info", changefreq: "monthly", priority: "0.6" },
    { path: "/uniforms-info", changefreq: "monthly", priority: "0.6" },
    { path: "/school-supplies-info", changefreq: "monthly", priority: "0.6" },
    { path: "/contact", changefreq: "monthly", priority: "0.5" },
    { path: "/faq", changefreq: "monthly", priority: "0.5" },
    { path: "/terms", changefreq: "yearly" as any, priority: "0.3" },
    { path: "/privacy", changefreq: "yearly" as any, priority: "0.3" },
    { path: "/login", changefreq: "monthly", priority: "0.4" },
    { path: "/register", changefreq: "monthly", priority: "0.4" },
  ];

  const [books, uniforms, supplies] = await Promise.all([
    supaSelect("books", "select=id,title,author,grade,university_year,item_type&sold=eq.false&limit=5000"),
    supaSelect("uniforms", "select=id,title,school_name&limit=5000"),
    supaSelect("school_supplies", "select=id,title&limit=5000"),
  ]);

  const dynamic: SitemapEntry[] = [];

  for (const b of books) {
    const type = (b.item_type || "textbook").toLowerCase();
    const title = slugify(b.title);
    if (type === "reader") {
      dynamic.push({ path: `/book/${title}/${slugify(b.author)}/${b.id}`, changefreq: "weekly", priority: "0.7" });
    } else {
      const grade = slugify(b.grade || b.university_year || "all");
      dynamic.push({ path: `/textbook/${title}/${grade}/${b.id}`, changefreq: "weekly", priority: "0.7" });
    }
  }
  for (const u of uniforms) {
    dynamic.push({
      path: `/uniform/${slugify(u.school_name)}/${slugify(u.title)}/${u.id}`,
      changefreq: "weekly",
      priority: "0.7",
    });
  }
  for (const s of supplies) {
    dynamic.push({
      path: `/school-supplies/${slugify(s.title)}/${s.id}`,
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  return [...staticPaths, ...dynamic];
}

function generateSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const entries = await buildEntries();
  const xml = generateSitemap(entries);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main().catch((e) => {
  console.error("[sitemap] failed:", e);
  process.exit(0); // Don't fail the build
});