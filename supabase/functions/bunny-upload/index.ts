import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LIBRARY_ID = 679977;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("BUNNY_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "BUNNY_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let title: string;
  try {
    const body = await req.json();
    title = body?.title;
    if (!title || typeof title !== "string") {
      throw new Error("missing title");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body. Expected { \"title\": \"...\" }" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!bunnyRes.ok) {
    const text = await bunnyRes.text();
    return new Response(JSON.stringify({ error: "Bunny API error", detail: text }), {
      status: bunnyRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await bunnyRes.json();
  const guid: string = data.guid;

  if (!guid) {
    return new Response(JSON.stringify({ error: "Bunny returned no guid", detail: data }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ videoId: guid, libraryId: LIBRARY_ID, apiKey }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
