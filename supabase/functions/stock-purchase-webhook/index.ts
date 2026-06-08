import Stripe from "npm:stripe@14.14.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return new Response(
          JSON.stringify({ error: "Missing signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      console.log("Webhook received checkout.session.completed, metadata:", JSON.stringify(metadata));

      if (metadata?.type === "stock_purchase" && metadata?.transaction_id) {
        const txId = metadata.transaction_id;
        const footageId = metadata.footage_id;

        // Get the transaction to check current status
        const { data: tx, error: txFetchErr } = await sb
          .from("stock_transactions")
          .select("id, status, seller_payout, footage_id")
          .eq("id", txId)
          .maybeSingle();

        if (txFetchErr) {
          console.error("Failed to fetch transaction:", txFetchErr.message);
          return new Response(
            JSON.stringify({ error: "Failed to fetch transaction" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!tx) {
          console.error("Transaction not found:", txId);
          return new Response(
            JSON.stringify({ error: "Transaction not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Already completed — skip
        if (tx.status === "completed") {
          console.log("Transaction already completed:", txId);
          return new Response(
            JSON.stringify({ received: true, already_completed: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Mark transaction as completed
        const { error: updateErr } = await sb
          .from("stock_transactions")
          .update({ status: "completed" })
          .eq("id", txId);

        if (updateErr) {
          console.error("Failed to update transaction status:", updateErr.message);
          return new Response(
            JSON.stringify({ error: "Failed to update transaction" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Transaction marked completed:", txId);

        // Fetch footage details for sales_count increment and seller credit
        const resolvedFootageId = footageId || tx.footage_id;
        const { data: footageData, error: footageFetchErr } = await sb
          .from("stock_footage")
          .select("sales_count, is_admin_global, seller_id")
          .eq("id", resolvedFootageId)
          .maybeSingle();

        if (footageFetchErr) {
          console.error("Failed to fetch footage for payout:", footageFetchErr.message);
        }

        if (footageData) {
          // Increment sales count
          const { error: salesUpdateErr } = await sb
            .from("stock_footage")
            .update({ sales_count: (footageData.sales_count || 0) + 1 })
            .eq("id", resolvedFootageId);

          if (salesUpdateErr) {
            console.error("Failed to increment sales_count:", salesUpdateErr.message);
          }

          // Credit seller balance (70% split) for non-admin footage
          const sellerId = metadata.seller_id || footageData.seller_id;
          const isAdmin = metadata.is_admin === "true" || footageData.is_admin_global;

          if (!isAdmin && sellerId && sellerId !== "admin" && tx.seller_payout > 0) {
            const { data: sellerProfile, error: sellerFetchErr } = await sb
              .from("creator_profiles")
              .select("balance_available, balance_total_earned")
              .eq("user_id", sellerId)
              .maybeSingle();

            if (sellerFetchErr) {
              console.error("Failed to fetch seller profile:", sellerFetchErr.message);
            }

            if (sellerProfile) {
              const newBalance = (sellerProfile.balance_available || 0) + tx.seller_payout;
              const newTotal = (sellerProfile.balance_total_earned || 0) + tx.seller_payout;

              const { error: creditErr } = await sb
                .from("creator_profiles")
                .update({
                  balance_available: newBalance,
                  balance_total_earned: newTotal,
                })
                .eq("user_id", sellerId);

              if (creditErr) {
                console.error("Failed to credit seller:", creditErr.message);
              } else {
                console.log("Credited seller:", sellerId, "amount:", tx.seller_payout, "new balance:", newBalance);
              }
            } else {
              console.error("Seller profile not found for user_id:", sellerId);
            }
          } else {
            console.log("Admin footage or zero payout — no seller credit needed");
          }
        } else {
          console.error("Footage not found for id:", resolvedFootageId);
        }

        console.log("Stock purchase webhook completed successfully for tx:", txId);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
