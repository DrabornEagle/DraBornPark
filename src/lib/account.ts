import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/src/data';
import { supabase } from '@/src/lib/supabase';

export const DRABORNPARK_WEB = 'https://draborneagle.com/DraBornPark';
export const PRIVACY_URL = `${DRABORNPARK_WEB}/privacy/`;
export const TERMS_URL = `${DRABORNPARK_WEB}/terms/`;
export const DATA_SAFETY_URL = `${DRABORNPARK_WEB}/data-safety/`;
export const ACCOUNT_DELETION_URL = `${DRABORNPARK_WEB}/account-deletion/`;
export const SUPPORT_URL = `${DRABORNPARK_WEB}/support/`;

export async function deleteDraBornParkAccount() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Aktif oturum bulunamadı.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/drabornpark-account-delete`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirm: true }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Hesap silinemedi.');
  await supabase.auth.signOut({ scope: 'local' });
  return payload;
}
