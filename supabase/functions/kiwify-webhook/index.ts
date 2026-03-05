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

/** Extract customer email from various Kiwify payload formats */
function extractEmail(payload: Record<string, unknown>): string | null {
  // Kiwify uses "Customer" (capital C) in their standard payload
  const customer = (payload.Customer || payload.customer) as Record<string, unknown> | undefined;
  if (customer?.email) return String(customer.email).toLowerCase().trim();

  // Fallback: buyer object
  const buyer = payload.buyer as Record<string, unknown> | undefined;
  if (buyer?.email) return String(buyer.email).toLowerCase().trim();

  // Fallback: top-level email
  if (payload.email) return String(payload.email).toLowerCase().trim();

  // Fallback: nested in Subscription
  const subscription = (payload.Subscription || payload.subscription) as Record<string, unknown> | undefined;
  if (subscription?.customer) {
    const subCustomer = subscription.customer as Record<string, unknown>;
    if (subCustomer?.email) return String(subCustomer.email).toLowerCase().trim();
  }

  return null;
}

/** Extract event type from Kiwify payload */
function extractEventType(payload: Record<string, unknown>): string {
  // Kiwify sends order_status as the primary indicator
  return String(
    payload.order_status ||
    payload.event_type ||
    payload.type ||
    payload.webhook_event_type ||
    "unknown"
  ).toLowerCase();
}

