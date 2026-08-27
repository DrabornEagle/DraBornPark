import fs from 'node:fs';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(dkd_file,dkd_text);
const dkd_require=(dkd_ok,dkd_label)=>{if(!dkd_ok)throw new Error(`DraBornPark v1.0.20 marker missing: ${dkd_label}`)};

// Release metadata.
const dkd_app=JSON.parse(dkd_read('app.json'));
dkd_app.expo.version='1.0.20';
dkd_app.expo.android.versionCode=20;
dkd_write('app.json',JSON.stringify(dkd_app,null,2)+'\n');
for(const dkd_file of ['app/index.tsx','app/hub.tsx','app/legal.tsx','app/factory.tsx']){
  if(!fs.existsSync(dkd_file))continue;
  let dkd_text=dkd_read(dkd_file).replace(/v1\.0\.19/g,'v1.0.20');
  if(dkd_file==='app/legal.tsx')dkd_text=dkd_text.replace(/Son güncelleme: [^<]+/,'Son güncelleme: 27 Ağustos 2026 • v1.0.20');
  dkd_write(dkd_file,dkd_text);
}

// Admin version cards.
let dkd_admin=dkd_read('app/admin.tsx');
dkd_admin=dkd_admin.replace("const DKD_FALLBACK_LATEST_VERSION='1.0.19';","const DKD_FALLBACK_LATEST_VERSION='1.0.20';");
dkd_admin=dkd_admin.replace('const DKD_FALLBACK_LATEST_VERSION_CODE=19;','const DKD_FALLBACK_LATEST_VERSION_CODE=20;');
dkd_admin=dkd_admin.replace('const [dkdMinimum,setDkdMinimum]=useState(18);','const [dkdMinimum,setDkdMinimum]=useState(19);');
dkd_write('app/admin.tsx',dkd_admin);

// App version edge fallback.
let dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');
dkd_version=dkd_version.replace(/FALLBACK_VERSION="1\.0\.19"/g,'FALLBACK_VERSION="1.0.20"').replace(/FALLBACK_VERSION_CODE=19/g,'FALLBACK_VERSION_CODE=20').replace(/FALLBACK_PREVIOUS_VERSION_CODE=18/g,'FALLBACK_PREVIOUS_VERSION_CODE=19');
dkd_write('supabase/functions/dkd-drabornpark-app-version/index.ts',dkd_version);

