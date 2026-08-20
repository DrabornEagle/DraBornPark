export const SUPABASE_URL = 'https://xpdiwyxnnrmyvpcqwuyb.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_cu71JQGPiRusMw_YeZzUbg_6r9r13TG';
export const PUBLIC_CONTACT_URL = `${SUPABASE_URL}/functions/v1/drabornpark-public-contact`;

export type DemoPayload = {
  profile: { displayName: string; plan: string; trialDaysLeft: number };
  vehicle: { id: string; name: string; plate: string; brand: string; model: string; year: number; color: string; type: string; tagCode: string; tagStatus: string };
  lastPark: { placeName: string; floor: string; zoneColor: string; row: string; bay: string; latitude: number; longitude: number; parkedAt: string; photoHint: string };
  notifications: Array<{ id: string; category: string; title: string; body: string; priority: string; minutesAgo: number; seen: boolean }>;
  timeline: Array<{ type: string; title: string; detail: string; time: string }>;
  stats: { parksThisMonth: number; reportsThisMonth: number; averageParkMinutes: number; favoritePlace: string };
};

export const fallbackDemo: DemoPayload = {
  profile: { displayName: 'Draborn Eagle', plan: 'PLUS_TRIAL', trialDaysLeft: 14 },
  vehicle: { id: 'demo-vehicle-1', name: 'Volkswagen Tiguan', plate: '06 DBP 2026', brand: 'Volkswagen', model: 'Tiguan', year: 2025, color: 'Gece Mavisi', type: 'car', tagCode: 'DP-K7M4X2P9', tagStatus: 'ACTIVATED' },
  lastPark: { placeName: 'Metromall AVM', floor: 'P2', zoneColor: 'Mavi', row: 'C', bay: '128', latitude: 39.9357, longitude: 32.8063, parkedAt: '2026-08-20T00:32:00+03:00', photoHint: 'P2 Mavi C-128' },
  notifications: [
    { id: 'n1', category: 'Farlarınız açık', title: 'Farlarınız açık olabilir', body: 'Aracınız için yeni bir bildirim gönderildi.', priority: 'normal', minutesAgo: 5, seen: false },
    { id: 'n2', category: 'Aracı hareket ettir', title: 'Aracınızı hareket ettirmeniz isteniyor', body: 'Bir kullanıcı aracınızın başka bir aracın çıkışını engellediğini bildirdi.', priority: 'high', minutesAgo: 18, seen: true },
    { id: 'n3', category: 'Tanık Modu', title: 'Fotoğraflı olay bildirimi', body: 'Aracınızla ilgili bir olaya şahit olundu.', priority: 'normal', minutesAgo: 93, seen: true }
  ],
  timeline: [
    { type: 'PARKED', title: 'Park edildi', detail: 'Metromall AVM • P2 • Mavi • C128', time: '20 Ağustos 00:32' },
    { type: 'LIGHTS', title: 'Far açık bildirimi', detail: 'Bir kullanıcı farlarınızın açık olabileceğini bildirdi.', time: '19 Ağustos 23:58' },
    { type: 'PHOTO_REPORT', title: 'Fotoğraflı hasar bildirimi', detail: 'Sağ ön kapı bölgesi için fotoğraflı bildirim alındı.', time: '16 Ağustos 21:03' }
  ],
  stats: { parksThisMonth: 17, reportsThisMonth: 3, averageParkMinutes: 102, favoritePlace: 'Metromall AVM' }
};

export async function loadDemo(): Promise<DemoPayload> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/drabornpark_demo_scenarios?scenario_key=eq.default&select=payload`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` }
    });
    if (!response.ok) return fallbackDemo;
    const rows = await response.json();
    return rows?.[0]?.payload ?? fallbackDemo;
  } catch {
    return fallbackDemo;
  }
}
