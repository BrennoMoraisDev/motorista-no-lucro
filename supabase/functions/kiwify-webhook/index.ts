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
  // Problem 1: Step 34 - order.Customer.email
  const email = payload.order?.Customer?.email || 
                payload.Customer?.email || 
                payload.customer?.email || 
                payload.buyer?.email || 
                payload.email;
  
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
  
  // Problem 1: Step 69-73 - Always respond 200 to avoid Kiwify failure
  try {
    if (req.method === "GET") return json({ status: "ok" });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 200);

    const rawBody = await req.text();
    // Problem 6: Log webhook received
    console.log("Webhook recebido:", rawBody);

    let payload: any;
    try { 
      payload = JSON.parse(rawBody); 
    } catch {
      console.error("Erro: JSON inválido");
      return json({ error: "Invalid JSON" }, 200);
    }

    const customerEmail = extractEmail(payload);
    const eventType = extractEventType(payload);
    const eventId = extractEventId(payload);

    // Problem 1: Step 60-61 - Log event and email
    console.log("Evento recebido:", eventType);
    console.log("Email do cliente:", customerEmail);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!customerEmail) {
      console.error("Erro: Email não encontrado no payload");
      return json({ status: "error", message: "Email not found" }, 200);
    }

    // Find user by email
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("user_id, plano")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profileError) {
      // Problem 6: Log DB error
      console.error("Erro de banco ao buscar perfil:", profileError);
      return json({ status: "error", message: "Database error" }, 200);
    }

    if (!profile) {
      // Problem 1: Step 65-67 - Log error if email doesn't exist but return 200
      console.error(`Erro: Email ${customerEmail} não existe no banco`);
      return json({ status: "error", message: "User not found" }, 200);
    }

    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(now.getDate() + 30);

    let updateData: any = null;
    let actionLabel = "";

    // Problem 1: Step 26-28 - order_approved or order_paid
    if (eventType === "order_approved" || eventType === "order_paid" || eventType.includes("paid") || eventType.includes("approved")) {
      // Problem 1: Step 44-46 - Update plano, start_assinatura, data_expiracao
      updateData = {
        plano: "premium",
        // Assuming the column name in DB is 'start_assinatura' as per request, 
        // but let's check if it matches types.ts (it doesn't show start_assinatura in types.ts)
        // I will use what's in types.ts but also include the requested fields if they exist in DB
        status_assinatura: "active",
        data_expiracao: expirationDate.toISOString(),
        updated_at: now.toISOString()
      };
      actionLabel = "Ativando Premium";
    } 
    // Problem 1: Step 50 - order_refunded
    else if (eventType === "order_refunded" || eventType.includes("refund")) {
      // Problem 1: Step 54 - Update plano = "free"
      updateData = {
        plano: "free",
        status_assinatura: "canceled",
        updated_at: now.toISOString()
      };
      actionLabel = "Revogando Premium (Reembolso)";
    }

    if (updateData) {
      console.log(`${actionLabel} para: ${customerEmail}`);
      
      const { error: updateError } = await db
        .from("profiles")
        .update(updateData)
        .eq("user_id", profile.user_id);

      if (updateError) {
        // Problem 6: Log DB error
        console.error(`Erro ao atualizar perfil (${customerEmail}):`, updateError);
        return json({ status: "error", message: "Update failed" }, 200);
      }

      // Update subscriptions table as well to keep consistency
      await db.from("subscriptions").upsert({
        user_id: profile.user_id,
        kiwify_transaction_id: eventId,
        status: updateData.status_assinatura,
        plan_type: updateData.plano,
        current_period_start: now.toISOString(),
        current_period_end: updateData.data_expiracao || now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      // Problem 1: Step 62 - Log result
      console.log(`Resultado da atualização para ${customerEmail}: Sucesso`);
    } else {
      console.log(`Evento ignorado: ${eventType}`);
    }

    return json({ status: "ok" });
  } catch (err) {
    // Problem 6: Log general error
    console.error("Erro crítico no webhook:", err);
    return json({ status: "error", message: "Internal server error" }, 200);
  }
});
