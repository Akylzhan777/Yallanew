import Stripe from "npm:stripe@14.14.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch order including stored Stripe session ID
    const { data: order, error: orderErr } = await supabase
      .from("marketplace_orders")
      .select("id, status, package_price, package_name, creator_id, creator_net_amount, region, buyer_name, stripe_session_id")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status === "paid") {
      return new Response(
        JSON.stringify({ success: true, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment via Stripe — use stored session ID (reliable) or fall back to metadata search
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    let paid = false;

    if (order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      paid = session.payment_status === "paid";
    } else {
      // Legacy fallback: search recent sessions by metadata (limit raised to 20)
      const sessions = await stripe.checkout.sessions.list({ limit: 20 });
      for (const session of sessions.data) {
        if (session.metadata?.order_id === order_id && session.payment_status === "paid") {
          paid = true;
          await supabase
            .from("marketplace_orders")
            .update({ stripe_session_id: session.id })
            .eq("id", order_id);
          break;
        }
      }
    }

    if (!paid) {
      return new Response(
        JSON.stringify({ error: "Payment not confirmed yet", status: "pending" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status to paid
    await supabase
      .from("marketplace_orders")
      .update({ status: "paid" })
      .eq("id", order_id);

    // Model B: package_price = clientPrice. Creator payout = creator_net_amount (frozen at checkout).
    // Fallback: package_price / 1.2 recovers creator's base price.
    const creatorAmount = Math.round(
      (order.creator_net_amount && order.creator_net_amount > 0)
        ? order.creator_net_amount
        : order.package_price / 1.2
    );

    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("wallet_balance, whatsapp_number, display_name, region")
      .eq("id", order.creator_id)
      .maybeSingle();

    const currentBalance = Number(profile?.wallet_balance) || 0;
    await supabase
      .from("creator_profiles")
      .update({ wallet_balance: currentBalance + creatorAmount })
      .eq("id", order.creator_id);

    // KZ: Send WhatsApp notification with net earnings
    if (order.region === "KZ" && profile?.whatsapp_number) {
      const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
      const token = Deno.env.get("GREEN_API_TOKEN");
      if (instanceId && token) {
        const netAmount = creatorAmount;
        const phone = (profile.whatsapp_number as string).replace(/\D/g, "");
        const packageName = order.package_name || "Съёмка";
        const message =
          `🚀 Новая бронь на Yalla Influencers!\n` +
          `Тариф: ${packageName}\n` +
          `Вы заработаете: ${netAmount.toLocaleString("ru-RU")} KZT (комиссия платформы удержана).\n` +
          `Заказчик: ${order.buyer_name || "Клиент"}\n\n` +
          `Зайдите в личный кабинет, клиент уже написал вам в чат!`;

        await fetch(
          `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
          },
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, credited: creatorAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
