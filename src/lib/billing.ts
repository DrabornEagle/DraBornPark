import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export const DKD_PLUS_PRODUCT_ID='drabornpark_plus';
export const DKD_PLUS_MONTHLY_BASE_PLAN='monthly';
export const DKD_PLUS_YEARLY_BASE_PLAN='yearly';
export const DKD_PLAY_PACKAGE='com.draborneagle.drabornpark';

export type DkdPlanKey='monthly'|'yearly';

export function dkdPurchaseToken(purchase:any){
  return String(purchase?.purchaseToken??purchase?.purchaseTokenAndroid??purchase?.token??purchase?.transactionReceipt??'').trim();
}

export async function verifyDkdGooglePurchase(purchase:any,plan:DkdPlanKey){
  if(Platform.OS!=='android')throw new Error('Google Play doğrulaması yalnızca Android satın alımlarında kullanılır.');
  const purchaseToken=dkdPurchaseToken(purchase);
  if(!purchaseToken)throw new Error('Google Play satın alma anahtarı alınamadı.');
  const {data,error}=await supabase.functions.invoke('drabornpark-billing',{body:{
    action:'verify_google',
    purchaseToken,
    productId:DKD_PLUS_PRODUCT_ID,
    basePlanId:plan==='yearly'?DKD_PLUS_YEARLY_BASE_PLAN:DKD_PLUS_MONTHLY_BASE_PLAN,
  }});
  if(error){
    const message=String((error as any)?.context?.body?.message||(error as any)?.message||'Satın alma doğrulanamadı.');
    throw new Error(message.includes('provider_not_configured')?'Google Play doğrulama anahtarı henüz sunucuya bağlanmadı.':message);
  }
  if(!data?.entitlement)throw new Error('Satın alma Google Play tarafından aktif abonelik olarak doğrulanamadı.');
  return data;
}
