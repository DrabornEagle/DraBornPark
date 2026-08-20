import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });

async function removeStorage(service: any, userId: string) {
  const folders = ["parks", "park-tickets", "tickets", "reports"];
  const paths: string[] = [];
  for (const folder of folders) {
    const { data, error } = await service.storage.from("drabornpark-private").list(`${userId}/${folder}`, { limit: 1000 });
    if (error) throw error;
    for (const item of data ?? []) {
      if (item.name) paths.push(`${userId}/${folder}/${item.name}`);
    }
  }
  if (paths.length) {
    const { error } = await service.storage.from("drabornpark-private").remove(paths);
    if (error) throw error;
  }
}

async function idsFor(service: any, table: string, column: string, userId: string) {
  const { data, error } = await service.from(table).select("id").eq(column, userId);
  if (error) throw error;
  return (data ?? []).map((x: any) => x.id);
}

async function ensureOk(result: { error?: unknown }, step: string) {
  if (result.error) {
    console.error(`account_delete_step_failed:${step}`, result.error);
    throw result.error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const publishable = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!url || !serviceKey || !token) return json({ error: "server_configuration_error" }, 500);

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (payload?.confirm !== true) {
    return json({ error: "explicit_confirmation_required" }, 400);
  }

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publishable || serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "invalid_session" }, 401);

    const userId = userData.user.id;
    const tagIds = await idsFor(service, "drabornpark_tags", "owner_user_id", userId);
    const sessionIds = await idsFor(service, "drabornpark_contact_sessions", "owner_user_id", userId);

    await removeStorage(service, userId);

    if (sessionIds.length) {
      await ensureOk(await service.from("drabornpark_messages").delete().in("session_id", sessionIds), "session_messages");
    }
    await ensureOk(await service.from("drabornpark_messages").delete().eq("sender_user_id", userId), "user_messages");

    if (tagIds.length) {
      await ensureOk(await service.from("drabornpark_scan_events").delete().in("tag_id", tagIds), "tag_scan_events");
    }

    // Factory history belongs to the physical product, not to the account. Keep the
    // serial/tag audit trail but remove the deleted user's identity from that history.
    await ensureOk(await service.from("drabornpark_factory_events").update({ actor_user_id: null }).eq("actor_user_id", userId), "factory_actor_anonymize");

    await ensureOk(await service.from("drabornpark_contact_sessions").delete().eq("owner_user_id", userId), "contact_sessions");
    await ensureOk(await service.from("drabornpark_reports").delete().eq("owner_user_id", userId), "reports");
    await ensureOk(await service.from("drabornpark_family_members").delete().or(`owner_user_id.eq.${userId},member_user_id.eq.${userId}`), "family");
    await ensureOk(await service.from("drabornpark_guest_drivers").delete().or(`owner_user_id.eq.${userId},guest_user_id.eq.${userId}`), "guest_drivers");
    await ensureOk(await service.from("drabornpark_routing_rules").delete().or(`owner_user_id.eq.${userId},target_user_id.eq.${userId}`), "routing_rules");
    await ensureOk(await service.from("drabornpark_emergency_contacts").delete().or(`owner_user_id.eq.${userId},contact_user_id.eq.${userId}`), "emergency_contacts");
    await ensureOk(await service.from("drabornpark_parks").delete().eq("owner_user_id", userId), "parks");
    await ensureOk(await service.from("drabornpark_timeline_events").delete().eq("owner_user_id", userId), "timeline");
    await ensureOk(await service.from("drabornpark_vehicle_modes").delete().eq("owner_user_id", userId), "vehicle_modes");
    await ensureOk(await service.from("drabornpark_push_tokens").delete().eq("user_id", userId), "push_tokens");
    await ensureOk(await service.from("drabornpark_subscriptions").delete().eq("user_id", userId), "subscriptions");
    await ensureOk(await service.from("drabornpark_support_requests").delete().eq("owner_user_id", userId), "support_requests");

    // Preserve the immutable physical NFC/QR tag, serial number, manufacturing data,
    // activation PIN hash and factory audit. Remove all account/vehicle bindings so the
    // product can be activated again by its legitimate holder using the original PIN.
    if (tagIds.length) {
      await ensureOk(await service.from("drabornpark_tags").update({
        owner_user_id: null,
        vehicle_id: null,
        status: "SOLD",
        activated_at: null,
        last_verified_at: null,
        disabled_at: null,
        transfer_token_hash: null,
        transfer_started_at: null,
        transfer_expires_at: null,
        updated_at: new Date().toISOString(),
      }).in("id", tagIds), "physical_tag_detach");
    }

    await ensureOk(await service.from("drabornpark_vehicles").delete().eq("owner_user_id", userId), "vehicles");
    await ensureOk(await service.from("drabornpark_profiles").delete().eq("user_id", userId), "profile");

    const { error: authDeleteError } = await service.auth.admin.deleteUser(userId, false);
    if (authDeleteError) throw authDeleteError;

    return json({
      ok: true,
      deleted: true,
      physicalTagsPreserved: tagIds.length,
      message: "DraBornPark hesabı ve hesaba bağlı kişisel veriler kalıcı olarak silindi. Fiziksel etiket seri kayıtları kişisel bağlantılardan arındırılarak korundu.",
    });
  } catch (error) {
    console.error("account_delete_failed", error);
    return json({ error: "account_delete_failed" }, 500);
  }
});