// Google Play verifier: a full refund must revoke DraBornPark+ immediately, even when Play's subscription state still has a future expiry.
let dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
dkd_google=dkd_google.replace('const VERSION="1.0.19";','const VERSION="1.0.20";');
if(!dkd_google.includes('async function getGoogleOrder(')){
  dkd_google=dkd_google.replace(
    'async function getGoogleSubscription(accessToken:string,purchaseToken:string){const endpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"}});const payload=await response.json().catch(()=>({}));return{response,payload};}',
    'async function getGoogleSubscription(accessToken:string,purchaseToken:string){const endpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"}});const payload=await response.json().catch(()=>({}));return{response,payload};}\nasync function getGoogleOrder(accessToken:string,orderId:string){const endpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/orders/${encodeURIComponent(orderId)}`;const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"}});const payload=await response.json().catch(()=>({}));return{response,payload};}\nasync function findFullRefund(accessToken:string,lines:any[],google:any){const dkd_ids=[...new Set(lines.map((dkd_item:any)=>String(dkd_item?.latestSuccessfulOrderId||"")).filter(Boolean))] as string[];if(!dkd_ids.length&&google?.latestOrderId)dkd_ids.push(String(google.latestOrderId));for(const dkd_order_id of dkd_ids){const dkd_order=await getGoogleOrder(accessToken,dkd_order_id);if(!dkd_order.response.ok){console.warn("[DraBornPark Play order]",dkd_order_id,dkd_order.response.status);continue;}const dkd_refund=dkd_order.payload?.orderHistory?.refundEvent;if(dkd_refund)return{refunded:true,orderId:dkd_order_id,event:dkd_refund};}return{refunded:false,orderId:null,event:null};}'
  );
}
const dkd_refund_anchor='const googleExpiry=line?.expiryTime?String(line.expiryTime):null;const googleExpiryMs=googleExpiry?Date.parse(googleExpiry):0;const state=String(google?.subscriptionState??"");const mapped=mapState(state,googleExpiry);const cancelReason=cancellationReason(google);const autoRenewing=Boolean(line?.autoRenewingPlan?.autoRenewEnabled);';
if(!dkd_google.includes('const dkdRefund=await findFullRefund')){
  dkd_google=dkd_google.replace(dkd_refund_anchor,dkd_refund_anchor+'const dkdRefund=await findFullRefund(accessToken,lines,google);const refunded=Boolean(dkdRefund.refunded);');
}
dkd_google=dkd_google.replace(
  'const effectiveExpiryMs=Number.isFinite(googleExpiryMs)&&googleExpiryMs>0?googleExpiryMs+trialBonusMs:0;const safeExpiredBonusTail=state==="SUBSCRIPTION_STATE_EXPIRED"&&previousWasGoogleEntitled&&!['+"'SYSTEM','DEVELOPER','REPLACEMENT'"+'].includes(cancelReason)&&trialBonusMs>0&&effectiveExpiryMs>nowMs;const effectiveEntitled=mapped.entitled||safeExpiredBonusTail;const effectiveStatus=mapped.entitled?mapped.status:(safeExpiredBonusTail?"PLUS_CANCELLED":"PLUS_EXPIRED");const effectiveExpiry=effectiveExpiryMs>0?new Date(effectiveExpiryMs).toISOString():googleExpiry;',
  'const effectiveExpiryMs=Number.isFinite(googleExpiryMs)&&googleExpiryMs>0?googleExpiryMs+trialBonusMs:0;const safeExpiredBonusTail=!refunded&&state==="SUBSCRIPTION_STATE_EXPIRED"&&previousWasGoogleEntitled&&!['+"'SYSTEM','DEVELOPER','REPLACEMENT'"+'].includes(cancelReason)&&trialBonusMs>0&&effectiveExpiryMs>nowMs;const effectiveEntitled=!refunded&&(mapped.entitled||safeExpiredBonusTail);const effectiveStatus=refunded?"PLUS_EXPIRED":(mapped.entitled?mapped.status:(safeExpiredBonusTail?"PLUS_CANCELLED":"PLUS_EXPIRED"));const effectiveExpiry=refunded?new Date(nowMs).toISOString():(effectiveExpiryMs>0?new Date(effectiveExpiryMs).toISOString():googleExpiry);'
);
if(!dkd_google.includes('refundOrderId:dkdRefund.orderId')){
  dkd_google=dkd_google.replace('cancelReason,externalAccountMatched,dkd_v119:{googleExpiry,purchaseStartTime:google?.startTime??null,trialBonusMs,effectiveExpiry,wasGoogleEntitled}', 'cancelReason,externalAccountMatched,refunded,refundOrderId:dkdRefund.orderId,refundEvent:dkdRefund.event,dkd_v120:{googleExpiry,purchaseStartTime:google?.startTime??null,trialBonusMs,effectiveExpiry,wasGoogleEntitled,refunded,refundOrderId:dkdRefund.orderId}');
}
dkd_google=dkd_google.replace('return json({ok:true,version:VERSION,entitled:effectiveEntitled,status:effectiveStatus,profileStatus,productId:PRODUCT_ID,basePlanId,expiresAt:effectiveExpiry,googleExpiresAt:googleExpiry,trialBonusMs,autoRenewing,acknowledged,cancelReason,externalAccountMatched,subscriptionState:state});','return json({ok:true,version:VERSION,entitled:effectiveEntitled,status:effectiveStatus,profileStatus,productId:PRODUCT_ID,basePlanId,expiresAt:effectiveExpiry,googleExpiresAt:googleExpiry,trialBonusMs,autoRenewing,acknowledged,cancelReason,externalAccountMatched,subscriptionState:state,refunded,refundOrderId:dkdRefund.orderId,refundEvent:dkdRefund.event});');
dkd_write('supabase/functions/dkd-drabornpark-google-play/index.ts',dkd_google);

