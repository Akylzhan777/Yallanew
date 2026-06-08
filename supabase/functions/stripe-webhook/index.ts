import Stripe from "npm:stripe@14.14.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    if (event.type !== "checkout.session.completed") {
      return new Response(
        JSON.stringify({ received: true, skipped: event.type }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const region = session.metadata?.region || "UAE";
    const type = session.metadata?.type;

    // Only handle marketplace orders — other types have their own webhooks
    if (!orderId || type !== "marketplace_order" || session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order
    const { data: order } = await supabase
      .from("marketplace_orders")
      .select("id, status, package_price, package_name, creator_id, buyer_name, region, client_user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      console.error("Order not found:", orderId);
      return new Response(
        JSON.stringify({ received: true, error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency guard
    if (order.status === "paid" || order.status === "on_hold" || order.status === "completed") {
      return new Response(
        JSON.stringify({ received: true, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isKZ = region === "KZ";
    const netAmount = Math.round(order.package_price * 0.8);

    // 1. Update order status:
    //    KZ → 'on_hold' (funds frozen in escrow until client accepts work)
    //    UAE/other → 'paid' (immediate, existing flow unchanged)
    await supabase
      .from("marketplace_orders")
      .update({
        status: isKZ ? "on_hold" : "paid",
        stripe_session_id: session.id,
      })
      .eq("id", orderId);

    // 2. Credit creator wallet:
    //    KZ → balance_on_hold (escrow; released when client accepts work)
    //    UAE → wallet_balance (immediate, existing flow unchanged)
    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("wallet_balance, balance_on_hold, whatsapp_number, display_name, user_id")
      .eq("id", order.creator_id)
      .maybeSingle();

    if (creatorProfile) {
      if (isKZ) {
        const currentOnHold = Number(creatorProfile.balance_on_hold) || 0;
        await supabase
          .from("creator_profiles")
          .update({ balance_on_hold: currentOnHold + netAmount })
          .eq("id", order.creator_id);
      } else {
        const currentBalance = Number(creatorProfile.wallet_balance) || 0;
        await supabase
          .from("creator_profiles")
          .update({ wallet_balance: currentBalance + netAmount })
          .eq("id", order.creator_id);
      }

      // 3. WhatsApp notification to creator (KZ only)
      if (isKZ && creatorProfile.whatsapp_number) {
        const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
        const token = Deno.env.get("GREEN_API_TOKEN");
        if (instanceId && token) {
          const phone = (creatorProfile.whatsapp_number as string).replace(/\D/g, "");
          const packageName = order.package_name || "Съёмка";
          const message =
            `🚀 Новая бронь на Yalla Influencers!\n` +
            `Тариф: ${packageName}\n` +
            `Вы заработаете: ${netAmount.toLocaleString("ru-RU")} KZT (после комиссии платформы).\n` +
            `Заказчик: ${order.buyer_name || "Клиент"}\n\n` +
            `Зайдите в личный кабинет — клиент уже написал вам в чате!`;

          await fetch(
            `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
            }
          ).catch(e => console.error("WhatsApp send failed:", e));
        }
      }
    }

    console.log(`Order ${orderId} processed: paid, creator credited ${netAmount}`);

    return new Response(
      JSON.stringify({ received: true, credited: netAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
