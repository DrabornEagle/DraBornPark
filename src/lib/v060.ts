import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/src/data';
import { supabase } from '@/src/lib/supabase';

export const DKD_PLUS_MONTHLY='drabornpark_plus_monthly';
export const DKD_PLUS_YEARLY='drabornpark_plus_yearly';
export const DKD_PLUS_PRODUCT_IDS=[DKD_PLUS_MONTHLY,DKD_PLUS_YEARLY] as const;

export function normalizePhoneE164(value:string){
  const clean=value.replace(/[\s()-]/g,'');
  if(!/^\+?[1-9]\d{7,14}$/.test(clean)) throw new Error('Telefon numarasını ülke koduyla gir. Örnek: +905551112233');
  return clean.startsWith('+')?clean:`+${clean}`;
}

export async function saveProfilePhone(value:string){
  const phone=normalizePhoneE164(value);
  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!userData.user)throw new Error('Oturum bulunamadı.');
  const {error}=await supabase.from('drabornpark_profiles').update({phone_e164:phone,updated_at:new Date().toISOString()}).eq('user_id',userData.user.id);
  if(error)throw error;
  return phone;
}

export async function createSupportRequestV060(subject:string,body:string){
  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!userData.user)throw new Error('Oturum bulunamadı.');
  const {data,error}=await supabase.from('drabornpark_support_requests').insert({owner_user_id:userData.user.id,subject:subject.trim(),body:body.trim(),status:'open'}).select('*').single();
  if(error)throw error;
  try{
    const {data:session}=await supabase.auth.getSession();
    const token=session.session?.access_token;
    if(token){
      await fetch(`${SUPABASE_URL}/functions/v1/drabornpark-support-notify-admin`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({supportRequestId:data.id})});
    }
  }catch(error){console.warn('[DraBornPark support notify]',String((error as any)?.message||error));}
  return data;
}

export async function isCurrentUserAdmin(){
  const {data,error}=await supabase.rpc('drabornpark_is_admin');
  if(error)return false;
  return Boolean(data);
}

export async function loadAdminSupportRequest(id:string){
  const {data,error}=await supabase.rpc('drabornpark_admin_support_request_dkd',{drabornpark_support_request_id:id});
  if(error)throw error;
  return data;
}

export async function loadAdminSupportInbox(limit=50){
  const {data,error}=await supabase.rpc('drabornpark_admin_support_inbox_dkd',{drabornpark_limit:limit});
  if(error)throw error;
  return Array.isArray(data)?data:[];
}

export async function markAdminSupportNotificationRead(id:string){
  const {error}=await supabase.rpc('drabornpark_mark_admin_notification_read_dkd',{drabornpark_support_request_id:id});
  if(error)throw error;
}

export async function setSupportRequestStatus(id:string,status:'open'|'in_progress'|'resolved'){
  const {data,error}=await supabase.from('drabornpark_support_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();
  if(error)throw error;
  return data;
}

export async function verifyGooglePlaySubscription(input:{productId:string;purchaseToken:string;basePlanId?:string|null}){
  const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
  if(sessionError)throw sessionError;
  const token=sessionData.session?.access_token;
  if(!token)throw new Error('Oturum bulunamadı.');
  const response=await fetch(`${SUPABASE_URL}/functions/v1/drabornpark-google-play-verify`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error==='google_play_service_account_not_configured'?'Google Play sunucu doğrulama anahtarı henüz yayın ortamına bağlanmadı.':payload?.error||'Google Play doğrulaması tamamlanamadı.');
  return payload;
}
