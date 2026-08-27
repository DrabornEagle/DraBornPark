import fs from 'node:fs';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(dkd_file,dkd_text);
const dkd_replace_required=(dkd_text,dkd_from,dkd_to,dkd_label)=>{
  if(dkd_text.includes(dkd_to))return dkd_text;
  if(!dkd_text.includes(dkd_from))throw new Error(`v1.0.22 dönüşümü için desen bulunamadı: ${dkd_label}`);
  return dkd_text.replace(dkd_from,dkd_to);
};

const dkd_google_file='supabase/functions/dkd-drabornpark-google-play/index.ts';
let dkd_google=dkd_read(dkd_google_file);
dkd_google=dkd_replace_required(dkd_google,'const VERSION="1.0.21";','const VERSION="1.0.22";','Google Play Edge Function version');

const dkd_bonus_start='const {data:previousUserSubscription}=await adminDb.from("drabornpark_subscriptions").select("raw_provider_state").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();';
const dkd_bonus_end=';const previousWasGoogleEntitled=';
if(dkd_google.includes(dkd_bonus_start)){
  const dkd_start_index=dkd_google.indexOf(dkd_bonus_start);
  const dkd_end_index=dkd_google.indexOf(dkd_bonus_end,dkd_start_index);
  if(dkd_end_index<0)throw new Error('v1.0.22 deneme bonusu dönüşüm sonu bulunamadı');
  const dkd_new_bonus='const nowMs=Date.now();const purchaseStartMs=google?.startTime?Date.parse(String(google.startTime)):nowMs;const existingV122Bonus=Number((existing as any)?.raw_provider_state?.dkd_v122?.trialBonusMs);const trialUntilMs=profile?.plus_trial_until?Date.parse(profile.plus_trial_until):0;const dkdDayMs=24*60*60*1000;const dkdRemainingTrialMs=Math.max(0,trialUntilMs-purchaseStartMs);const calculatedTrialDays=Math.min(14,dkdRemainingTrialMs>0?Math.ceil(dkdRemainingTrialMs/dkdDayMs):0);const calculatedBonus=calculatedTrialDays*dkdDayMs;const dkdHasV122Bonus=Boolean(existing)&&Number.isFinite(existingV122Bonus)&&existingV122Bonus>=0;const trialBonusMs=dkdHasV122Bonus?existingV122Bonus:calculatedBonus;const trialBonusDays=Math.round(trialBonusMs/dkdDayMs);const trialBonusSource=dkdHasV122Bonus?"same_purchase_token":"current_purchase_trial_snapshot"';
  dkd_google=dkd_google.slice(0,dkd_start_index)+dkd_new_bonus+dkd_google.slice(dkd_end_index);
}

dkd_google=dkd_google.replace('const previousWasGoogleEntitled=Boolean((existing as any)?.raw_provider_state?.dkd_v120?.wasGoogleEntitled||(existing as any)?.raw_provider_state?.dkd_v119?.wasGoogleEntitled||(existing as any)?.raw_provider_state?.dkd_v115?.wasGoogleEntitled);','const previousWasGoogleEntitled=Boolean((existing as any)?.raw_provider_state?.dkd_v122?.wasGoogleEntitled||(existing as any)?.raw_provider_state?.dkd_v120?.wasGoogleEntitled||(existing as any)?.raw_provider_state?.dkd_v119?.wasGoogleEntitled||(existing as any)?.raw_provider_state?.dkd_v115?.wasGoogleEntitled);');

const dkd_old_state='dkd_v120:{googleExpiry,purchaseStartTime:google?.startTime??null,trialBonusMs,effectiveExpiry,wasGoogleEntitled,refunded,refundOrderId:dkdRefund.orderId}';
const dkd_new_state='dkd_v122:{googleExpiry,purchaseStartTime:google?.startTime??null,trialBonusMs,trialBonusDays,trialBonusSource,effectiveExpiry,wasGoogleEntitled,refunded,refundOrderId:dkdRefund.orderId},dkd_v120:{googleExpiry,purchaseStartTime:google?.startTime??null,trialBonusMs,effectiveExpiry,wasGoogleEntitled,refunded,refundOrderId:dkdRefund.orderId}';
dkd_google=dkd_replace_required(dkd_google,dkd_old_state,dkd_new_state,'v1.0.22 billing audit state');
dkd_google=dkd_replace_required(dkd_google,'trialBonusMs,autoRenewing:refunded?false:autoRenewing','trialBonusMs,trialBonusDays,trialBonusSource,autoRenewing:refunded?false:autoRenewing','v1.0.22 billing response');
dkd_write(dkd_google_file,dkd_google);