// Plus UI: no price explanatory paragraph, refunded entitlement never remains active, paid card opens a modern info popup.
let dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
dkd_plus=dkd_plus.replace("const [selected,setSelected]=useState<PlanId>('yearly');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [popup,setPopup]=useState(false);", "const [selected,setSelected]=useState<PlanId>('yearly');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [popup,setPopup]=useState(false);const [dkdInfoPopup,setDkdInfoPopup]=useState(false);");
dkd_plus=dkd_plus.replace('<View style={s.planHead}><Text style={s.planTitle}>Premium planını seç</Text><Text style={s.planSub}>Aylık ve yıllık güncel fiyatlar Google Play\'den canlı alınır. Satın alma ekranında gösterilen mağaza fiyatı her zaman esas alınır.</Text></View>','<View style={s.planHead}><Text style={s.planTitle}>Premium planını seç</Text></View>');
dkd_plus=dkd_plus.replace('const dkdServerPremium=Boolean(data?.subscription?.client_store_entitlement===true&&[\'PLUS_ACTIVE\',\'PLUS_GRACE_PERIOD\',\'PLUS_CANCELLED\'].includes(dkdSubscriptionStatus)&&Number.isFinite(dkdServerExpiryMs)&&dkdServerExpiryMs>dkdCountdownNow);','const dkdServerPremium=Boolean(data?.subscription?.client_store_entitlement===true&&data?.subscription?.raw_provider_state?.refunded!==true&&[\'PLUS_ACTIVE\',\'PLUS_GRACE_PERIOD\',\'PLUS_CANCELLED\'].includes(dkdSubscriptionStatus)&&Number.isFinite(dkdServerExpiryMs)&&dkdServerExpiryMs>dkdCountdownNow);');
dkd_plus=dkd_plus.replace('const dkdVerifiedPremium=Boolean(lastVerified?.ok&&lastVerified?.entitled&&Number.isFinite(dkdVerifiedExpiryMs)&&dkdVerifiedExpiryMs>dkdCountdownNow);','const dkdVerifiedPremium=Boolean(lastVerified?.ok&&lastVerified?.entitled&&lastVerified?.refunded!==true&&Number.isFinite(dkdVerifiedExpiryMs)&&dkdVerifiedExpiryMs>dkdCountdownNow);');
if(!dkd_plus.includes('const dkdOwnedPopupBody=')){
  dkd_plus=dkd_plus.replace("const dkdCountdownTitle=dkdPaidPremium?'PREMİUM SÜRESİ':'DENEME SÜRESİ';", "const dkdCountdownTitle=dkdPaidPremium?'PREMİUM SÜRESİ':'DENEME SÜRESİ';const dkdOwnedPlan=String(lastVerified?.basePlanId||data?.subscription?.base_plan_id||'').toLowerCase().includes('year')?'Yıllık DraBornPark+':'Aylık DraBornPark+';const dkdOwnedAutoRenew=lastVerified?.autoRenewing??data?.subscription?.auto_renewing;const dkdOwnedExpiryText=dkdEntitlementExpiry?dkdEntitlementExpiry.toLocaleDateString('tr-TR'):'—';const dkdOwnedPopupBody=`${dkdOwnedPlan} Google Play tarafından doğrulandı. ${dkdOwnedAutoRenew===false?'Otomatik yenileme kapalı.':'Otomatik yenileme açık.'} Mevcut erişim bitiş tarihi: ${dkdOwnedExpiryText}. İade veya revoke gerçekleşirse DraBornPark+ güvenli sunucu doğrulamasında anında kapatılır.`;");
}
dkd_plus=dkd_plus.replace(':(dkdPaidPremium||(dkdEntitlementExpiry&&dkdRemainingMs>0))?<View style={s.countdownCard}>',':(dkdPaidPremium||(dkdEntitlementExpiry&&dkdRemainingMs>0))?<Pressable onPress={()=>{if(dkdPaidPremium)setDkdInfoPopup(true)}} style={({pressed})=>[s.countdownCard,dkdPaidPremium&&pressed&&{opacity:.86}]}>');
dkd_plus=dkd_plus.replace('</View><MaterialCommunityIcons name="shield-check" size={24} color={palette.green}/></View>:null}\n    <View style={s.plans}>','</View><MaterialCommunityIcons name="shield-check" size={24} color={palette.green}/></Pressable>:null}\n    <View style={s.plans}>');
if(!dkd_plus.includes('visible={dkdInfoPopup}')){
  dkd_plus=dkd_plus.replace('    <ColorPopup visible={popup}', '    <ColorPopup visible={dkdInfoPopup} icon="credit-card-check-outline" eyebrow="GOOGLE PLAY ABONELİĞİN" title="DraBornPark+ abonelik bilgilerin" body={dkdOwnedPopupBody} accent={palette.cyan} secondary={palette.yellow} primaryLabel="TAMAM" onPrimary={()=>setDkdInfoPopup(false)} chips={[dkdOwnedPlan,dkdOwnedAutoRenew===false?\'Yenileme kapalı\':\'Yenileme açık\',`Bitiş ${dkdOwnedExpiryText}`]}/>\n    <ColorPopup visible={popup}');
}
dkd_write('src/components/DraBornParkPlusPanel.tsx',dkd_plus);

dkd_require(dkd_google.includes('const VERSION="1.0.20"'),'Google Play verifier version');
dkd_require(dkd_google.includes('orderHistory?.refundEvent'),'full refund order check');
dkd_require(dkd_google.includes('effectiveEntitled=!refunded'),'refund entitlement revocation');
dkd_require(!dkd_plus.includes("Aylık ve yıllık güncel fiyatlar Google Play'den canlı alınır."),'price explanation removed');
dkd_require(dkd_plus.includes('visible={dkdInfoPopup}'),'owned subscription popup');
dkd_require(dkd_plus.includes('data?.subscription?.raw_provider_state?.refunded!==true'),'server refunded guard');
console.log('DraBornPark v1.0.20 transforms ready • refund revocation • owned subscription popup • clean plan header.');
