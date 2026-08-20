import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const categories: Record<string, { title: string; body: string; priority: "normal" | "high" | "emergency" }> = {
  blocked_exit: { title: "Aracınızı hareket ettirmeniz isteniyor", body: "Bir kullanıcı aracınızın başka bir aracın çıkışını engellediğini bildirdi.", priority: "high" },
  move_vehicle: { title: "Aracınızı hareket ettirebilir misiniz?", body: "Aracınızın kısa süre içinde hareket ettirilmesi isteniyor.", priority: "normal" },
  lights_on: { title: "Farlarınız açık olabilir", body: "Aracınız için farların açık olabileceğine dair bildirim gönderildi.", priority: "normal" },
  window_open: { title: "Camınız açık olabilir", body: "Aracınızın camlarından birinin açık olabileceği bildirildi.", priority: "normal" },
  door_open: { title: "Kapınız açık olabilir", body: "Aracınızın kapılarından birinin açık olabileceği bildirildi.", priority: "high" },
  trunk_open: { title: "Bagajınız açık olabilir", body: "Aracınızın bagajının açık olabileceği bildirildi.", priority: "high" },
  damage: { title: "Aracınızda hasar fark edilmiş olabilir", body: "Aracınızla ilgili olası bir hasar bildirimi aldınız.", priority: "high" },
  suspicious: { title: "Şüpheli durum bildirimi", body: "Aracınızın çevresinde şüpheli bir durum olabileceği bildirildi.", priority: "high" },
  towing: { title: "Aracınız çekiliyor olabilir", body: "Aracınızın çekilmekte olabileceğine dair yüksek öncelikli bildirim geldi.", priority: "emergency" },
  animal: { title: "Araçta hayvan var", body: "Araçta bir hayvan bulunduğuna dair acil bildirim gönderildi.", priority: "emergency" },
  child: { title: "Araçta çocuk var", body: "Araçta bir çocuk bulunduğuna dair acil bildirim gönderildi.", priority: "emergency" },
  fire: { title: "Duman / yangın şüphesi", body: "Aracınızla ilgili duman veya yangın şüphesi bildirildi.", priority: "emergency" },
  forgotten_item: { title: "Eşya veya anahtar unutulmuş olabilir", body: "Aracınızda eşya veya anahtar unutulmuş olabileceği bildirildi.", priority: "normal" },
  witness: { title: "Bir olaya şahit olundu", body: "Aracınızla ilgili bir olaya şahit olan kullanıcı bildirim gönderdi.", priority: "high" },
  emergency: { title: "Acil durum bildirimi", body: "Aracınızla ilgili acil müdahale gerektirebilecek bir durum bildirildi.", priority: "emergency" },
  other: { title: "Yeni araç bildirimi", body: "DraBornPark üzerinden aracınızla ilgili yeni bir bildirim gönderildi.", priority: "normal" },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function normalizeTagCode(input: string) {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return cleaned.startsWith("DP-") ? cleaned : `DP-${cleaned}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeMessage(input?: string) {
  if (!input) return null;
  let value = input.trim().slice(0, 700);
  value = value.replace(/(?:\+?90\s*)?(?:0\s*)?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g, "[telefon numarası gizlendi]");
  value = value.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[e-posta gizlendi]");
  const abusive = /(amk|aq|orospu|siktir|piç|gerizekalı|salak|aptal|lan\b)/gi;
  if (abusive.test(value)) return "Araçla ilgili serbest mesaj DraBornPark güvenlik filtresi tarafından nötrleştirildi. Lütfen bildirimin kategorisini dikkate alın.";
  return value;
}

async function hitRateLimit(supabase: ReturnType<typeof createClient>, bucketKey: string) {
  const { data, error } = await supabase.rpc("drabornpark_hit_rate_limit", {
    drabornpark_bucket_key: bucketKey,
    drabornpark_limit: 6,
    drabornpark_window_seconds: 600,
    drabornpark_block_seconds: 1800,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return { blocked: Boolean(result?.blocked), retryAfter: Number(result?.retry_after ?? 0) };
}

function localClock(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { day: dayMap[map.weekday] ?? 1, time: `${map.hour ?? "00"}:${map.minute ?? "00"}` };
}

function ruleMatches(rule: any, currentDay: number, currentTime: string) {
  const days = Array.isArray(rule.days_of_week) ? rule.days_of_week.map(Number) : [];
  const start = String(rule.start_time ?? "00:00").slice(0, 5);
  const end = String(rule.end_time ?? "23:59").slice(0, 5);
  if (start <= end) return days.includes(currentDay) && currentTime >= start && currentTime <= end;
  if (currentTime >= start) return days.includes(currentDay);
  const previousDay = currentDay === 1 ? 7 : currentDay - 1;
  return currentTime <= end && days.includes(previousDay);
}

async function resolvePushRecipients(supabase: ReturnType<typeof createClient>, ownerUserId: string, vehicleId: string | null, priority: string) {
  const { data: profile } = await supabase.from("drabornpark_profiles").select("notification_settings").eq("user_id", ownerUserId).maybeSingle();
  const timeZone = String(profile?.notification_settings?.timezone || "Europe/Istanbul");
  let clock: { day: number; time: string };
  try { clock = localClock(timeZone); } catch { clock = localClock("Europe/Istanbul"); }

  let query = supabase.from("drabornpark_routing_rules")
    .select("id,vehicle_id,days_of_week,start_time,end_time,target_type,target_user_id,updated_at")
    .eq("owner_user_id", ownerUserId)
    .eq("is_enabled", true);
  if (vehicleId) query = query.or(`vehicle_id.is.null,vehicle_id.eq.${vehicleId}`);
  else query = query.is("vehicle_id", null);
  const { data: rules } = await query;
  const sorted = [...(rules ?? [])].sort((a: any, b: any) => {
    const exactA = vehicleId && a.vehicle_id === vehicleId ? 1 : 0;
    const exactB = vehicleId && b.vehicle_id === vehicleId ? 1 : 0;
    if (exactA !== exactB) return exactB - exactA;
    return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime();
  });
  const activeRule = sorted.find((rule: any) => ruleMatches(rule, clock.day, clock.time));
  let routedTarget = ownerUserId;
  if (activeRule?.target_type === "family" && activeRule.target_user_id) {
    const { data: family } = await supabase.from("drabornpark_family_members")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .eq("member_user_id", activeRule.target_user_id)
      .eq("status", "active")
      .eq("can_receive_notifications", true)
      .maybeSingle();
    if (family) routedTarget = activeRule.target_user_id;
  }
  const recipients = priority === "emergency" ? [ownerUserId, routedTarget] : [routedTarget];
  return { recipients: [...new Set(recipients)], routingRuleId: activeRule?.id ?? null, timeZone };
}

async function sendExpoPush(supabase: ReturnType<typeof createClient>, userIds: string[], title: string, body: string, reportId: string, priority: string) {
  if (!userIds.length) return;
  const { data: tokens } = await supabase.from("drabornpark_push_tokens").select("user_id,expo_push_token").in("user_id", userIds).eq("is_enabled", true);
  if (!tokens?.length) return;
  const messages = tokens.map((token: { user_id: string; expo_push_token: string }) => ({
    to: token.expo_push_token,
    title,
    body,
    sound: "default",
    priority: priority === "emergency" ? "high" : "default",
    data: { type: "drabornpark_report", reportId },
  }));
  try {
    await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(messages) });
  } catch (error) {
    console.error("DraBornPark push delivery error", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const payload = await req.json();
    const action = String(payload?.action ?? "lookup");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await sha256(ip);
    const userAgent = (req.headers.get("user-agent") || "unknown").slice(0, 400);

    if (action === "lookup") {
      const tagCode = normalizeTagCode(String(payload?.tagCode ?? ""));
      const { data: snapshot, error } = await supabase.rpc("drabornpark_public_tag_snapshot", { drabornpark_tag_code: tagCode });
      if (error) throw error;
      if (!snapshot) return json({ error: "tag_not_found" }, 404);
      const { data: tag } = await supabase.from("drabornpark_tags").select("id").eq("tag_code", tagCode).maybeSingle();
      if (tag?.id) await supabase.from("drabornpark_scan_events").insert({ tag_id: tag.id, ip_hash: ipHash, user_agent: userAgent, action: "lookup" });
      return json({ ok: true, snapshot, categories: Object.entries(categories).map(([key, value]) => ({ key, ...value })) });
    }

    if (action === "notify") {
      const tagCode = normalizeTagCode(String(payload?.tagCode ?? ""));
      const sessionKey = String(payload?.sessionKey ?? crypto.randomUUID()).slice(0, 100);
      const categoryKey = String(payload?.category ?? "other");
      const category = categories[categoryKey] ?? categories.other;
      const rate = await hitRateLimit(supabase, `${ipHash}:${tagCode}`);
      if (rate.blocked) return json({ error: "rate_limited", retryAfter: rate.retryAfter }, 429);

      const { data: tag } = await supabase.from("drabornpark_tags").select("id,vehicle_id,owner_user_id,status").eq("tag_code", tagCode).maybeSingle();
      if (!tag || tag.status !== "ACTIVATED" || !tag.owner_user_id) return json({ error: "tag_not_available" }, 404);

      const original = payload?.message ? String(payload.message).slice(0, 700) : null;
      const safe = sanitizeMessage(original) || category.body;
      const { data: report, error: reportError } = await supabase.from("drabornpark_reports").insert({
        tag_id: tag.id,
        vehicle_id: tag.vehicle_id,
        owner_user_id: tag.owner_user_id,
        category: categoryKey,
        priority: category.priority,
        message_original: original,
        message_safe: safe,
        sender_session_key: sessionKey,
        sender_ip_hash: ipHash,
        sender_user_agent: userAgent,
      }).select("id").single();
      if (reportError) throw reportError;

      const { data: session, error: sessionError } = await supabase.from("drabornpark_contact_sessions").insert({ report_id: report.id, tag_id: tag.id, owner_user_id: tag.owner_user_id }).select("public_token,expires_at").single();
      if (sessionError) throw sessionError;

      const routing = await resolvePushRecipients(supabase, tag.owner_user_id, tag.vehicle_id, category.priority);
      await supabase.from("drabornpark_scan_events").insert({ tag_id: tag.id, session_key: sessionKey, ip_hash: ipHash, user_agent: userAgent, action: "notify" });
      await supabase.from("drabornpark_timeline_events").insert({ owner_user_id: tag.owner_user_id, vehicle_id: tag.vehicle_id, event_type: "REPORT_RECEIVED", title: category.title, description: safe, metadata: { reportId: report.id, priority: category.priority, routingRuleId: routing.routingRuleId, routedRecipients: routing.recipients.length } });
      await sendExpoPush(supabase, routing.recipients, category.title, safe, report.id, category.priority);
      return json({ ok: true, reportId: report.id, sessionToken: session.public_token, expiresAt: session.expires_at, ownerMessage: "Bildirim DraBornPark yönlendirme kurallarına göre güvenli şekilde iletildi." }, 201);
    }

    if (action === "chat") {
      const token = String(payload?.sessionToken ?? "");
      const bodyOriginal = String(payload?.message ?? "").trim().slice(0, 700);
      if (!token || !bodyOriginal) return json({ error: "invalid_chat_payload" }, 400);
      const { data: session } = await supabase.from("drabornpark_contact_sessions").select("id,owner_user_id,status,expires_at,tag_id").eq("public_token", token).maybeSingle();
      if (!session || session.status !== "open" || new Date(session.expires_at) <= new Date()) return json({ error: "session_closed" }, 410);
      const rate = await hitRateLimit(supabase, `${ipHash}:chat:${token}`);
      if (rate.blocked) return json({ error: "rate_limited", retryAfter: rate.retryAfter }, 429);
      const bodySafe = sanitizeMessage(bodyOriginal) || "Mesaj güvenlik filtresi tarafından temizlendi.";
      await supabase.from("drabornpark_messages").insert({ session_id: session.id, sender_role: "visitor", body_original: bodyOriginal, body_safe: bodySafe });
      await supabase.from("drabornpark_contact_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", session.id);
      await supabase.from("drabornpark_scan_events").insert({ tag_id: session.tag_id, ip_hash: ipHash, user_agent: userAgent, action: "chat" });
      return json({ ok: true, message: bodySafe }, 201);
    }

    if (action === "status") {
      const token = String(payload?.sessionToken ?? "");
      const { data: session } = await supabase.from("drabornpark_contact_sessions").select("id,status,expires_at").eq("public_token", token).maybeSingle();
      if (!session) return json({ error: "session_not_found" }, 404);
      if (session.status !== "open" || new Date(session.expires_at) <= new Date()) return json({ error: "session_closed" }, 410);
      const { data: messages } = await supabase.from("drabornpark_messages").select("id,sender_role,body_safe,created_at").eq("session_id", session.id).order("created_at", { ascending: true }).limit(50);
      return json({ ok: true, status: session.status, expiresAt: session.expires_at, messages: messages ?? [] });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: "request_failed" }, 500);
  }
});