/** Extract a unique event ID for idempotency */
function extractEventId(payload: Record<string, unknown>): string {
  return String(
    payload.order_id ||
    payload.transaction_id ||
    payload.subscription_id ||
    payload.event_id ||
    `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
}

/** Determine the action based on event type */
function classifyEvent(eventType: string): "activate" | "cancel" | "revoke" | "ignore" {
  if (
    eventType.includes("paid") ||
    eventType.includes("approved") ||
    eventType.includes("compra_aprovada") ||
    eventType.includes("subscription_purchased") ||
    eventType.includes("renewed") ||
    eventType.includes("assinatura_renovada") ||
    eventType === "order_approved"
  ) {
    return "activate";
  }

  if (
    eventType.includes("canceled") ||
    eventType.includes("assinatura_cancelada") ||
    eventType === "subscription_canceled"
  ) {
    return "cancel";
  }

  if (
    eventType.includes("refund") ||
    eventType.includes("reembolso") ||
    eventType.includes("chargeback") ||
    eventType === "order_refunded"
  ) {
    return "revoke";
  }

  return "ignore";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return json({ status: "ok" });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let rawBody: string | null = null;

  try {
    // Validate webhook token
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token") || "";
    const customTokenHeader = req.headers.get("x-webhook-token") || "";
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const token = queryToken || customTokenHeader || authHeader.replace("Bearer ", "").trim();
    const expectedToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");

    if (!expectedToken || token !== expectedToken) {
      console.error("Invalid webhook token received");
      return json({ error: "Unauthorized" }, 401);
    }

    // Read body
    rawBody = await req.text();
    console.log("Kiwify raw payload:", rawBody);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("Failed to parse JSON payload");
      return json({ error: "Invalid JSON" }, 400);
    }

    // Extract fields
    const customerEmail = extractEmail(payload);
    const eventType = extractEventType(payload);
    const eventId = extractEventId(payload);

    console.log("Evento recebido:", eventType);
    console.log("Email:", customerEmail);
    console.log("Event ID:", eventId);

    // Create service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ALWAYS save the event first, before any processing
    const { data: existingEvent } = await supabaseAdmin
      .from("kiwify_events")
      .select("id, processed")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent?.processed) {
      console.log(`Event ${eventId} already processed, skipping`);
      return json({ status: "already_processed" });
    }

    // Insert event if new
    if (!existingEvent) {
      const { error: insertError } = await supabaseAdmin.from("kiwify_events").insert({
        event_id: eventId,
        event_type: eventType,
        email: customerEmail,
        payload,
        processed: false,
      });
      if (insertError) {
        console.error("Failed to insert event:", insertError);
      }
    } else {
      // Update email if missing
      if (customerEmail) {
        await supabaseAdmin.from("kiwify_events")
          .update({ email: customerEmail })
          .eq("id", existingEvent.id);
      }
    }

    // Check email
    if (!customerEmail) {
      const errorMsg = "No customer email found in payload";
      console.error(errorMsg);
      await supabaseAdmin
        .from("kiwify_events")
        .update({ processed: true, processed_at: new Date().toISOString(), error_log: errorMsg })
        .eq("event_id", eventId);
      // Return 200 so Kiwify doesn't retry
      return json({ status: "error", message: errorMsg });
    }

    // Classify event
    const action = classifyEvent(eventType);
    console.log("Action classified:", action);

    if (action === "ignore") {
      console.log(`Unknown/ignored event type: ${eventType}`);
      await supabaseAdmin
        .from("kiwify_events")
        .update({ processed: true, processed_at: new Date().toISOString(), error_log: `Ignored event type: ${eventType}` })
        .eq("event_id", eventId);
      return json({ status: "ignored" });
    }

    // Find user by email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (!profile) {
      // Try case-insensitive search
      const { data: profileCI } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("email", customerEmail)
        .maybeSingle();

      if (!profileCI) {
        const errorMsg = `No user found for email: ${customerEmail}`;
        console.error(errorMsg);
        await supabaseAdmin
          .from("kiwify_events")
          .update({ processed: true, processed_at: new Date().toISOString(), error_log: errorMsg })
          .eq("event_id", eventId);
        return json({ status: "error", message: "User not found" });
      }

      // Use case-insensitive match
      return await processAction(supabaseAdmin, action, profileCI.user_id, eventId, customerEmail);
    }

    return await processAction(supabaseAdmin, action, profile.user_id, eventId, customerEmail);
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to avoid Kiwify retrying on server errors
    return json({ status: "error", message: "Internal server error" });
  }
});

async function processAction(
  db: ReturnType<typeof createClient>,
  action: "activate" | "cancel" | "revoke",
  userId: string,
  eventId: string,
  email: string
) {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    if (action === "activate") {
      await db.from("profiles").update({
        plano: "premium",
        status_assinatura: "active",
        data_expiracao: periodEnd.toISOString(),
      }).eq("user_id", userId);

      await db.from("subscriptions").upsert({
        user_id: userId,
        kiwify_transaction_id: eventId,
        status: "active",
        plan_type: "premium",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      console.log(`Premium ativado para: ${email} (user: ${userId})`);
    } else if (action === "cancel") {
      await db.from("profiles").update({
        status_assinatura: "canceled",
      }).eq("user_id", userId);

      await db.from("subscriptions").update({
        status: "canceled",
        updated_at: now.toISOString(),
      }).eq("user_id", userId);

      console.log(`Assinatura cancelada para: ${email}`);
    } else if (action === "revoke") {
      await db.from("profiles").update({
        plano: "free",
        status_assinatura: "canceled",
        data_expiracao: now.toISOString(),
      }).eq("user_id", userId);

      await db.from("subscriptions").update({
        status: "expired",
        current_period_end: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq("user_id", userId);

      console.log(`Acesso revogado para: ${email} (reembolso/chargeback)`);
    }

    // Mark as processed successfully
    await db.from("kiwify_events").update({
      processed: true,
      processed_at: now.toISOString(),
      error_log: null,
    }).eq("event_id", eventId);

    return json({ status: "ok", action });
  } catch (err) {
    const errorMsg = `Processing error: ${(err as Error).message}`;
    console.error(errorMsg);
    await db.from("kiwify_events").update({
      processed: true,
      processed_at: now.toISOString(),
      error_log: errorMsg,
    }).eq("event_id", eventId);
    return json({ status: "error", message: errorMsg });
  }
}
