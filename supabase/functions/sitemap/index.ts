import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://yallainfluencers.com";

const CREATOR_TYPE_LABELS: Record<string, string> = {
  blogger: "Influencer",
  influencer: "Influencer",
  ugc: "UGC Creator",
  model: "Model",
  videographer: "Videographer",
  photographer: "Photographer",
  editor: "Video Editor",
};

const TYPE_SLUGS = ["ugc-creators", "influencers", "bloggers", "videographers", "photographers", "models", "editors", "creators"];
const LOCATION_SLUGS = ["dubai", "abu-dhabi", "sharjah", "uae", "almaty", "astana", "shymkent", "karaganda", "aktobe", "kazakhstan"];
const LANGUAGE_SLUGS = ["russian", "english", "arabic", "kazakh"];
const CATEGORY_SLUGS = ["beauty", "fashion", "food", "travel", "fitness", "lifestyle", "tech", "finance", "real-estate", "business"];

const BLOG_SLUGS = [
  "how-to-choose-videographer",
  "why-brands-need-ugc",
  "influencer-marketing-kazakhstan",
  "ugc-vs-influencer-what-to-choose",
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch active creator profiles
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("username, updated_at, avatar_url, display_name, creator_type, location, category, languages")
      .eq("is_published", true)
      .eq("is_hidden", false)
      .neq("status", "banned")
      .not("username", "is", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    interface ProfileRow {
      username: string;
      updated_at: string;
      avatar_url: string | null;
      display_name: string;
      creator_type: string;
      location: string | null;
      category: string | null;
      languages: string[] | null;
    }

    const profiles = (data ?? []) as ProfileRow[];
    const today = new Date().toISOString().slice(0, 10);

    // Build a set of location+type combos that actually have creators
    // to avoid generating empty filter pages in sitemap
    const activeTypeLoc = new Set<string>();
    const activeLocs = new Set<string>();
    for (const p of profiles) {
      if (!p.location) continue;
      const locLower = p.location.toLowerCase();
      for (const locSlug of LOCATION_SLUGS) {
        const searchTerm = locSlug.replace('-', ' ');
        if (locLower.includes(searchTerm) || locLower.includes(locSlug)) {
          activeLocs.add(locSlug);
          // map creator_type to type slug
          const typeSlugMap: Record<string, string> = {
            ugc: 'ugc-creators', influencer: 'influencers', blogger: 'bloggers',
            videographer: 'videographers', photographer: 'photographers',
            model: 'models', editor: 'editors',
          };
          const tSlug = typeSlugMap[p.creator_type] ?? 'creators';
          activeTypeLoc.add(`${tSlug}/${locSlug}`);
          activeTypeLoc.add(`creators/${locSlug}`);
        }
      }
    }

    // Static pages
    const staticEntries = [
      { loc: SITE_URL, changefreq: "daily", priority: "1.0" },
      { loc: `${SITE_URL}/blog`, changefreq: "weekly", priority: "0.7" },
    ].map(u => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`);

    // Blog posts
    const blogEntries = BLOG_SLUGS.map(slug => `
  <url>
    <loc>${SITE_URL}/blog/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);

    // 2-segment filter pages: /[type]/[location]
    const filterL2Entries: string[] = [];
    for (const typeSlug of TYPE_SLUGS) {
      for (const locSlug of LOCATION_SLUGS) {
        // Only include if there's at least one creator for this combo
        if (!activeTypeLoc.has(`${typeSlug}/${locSlug}`) && !activeLocs.has(locSlug)) continue;
        filterL2Entries.push(`
  <url>
    <loc>${SITE_URL}/${typeSlug}/${locSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`);
      }
    }

    // 3-segment filter pages: /[type]/[location]/[language]
    const filterL3Entries: string[] = [];
    for (const typeSlug of TYPE_SLUGS) {
      for (const locSlug of LOCATION_SLUGS) {
        if (!activeLocs.has(locSlug)) continue;
        for (const langSlug of LANGUAGE_SLUGS) {
          filterL3Entries.push(`
  <url>
    <loc>${SITE_URL}/${typeSlug}/${locSlug}/${langSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`);
        }
      }
    }

    // 4-segment filter pages: /[type]/[location]/[language]/[category]
    const filterL4Entries: string[] = [];
    for (const typeSlug of ["ugc-creators", "influencers", "bloggers", "creators"]) {
      for (const locSlug of LOCATION_SLUGS.slice(0, 6)) { // top locations only
        if (!activeLocs.has(locSlug)) continue;
        for (const langSlug of ["russian", "english", "arabic"]) {
          for (const catSlug of CATEGORY_SLUGS.slice(0, 6)) { // top categories only
            filterL4Entries.push(`
  <url>
    <loc>${SITE_URL}/${typeSlug}/${locSlug}/${langSlug}/${catSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.65</priority>
  </url>`);
          }
        }
      }
    }

    // Creator profile pages
    const creatorEntries = profiles
      .filter(r => r.username && r.username.length >= 3)
      .map(r => {
        const typeLabel = CREATOR_TYPE_LABELS[r.creator_type?.toLowerCase()] ?? "Content Creator";
        const lastmod = r.updated_at ? r.updated_at.slice(0, 10) : today;
        const imageBlock = r.avatar_url
          ? `\n    <image:image>\n      <image:loc>${escapeXml(r.avatar_url)}</image:loc>\n      <image:title>${escapeXml(r.display_name)} – ${escapeXml(typeLabel)} | Yalla Influencers</image:title>\n    </image:image>`
          : "";
        return `
  <url>
    <loc>${SITE_URL}/${r.username}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageBlock}
  </url>`;
      });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${[...staticEntries, ...blogEntries, ...filterL2Entries, ...filterL3Entries, ...filterL4Entries, ...creatorEntries].join("")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      `<?xml version="1.0"?><error>${String(err)}</error>`,
      { status: 500, headers: { "Content-Type": "application/xml" } },
    );
  }
});
