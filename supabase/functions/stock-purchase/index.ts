import Stripe from "npm:stripe@14.14.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PLATFORM_FEE_RATE = 0.30;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    // ── DOWNLOAD: Generate signed URL for purchased footage ──
    if (action === "download") {
      const { footage_id, buyer_id } = body;

      const { data: tx } = await sb
        .from("stock_transactions")
        .select("id")
        .eq("footage_id", footage_id)
        .eq("buyer_id", buyer_id)
        .eq("status", "completed")
        .limit(1)
        .maybeSingle();

      if (!tx) {
        return jsonResponse({ error: "Purchase not found or not yet completed" }, 403);
      }

      const { data: footage } = await sb
        .from("stock_footage")
        .select("original_path, original_link")
        .eq("id", footage_id)
        .maybeSingle();

      if (!footage) {
        return jsonResponse({ error: "File not found" }, 404);
      }

      if (footage.original_link) {
        try {
          const linkUrl = new URL(footage.original_link);
          const host = linkUrl.hostname.toLowerCase();
          if (host.includes('yallainfluencers.com') || host === 'localhost') {
            return jsonResponse({ error: "Download link is misconfigured. Please contact support." }, 400);
          }
        } catch {
          return jsonResponse({ error: "Invalid download link configured" }, 400);
        }
        return jsonResponse({ url: footage.original_link });
      }

      if (!footage.original_path) {
        return jsonResponse({ error: "No file available" }, 404);
      }

      const { data: signedData, error: signError } = await sb.storage
        .from("stock-originals")
        .createSignedUrl(footage.original_path, 3600);

      if (signError || !signedData) {
        return jsonResponse({ error: "Could not generate download link" }, 500);
      }

      return jsonResponse({ url: signedData.signedUrl });
    }

    // ── CONFIRM: Complete a purchase after Stripe payment redirect ──
    if (action === "confirm") {
      const { transaction_id } = body;
      if (!transaction_id) {
        return jsonResponse({ error: "Missing transaction_id" }, 400);
      }

      const { data: tx, error: txErr2 } = await sb
        .from("stock_transactions")
        .select("id, status, seller_payout, footage_id")
        .eq("id", transaction_id)
        .maybeSingle();

      if (txErr2 || !tx) {
        console.error("Confirm: transaction not found", transaction_id, txErr2?.message);
        return jsonResponse({ error: "Transaction not found" }, 404);
      }

      if (tx.status === "completed") {
        return jsonResponse({ ok: true });
      }

      const { error: updErr } = await sb
        .from("stock_transactions")
        .update({ status: "completed" })
        .eq("id", transaction_id);

      if (updErr) {
        console.error("Confirm: update failed", updErr.message);
        return jsonResponse({ error: updErr.message }, 500);
      }

      // Increment sales count and credit seller
      const { data: footageData } = await sb
        .from("stock_footage")
        .select("sales_count, is_admin_global, seller_id")
        .eq("id", tx.footage_id)
        .maybeSingle();

      if (footageData) {
        await sb
          .from("stock_footage")
          .update({ sales_count: (footageData.sales_count || 0) + 1 })
          .eq("id", tx.footage_id);

        if (!footageData.is_admin_global && footageData.seller_id && tx.seller_payout > 0) {
          const { data: sellerProfile } = await sb
            .from("creator_profiles")
            .select("balance_available, balance_total_earned")
            .eq("user_id", footageData.seller_id)
            .maybeSingle();

          if (sellerProfile) {
            await sb
              .from("creator_profiles")
              .update({
                balance_available: (sellerProfile.balance_available || 0) + tx.seller_payout,
                balance_total_earned: (sellerProfile.balance_total_earned || 0) + tx.seller_payout,
              })
              .eq("user_id", footageData.seller_id);
          }
        }
      }

      return jsonResponse({ ok: true });
    }

    // ── PURCHASE: Create Stripe checkout session ──
    const { footage_id, buyer_id, seller_id, amount, return_url } = body;

    if (!footage_id || !buyer_id || !amount) {
      return jsonResponse({ error: "Missing required fields: footage_id, buyer_id, amount" }, 400);
    }

    console.log("Purchase request:", { footage_id, buyer_id, amount });

    // Check if already purchased
    const { data: existing } = await sb
      .from("stock_transactions")
      .select("id, status")
      .eq("footage_id", footage_id)
      .eq("buyer_id", buyer_id)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "Already purchased", already_owned: true });
    }

    // Remove any stale non-completed transactions (pending, failed, expired)
    await sb
      .from("stock_transactions")
      .delete()
      .eq("footage_id", footage_id)
      .eq("buyer_id", buyer_id)
      .neq("status", "completed");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not set");
      return jsonResponse({ error: "Stripe is not configured. Please contact support." }, 500);
    }

    // Get footage details
    const { data: footage, error: footageErr } = await sb
      .from("stock_footage")
      .select("title, seller_name, is_admin_global")
      .eq("id", footage_id)
      .maybeSingle();

    if (footageErr) {
      console.error("Failed to fetch footage:", footageErr.message);
      return jsonResponse({ error: "Failed to fetch footage details" }, 500);
    }

    const isAdminGlobal = footage?.is_admin_global === true;
    const platformFee = isAdminGlobal ? amount : Math.round(amount * PLATFORM_FEE_RATE);
    const sellerPayout = isAdminGlobal ? 0 : amount - platformFee;

    // Create pending transaction
    const { data: txRecord, error: txErr } = await sb
      .from("stock_transactions")
      .insert({
        footage_id,
        buyer_id,
        seller_id: seller_id || "admin",
        amount,
        seller_payout: sellerPayout,
        platform_fee: platformFee,
        payment_method: "stripe",
        status: "pending",
      })
      .select("id")
      .single();

    if (txErr || !txRecord) {
      console.error("Failed to create transaction:", txErr?.message);
      return jsonResponse({ error: "Failed to create transaction: " + (txErr?.message || "unknown") }, 500);
    }

    console.log("Transaction created:", txRecord.id);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") || "https://yallainfluencers.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "aed",
      line_items: [
        {
          price_data: {
            currency: "aed",
            unit_amount: amount * 100,
            product_data: {
              name: `Stock Footage: ${footage?.title || "Clip"}`,
              description: `By ${isAdminGlobal ? "Yalla Production" : footage?.seller_name || "Creator"} — Instant download after payment`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        transaction_id: txRecord.id,
        footage_id,
        buyer_id,
        seller_id: seller_id || "admin",
        is_admin: String(isAdminGlobal),
        type: "stock_purchase",
      },
      success_url: `${origin}${return_url || "/creator-dashboard"}?payment=success&type=stock&tx=${txRecord.id}`,
      cancel_url: `${origin}${return_url || "/creator-dashboard"}?payment=cancelled&type=stock`,
    });

    console.log("Stripe session created:", session.id, "url:", session.url);

    // Store stripe session id (non-critical)
    await sb
      .from("stock_transactions")
      .update({ stripe_session_id: session.id })
      .eq("id", txRecord.id);

    // Return the checkout URL immediately -- views increment is non-critical
    // Do views increment in background after responding
    const viewsPromise = sb
      .from("stock_footage")
      .select("views")
      .eq("id", footage_id)
      .maybeSingle();

    viewsPromise.then(async (res) => {
      if (res.data) {
        await sb
          .from("stock_footage")
          .update({ views: (res.data.views || 0) + 1 })
          .eq("id", footage_id);
      }
    }).catch(() => {});

    return jsonResponse({ url: session.url });
  } catch (err) {
    console.error("stock-purchase unhandled error:", (err as Error).message, (err as Error).stack);
    return jsonResponse({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
