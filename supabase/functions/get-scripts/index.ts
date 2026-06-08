import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOTION_SECRET = "secret_262HXjSbzbG0faP9sGkYvHsHobpzWvi1njat2WQvUp4";
const NOTION_DB_ID = "3128d9e73cb880f38121cc1c954fbef3";

interface NotionRichText {
  plain_text: string;
}

interface NotionTitle {
  title: NotionRichText[];
}

interface NotionMultiSelect {
  multi_select: { name: string }[];
}

interface NotionSelect {
  select: { name: string } | null;
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionTitle | NotionMultiSelect | NotionSelect | unknown>;
}

function extractTitle(properties: NotionPage["properties"]): string {
  for (const key of ["Name", "Название", "Title"]) {
    const prop = properties[key] as NotionTitle | undefined;
    if (prop?.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "Без названия";
}

function extractTags(properties: NotionPage["properties"]): string[] {
  for (const key of ["Tags", "Теги", "Tag", "Label", "Labels"]) {
    const prop = properties[key] as NotionMultiSelect | undefined;
    if (prop?.multi_select) {
      return prop.multi_select.map((t) => t.name);
    }
  }
  return [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_SECRET}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({ page_size: 100 }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return new Response(
        JSON.stringify({ error: "Notion API error", detail: err }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await response.json();
    const results: NotionPage[] = json.results ?? [];

    const scripts = results.map((page) => ({
      id: page.id,
      title: extractTitle(page.properties),
      tags: extractTags(page.properties),
    }));

    return new Response(JSON.stringify({ scripts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
