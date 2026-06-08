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
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { creator_id, email, items, subtotal, platform_fee, total } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save order to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error: orderError } = await sb
      .from("rental_orders")
      .insert({
        creator_id: creator_id || "anonymous",
        creator_email: email || "",
        items,
        platform_fee,
        total_amount: total,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError) {
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") || "https://yallainfluencers.com";

    // Build line items for Stripe (total amount includes platform fee)
    const lineItems = items.map((item: { name: string; day_rate: number; days: number; subtotal: number }) => ({
      price_data: {
        currency: "aed",
        unit_amount: Math.round((item.day_rate * 1.20) * 100), // base + 20% commission, in fils
        product_data: {
          name: `${item.name} — ${item.days} day${item.days > 1 ? "s" : ""} rental`,
        },
      },
      quantity: item.days,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "aed",
      customer_email: email || undefined,
      line_items: lineItems,
      metadata: {
        order_id: order.id,
        creator_id: creator_id || "",
        type: "equipment_rental",
      },
      success_url: `${origin}/creator-dashboard?payment=success&type=rental`,
      cancel_url: `${origin}/creator-dashboard?payment=cancelled`,
    });

    // Update order with stripe session ID
    await sb
      .from("rental_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
