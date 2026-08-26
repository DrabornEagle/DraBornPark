import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
await import('./apply-v112-source-transform.mjs');

function dkd_read(dkd_file){return fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');}
function dkd_write(dkd_file,dkd_text){fs.writeFileSync(path.join(dkd_root,dkd_file),dkd_text);}
function dkd_patch(dkd_file,dkd_replacements){
  let dkd_text=dkd_read(dkd_file);let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.13 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,220)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);dkd_changed=true;
  }
  if(dkd_changed)dkd_write(dkd_file,dkd_text);
}

// Google Play sahipliği yüklenmeden Deneme/Premium kartını göstermeyerek açılış flicker'ını kaldır.
dkd_patch('src/components/DraBornParkPlusPanel.tsx',[
  [
    "const [selected,setSelected]=useState<PlanId>('yearly');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [popup,setPopup]=useState(false);const [lastVerified,setLastVerified]=useState<any>(null);const [dkdCountdownNow,setDkdCountdownNow]=useState(Date.now());const pulse=useRef(new Animated.Value(0)).current;const sweep=useRef(new Animated.Value(0)).current;",
    "const [selected,setSelected]=useState<PlanId>('yearly');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [popup,setPopup]=useState(false);const [lastVerified,setLastVerified]=useState<any>(null);const [dkdCountdownNow,setDkdCountdownNow]=useState(Date.now());const [dkdStoreState,setDkdStoreState]=useState<'checking'|'active'|'inactive'|'unknown'>('checking');const pulse=useRef(new Animated.Value(0)).current;const sweep=useRef(new Animated.Value(0)).current;"
  ],
  [
    "  useEffect(()=>{if(!connected)return;let dkd_active=true;void (async()=>{try{const dkd_purchases=await getStorePurchases();const dkd_matching=dkd_purchases.filter((dkd_item:any)=>dkd_item.productId===PRODUCT_ID&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');for(const dkd_purchase of dkd_matching){if(!dkd_active)break;await verifyAndFinish(dkd_purchase,{silent:true});}if(dkd_active&&dkd_matching.length)onEntitlementChanged?.();}catch(dkd_error){console.warn('[DraBornPark+] bekleyen Google Play işlemi toparlanamadı',String((dkd_error as any)?.message||dkd_error));}})();return()=>{dkd_active=false};},[connected,finishTransaction]);",
    "  useEffect(()=>{if(!connected)return;let dkd_active=true;setDkdStoreState('checking');void (async()=>{try{const dkd_purchases=await getStorePurchases();const dkd_matching=dkd_purchases.filter((dkd_item:any)=>dkd_item.productId===PRODUCT_ID&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');if(!dkd_active)return;if(!dkd_matching.length){setDkdStoreState('inactive');setLastVerified(null);onEntitlementChanged?.();return;}const dkd_purchase:any=dkd_matching[0];const dkd_plan=String(dkd_purchase.basePlanIdAndroid??dkd_purchase.currentPlanId??'').toLowerCase();setDkdStoreState('active');setLastVerified({entitled:true,localStore:true,basePlanId:dkd_plan.includes('year')?'yearly':'monthly',expiresAt:null});for(const dkd_owned of dkd_matching){if(!dkd_active)break;await verifyAndFinish(dkd_owned,{silent:true});}if(dkd_active)onEntitlementChanged?.();}catch(dkd_error){if(dkd_active)setDkdStoreState('unknown');console.warn('[DraBornPark+] Google Play sahiplik kontrolü tamamlanamadı',String((dkd_error as any)?.message||dkd_error));}})();return()=>{dkd_active=false};},[connected,finishTransaction]);"
  ]
]);

let dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_paid_old=/const trialUntil=data\?\.profile\?\.plus_trial_until\?new Date\(data\.profile\.plus_trial_until\):null;const trialActive=Boolean\(trialUntil&&trialUntil\.getTime\(\)>Date\.now\(\)\);const dkdSubscriptionStatus=String\(data\?\.subscription\?\.status\|\|'\'\)\.toUpperCase\(\);const dkdPaidPremium=Boolean\([^;]+\);/;
if(!dkd_plus.includes("const dkdPaidPremium=dkdStoreState==='active'")){
  if(!dkd_paid_old.test(dkd_plus))throw new Error('DraBornPark v1.0.13 paid premium marker missing');
  dkd_plus=dkd_plus.replace(dkd_paid_old,"const trialUntil=data?.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());const dkdSubscriptionStatus=String(data?.subscription?.status||'').toUpperCase();const dkdServerPremium=Boolean(data?.subscription?.client_store_entitlement||['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdSubscriptionStatus));const dkdPaidPremium=dkdStoreState==='active'?true:dkdStoreState==='inactive'?false:Boolean(lastVerified?.entitled||dkdServerPremium);const dkdResolvedTrialActive=dkdStoreState==='checking'?false:trialActive;");
  dkd_plus=dkd_plus.replace(/\(!dkdPaidPremium&&trialActive\?trialUntil:null\)/g,'(!dkdPaidPremium&&dkdResolvedTrialActive?trialUntil:null)');
  dkd_write('src/components/DraBornParkPlusPanel.tsx',dkd_plus);
}

dkd_patch('src/components/DraBornParkPlusPanel.tsx',[[
  "    {(dkdPaidPremium||(dkdEntitlementExpiry&&dkdRemainingMs>0))?<View style={s.countdownCard}>",
  "    {dkdStoreState==='checking'?<View style={s.countdownCard}><View style={s.countdownIcon}><ActivityIndicator color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text style={s.countdownKicker}>GOOGLE PLAY KONTROLÜ</Text><Text style={s.countdownLoading}>Abonelik durumu doğrulanıyor…</Text><Text style={s.countdownMeta}>Deneme veya Premium bilgisi doğrulama bitmeden gösterilmez.</Text></View></View>:(dkdPaidPremium||(dkdEntitlementExpiry&&dkdRemainingMs>0))?<View style={s.countdownCard}>"
],[
  "</View>:null}\n    <View style={s.plans}>{plans.map(plan=>{const active=selected===plan.id;",
  "</View>:null}\n    <View style={s.plans}>{plans.map(plan=>{const active=selected===plan.id;"
],[
  "countdownActive:{color:palette.green,fontSize:28,fontWeight:'900',letterSpacing:.4},countdownMeta:",
  "countdownActive:{color:palette.green,fontSize:28,fontWeight:'900',letterSpacing:.4},countdownLoading:{color:palette.text,fontSize:17,fontWeight:'900',marginTop:5},countdownMeta:"
]]);

// Yerel Google Play kontrolü başarılıysa yok olan/refund edilen satın alma, eski sunucu satırından tekrar Premium açamaz.
let dkd_lib=dkd_read('src/lib/drabornpark.ts');
if(!dkd_lib.includes('dkdLocalOwnershipChecked')){
  const dkd_start=dkd_lib.indexOf('async function dkdLoadLocalGooglePlaySubscription(){');
  const dkd_end=dkd_lib.indexOf('\n\nexport async function loadLiveDashboard',dkd_start);
  if(dkd_start<0||dkd_end<0)throw new Error('DraBornPark v1.0.13 local Play function marker missing');
  const dkd_new_fn=`async function dkdLoadLocalGooglePlaySubscription(){\n  if(Platform.OS!=='android')return {dkdLocalOwnershipChecked:false,subscription:null};\n  try{\n    const dkd_iap=await import('expo-iap');\n    const dkd_purchases=await dkd_iap.getAvailablePurchases();\n    const dkd_purchase=(dkd_purchases??[]).find((dkd_item:any)=>dkd_item.productId==='drabornpark_plus'&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');\n    if(!dkd_purchase)return {dkdLocalOwnershipChecked:true,subscription:null};\n    try{await dkd_iap.finishTransaction({purchase:dkd_purchase,isConsumable:false});}catch(dkd_error:any){const dkd_message=String(dkd_error?.message||dkd_error||'');if(!/already|acknowledg|ITEM_NOT_OWNED|not owned/i.test(dkd_message))console.warn('[DraBornPark+] Google Play işlemi tamamlanamadı',dkd_message);}\n    return {dkdLocalOwnershipChecked:true,subscription:{provider:'google_play_device',product_id:'drabornpark_plus',base_plan_id:String((dkd_purchase as any).basePlanIdAndroid??(dkd_purchase as any).currentPlanId??'')||null,status:'PLUS_ACTIVE',expires_at:null,auto_renewing:Boolean((dkd_purchase as any).autoRenewingAndroid??(dkd_purchase as any).isAutoRenewing),last_verified_at:null,client_store_entitlement:true,transaction_date:(dkd_purchase as any).transactionDate??null}};\n  }catch{return {dkdLocalOwnershipChecked:false,subscription:null};}\n}`;
  dkd_lib=dkd_lib.slice(0,dkd_start)+dkd_new_fn+dkd_lib.slice(dkd_end);
  const dkd_resolve_old="  const dkdServerSubscription=subscriptionRes.data;\n  const dkdServerStatus=String(dkdServerSubscription?.status||'').toUpperCase();\n  const dkdServerExpiry=dkdServerSubscription?.expires_at?new Date(dkdServerSubscription.expires_at).getTime():null;\n  const dkdServerActive=['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdServerStatus)&&(!dkdServerExpiry||dkdServerExpiry>Date.now());\n  const dkdResolvedSubscription=dkdServerActive?dkdServerSubscription:(dkdLocalPlaySubscription??dkdServerSubscription);";
  const dkd_resolve_new="  const dkdServerSubscription=subscriptionRes.data;\n  const dkdServerStatus=String(dkdServerSubscription?.status||'').toUpperCase();\n  const dkdServerExpiry=dkdServerSubscription?.expires_at?new Date(dkdServerSubscription.expires_at).getTime():null;\n  const dkdServerActive=['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdServerStatus)&&(!dkdServerExpiry||dkdServerExpiry>Date.now());\n  const dkdResolvedSubscription=Platform.OS==='android'&&dkdLocalPlaySubscription?.dkdLocalOwnershipChecked?(dkdLocalPlaySubscription.subscription??null):(dkdLocalPlaySubscription?.subscription??(dkdServerActive?dkdServerSubscription:dkdServerSubscription));";
  if(!dkd_lib.includes(dkd_resolve_old))throw new Error('DraBornPark v1.0.13 subscription resolver marker missing');
  dkd_lib=dkd_lib.replace(dkd_resolve_old,dkd_resolve_new);
  const dkd_profile_old="  return ['PLUS_ACTIVE','PLUS_GRACE_PERIOD'].includes(profileStatus);";
  const dkd_profile_new="  if(Platform.OS==='android')return false;\n  return ['PLUS_ACTIVE','PLUS_GRACE_PERIOD'].includes(profileStatus);";
  if(!dkd_lib.includes(dkd_profile_old))throw new Error('DraBornPark v1.0.13 profile entitlement marker missing');
  dkd_lib=dkd_lib.replace(dkd_profile_old,dkd_profile_new);
  dkd_write('src/lib/drabornpark.ts',dkd_lib);
}

// Admin kullanıcılarına Merkezim > Hesap & Destek altında Admin Paneli kartı.
dkd_patch('app/hub.tsx',[[
  "    {title:'Üretim Paneli',subtitle:'Etiket üretim ve doğrulama',icon:'factory',color:palette.orange,route:'/factory',keywords:'üretim etiket doğrulama admin',adminOnly:true},",
  "    {title:'Üretim Paneli',subtitle:'Etiket üretim ve doğrulama',icon:'factory',color:palette.orange,route:'/factory',keywords:'üretim etiket doğrulama admin',adminOnly:true},\n    {title:'Admin Paneli',subtitle:'Zorunlu güncelleme ve yayın kontrolleri',icon:'shield-crown-outline',color:palette.green,route:'/admin',keywords:'admin zorunlu güncelleme yayın politika',adminOnly:true},"
],[
  '<Pill label="v1.0.12" color={palette.purple}/>','<Pill label="v1.0.13" color={palette.purple}/>'
]]);

dkd_patch('app/index.tsx',[[
  '<Pill label="v1.0.12" color={palette.purple}/>','<Pill label="v1.0.13" color={palette.purple}/>'
]]);
dkd_patch('app/factory.tsx',[[
  'NFC + QR ETİKET MERKEZİ • v1.0.12','NFC + QR ETİKET MERKEZİ • v1.0.13'
]]);
dkd_patch('app/t/[id].tsx',[[
  "stampLabel:'DraBornPark v1.0.12 • Güvenli Araç İletişimi'","stampLabel:'DraBornPark v1.0.13 • Güvenli Araç İletişimi'"
]]);
dkd_patch('supabase/functions/drabornpark-public-contact/index.ts',[[
  'const VERSION="1.0.12";','const VERSION="1.0.13";'
]]);
dkd_patch('supabase/functions/dkd-drabornpark-google-play/index.ts',[[
  'const VERSION="1.0.12";','const VERSION="1.0.13";'
]]);

const dkd_version_fn=`import "jsr:@supabase/functions-js/edge-runtime.d.ts";\nimport {createClient} from "jsr:@supabase/supabase-js@2";\n\nconst VERSION="1.0.13";\nconst VERSION_CODE=13;\nconst PLAY_URL="https://play.google.com/store/apps/details?id=com.draborneagle.drabornpark";\nconst corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0"};\nconst json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});\n\nDeno.serve(async(req:Request)=>{\n  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});\n  if(req.method!=="GET"&&req.method!=="POST")return json({error:"method_not_allowed"},405);\n  let forceUpdateEnabled=false;let configuredMinimum=0;\n  try{\n    const url=Deno.env.get("SUPABASE_URL")??"";const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";\n    if(url&&serviceKey){const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});const {data}=await db.rpc('dkd_drabornpark_get_update_policy');forceUpdateEnabled=Boolean(data?.force_update_enabled);configuredMinimum=Number(data?.minimum_version_code||0);}\n  }catch(error){console.error('[DraBornPark update policy]',error);}\n  const minimumVersionCode=forceUpdateEnabled?Math.max(1,configuredMinimum||VERSION_CODE):0;\n  return json({ok:true,latestVersion:VERSION,latestVersionCode:VERSION_CODE,minimumVersionCode,forceUpdateBelow:minimumVersionCode,forceUpdateEnabled,playUrl:PLAY_URL,message:"DraBornPark için yeni bir sürüm yayınlandı. Güvenlik, performans ve yeni özellikleri kullanmaya devam etmek için Google Play üzerinden güncelleme zorunludur."});\n});\n`;
dkd_write('supabase/functions/dkd-drabornpark-app-version/index.ts',dkd_version_fn);

console.log('DraBornPark v1.0.13 source transforms ready • no trial/premium flicker • refunded Play purchases removed • admin force-update control.');
