import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractEmail(payload: Record<string, unknown>): string | null {
  const customer = (payload.Customer || payload.customer) as Record<string, unknown> | undefined;
  if (customer?.email) return String(customer.email).toLowerCase().trim();
  const buyer = payload.buyer as Record<string, unknown> | undefined;
  if (buyer?.email) return String(buyer.email).toLowerCase().trim();
  if (payload.email) return String(payload.email).toLowerCase().trim();
  const subscription = (payload.Subscription || payload.subscription) as Record<string, unknown> | undefined;
  if (subscription?.customer) {
    const subCustomer = subscription.customer as Record<string, unknown>;
    if (subCustomer?.email) return String(subCustomer.email).toLowerCase().trim();
  }
  return null;
}

function extractEventType(payload: Record<string, unknown>): string {
  return String(
    payload.order_status || payload.event_type || payload.type || payload.webhook_event_type || "unknown"
  ).toLowerCase();
}

function extractEventId(payload: Record<string, unknown>): string {
  return String(
    payload.order_id || payload.transaction_id || payload.subscription_id || payload.event_id ||
    `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
}

/** Extract a timestamp from the payload to determine event chronological order */
function extractEventTimestamp(payload: Record<string, unknown>): Date {
  // Try various Kiwify timestamp fields
  const candidates = [
    payload.approved_date,
    payload.updated_at,
    payload.created_at,
    payload.sale_date,
    (payload.Subscription as Record<string, unknown>)?.updated_at,
    (payload.Subscription as Record<string, unknown>)?.created_at,
  ];
  for (const c of candidates) {
    if (c) {
      const d = new Date(String(c));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date(); // fallback to now
}

type Action = "activate" | "cancel" | "revoke" | "ignore";

function classifyEvent(eventType: string): Action {
  if (
    eventType.includes("paid") || eventType.includes("approved") ||
    eventType.includes("compra_aprovada") || eventType.includes("subscription_purchased") ||
    eventType.includes("renewed") || eventType.includes("assinatura_renovada") ||
    eventType === "order_approved"
  ) return "activate";

  if (
    eventType.includes("canceled") || eventType.includes("assinatura_cancelada") ||
    eventType === "subscription_canceled"
  ) return "cancel";

  if (
    eventType.includes("refund") || eventType.includes("reembolso") ||
    eventType.includes("chargeback") || eventType === "order_refunded"
  ) return "revoke";

  return "ignore";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return json({ status: "ok" });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    // Validate token
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token") || "";
    const customTokenHeader = req.headers.get("x-webhook-token") || "";
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const token = queryToken || customTokenHeader || authHeader.replace("Bearer ", "").trim();
    const expectedToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");

    if (!expectedToken || token !== expectedToken) {
      console.error("Invalid webhook token");
      return json({ error: "Unauthorized" }, 401);
    }

    const rawBody = await req.text();
    console.log("Kiwify raw payload:", rawBody);

    let payload: Record<string, unknown>;
    try { payload = JSON.parse(rawBody); } catch {
      console.error("Invalid JSON");
      return json({ error: "Invalid JSON" }, 400);
    }

    const customerEmail = extractEmail(payload);
    const eventType = extractEventType(payload);
    const eventId = extractEventId(payload);
    const eventTimestamp = extractEventTimestamp(payload);

    console.log("Evento recebido:", eventType);
    console.log("Email:", customerEmail);
    console.log("Event ID:", eventId);
    console.log("Event timestamp:", eventTimestamp.toISOString());

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Always save event first ──
    const { data: existingEvent } = await db
      .from("kiwify_events").select("id, processed").eq("event_id", eventId).maybeSingle();

    if (existingEvent?.processed) {
      console.log(`Event ${eventId} already processed, skipping`);
      return json({ status: "already_processed" });
    }

    if (!existingEvent) {
      const { error: insertErr } = await db.from("kiwify_events").insert({
        event_id: eventId, event_type: eventType, email: customerEmail, payload, processed: false,
      });
      if (insertErr) console.error("Failed to insert event:", insertErr);
    }

    if (!customerEmail) {
      const msg = "No customer email found in payload";
      console.error(msg);
      await db.from("kiwify_events").update({ processed: true, processed_at: new Date().toISOString(), error_log: msg }).eq("event_id", eventId);
      return json({ status: "error", message: msg });
    }

    const action = classifyEvent(eventType);
    console.log("Action:", action);

    if (action === "ignore") {
      await db.from("kiwify_events").update({ processed: true, processed_at: new Date().toISOString(), error_log: `Ignored: ${eventType}` }).eq("event_id", eventId);
      return json({ status: "ignored" });
    }

    // Find user
    const { data: profile } = await db.from("profiles").select("user_id, data_expiracao, status_assinatura, plano").eq("email", customerEmail).maybeSingle();
    const foundProfile = profile || (await db.from("profiles").select("user_id, data_expiracao, status_assinatura, plano").ilike("email", customerEmail).maybeSingle()).data;

    if (!foundProfile) {
      const msg = `No user found for email: ${customerEmail}`;
      console.error(msg);
      await db.from("kiwify_events").update({ processed: true, processed_at: new Date().toISOString(), error_log: msg }).eq("event_id", eventId);
      return json({ status: "error", message: "User not found" });
    }

    // ── ANTI OUT-OF-ORDER PROTECTION ──
    // Check if there's a MORE RECENT activation event already processed for this user
    // If so, skip cancel/revoke events that are older
    if (action === "cancel" || action === "revoke") {
      const { data: latestActivation } = await db
        .from("kiwify_events")
        .select("created_at")
        .eq("email", customerEmail)
        .eq("processed", true)
        .or("event_type.ilike.%paid%,event_type.ilike.%approved%,event_type.ilike.%renewed%,event_type.ilike.%purchased%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestActivation) {
        const latestActivationTime = new Date(latestActivation.created_at);
        if (eventTimestamp < latestActivationTime) {
          const msg = `Skipped stale ${action} event (timestamp ${eventTimestamp.toISOString()} < latest activation ${latestActivationTime.toISOString()})`;
          console.log(msg);
          await db.from("kiwify_events").update({ processed: true, processed_at: new Date().toISOString(), error_log: msg }).eq("event_id", eventId);
          return json({ status: "skipped_stale", message: msg });
        }
      }
    }

    // ── Process action ──
    const now = new Date();

    if (action === "activate") {
      // If user already has an active subscription with future expiration, extend from that date
      const currentExp = foundProfile.data_expiracao ? new Date(foundProfile.data_expiracao) : null;
      const baseDate = (currentExp && currentExp > now && foundProfile.status_assinatura === "active") ? currentExp : now;
      const newExpiration = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await db.from("profiles").update({
        plano: "premium", status_assinatura: "active", data_expiracao: newExpiration.toISOString(),
      }).eq("user_id", foundProfile.user_id);

      await db.from("subscriptions").upsert({
        user_id: foundProfile.user_id, kiwify_transaction_id: eventId, status: "active", plan_type: "premium",
        current_period_start: now.toISOString(), current_period_end: newExpiration.toISOString(), updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      console.log(`Premium ativado para: ${customerEmail} (expira: ${newExpiration.toISOString()})`);
    } else if (action === "cancel") {
      // Mark as canceled but DON'T remove expiration — user keeps access until period ends
      await db.from("profiles").update({ status_assinatura: "canceled" }).eq("user_id", foundProfile.user_id);
      await db.from("subscriptions").update({ status: "canceled", updated_at: now.toISOString() }).eq("user_id", foundProfile.user_id);
      console.log(`Assinatura cancelada para: ${customerEmail} (acesso mantido até expiração)`);
    } else if (action === "revoke") {
      // Refund/chargeback: immediate revocation
      await db.from("profiles").update({ plano: "free", status_assinatura: "canceled", data_expiracao: now.toISOString() }).eq("user_id", foundProfile.user_id);
      await db.from("subscriptions").update({ status: "expired", current_period_end: now.toISOString(), updated_at: now.toISOString() }).eq("user_id", foundProfile.user_id);
      console.log(`Acesso revogado para: ${customerEmail} (reembolso/chargeback)`);
    }

    await db.from("kiwify_events").update({ processed: true, processed_at: now.toISOString(), error_log: null }).eq("event_id", eventId);
    return json({ status: "ok", action });
  } catch (err) {
    console.error("Webhook error:", err);
    return json({ status: "error", message: "Internal server error" });
  }
});
