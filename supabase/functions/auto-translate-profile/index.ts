import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TranslateRequest {
  profile_id: string;
  bio_en: string;
}

async function translateText(text: string, targetLang: string, apiKey: string): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: "en", target: targetLang, format: "text" }),
  });
  if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
  const data = await res.json();
  return data.data?.translations?.[0]?.translatedText ?? text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: TranslateRequest = await req.json();
    const { profile_id, bio_en } = body;

    if (!profile_id || !bio_en) {
      return new Response(
        JSON.stringify({ error: "profile_id and bio_en are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const googleApiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");

    let bio_ru: string;
    let bio_ar: string;

    if (googleApiKey) {
      [bio_ru, bio_ar] = await Promise.all([
        translateText(bio_en, "ru", googleApiKey),
        translateText(bio_en, "ar", googleApiKey),
      ]);
    } else {
      // Stub: return English as fallback when API key not configured
      bio_ru = bio_en;
      bio_ar = bio_en;
    }

    const { error } = await supabase
      .from("creator_profiles")
      .update({ bio_en, bio_ru, bio_ar })
      .eq("id", profile_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, bio_en, bio_ru, bio_ar, stub: !googleApiKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
