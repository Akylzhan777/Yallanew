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

    const { order_id, title, budget, email } = await req.json();

    if (!order_id || !budget) {
      return new Response(
        JSON.stringify({ error: "Missing order_id or budget" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") || "https://yallainfluencers.com";

    // Create a payment intent with capture_method manual (escrow-like hold)
    // Using checkout session in "payment" mode — funds go to platform account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "aed",
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "aed",
            unit_amount: budget * 100, // convert AED to fils
            product_data: {
              name: `Video Editing: ${title || "Order"}`,
              description: "Payment held until editing is completed and approved",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id,
        type: "editing_outsource",
      },
      success_url: `${origin}/creator-dashboard?payment=success&type=editing`,
      cancel_url: `${origin}/creator-dashboard?payment=cancelled`,
    });

    // Update order with stripe session and set status to open
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    await sb
      .from("editing_orders")
      .update({ stripe_session_id: session.id, status: "open" })
      .eq("id", order_id);

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
