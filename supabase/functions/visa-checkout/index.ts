import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SERVICES: Record<
  string,
  { name: string; description: string; amount: number }
> = {
  freelance_visa: {
    name: "UAE Freelance Visa",
    description:
      "2-year residence visa, Emirates ID, bank account opening, full document package",
    amount: 7500_00, // 7500 AED in fils
  },
  blogger_permit: {
    name: "Blogger / Influencer Permit (NMC)",
    description:
      "Official NMC license for legal advertising, brand collaborations, and content monetization in UAE",
    amount: 2500_00, // 2500 AED in fils
  },
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

    const { service, creator_id, email } = await req.json();

    const serviceConfig = SERVICES[service];
    if (!serviceConfig) {
      return new Response(
        JSON.stringify({ error: "Invalid service type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const origin = req.headers.get("origin") || "https://yallainfluencers.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      currency: "aed",
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "aed",
            unit_amount: serviceConfig.amount,
            product_data: {
              name: serviceConfig.name,
              description: serviceConfig.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        service,
        creator_id: creator_id || "",
      },
      success_url: `${origin}/creator-dashboard?payment=success&service=${service}`,
      cancel_url: `${origin}/creator-dashboard?payment=cancelled`,
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
