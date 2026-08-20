import { supabase } from '@/src/lib/supabase';

export type SharedFamilyPark = {
  owner_user_id: string;
  owner_display_name: string;
  vehicle_id: string;
  vehicle_name: string;
  plate: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  floor_code: string | null;
  zone_color: string | null;
  row_code: string | null;
  bay_code: string | null;
  parked_at: string;
};

export async function loadSharedFamilyParks(): Promise<SharedFamilyPark[]> {
  const { data, error } = await supabase.rpc('drabornpark_family_shared_parks');
  if (error) throw error;
  return (data ?? []) as SharedFamilyPark[];
}
