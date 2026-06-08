import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// KZ boost packages (days → price in KZT)
const BOOST_PACKAGES: Record<number, { price: number; label: string }> = {
  3:  { price: 4900,  label: "Продвижение профиля — 3 дня"  },
  7:  { price: 9900,  label: "Продвижение профиля — 7 дней" },
  30: { price: 29900, label: "Продвижение профиля — 30 дней" },
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

    const { user_id, days, creator_name } = await req.json();

    if (!user_id || !days || !BOOST_PACKAGES[days]) {
      return new Response(
        JSON.stringify({ error: "Invalid request. days must be 3, 7, or 30." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pkg = BOOST_PACKAGES[days];
    const unitAmount = pkg.price * 100; // Stripe uses smallest currency unit (tenge-tiyn)

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") || "https://yallainfluencers.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "kzt",
      line_items: [
        {
          price_data: {
            currency: "kzt",
            unit_amount: unitAmount,
            product_data: {
              name: pkg.label,
              description: `Продвижение профиля ${creator_name || ""} в топ витрины на ${days} дней`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "profile_boost",
        user_id,
        days: String(days),
      },
      success_url: `${origin}/production-dashboard?boost=success&days=${days}`,
      cancel_url:  `${origin}/production-dashboard?boost=cancelled`,
    });

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