const dkd_plus_file='src/components/DraBornParkPlusPanel.tsx';
let dkd_plus=dkd_read(dkd_plus_file);
dkd_plus=dkd_replace_required(dkd_plus,'const dkdRemainingDays=dkdRemainingMs>0?Math.ceil(dkdRemainingMs/86400000):0;','const dkdRemainingDays=dkdRemainingMs>0?Math.max(1,dkdPaidPremium?Math.floor(dkdRemainingMs/86400000):Math.ceil(dkdRemainingMs/86400000)):0;','premium countdown day rounding');
const dkd_old_owned="const dkdOwnedAutoRenew=lastVerified?.autoRenewing??data?.subscription?.auto_renewing;const dkdOwnedExpiryText=dkdEntitlementExpiry?dkdEntitlementExpiry.toLocaleDateString('tr-TR'):'—';const dkdOwnedPopupBody=`${dkdOwnedPlan} Google Play tarafından doğrulandı. ${dkdOwnedAutoRenew===false?'Otomatik yenileme kapalı.':'Otomatik yenileme açık.'} Mevcut erişim bitiş tarihi: ${dkdOwnedExpiryText}. İade veya revoke gerçekleşirse DraBornPark+ güvenli sunucu doğrulamasında anında kapatılır.`;";
const dkd_new_owned="const dkdOwnedAutoRenew=lastVerified?.autoRenewing??data?.subscription?.auto_renewing;const dkdOwnedExpiryText=dkdEntitlementExpiry?dkdEntitlementExpiry.toLocaleDateString('tr-TR'):'—';const dkdOwnedGoogleExpiryRaw=lastVerified?.googleExpiresAt??data?.subscription?.raw_provider_state?.dkd_v122?.googleExpiry??data?.subscription?.raw_provider_state?.dkd_v120?.googleExpiry;const dkdOwnedGoogleExpiry=dkdOwnedGoogleExpiryRaw?new Date(dkdOwnedGoogleExpiryRaw):null;const dkdOwnedGoogleExpiryText=dkdOwnedGoogleExpiry&&!Number.isNaN(dkdOwnedGoogleExpiry.getTime())?dkdOwnedGoogleExpiry.toLocaleDateString('tr-TR'):'—';const dkdOwnedTrialBonusMs=Number(lastVerified?.trialBonusMs??data?.subscription?.raw_provider_state?.dkd_v122?.trialBonusMs??0);const dkdOwnedTrialBonusDays=Math.max(0,Number(lastVerified?.trialBonusDays??data?.subscription?.raw_provider_state?.dkd_v122?.trialBonusDays??Math.round(dkdOwnedTrialBonusMs/86400000))||0);const dkdOwnedPopupBody=`${dkdOwnedPlan} Google Play tarafından doğrulandı. ${dkdOwnedAutoRenew===false?'Otomatik yenileme kapalı.':'Otomatik yenileme açık.'} Google Play ücretli hak tarihi ${dkdOwnedGoogleExpiryText}. Satın alma anında kalan ${dkdOwnedTrialBonusDays} günlük etiket ödülün bu sürenin sonuna bir kez eklendi. DraBornPark+ erişim bitişin ${dkdOwnedExpiryText}. Aynı satın alma tekrar doğrulandığında ödül yeniden eklenmez.`;";
dkd_plus=dkd_replace_required(dkd_plus,dkd_old_owned,dkd_new_owned,'owned subscription popup details');

dkd_plus=dkd_replace_required(dkd_plus,"const product:any=subscriptions.find(item=>item.id===PRODUCT_ID);","useEffect(()=>{const dkd_plan=String(data?.subscription?.base_plan_id||'').toLowerCase();if(plus&&dkd_plan.includes('month'))setSelected('monthly');else if(plus&&dkd_plan.includes('year'))setSelected('yearly');},[plus,data?.subscription?.base_plan_id]);\n  const product:any=subscriptions.find(item=>item.id===PRODUCT_ID);",'owned plan initial selection');

dkd_plus=dkd_replace_required(dkd_plus,"<Text style={s.planFootText}>{plan.id==='yearly'?'Google Play fiyatına göre yıllık avantaj':'İstediğin zaman plan yönetimi'}</Text><MaterialCommunityIcons name={active?'radiobox-marked':'radiobox-blank'} size={21} color={active?palette.yellow:palette.muted2}/>","<Text style={s.planFootText}>{dkdPaidPremium&&dkdOwnedPlanCardId===plan.id?'SAHİP OLDUĞUN PLAN • Detayları gör':plan.id==='yearly'?'Google Play fiyatına göre yıllık avantaj':'İstediğin zaman plan yönetimi'}</Text><MaterialCommunityIcons name={dkdPaidPremium&&dkdOwnedPlanCardId===plan.id?'check-decagram':active?'radiobox-marked':'radiobox-blank'} size={21} color={dkdPaidPremium&&dkdOwnedPlanCardId===plan.id?palette.green:active?palette.yellow:palette.muted2}/>",'owned plan card badge');

dkd_plus=dkd_replace_required(dkd_plus,'chips={[dkdOwnedPlan,dkdOwnedAutoRenew===false?\'Yenileme kapalı\':\'Yenileme açık\',`Bitiş ${dkdOwnedExpiryText}`]}','chips={[dkdOwnedPlan,dkdOwnedAutoRenew===false?\'Yenileme kapalı\':\'Yenileme açık\',`Google Play ${dkdOwnedGoogleExpiryText}`,`Etiket ödülü +${dkdOwnedTrialBonusDays} gün`,`Toplam bitiş ${dkdOwnedExpiryText}`]}','owned popup chips');
dkd_write(dkd_plus_file,dkd_plus);

const dkd_version_file='supabase/functions/dkd-drabornpark-app-version/index.ts';
let dkd_version=dkd_read(dkd_version_file);
dkd_version=dkd_version.replace('const FALLBACK_VERSION="1.0.21";','const FALLBACK_VERSION="1.0.22";').replace('const FALLBACK_VERSION_CODE=21;','const FALLBACK_VERSION_CODE=22;');
dkd_write(dkd_version_file,dkd_version);

for(const dkd_file of ['app/index.tsx','app/hub.tsx','app/legal.tsx','app/factory.tsx','app/admin.tsx','src/components/MandatoryUpdateGate.tsx']){
  if(!fs.existsSync(dkd_file))continue;
  const dkd_text=dkd_read(dkd_file).replaceAll('v1.0.21','v1.0.22').replaceAll('1.0.21','1.0.22');
  dkd_write(dkd_file,dkd_text);
}

console.log('DraBornPark v1.0.22 billing, owned-plan popup and visible version fixes applied.');
