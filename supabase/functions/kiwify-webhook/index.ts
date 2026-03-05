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

function extractEmail(payload: any): string | null {
  // Problem 2: Audit Kiwify email capture
  // Kiwify payload structure can vary, checking multiple locations
  const email = payload.order?.Customer?.email || 
                payload.Customer?.email || 
                payload.customer?.email || 
                payload.buyer?.email || 
                payload.email ||
                payload.customer_email;
  
  if (email) return String(email).toLowerCase().trim();
  return null;
}

function extractEventType(payload: any): string {
  return String(
    payload.order_status || payload.event_type || payload.type || payload.webhook_event_type || "unknown"
  ).toLowerCase();
}

function extractEventId(payload: any): string {
  return String(
    payload.order_id || payload.transaction_id || payload.subscription_id || payload.event_id ||
    `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  // Always respond 200 to Kiwify to prevent webhook blocking
  try {
    if (req.method === "GET") return json({ status: "ok" });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 200);

    const rawBody = await req.text();
    // Problem 8: Audit Logs - Webhook received
    console.log("--- WEBHOOK RECEBIDO ---");
    console.log("Raw payload:", rawBody);

    let payload: any;
    try { 
      payload = JSON.parse(rawBody); 
    } catch {
      console.error("ERRO: JSON inválido");
      return json({ error: "Invalid JSON" }, 200);
    }

    const customerEmail = extractEmail(payload);
    const eventType = extractEventType(payload);
    const eventId = extractEventId(payload);

    // Problem 8: Audit Logs - Event details
    console.log(`Evento: ${eventType}`);
    console.log(`Email do Cliente: ${customerEmail}`);
    console.log(`ID do Evento: ${eventId}`);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!customerEmail) {
      console.error("ERRO: Email não encontrado no payload Kiwify");
      return json({ status: "error", message: "Email not found" }, 200);
    }

    // Find user by email (using the unique index created in migration)
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("user_id, plano, email")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profileError) {
      // Problem 8: Audit Logs - DB Error
      console.error("ERRO DE BANCO (Busca Perfil):", profileError);
      return json({ status: "error", message: "Database error" }, 200);
    }

    if (!profile) {
      // Problem 8: Audit Logs - User not found
      console.warn(`AVISO: Email ${customerEmail} não existe no banco de dados.`);
      return json({ status: "error", message: "User not found" }, 200);
    }

    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(now.getDate() + 30); // Standard 30 days subscription

    let updateData: any = null;
    let actionLabel = "";

    // Problem 2: Audit Kiwify Events mapping
    const isApproved = ["order_approved", "order_paid", "paid", "approved", "paid_success"].includes(eventType) || eventType.includes("approved") || eventType.includes("paid");
    const isRefunded = ["order_refunded", "refunded", "refund", "chargeback"].includes(eventType) || eventType.includes("refund");

    if (isApproved) {
      updateData = {
        plano: "premium",
        status_assinatura: "active",
        data_expiracao: expirationDate.toISOString(),
        start_assinatura: now.toISOString(),
        updated_at: now.toISOString()
      };
      actionLabel = "ATIVANDO PREMIUM";
    } else if (isRefunded) {
      updateData = {
        plano: "free",
        status_assinatura: "canceled",
        data_expiracao: now.toISOString(), // Expire immediately on refund
        updated_at: now.toISOString()
      };
      actionLabel = "REVOGANDO PREMIUM (REEMBOLSO)";
    }

    if (updateData) {
      console.log(`${actionLabel} para: ${customerEmail}`);
      
      const { error: updateError } = await db
        .from("profiles")
        .update(updateData)
        .eq("user_id", profile.user_id);

      if (updateError) {
        // Problem 8: Audit Logs - DB Update Error
        console.error(`ERRO AO ATUALIZAR PERFIL (${customerEmail}):`, updateError);
        return json({ status: "error", message: "Update failed" }, 200);
      }

      // Sync with subscriptions table
      await db.from("subscriptions").upsert({
        user_id: profile.user_id,
        kiwify_transaction_id: eventId,
        status: updateData.status_assinatura,
        plan_type: updateData.plano,
        current_period_start: updateData.start_assinatura || now.toISOString(),
        current_period_end: updateData.data_expiracao || now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      // Problem 8: Audit Logs - Success result
      console.log(`SUCESSO: ${actionLabel} concluído para ${customerEmail}`);
    } else {
      console.log(`INFO: Evento '${eventType}' recebido mas ignorado (sem ação definida).`);
    }

    console.log("--- FIM DO WEBHOOK ---");
    return json({ status: "ok" });
  } catch (err) {
    // Problem 8: Audit Logs - Critical error
    console.error("ERRO CRÍTICO NO WEBHOOK:", err);
    return json({ status: "error", message: "Internal server error" }, 200);
  }
});
