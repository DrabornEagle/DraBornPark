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
  subscription: any | null;
};

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Oturum bulunamadı.');
  return data.user.id;
}

export async function bootstrapProfile(displayName?: string) {
  const { data, error } = await supabase.rpc('drabornpark_bootstrap_user', {
    drabornpark_display_name: displayName ?? null,
  });
  if (error) throw error;
  return data;
}

export async function loadLiveDashboard(): Promise<LiveDashboard> {
  const userId = await currentUserId();
  const [profileRes, vehiclesRes, tagsRes, parksRes, reportsRes, timelineRes, familyRes, guestRes, subscriptionRes] = await Promise.all([
    supabase.from('drabornpark_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('drabornpark_vehicles').select('*').eq('owner_user_id', userId).eq('is_active', true).order('created_at'),
    supabase.from('drabornpark_tags').select('id,tag_code,serial_number,nfc_url,status,vehicle_id,manufactured_at,sold_at,activated_at,disabled_at,transfer_expires_at').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_parks').select('*').eq('owner_user_id', userId).order('parked_at', { ascending: false }).limit(30),
    supabase.from('drabornpark_reports').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }).limit(40),
    supabase.from('drabornpark_timeline_events').select('*').eq('owner_user_id', userId).order('occurred_at', { ascending: false }).limit(50),
    supabase.from('drabornpark_family_members').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_guest_drivers').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('drabornpark_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const errors = [profileRes.error, vehiclesRes.error, tagsRes.error, parksRes.error, reportsRes.error, timelineRes.error, familyRes.error, guestRes.error, subscriptionRes.error].filter(Boolean);
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
  const { data, error } = await supabase.rpc('drabornpark_activate_tag', {
    drabornpark_tag_code: tagCode.trim().toUpperCase(),
    drabornpark_pin: pin.trim(),
    drabornpark_vehicle_id: vehicleId,
  });
  if (error) throw error;
  return data;
}

export async function startTagTransfer(tagId: string) {
  const { data, error } = await supabase.rpc('drabornpark_start_tag_transfer', { drabornpark_tag_id: tagId });
  if (error) throw error;
  return data;
}

export async function claimTagTransfer(tagCode: string, transferCode: string, vehicleId: string) {
  const { data, error } = await supabase.rpc('drabornpark_claim_tag_transfer', {
    drabornpark_tag_code: tagCode.trim().toUpperCase(),
    drabornpark_transfer_code: transferCode.trim().toUpperCase(),
    drabornpark_vehicle_id: vehicleId,
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

export async function createSupportRequest(subject: string, body: string) {
  const ownerUserId = await currentUserId();
  const { data, error } = await supabase.from('drabornpark_support_requests').insert({
    owner_user_id: ownerUserId,
    subject: subject.trim(),
    body: body.trim(),
    status: 'open',
  }).select('*').single();
  if (error) throw error;
  return data;
}
