import { readLocalFileBytes } from '@/src/lib/localFile';
import { supabase } from '@/src/lib/supabase';

export type LiveDashboard = {
  userId: string;
  profile: any | null;
  vehicles: any[];
  tags: any[];
  parks: any[];
  reports: any[];
  timeline: any[];
  family: any[];
  guestDrivers: any[];
  vehicleModes: any[];
  routingRules: any[];
  emergencyContacts: any[];
  subscription: any | null;
};

export type ProfileAvatarAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Oturum bulunamadı.');
  return data.user.id;
}

export function hasPlusEntitlement(profile: any | null, subscription: any | null) {
  if (!profile) return false;
  if (profile.plus_trial_until && new Date(profile.plus_trial_until).getTime() > Date.now()) return true;
  const profileStatus=String(profile.subscription_status||'').toUpperCase();
  const subscriptionStatus=String(subscription?.status||'').toUpperCase();
  if (['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(subscriptionStatus)) return !subscription?.expires_at || new Date(subscription.expires_at).getTime()>Date.now();
  return ['PLUS_ACTIVE','PLUS_GRACE_PERIOD'].includes(profileStatus);
}

export async function isUsernameAvailable(username: string) {
  const normalized = username.trim().toLowerCase();
  const { data, error } = await supabase.rpc('drabornpark_username_available', {
    drabornpark_username: normalized,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function bootstrapProfile(displayName?: string, username?: string, avatarUrl?: string, phoneE164?: string) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const meta = user?.user_metadata ?? {};
  const resolvedUsername = (username ?? meta.username ?? displayName ?? meta.display_name ?? user?.email?.split('@')[0] ?? '').trim().toLowerCase() || null;
  const resolvedDisplay = displayName ?? meta.display_name ?? resolvedUsername ?? undefined;
  const { data, error } = await supabase.rpc('dkd_drabornpark_bootstrap_user_v054', {dkd_display_name:resolvedDisplay??null,dkd_username:resolvedUsername,dkd_avatar_url:avatarUrl??meta.avatar_url??null,dkd_phone_e164:phoneE164??meta.phone_e164??null});
  if (error) throw error;
  return data;
}

export async function updateProfile(input: { username?: string; avatarUrl?: string }) {
  const { data, error } = await supabase.rpc('drabornpark_update_profile', {
    drabornpark_username: input.username?.trim().toLowerCase() ?? null,
    drabornpark_avatar_url: input.avatarUrl ?? null,
  });
  if (error) throw error;
  return data;
}

export async function uploadProfileAvatar(asset: ProfileAvatarAsset) {
  const userId = await currentUserId();
  const mime = (asset.mimeType || 'image/jpeg').toLowerCase();
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const bytes = await readLocalFileBytes(asset.uri, 'Profil resmi okunamadı.');
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('drabornpark-avatars').upload(path, bytes, {
    contentType: mime,
    upsert: true,
    cacheControl: '3600',
  });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('drabornpark-avatars').getPublicUrl(path);
  const publicUrl = publicData.publicUrl;
  await updateProfile({ avatarUrl: publicUrl });
  return publicUrl;
}

export async function loadLiveDashboard(): Promise<LiveDashboard> {
  const userId = await currentUserId();
  const [
    profileRes,
    vehiclesRes,
    tagsRes,
    parksRes,
    reportsRes,
    timelineRes,
    familyRes,
    guestRes,
    modesRes,
    routingRes,
    emergencyRes,
    subscriptionRes,
  ] = await Promise.all([
    supabase.from('drabornpark_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('drabornpark_vehicles').select('*').eq('owner_user_id', userId).eq('is_active', true).order('created_at'),
    supabase.from('drabornpark_tags').select('id,tag_code,serial_number,nfc_url,status,vehicle_id,manufactured_at,sold_at,activated_at,disabled_at,transfer_expires_at').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_parks').select('*').eq('owner_user_id', userId).order('parked_at', { ascending: false }).limit(30),
    supabase.from('drabornpark_reports').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }).limit(40),
    supabase.from('drabornpark_timeline_events').select('*').eq('owner_user_id', userId).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('drabornpark_family_members').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_guest_drivers').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_vehicle_modes').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_routing_rules').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_emergency_contacts').select('*').eq('owner_user_id', userId).order('priority').order('created_at'),
    supabase.from('drabornpark_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const errors = [
    profileRes.error,
    vehiclesRes.error,
    tagsRes.error,
    parksRes.error,
    reportsRes.error,
    timelineRes.error,
    familyRes.error,
    guestRes.error,
    modesRes.error,
    routingRes.error,
    emergencyRes.error,
    subscriptionRes.error,
  ].filter(Boolean);
  if (errors.length) throw errors[0];

  return {
    userId,
    profile: profileRes.data,
    vehicles: vehiclesRes.data ?? [],
    tags: tagsRes.data ?? [],
    parks: parksRes.data ?? [],
    reports: reportsRes.data ?? [],
    timeline: timelineRes.data ?? [],
    family: familyRes.data ?? [],
    guestDrivers: guestRes.data ?? [],
    vehicleModes: modesRes.data ?? [],
    routingRules: routingRes.data ?? [],
    emergencyContacts: emergencyRes.data ?? [],
    subscription: subscriptionRes.data,
  };
}

export async function createVehicle(input: {
  vehicleName: string;
  plate?: string;
  brand?: string;
  model?: string;
  modelYear?: number | null;
  color?: string;
  vehicleType?: 'car' | 'motorcycle';
}) {
  const ownerUserId = await currentUserId();
  const { data, error } = await supabase.from('drabornpark_vehicles').insert({
    owner_user_id: ownerUserId,
    vehicle_name: input.vehicleName.trim() || 'Aracım',
    plate: input.plate?.trim().toUpperCase() || null,
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    model_year: input.modelYear || null,
    color: input.color?.trim() || null,
    vehicle_type: input.vehicleType ?? 'car',
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(vehicleId: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('drabornpark_vehicles').update(patch).eq('id', vehicleId).select('*').single();
  if (error) throw error;
  return data;
}

export async function savePark(input: {
  vehicleId: string;
  placeName?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  floorCode?: string;
  zoneName?: string;
  zoneColor?: string;
  rowCode?: string;
  bayCode?: string;
  note?: string;
  photoPath?: string | null;
  reminderMinutes?: number | null;
  source?: string;
}) {
  const { data, error } = await supabase.rpc('drabornpark_save_park', {
    drabornpark_vehicle_id: input.vehicleId,
    drabornpark_place_name: input.placeName ?? null,
    drabornpark_latitude: input.latitude ?? null,
    drabornpark_longitude: input.longitude ?? null,
    drabornpark_accuracy_meters: input.accuracyMeters ?? null,
    drabornpark_floor_code: input.floorCode ?? null,
    drabornpark_zone_name: input.zoneName ?? null,
    drabornpark_zone_color: input.zoneColor ?? null,
    drabornpark_row_code: input.rowCode ?? null,
    drabornpark_bay_code: input.bayCode ?? null,
    drabornpark_note: input.note ?? null,
    drabornpark_photo_path: input.photoPath ?? null,
    drabornpark_reminder_minutes: input.reminderMinutes ?? null,
    drabornpark_source: input.source ?? 'manual',
  });
  if (error) throw error;
  return data;
}

export async function endPark(vehicleId: string) {
  const { data, error } = await supabase.rpc('drabornpark_end_park', { drabornpark_vehicle_id: vehicleId });
  if (error) throw error;
  return Boolean(data);
}

export async function markReportSeen(reportId: string) {
  const { error } = await supabase.from('drabornpark_reports').update({ seen_at: new Date().toISOString(), status: 'seen' }).eq('id', reportId);
  if (error) throw error;
}

export async function quickReply(reportId: string, message: string) {
  const { data, error } = await supabase.rpc('drabornpark_owner_reply', {
    drabornpark_report_id: reportId,
    drabornpark_message: message,
  });
  if (error) throw error;
  return data;
}

export async function activateTag(tagCode: string, pin: string, vehicleId: string) {
  const { data, error } = await supabase.rpc('dkd_drabornpark_activate_tag_v054', {dkd_tag_code:tagCode.trim().toUpperCase(),dkd_pin:pin.trim(),dkd_vehicle_id:vehicleId});
  if (error) throw error;
  return data;
}

export async function startTagTransfer(tagId: string) {
  const { data, error } = await supabase.rpc('dkd_drabornpark_start_tag_transfer_v055', { dkd_tag_id: tagId });
  if (error) throw error;
  return data;
}

export async function claimTagTransfer(tagCode: string, transferCode: string, vehicleId: string) {
  const { data, error } = await supabase.rpc('dkd_drabornpark_claim_tag_transfer_v055', {
    dkd_tag_code: tagCode.trim().toUpperCase(),
    dkd_transfer_code: transferCode.trim().toUpperCase(),
    dkd_vehicle_id: vehicleId,
  });
  if (error) throw error;
  return data;
}

export async function resetTag(tagId: string, vehicleId?: string | null) {
  const { data, error } = await supabase.rpc('drabornpark_reset_tag', { drabornpark_tag_id: tagId, drabornpark_vehicle_id: vehicleId ?? null });
  if (error) throw error;
  return data;
}

export async function disableTag(tagId: string) {
  const { data, error } = await supabase.rpc('drabornpark_disable_tag', { drabornpark_tag_id: tagId });
  if (error) throw error;
  return Boolean(data);
}

export async function updatePrivacySettings(settings: Record<string, boolean>) {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('drabornpark_profiles').update({ privacy_settings: settings }).eq('user_id', userId).select('*').single();
  if (error) throw error;
  return data;
}

export async function addFamilyMember(input: { email: string; displayName?: string; canViewPark: boolean; canReceiveNotifications: boolean }) {
  const ownerUserId = await currentUserId();
  const { data, error } = await supabase.from('drabornpark_family_members').insert({
    owner_user_id: ownerUserId,
    invite_email: input.email.trim().toLowerCase(),
    display_name: input.displayName?.trim() || null,
    can_view_park: input.canViewPark,
    can_receive_notifications: input.canReceiveNotifications,
    status: 'invited',
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateFamilyMember(memberId: string, patch: { can_view_park?: boolean; can_receive_notifications?: boolean; display_name?: string }) {
  const { data, error } = await supabase.from('drabornpark_family_members').update(patch).eq('id', memberId).select('*').single();
  if (error) throw error;
  return data;
}

export async function removeFamilyMember(memberId: string) {
  const { error } = await supabase.from('drabornpark_family_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function addGuestDriver(input: { vehicleId: string; label: string; endsAt: string }) {
  const ownerUserId = await currentUserId();
  const { data, error } = await supabase.from('drabornpark_guest_drivers').insert({
    owner_user_id: ownerUserId,
    vehicle_id: input.vehicleId,
    guest_label: input.label.trim(),
    redirect_notifications: true,
    starts_at: new Date().toISOString(),
    ends_at: input.endsAt,
    status: 'active',
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function endGuestDriver(guestDriverId: string) {
  const { data, error } = await supabase.rpc('drabornpark_end_guest_driver', {
    drabornpark_guest_driver_id: guestDriverId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function startVehicleMode(input: {
  vehicleId: string;
  modeType: 'valet' | 'service';
  label?: string;
  durationMinutes: number;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.rpc('drabornpark_start_vehicle_mode', {
    drabornpark_vehicle_id: input.vehicleId,
    drabornpark_mode_type: input.modeType,
    drabornpark_label: input.label?.trim() || null,
    drabornpark_duration_minutes: input.durationMinutes,
    drabornpark_metadata: input.metadata ?? {},
  });
  if (error) throw error;
  return data;
}

export async function endVehicleMode(modeId: string) {
  const { data, error } = await supabase.rpc('drabornpark_end_vehicle_mode', {
    drabornpark_mode_id: modeId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function setServiceState(modeId: string, serviceState: 'in_service' | 'extra_work' | 'ready' | 'pickup', note?: string) {
  const { data, error } = await supabase.rpc('drabornpark_set_service_state', {
    drabornpark_mode_id: modeId,
    drabornpark_service_state: serviceState,
    drabornpark_note: note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function createRoutingRule(input: {
  vehicleId?: string | null;
  ruleName: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  targetType: 'owner' | 'family' | 'guest';
  targetUserId?: string | null;
}) {
  const { data, error } = await supabase.rpc('drabornpark_create_routing_rule', {
    drabornpark_vehicle_id: input.vehicleId ?? null,
    drabornpark_rule_name: input.ruleName.trim(),
    drabornpark_days_of_week: input.daysOfWeek,
    drabornpark_start_time: input.startTime,
    drabornpark_end_time: input.endTime,
    drabornpark_target_type: input.targetType,
    drabornpark_target_user_id: input.targetUserId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function setRoutingRuleEnabled(ruleId: string, enabled: boolean) {
  const { data, error } = await supabase.from('drabornpark_routing_rules').update({ is_enabled: enabled }).eq('id', ruleId).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteRoutingRule(ruleId: string) {
  const { data, error } = await supabase.rpc('drabornpark_delete_routing_rule', {
    drabornpark_rule_id: ruleId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function addEmergencyContact(input: { name: string; phone?: string; priority: number }) {
  const { data, error } = await supabase.rpc('drabornpark_add_emergency_contact', {
    drabornpark_contact_name: input.name.trim(),
    drabornpark_phone_e164: input.phone?.trim() || null,
    drabornpark_priority: input.priority,
  });
  if (error) throw error;
  return data;
}

export async function setEmergencyContactEnabled(contactId: string, enabled: boolean) {
  const { data, error } = await supabase.from('drabornpark_emergency_contacts').update({ is_enabled: enabled }).eq('id', contactId).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteEmergencyContact(contactId: string) {
  const { data, error } = await supabase.rpc('drabornpark_delete_emergency_contact', {
    drabornpark_contact_id: contactId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function createSupportRequest(subject: string, body: string) {
  const ownerUserId = await currentUserId();
  const { data, error } = await supabase.from('drabornpark_support_requests').insert({owner_user_id:ownerUserId,subject:subject.trim(),body:body.trim(),status:'open'}).select('*').single();
  if (error) throw error;
  void supabase.functions.invoke('dkd-drabornpark-admin-support-push',{body:{supportId:data.id}}).catch(()=>{});
  return data;
}
