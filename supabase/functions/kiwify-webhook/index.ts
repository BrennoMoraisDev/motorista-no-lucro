import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Validate webhook token
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token") || "";
    const customTokenHeader = req.headers.get("x-webhook-token") || "";
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const token = queryToken || customTokenHeader || authHeader.replace("Bearer ", "").trim();
    const expectedToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
    if (!expectedToken || token !== expectedToken) {
      console.error("Invalid webhook token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Kiwify webhook received:", JSON.stringify(payload));

    // Extract event info from Kiwify payload
    const eventId =
      payload.order_id ||
      payload.transaction_id ||
      payload.event_id ||
      `${payload.order_status}_${Date.now()}`;
    const eventType =
      payload.order_status || payload.event_type || payload.type || "unknown";
    const customerEmail =
      payload.Customer?.email ||
      payload.customer?.email ||
      payload.email ||
      payload.buyer?.email ||
      null;

    if (!customerEmail) {
      console.error("No customer email in payload");
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Idempotency check
    const { data: existingEvent } = await supabaseAdmin
      .from("kiwify_events")
      .select("id, processed")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent?.processed) {
      console.log(`Event ${eventId} already processed, skipping`);
      return new Response(JSON.stringify({ status: "already_processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert event log
    if (!existingEvent) {
      await supabaseAdmin.from("kiwify_events").insert({
        event_id: eventId,
        event_type: eventType,
        payload,
        processed: false,
      });
    }

    // Find user by email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (!profile) {
      const errorMsg = `No user found for email: ${customerEmail}`;
      console.error(errorMsg);
      await supabaseAdmin
        .from("kiwify_events")
        .update({ processed: true, processed_at: new Date().toISOString(), error_log: errorMsg })
        .eq("event_id", eventId);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = profile.user_id;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // Process event based on type
    const normalizedType = eventType.toLowerCase();

    if (
      normalizedType.includes("paid") ||
      normalizedType.includes("approved") ||
      normalizedType.includes("compra_aprovada") ||
      normalizedType.includes("subscription_purchased") ||
      normalizedType.includes("renewed") ||
      normalizedType.includes("assinatura_renovada")
    ) {
      // Purchase approved or subscription renewed
      await supabaseAdmin
        .from("profiles")
        .update({
          plano: "premium",
          status_assinatura: "active",
          data_expiracao: periodEnd.toISOString(),
        })
        .eq("user_id", userId);

      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          kiwify_transaction_id: eventId,
          status: "active",
          plan_type: "premium",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id" }
      );

      console.log(`Activated premium for user ${userId}`);
    } else if (
      normalizedType.includes("canceled") ||
      normalizedType.includes("assinatura_cancelada")
    ) {
      // Subscription canceled – keep access until period end
      await supabaseAdmin
        .from("profiles")
        .update({ status_assinatura: "canceled" })
        .eq("user_id", userId);

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled", updated_at: now.toISOString() })
        .eq("user_id", userId);

      console.log(`Canceled subscription for user ${userId}`);
    } else if (
      normalizedType.includes("past_due") ||
      normalizedType.includes("atrasada") ||
      normalizedType.includes("overdue")
    ) {
      await supabaseAdmin
        .from("profiles")
        .update({ status_assinatura: "past_due" })
        .eq("user_id", userId);

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "past_due", updated_at: now.toISOString() })
        .eq("user_id", userId);

      console.log(`Marked past_due for user ${userId}`);
    } else if (
      normalizedType.includes("refund") ||
      normalizedType.includes("reembolso") ||
      normalizedType.includes("chargeback")
    ) {
      // Immediate revoke
      await supabaseAdmin
        .from("profiles")
        .update({
          plano: "free",
          status_assinatura: "canceled",
          data_expiracao: now.toISOString(),
        })
        .eq("user_id", userId);

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "expired",
          current_period_end: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("user_id", userId);

      console.log(`Revoked access for user ${userId} (refund/chargeback)`);
    } else {
      console.log(`Unknown event type: ${eventType}, skipping processing`);
    }

    // Mark event as processed
    await supabaseAdmin
      .from("kiwify_events")
      .update({ processed: true, processed_at: now.toISOString() })
      .eq("event_id", eventId);

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
