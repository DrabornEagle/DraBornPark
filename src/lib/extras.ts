import { supabase } from '@/src/lib/supabase';

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Oturum bulunamadı.');
  return data.user.id;
}

export type NotificationSettings = {
  vehicleReports: boolean;
  emergencyReports: boolean;
  parkReminders: boolean;
  familyUpdates: boolean;
  serviceUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export const defaultNotificationSettings: NotificationSettings = {
  vehicleReports: true,
  emergencyReports: true,
  parkReminders: true,
  familyUpdates: true,
  serviceUpdates: true,
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '08:00',
};

export async function updateNotificationSettings(settings: NotificationSettings) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('drabornpark_profiles')
    .update({ notification_settings: settings })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function attachParkTicket(parkId: string, ticketPath: string) {
  const { data, error } = await supabase
    .from('drabornpark_parks')
    .update({ ticket_path: ticketPath })
    .eq('id', parkId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export type MonthlyInsights = {
  parks: number;
  reports: number;
  emergencyReports: number;
  averageParkMinutes: number;
  favoritePlace: string;
  activeDays: number;
};

export function calculateMonthlyInsights(parks: any[], reports: any[], now = new Date()): MonthlyInsights {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const monthParks = parks.filter(item => {
    const time = new Date(item.parked_at ?? item.parkedAt ?? 0).getTime();
    return time >= monthStart && time < nextMonth;
  });
  const monthReports = reports.filter(item => {
    const time = new Date(item.created_at ?? item.createdAt ?? 0).getTime();
    return time >= monthStart && time < nextMonth;
  });
  const placeCounts = new Map<string, number>();
  let totalMinutes = 0;
  let completed = 0;
  const days = new Set<string>();
  for (const item of monthParks) {
    const place = String(item.place_name ?? item.placeName ?? 'Kaydedilen konum');
    placeCounts.set(place, (placeCounts.get(place) ?? 0) + 1);
    const start = new Date(item.parked_at ?? item.parkedAt ?? 0).getTime();
    const endValue = item.ended_at ?? item.endedAt;
    if (endValue) {
      const end = new Date(endValue).getTime();
      if (end > start) { totalMinutes += (end - start) / 60000; completed += 1; }
    }
    if (Number.isFinite(start)) days.add(new Date(start).toISOString().slice(0,10));
  }
  const favoritePlace = [...placeCounts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'Henüz yok';
  return {
    parks: monthParks.length,
    reports: monthReports.length,
    emergencyReports: monthReports.filter(item => String(item.priority).toLowerCase() === 'emergency').length,
    averageParkMinutes: completed ? Math.round(totalMinutes / completed) : 0,
    favoritePlace,
    activeDays: days.size,
  };
}
