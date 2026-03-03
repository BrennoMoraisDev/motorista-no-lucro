import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAILS = ["brennomoraisdev@gmail.com"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("NO_AUTH");

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await callerClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) throw new Error("INVALID_TOKEN");

  const email = data.claims.email as string;
  if (!ADMIN_EMAILS.includes(email)) throw new Error("NOT_ADMIN");

  return email;
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await verifyAdmin(req);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NOT_ADMIN") return json({ error: "Forbidden" }, 403);
    return json({ error: "Unauthorized" }, 401);
  }

  const db = getSupabaseAdmin();
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  try {
    // ─── LIST USERS ───
    if (action === "list-users" && req.method === "GET") {
      const search = url.searchParams.get("search") || "";
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;
      const offset = (page - 1) * perPage;

      let query = db.from("profiles").select("user_id, name, email, plano, status_assinatura, data_expiracao, photo_url, created_at", { count: "exact" });

      if (search) {
        const sanitized = search.slice(0, 100).replace(/[%_,\\()]/g, '');
        if (sanitized) {
          query = query.or(`email.ilike.%${sanitized}%,name.ilike.%${sanitized}%`);
        }
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + perPage - 1);

      if (error) throw error;
      return json({ users: data, total: count, page, perPage });
    }

    // ─── USER DETAILS ───
    if (action === "user-details" && req.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) return json({ error: "Missing userId" }, 400);

      const [profileRes, vehicleRes, settingsRes, sessionsRes, recordsRes] = await Promise.all([
        db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        db.from("vehicles").select("*").eq("user_id", userId).maybeSingle(),
        db.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
        db.from("shift_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        db.from("daily_records").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(10),
      ]);

      return json({
        profile: profileRes.data,
        vehicle: vehicleRes.data,
        settings: settingsRes.data,
        recentSessions: sessionsRes.data,
        recentRecords: recordsRes.data,
      });
    }

    // ─── ACTIVATE PREMIUM ───
    if (action === "activate-premium" && req.method === "POST") {
      const { userId, days = 30 } = await req.json();
      if (!userId) return json({ error: "Missing userId" }, 400);

      const now = new Date();
      const expDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      await db.from("profiles").update({
        plano: "premium",
        status_assinatura: "active",
        data_expiracao: expDate.toISOString(),
      }).eq("user_id", userId);

      await db.from("subscriptions").upsert({
        user_id: userId,
        status: "active",
        plan_type: "premium",
        current_period_start: now.toISOString(),
        current_period_end: expDate.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      console.log(`Admin activated premium for ${userId} – ${days} days`);
      return json({ status: "ok", expires: expDate.toISOString() });
    }

    // ─── DEACTIVATE USER ───
    if (action === "deactivate" && req.method === "POST") {
      const { userId, reason } = await req.json();
      if (!userId) return json({ error: "Missing userId" }, 400);

      const now = new Date();
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

      console.log(`Admin deactivated user ${userId}. Reason: ${reason || "N/A"}`);
      return json({ status: "ok" });
    }

    // ─── KIWIFY EVENTS ───
    if (action === "kiwify-events" && req.method === "GET") {
      const processed = url.searchParams.get("processed");
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;
      const offset = (page - 1) * perPage;

      let query = db.from("kiwify_events").select("*", { count: "exact" });

      if (processed === "true") query = query.eq("processed", true);
      else if (processed === "false") query = query.eq("processed", false);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + perPage - 1);

      if (error) throw error;
      return json({ events: data, total: count, page, perPage });
    }

    // ─── RETRY EVENT ───
    if (action === "retry-event" && req.method === "POST") {
      const { eventId } = await req.json();
      if (!eventId) return json({ error: "Missing eventId" }, 400);

      await db.from("kiwify_events").update({
        processed: false,
        processed_at: null,
        error_log: null,
      }).eq("id", eventId);

      // Re-fetch event to process
      const { data: evt } = await db.from("kiwify_events").select("*").eq("id", eventId).single();
      if (!evt) return json({ error: "Event not found" }, 404);

      // Inline reprocess logic
      const payload = evt.payload as Record<string, unknown>;
      const customerEmail =
        (payload.Customer as Record<string, unknown>)?.email ||
        (payload.customer as Record<string, unknown>)?.email ||
        payload.email ||
        (payload.buyer as Record<string, unknown>)?.email;

      if (!customerEmail) {
        await db.from("kiwify_events").update({ processed: true, error_log: "No email in payload" }).eq("id", eventId);
        return json({ status: "error", message: "No email in payload" });
      }

      const { data: profile } = await db.from("profiles").select("user_id").eq("email", customerEmail).maybeSingle();
      if (!profile) {
        await db.from("kiwify_events").update({ processed: true, error_log: `User not found: ${customerEmail}` }).eq("id", eventId);
        return json({ status: "error", message: "User not found" });
      }

      const eventType = (evt.event_type || "").toLowerCase();
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (eventType.includes("paid") || eventType.includes("approved") || eventType.includes("compra_aprovada") || eventType.includes("purchased") || eventType.includes("renewed") || eventType.includes("renovada")) {
        await db.from("profiles").update({ plano: "premium", status_assinatura: "active", data_expiracao: periodEnd.toISOString() }).eq("user_id", profile.user_id);
        await db.from("subscriptions").upsert({ user_id: profile.user_id, status: "active", plan_type: "premium", current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(), updated_at: now.toISOString() }, { onConflict: "user_id" });
      } else if (eventType.includes("canceled") || eventType.includes("cancelada")) {
        await db.from("profiles").update({ status_assinatura: "canceled" }).eq("user_id", profile.user_id);
        await db.from("subscriptions").update({ status: "canceled", updated_at: now.toISOString() }).eq("user_id", profile.user_id);
      } else if (eventType.includes("refund") || eventType.includes("reembolso") || eventType.includes("chargeback")) {
        await db.from("profiles").update({ plano: "free", status_assinatura: "canceled", data_expiracao: now.toISOString() }).eq("user_id", profile.user_id);
        await db.from("subscriptions").update({ status: "expired", current_period_end: now.toISOString(), updated_at: now.toISOString() }).eq("user_id", profile.user_id);
      }

      await db.from("kiwify_events").update({ processed: true, processed_at: now.toISOString(), error_log: null }).eq("id", eventId);
      return json({ status: "ok", reprocessed: true });
    }

    // ─── STATS ───
    if (action === "stats" && req.method === "GET") {
      const [usersRes, activeRes, trialRes, expiredRes, eventsRes, eventsTodayRes] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("profiles").select("id", { count: "exact", head: true }).eq("status_assinatura", "active"),
        db.from("profiles").select("id", { count: "exact", head: true }).eq("status_assinatura", "trial"),
        db.from("profiles").select("id", { count: "exact", head: true }).eq("plano", "free"),
        db.from("kiwify_events").select("id", { count: "exact", head: true }),
        db.from("kiwify_events").select("id", { count: "exact", head: true }).gte("created_at", new Date().toISOString().split("T")[0]),
      ]);

      return json({
        totalUsers: usersRes.count || 0,
        activeUsers: activeRes.count || 0,
        trialUsers: trialRes.count || 0,
        freeUsers: expiredRes.count || 0,
        totalEvents: eventsRes.count || 0,
        eventsToday: eventsTodayRes.count || 0,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Admin API error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
