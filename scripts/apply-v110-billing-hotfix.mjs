import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_plus_path=path.join(dkd_root,'src/components/DraBornParkPlusPanel.tsx');
if(!fs.readFileSync(dkd_plus_path,'utf8').includes('dkdCountdownNow'))await import('./apply-v110-source-transform.mjs');

function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.10 billing hotfix marker missing in ${dkd_file}: ${dkd_from.slice(0,180)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('src/components/DraBornParkPlusPanel.tsx',[
  [
    'export function DraBornParkPlusPanel({data,plus}:{data:any;plus:boolean}){',
    'export function DraBornParkPlusPanel({data,plus,onEntitlementChanged}:{data:any;plus:boolean;onEntitlementChanged?:()=>void}){'
  ],
  [
    "  const verifyAndFinish=async(purchase:Purchase)=>{const token=String((purchase as any).purchaseToken||'');if(!token)return;const {data:verified,error}=await supabase.functions.invoke('dkd-drabornpark-google-play',{body:{action:'verify',purchaseToken:token,productId:PRODUCT_ID}});if(error)throw error;if(!verified?.ok)throw new Error(verified?.error||'Google Play doğrulaması tamamlanamadı.');await finishTransaction({purchase,isConsumable:false});setLastVerified(verified);setPopup(true);setMessage(verified.entitled?'DraBornPark+ Google Play üzerinden doğrulandı.':'Satın alma doğrulandı ancak aktif hak bulunamadı.');};",
    "  const dkdFinishOwnedPurchase=async(dkd_purchase:Purchase)=>{try{await finishTransaction({purchase:dkd_purchase,isConsumable:false});}catch(dkd_error:any){const dkd_message=String(dkd_error?.message||dkd_error||'');if(!/already|acknowledg|ITEM_NOT_OWNED|not owned/i.test(dkd_message))throw dkd_error;}onEntitlementChanged?.();};\n  const verifyAndFinish=async(dkd_purchase:Purchase,dkd_options?:{silent?:boolean})=>{const dkd_token=String((dkd_purchase as any).purchaseToken||'');if(!dkd_token)return null;await dkdFinishOwnedPurchase(dkd_purchase);const {data:dkd_verified,error:dkd_verify_error}=await supabase.functions.invoke('dkd-drabornpark-google-play',{body:{action:'verify',purchaseToken:dkd_token,productId:PRODUCT_ID}});if(dkd_verify_error||!dkd_verified?.ok){if(!dkd_options?.silent){setLastVerified({entitled:true,localStore:true,basePlanId:selected,expiresAt:null});setPopup(true);setMessage('Google Play aboneliğin etkinleştirildi. Sunucu doğrulaması geçici olarak tamamlanamadı; uygulama aktif Google Play aboneliğini kullanacak.');}return null;}setLastVerified(dkd_verified);if(!dkd_options?.silent)setPopup(true);setMessage(dkd_verified.entitled?'DraBornPark+ Google Play üzerinden doğrulandı.':'Satın alma doğrulandı ancak aktif hak bulunamadı.');onEntitlementChanged?.();return dkd_verified;};"
  ],
  [
    "  useEffect(()=>{if(connected)void fetchProducts({skus:[PRODUCT_ID],type:'subs'});},[connected,fetchProducts]);\n  useEffect(()=>{const dkdTimer=setInterval(()=>setDkdCountdownNow(Date.now()),60000);return()=>clearInterval(dkdTimer);},[]);",
    "  useEffect(()=>{if(connected)void fetchProducts({skus:[PRODUCT_ID],type:'subs'});},[connected,fetchProducts]);\n  useEffect(()=>{const dkdTimer=setInterval(()=>setDkdCountdownNow(Date.now()),60000);return()=>clearInterval(dkdTimer);},[]);\n  useEffect(()=>{if(!connected)return;let dkd_active=true;void (async()=>{try{const dkd_purchases=await getStorePurchases();const dkd_matching=dkd_purchases.filter((dkd_item:any)=>dkd_item.productId===PRODUCT_ID&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');for(const dkd_purchase of dkd_matching){if(!dkd_active)break;await verifyAndFinish(dkd_purchase,{silent:true});}if(dkd_active&&dkd_matching.length)onEntitlementChanged?.();}catch(dkd_error){console.warn('[DraBornPark+] bekleyen Google Play işlemi toparlanamadı',String((dkd_error as any)?.message||dkd_error));}})();return()=>{dkd_active=false};},[connected,finishTransaction]);"
  ],
  [
    "  async function restore(){setBusy(true);setMessage('Satın almalar kontrol ediliyor…');try{const purchases=await getStorePurchases();const matching=purchases.filter((item:any)=>item.productId===PRODUCT_ID&&item.purchaseToken);if(!matching.length){setMessage('Bu Google Play hesabında geri yüklenecek DraBornPark+ aboneliği bulunamadı.');return;}for(const purchase of matching)await verifyAndFinish(purchase);setMessage('Google Play satın almaların doğrulandı ve geri yüklendi.');}catch(error:any){setMessage(error?.message||'Satın almalar geri yüklenemedi.');}finally{setBusy(false)}}",
    "  async function restore(){setBusy(true);setMessage('Satın almalar kontrol ediliyor…');try{const dkd_purchases=await getStorePurchases();const dkd_matching=dkd_purchases.filter((dkd_item:any)=>dkd_item.productId===PRODUCT_ID&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');if(!dkd_matching.length){setMessage('Bu Google Play hesabında geri yüklenecek DraBornPark+ aboneliği bulunamadı.');return;}let dkd_server_verified=false;for(const dkd_purchase of dkd_matching){const dkd_result=await verifyAndFinish(dkd_purchase);if(dkd_result?.entitled)dkd_server_verified=true;}setMessage(dkd_server_verified?'Google Play satın almaların doğrulandı ve geri yüklendi.':'Google Play aboneliğin kullanıma alındı; sunucu doğrulaması bağlantı geldiğinde yeniden denenecek.');onEntitlementChanged?.();}catch(dkd_error:any){setMessage(dkd_error?.message||'Satın almalar geri yüklenemedi.');}finally{setBusy(false)}}"
  ],
  [
    "    <View style={s.playInfo}><MaterialCommunityIcons name=\"shield-check-outline\" size={23} color={palette.green}/><Text style={s.playInfoText}>Ödeme Google Play tarafından işlenir. Satın alma tokenı sunucuda Google Play Developer API ile doğrulanmadan Premium hakkı açılmaz. Uygulamadaki sabit hedef fiyat yalnız bilgilendirme içindir; son fiyat Google Play ödeme ekranındaki yerel fiyattır.</Text></View>",
    "    <View style={s.playInfo}><MaterialCommunityIcons name=\"shield-check-outline\" size={23} color={palette.green}/><Text style={s.playInfoText}>Ödeme Google Play tarafından işlenir. Satın alma tamamlandığında uygulama işlemi hemen Google Play'e bildirip aboneliği kullanıma alır; böylece 3 günlük onay süresi nedeniyle otomatik iptal riski oluşmaz. Sunucu doğrulaması geçici olarak erişilemiyorsa cihazdaki aktif Google Play aboneliği güvenli geri dönüş olarak kullanılır.</Text></View>"
  ],
  [
    "<ColorPopup visible={popup} icon=\"crown-circle-outline\" eyebrow=\"DRABORNPARK+ AKTİF\" title=\"Premium özelliklerin açıldı\" body={lastVerified?.expiresAt?'Aboneliğin '+new Date(lastVerified.expiresAt).toLocaleDateString('tr-TR')+' tarihine kadar doğrulandı. DraBornPark+ ile aşağıdaki özelliklerin tamamı artık hesabında aktif.':'Google Play satın alman doğrulandı. DraBornPark+ ile aşağıdaki özelliklerin tamamı artık hesabında aktif.'} accent={palette.yellow} secondary={palette.purple} primaryLabel=\"DRABORNPARK+ KULLAN\" onPrimary={()=>setPopup(false)} chips={['DraBornPark Aile','Geçici Sürücü','Vale / Servis Modu','Zaman Kuralları','Acil Durum Zinciri','Gelişmiş Araç Geçmişi','Aylık Özet']}/>",
    "<ColorPopup visible={popup} icon=\"crown-circle-outline\" eyebrow=\"DRABORNPARK+ AKTİF\" title=\"Premium özelliklerin açıldı\" body={lastVerified?.expiresAt?'Aboneliğin '+new Date(lastVerified.expiresAt).toLocaleDateString('tr-TR')+' tarihine kadar doğrulandı. DraBornPark+ ile aşağıdaki özelliklerin tamamı artık hesabında aktif.':lastVerified?.localStore?'Google Play aboneliğin cihaz üzerinden kullanıma alındı. Sunucu doğrulaması geçici olarak erişilemiyorsa uygulama aktif Play aboneliğini kullanmaya devam eder.':'Google Play satın alman doğrulandı. DraBornPark+ ile aşağıdaki özelliklerin tamamı artık hesabında aktif.'} accent={palette.yellow} secondary={palette.purple} primaryLabel=\"DRABORNPARK+ KULLAN\" onPrimary={()=>setPopup(false)} chips={['DraBornPark Aile','Geçici Sürücü','Vale / Servis Modu','Zaman Kuralları','Acil Durum Zinciri','Gelişmiş Araç Geçmişi','Aylık Özet']}/>"
  ]
]);

dkd_patch('app/feature/[slug].tsx',[[
  '{plusPage?<DraBornParkPlusPanel data={data} plus={plus}/>:null}',
  "{plusPage?<DraBornParkPlusPanel data={data} plus={plus} onEntitlementChanged={()=>{void loadLiveDashboard().then(dkd_next=>setData(dkd_next)).catch(()=>undefined)}}/>:null}"
]]);

dkd_patch('src/lib/drabornpark.ts',[
  [
    "import { readLocalFileBytes } from '@/src/lib/localFile';\nimport { supabase } from '@/src/lib/supabase';",
    "import {Platform} from 'react-native';\nimport { readLocalFileBytes } from '@/src/lib/localFile';\nimport { supabase } from '@/src/lib/supabase';"
  ],
  [
    'export async function loadLiveDashboard(): Promise<LiveDashboard> {',
    "async function dkdLoadLocalGooglePlaySubscription(){\n  if(Platform.OS!=='android')return null;\n  try{\n    const dkd_iap=await import('expo-iap');\n    const dkd_purchases=await dkd_iap.getAvailablePurchases();\n    const dkd_purchase=(dkd_purchases??[]).find((dkd_item:any)=>dkd_item.productId==='drabornpark_plus'&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');\n    if(!dkd_purchase)return null;\n    try{await dkd_iap.finishTransaction({purchase:dkd_purchase,isConsumable:false});}catch(dkd_error:any){const dkd_message=String(dkd_error?.message||dkd_error||'');if(!/already|acknowledg|ITEM_NOT_OWNED|not owned/i.test(dkd_message))console.warn('[DraBornPark+] Google Play işlemi tamamlanamadı',dkd_message);}\n    return {provider:'google_play_device',product_id:'drabornpark_plus',base_plan_id:null,status:'PLUS_ACTIVE',expires_at:null,auto_renewing:Boolean((dkd_purchase as any).autoRenewingAndroid??(dkd_purchase as any).isAutoRenewing),last_verified_at:null,client_store_entitlement:true,transaction_date:(dkd_purchase as any).transactionDate??null};\n  }catch{return null;}\n}\n\nexport async function loadLiveDashboard(): Promise<LiveDashboard> {"
  ],
  [
    "    subscriptionRes,\n  ] = await Promise.all([",
    "    subscriptionRes,\n    dkdLocalPlaySubscription,\n  ] = await Promise.all(["
  ],
  [
    "    supabase.from('drabornpark_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),\n  ]);",
    "    supabase.from('drabornpark_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),\n    dkdLoadLocalGooglePlaySubscription(),\n  ]);"
  ],
  [
    "  if (errors.length) throw errors[0];\n\n  return {",
    "  if (errors.length) throw errors[0];\n  const dkdServerSubscription=subscriptionRes.data;\n  const dkdServerStatus=String(dkdServerSubscription?.status||'').toUpperCase();\n  const dkdServerExpiry=dkdServerSubscription?.expires_at?new Date(dkdServerSubscription.expires_at).getTime():null;\n  const dkdServerActive=['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdServerStatus)&&(!dkdServerExpiry||dkdServerExpiry>Date.now());\n  const dkdResolvedSubscription=dkdServerActive?dkdServerSubscription:(dkdLocalPlaySubscription??dkdServerSubscription);\n\n  return {"
  ],
  [
    '    subscription: subscriptionRes.data,',
    '    subscription: dkdResolvedSubscription,'
  ]
]);

console.log('DraBornPark v1.0.10 billing hotfix ready • Android purchase acknowledgement before verification • startup recovery • local Google Play entitlement fallback.');
