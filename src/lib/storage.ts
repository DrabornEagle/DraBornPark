import { supabase } from '@/src/lib/supabase';

export async function uploadPrivateImage(uri: string, folder: 'parks' | 'tickets' | 'park-tickets' | 'reports') {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Oturum bulunamadı.');

  const response = await fetch(uri);
  if (!response.ok) throw new Error('Fotoğraf okunamadı.');
  const bytes = await response.arrayBuffer();
  const path = `${userData.user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('drabornpark-private').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createSignedPrivateUrl(path: string, seconds = 300) {
  const { data, error } = await supabase.storage.from('drabornpark-private').createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}
