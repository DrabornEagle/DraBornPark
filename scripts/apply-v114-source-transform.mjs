import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
await import('./apply-v113-safe.mjs');
await import('./apply-v113-final-fix.mjs');

const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(path.join(dkd_root,dkd_file),dkd_text);
function dkd_patch(dkd_file,dkd_from,dkd_to){
  let dkd_text=dkd_read(dkd_file);
  if(dkd_text.includes(dkd_to))return;
  if(!dkd_text.includes(dkd_from))throw new Error('DraBornPark v1.0.14 marker missing in '+dkd_file+': '+dkd_from.slice(0,180));
  dkd_text=dkd_text.replace(dkd_from,dkd_to);
  dkd_write(dkd_file,dkd_text);
}
function dkd_regex(dkd_file,dkd_pattern,dkd_to,dkd_label){
  let dkd_text=dkd_read(dkd_file);
  if(dkd_text.includes(dkd_to))return;
  if(!dkd_pattern.test(dkd_text))throw new Error('DraBornPark v1.0.14 regex marker missing in '+dkd_file+': '+dkd_label);
  dkd_pattern.lastIndex=0;
  dkd_text=dkd_text.replace(dkd_pattern,dkd_to);
  dkd_write(dkd_file,dkd_text);
}

// Premium hakkı yalnız Google Play sunucusu güncel olarak doğruladığında açılır.
dkd_regex('src/components/DraBornParkPlusPanel.tsx',/^  const dkdFinishOwnedPurchase=.*\n  const verifyAndFinish=.*\n/m,
`  const dkdFinishOwnedPurchase=async(dkd_purchase:Purchase)=>{try{await finishTransaction({purchase:dkd_purchase,isConsumable:false});}catch(dkd_error:any){const dkd_message=String(dkd_error?.message||dkd_error||'');if(!/already|acknowledg|ITEM_NOT_OWNED|not owned/i.test(dkd_message))throw dkd_error;}onEntitlementChanged?.();};
  const verifyAndFinish=async(dkd_purchase:Purchase,dkd_options?:{silent?:boolean})=>{const dkd_token=String((dkd_purchase as any).purchaseToken||'');if(!dkd_token)return null;await dkdFinishOwnedPurchase(dkd_purchase);const {data:dkd_verified,error:dkd_verify_error}=await supabase.functions.invoke('dkd-drabornpark-google-play',{body:{action:'verify',purchaseToken:dkd_token,productId:PRODUCT_ID}});if(dkd_verify_error||!dkd_verified?.ok){setLastVerified(null);setDkdStoreState('unknown');if(!dkd_options?.silent)setMessage('Google Play sunucu doğrulaması tamamlanamadı. Güvenlik için Premium özellikler doğrulama tamamlanana kadar kilitli tutulur.');return null;}setLastVerified(dkd_verified);setDkdStoreState(dkd_verified.entitled?'active':'inactive');if(!dkd_options?.silent&&dkd_verified.entitled)setPopup(true);setMessage(dkd_verified.entitled?'DraBornPark+ Google Play üzerinden doğrulandı.':dkd_verified.status==='PLUS_REFUNDED'?'İade edilen abonelik tespit edildi. Premium erişimin kapatıldı.':'Aktif DraBornPark+ aboneliği bulunamadı.');onEntitlementChanged?.();return dkd_verified;};
`,'strict verifyAndFinish');

dkd_regex('src/components/DraBornParkPlusPanel.tsx',/^  useEffect\(\(\)=>\{if\(!connected\)return;let dkd_active=true;setDkdStoreState\('checking'\);.*\},\[connected,finishTransaction\]\);$/m,
`  useEffect(()=>{if(!connected)return;let dkd_active=true;setDkdStoreState('checking');void (async()=>{try{const dkd_purchases=await getStorePurchases();const dkd_matching=dkd_purchases.filter((dkd_item:any)=>dkd_item.productId===PRODUCT_ID&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');if(!dkd_active)return;if(!dkd_matching.length){setDkdStoreState('inactive');setLastVerified(null);onEntitlementChanged?.();return;}let dkd_entitled=false;let dkd_verified_result:any=null;for(const dkd_purchase of dkd_matching){if(!dkd_active)break;const dkd_result=await verifyAndFinish(dkd_purchase,{silent:true});if(dkd_result?.entitled){dkd_entitled=true;dkd_verified_result=dkd_result;break;}if(dkd_result)dkd_verified_result=dkd_result;}if(!dkd_active)return;setLastVerified(dkd_verified_result);setDkdStoreState(dkd_entitled?'active':'inactive');onEntitlementChanged?.();}catch(dkd_error){if(dkd_active){setDkdStoreState('unknown');setLastVerified(null);}console.warn('[DraBornPark+] Google Play sahiplik kontrolü tamamlanamadı',String((dkd_error as any)?.message||dkd_error));}})();return()=>{dkd_active=false};},[connected,finishTransaction]);`,'strict startup ownership verification');

dkd_regex('src/components/DraBornParkPlusPanel.tsx',/^  async function restore\(\)\{.*\}$/m,
`  async function restore(){setBusy(true);setMessage('Satın almalar Google Play üzerinden doğrulanıyor…');setDkdStoreState('checking');try{const dkd_purchases=await getStorePurchases();const dkd_matching=dkd_purchases.filter((dkd_item:any)=>dkd_item.productId===PRODUCT_ID&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');if(!dkd_matching.length){setLastVerified(null);setDkdStoreState('inactive');setMessage('Bu Google Play hesabında aktif DraBornPark+ aboneliği bulunamadı.');onEntitlementChanged?.();return;}let dkd_entitled=false;let dkd_latest:any=null;for(const dkd_purchase of dkd_matching){const dkd_result=await verifyAndFinish(dkd_purchase,{silent:true});if(dkd_result)dkd_latest=dkd_result;if(dkd_result?.entitled){dkd_entitled=true;break;}}setLastVerified(dkd_latest);setDkdStoreState(dkd_entitled?'active':'inactive');setMessage(dkd_entitled?'Google Play aboneliğin doğrulandı ve Premium erişimin aktif.':dkd_latest?.status==='PLUS_REFUNDED'?'İade edilmiş abonelik bulundu. Premium erişim kapalı.':'Aktif DraBornPark+ aboneliği bulunamadı.');onEntitlementChanged?.();}catch(dkd_error:any){setLastVerified(null);setDkdStoreState('unknown');setMessage(dkd_error?.message||'Google Play doğrulaması tamamlanamadı. Premium erişim güvenlik için kilitli.');}finally{setBusy(false)}}`,'strict restore');

dkd_patch('src/components/DraBornParkPlusPanel.tsx',
  "const dkdPaidPremium=dkdStoreState==='active'?true:dkdStoreState==='inactive'?false:Boolean(lastVerified?.entitled||dkdServerPremium);",
  "const dkdPaidPremium=dkdStoreState==='active'&&Boolean(lastVerified?.entitled||dkdServerPremium);"
);
dkd_patch('src/components/DraBornParkPlusPanel.tsx',
  'Sunucu doğrulaması geçici olarak erişilemiyorsa cihazdaki aktif Google Play aboneliği güvenli geri dönüş olarak kullanılır.',
  'Premium erişim yalnız Google Play Developer API tarafından güncel olarak doğrulanmış aktif abonelikte açılır. İade, iptal/revoke veya doğrulama başarısızlığında Premium özellikler güvenlik için kilitlenir.'
);

// Dashboard tarafında cihaz kaydını tek başına Premium sayma; purchase token sunucuda doğrulanmalı.
let dkd_lib=dkd_read('src/lib/drabornpark.ts');
const dkd_local_pattern=/async function dkdLoadLocalGooglePlaySubscription\(\)\{[\s\S]*?\n\}\n\nexport async function loadLiveDashboard/;
const dkd_local_replacement=`async function dkdLoadLocalGooglePlaySubscription(){
  if(Platform.OS!=='android')return {dkdLocalOwnershipChecked:false,subscription:null};
  try{
    const dkd_iap=await import('expo-iap');
    const dkd_purchases=await dkd_iap.getAvailablePurchases();
    const dkd_purchase=(dkd_purchases??[]).find((dkd_item:any)=>dkd_item.productId==='drabornpark_plus'&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending');
    if(!dkd_purchase)return {dkdLocalOwnershipChecked:true,subscription:null};
    try{await dkd_iap.finishTransaction({purchase:dkd_purchase,isConsumable:false});}catch(dkd_error:any){const dkd_message=String(dkd_error?.message||dkd_error||'');if(!/already|acknowledg|ITEM_NOT_OWNED|not owned/i.test(dkd_message))console.warn('[DraBornPark+] Google Play işlemi tamamlanamadı',dkd_message);}
    const dkd_token=String((dkd_purchase as any).purchaseToken||'');
    const {data:dkd_verified,error:dkd_verify_error}=await supabase.functions.invoke('dkd-drabornpark-google-play',{body:{action:'verify',purchaseToken:dkd_token,productId:'drabornpark_plus'}});
    if(dkd_verify_error||!dkd_verified?.ok){return {dkdLocalOwnershipChecked:true,subscription:{provider:'google_play_unverified',product_id:'drabornpark_plus',base_plan_id:null,status:'PLUS_UNVERIFIED',expires_at:null,auto_renewing:false,last_verified_at:null,client_store_entitlement:false,transaction_date:(dkd_purchase as any).transactionDate??null}};}
    return {dkdLocalOwnershipChecked:true,subscription:{provider:'google_play_verified',product_id:'drabornpark_plus',base_plan_id:dkd_verified.basePlanId??null,status:String(dkd_verified.status||'PLUS_EXPIRED'),expires_at:dkd_verified.expiresAt??null,auto_renewing:Boolean(dkd_verified.autoRenewing),last_verified_at:new Date().toISOString(),client_store_entitlement:dkd_verified.entitled===true,transaction_date:(dkd_purchase as any).transactionDate??null,order_state:dkd_verified.orderState??null}};
  }catch(dkd_error){console.warn('[DraBornPark+] Google Play entitlement kontrolü başarısız',String((dkd_error as any)?.message||dkd_error));return {dkdLocalOwnershipChecked:true,subscription:{provider:'google_play_unverified',product_id:'drabornpark_plus',base_plan_id:null,status:'PLUS_UNVERIFIED',expires_at:null,auto_renewing:false,last_verified_at:null,client_store_entitlement:false,transaction_date:null}};}
}

export async function loadLiveDashboard`;
if(!dkd_lib.includes("provider:'google_play_verified'")){
  if(!dkd_local_pattern.test(dkd_lib))throw new Error('DraBornPark v1.0.14 local entitlement function not found');
  dkd_lib=dkd_lib.replace(dkd_local_pattern,dkd_local_replacement);
}
const dkd_entitlement_pattern=/export function hasPlusEntitlement\(profile: any \| null, subscription: any \| null\) \{[\s\S]*?\n\}\n\nexport async function isUsernameAvailable/;
const dkd_entitlement_replacement=`export function hasPlusEntitlement(profile: any | null, subscription: any | null) {
  if (!profile) return false;
  const dkd_subscription_status=String(subscription?.status||'').toUpperCase();
  const dkd_expiry=subscription?.expires_at?new Date(subscription.expires_at).getTime():null;
  if(Platform.OS==='android'){
    if(['PLUS_NOT_OWNED','PLUS_REFUNDED','PLUS_UNVERIFIED','PLUS_EXPIRED'].includes(dkd_subscription_status))return false;
    if(subscription?.client_store_entitlement===true&&['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkd_subscription_status))return !dkd_expiry||dkd_expiry>Date.now();
    if(!subscription&&profile.plus_trial_until&&new Date(profile.plus_trial_until).getTime()>Date.now())return true;
    return false;
  }
  if (profile.plus_trial_until && new Date(profile.plus_trial_until).getTime() > Date.now()) return true;
  const profileStatus=String(profile.subscription_status||'').toUpperCase();
  if (['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkd_subscription_status)) return !dkd_expiry || dkd_expiry>Date.now();
  return ['PLUS_ACTIVE','PLUS_GRACE_PERIOD'].includes(profileStatus);
}

export async function isUsernameAvailable`;
if(!dkd_lib.includes("['PLUS_NOT_OWNED','PLUS_REFUNDED','PLUS_UNVERIFIED','PLUS_EXPIRED']")){
  if(!dkd_entitlement_pattern.test(dkd_lib))throw new Error('DraBornPark v1.0.14 hasPlusEntitlement function not found');
  dkd_lib=dkd_lib.replace(dkd_entitlement_pattern,dkd_entitlement_replacement);
}
dkd_write('src/lib/drabornpark.ts',dkd_lib);

// Merkezim kartlarında Premium modüller abonelik yoksa satın alma popup'ı açar.
dkd_patch('app/hub.tsx',
  "import { AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';",
  "import { AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';\nimport {ColorPopup} from '@/src/components/ColorPopup';"
);
dkd_patch('app/hub.tsx',
  "import { supabase } from '@/src/lib/supabase';",
  "import {hasPlusEntitlement,loadLiveDashboard} from '@/src/lib/drabornpark';\nimport { supabase } from '@/src/lib/supabase';"
);
dkd_patch('app/hub.tsx',
  'type MenuItem={title:string;subtitle:string;icon:string;color:string;route:string;badge?:string;keywords:string;adminOnly?:boolean};',
  'type MenuItem={title:string;subtitle:string;icon:string;color:string;route:string;badge?:string;keywords:string;adminOnly?:boolean;requiresPlus?:boolean};'
);
for(const [dkd_from,dkd_to] of [
  ["route:'/timeline',keywords:'geçmiş olay zaman çizelgesi'","route:'/timeline',keywords:'geçmiş olay zaman çizelgesi',requiresPlus:true"],
  ["route:'/insights',keywords:'özet istatistik aylık'","route:'/insights',keywords:'özet istatistik aylık',requiresPlus:true"],
  ["route:'/family',keywords:'aile paylaşım'","route:'/family',keywords:'aile paylaşım',requiresPlus:true"],
  ["route:'/guest',keywords:'geçici sürücü yönlendirme'","route:'/guest',keywords:'geçici sürücü yönlendirme',requiresPlus:true"],
  ["route:'/emergency',keywords:'acil zincir kişi'","route:'/emergency',keywords:'acil zincir kişi',requiresPlus:true"],
  ["route:'/modes',badge:'PLUS',keywords:'vale servis'","route:'/modes',badge:'PLUS',keywords:'vale servis',requiresPlus:true"],
  ["route:'/routing',badge:'PLUS',keywords:'zaman kural saat'","route:'/routing',badge:'PLUS',keywords:'zaman kural saat',requiresPlus:true"]
])dkd_patch('app/hub.tsx',dkd_from,dkd_to);
dkd_patch('app/hub.tsx',
  "  const [isAdmin,setIsAdmin]=useState(false);",
  "  const [isAdmin,setIsAdmin]=useState(false);\n  const [dkdPlusActive,setDkdPlusActive]=useState(false);\n  const [dkdPlusChecked,setDkdPlusChecked]=useState(false);\n  const [dkdPlusPopup,setDkdPlusPopup]=useState(false);"
);
dkd_patch('app/hub.tsx',
  "  const visibleGroups=useMemo(()=>groups.map(group=>({...group,items:group.items.filter(item=>!item.adminOnly||isAdmin)})).filter(group=>group.items.length),[isAdmin]);",
  "  useEffect(()=>{let dkd_alive=true;void loadLiveDashboard().then(dkd_dashboard=>{if(!dkd_alive)return;setDkdPlusActive(hasPlusEntitlement(dkd_dashboard.profile,dkd_dashboard.subscription));setDkdPlusChecked(true)}).catch(()=>{if(dkd_alive){setDkdPlusActive(false);setDkdPlusChecked(true)}});return()=>{dkd_alive=false};},[]);\n\n  const visibleGroups=useMemo(()=>groups.map(group=>({...group,items:group.items.filter(item=>!item.adminOnly||isAdmin)})).filter(group=>group.items.length),[isAdmin]);"
);
dkd_patch('app/hub.tsx',
  "  const open=(item:MenuItem)=>router.push(item.route as any);",
  "  const open=(item:MenuItem)=>{if(item.requiresPlus&&(!dkdPlusChecked||!dkdPlusActive)){setDkdPlusPopup(true);return;}router.push(item.route as any)};"
);
dkd_patch('app/hub.tsx',
  '    <BottomDock active="hub" transparent={!dockSolid} floating/>',
  '    <ColorPopup visible={dkdPlusPopup} icon="crown-outline" eyebrow="DRABORNPARK+ GEREKLİ" title="Premium üyelikle açılır" body="Bu özellik için aktif DraBornPark+ aboneliği gerekir. Aboneliğini Google Play üzerinden başlatabilir veya mevcut satın almanı doğrulayabilirsin." accent={palette.yellow} secondary={palette.purple} primaryLabel="DRABORNPARK+ SAYFASINA GİT" onPrimary={()=>{setDkdPlusPopup(false);router.push(\'/feature/plus\')}} secondaryLabel="VAZGEÇ" onSecondary={()=>setDkdPlusPopup(false)} chips={[\'GOOGLE PLAY\',\'PREMIUM ERİŞİM\',\'GÜVENLİ DOĞRULAMA\']}/>\n    <BottomDock active="hub" transparent={!dockSolid} floating/>'
);

// Premium route'lar kart dışından/deep-link ile açılırsa da içerik çalışmaz.
dkd_patch('app/_layout.tsx',
  "import {DkdStartupSplash} from '@/src/components/DkdStartupSplash';",
  "import {DkdStartupSplash} from '@/src/components/DkdStartupSplash';\nimport {PremiumRouteGuard} from '@/src/components/PremiumRouteGuard';"
);
dkd_patch('app/_layout.tsx',
  '<SafeAreaProvider><LivePushRegistration/><NotificationPermissionPrompt/><StatusBar style="light"/>',
  '<SafeAreaProvider><LivePushRegistration/><NotificationPermissionPrompt/><PremiumRouteGuard/><StatusBar style="light"/>'
);

// Görünür sürüm ve admin son sürüm kodu.
for(const [dkd_file,dkd_from,dkd_to] of [
  ['app/index.tsx','<Pill label="v1.0.13" color={palette.purple}/>','<Pill label="v1.0.14" color={palette.purple}/>'],
  ['app/hub.tsx','<Pill label="v1.0.13" color={palette.purple}/>','<Pill label="v1.0.14" color={palette.purple}/>'],
  ['app/factory.tsx','NFC + QR ETİKET MERKEZİ • v1.0.13','NFC + QR ETİKET MERKEZİ • v1.0.14'],
  ['app/t/[id].tsx',"stampLabel:'DraBornPark v1.0.13 • Güvenli Araç İletişimi'","stampLabel:'DraBornPark v1.0.14 • Güvenli Araç İletişimi'"],
  ['app/admin.tsx','const DKD_LATEST_VERSION_CODE=13;','const DKD_LATEST_VERSION_CODE=14;'],
  ['supabase/functions/drabornpark-public-contact/index.ts','const VERSION="1.0.13";','const VERSION="1.0.14";'],
  ['supabase/functions/dkd-drabornpark-app-version/index.ts','const VERSION="1.0.13";','const VERSION="1.0.14";'],
  ['supabase/functions/dkd-drabornpark-app-version/index.ts','const VERSION_CODE=13;','const VERSION_CODE=14;']
])dkd_patch(dkd_file,dkd_from,dkd_to);

// Google Play SubscriptionPurchaseV2 + Orders API: tam iade/PENDING_REFUND artık Premium vermez.
const dkd_google_fn=`import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
const VERSION="1.0.14";const PACKAGE_NAME=Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")||"com.draborneagle.drabornpark";const PRODUCT_ID="drabornpark_plus";const MONTHLY_PLAN=Deno.env.get("GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID")||"monthly";const YEARLY_PLAN=Deno.env.get("GOOGLE_PLAY_YEARLY_BASE_PLAN_ID")||"yearly";const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});const encoder=new TextEncoder();
function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?encoder.encode(input):input;let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replace(/=/g,"").replace(/\\+/g,"-").replace(/\\//g,"_");}
function pemBytes(pem:string){const body=pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\\s+/g,"");const binary=atob(body);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
async function sha256(value:string){const hash=await crypto.subtle.digest("SHA-256",encoder.encode(value));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function googleAccessToken(){const raw=Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");if(!raw)throw new Error("google_play_not_configured");const service=JSON.parse(raw);if(!service.client_email||!service.private_key)throw new Error("google_play_credentials_invalid");const tokenUri=service.token_uri||"https://oauth2.googleapis.com/token";const now=Math.floor(Date.now()/1000);const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));const claims=b64url(JSON.stringify({iss:service.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:tokenUri,iat:now,exp:now+3600}));const signingInput=\`${'${header}.${claims}'}\`;const key=await crypto.subtle.importKey("pkcs8",pemBytes(service.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const signature=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,encoder.encode(signingInput)));const assertion=\`${'${signingInput}.${b64url(signature)}'}\`;const response=await fetch(tokenUri,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});const payload=await response.json().catch(()=>({}));if(!response.ok||!payload.access_token)throw new Error("google_oauth_failed");return String(payload.access_token);}
function mapState(state:string,expiry:string|null){const future=expiry?Date.parse(expiry)>Date.now():false;switch(state){case "SUBSCRIPTION_STATE_ACTIVE":return{status:"PLUS_ACTIVE",entitled:future||!expiry};case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":return{status:"PLUS_GRACE_PERIOD",entitled:future||!expiry};case "SUBSCRIPTION_STATE_CANCELED":return{status:future?"PLUS_CANCELLED":"PLUS_EXPIRED",entitled:future};default:return{status:"PLUS_EXPIRED",entitled:false};}}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});if(req.method!=="POST")return json({error:"method_not_allowed"},405);const url=Deno.env.get("SUPABASE_URL")??"";const anon=Deno.env.get("SUPABASE_ANON_KEY")??"";const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";if(!url||!anon||!serviceKey)return json({error:"server_configuration_error"},500);const authorization=req.headers.get("Authorization")??"";const userDb=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});const adminDb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});try{const {data:{user},error:userError}=await userDb.auth.getUser();if(userError||!user)return json({error:"authentication_required"},401);const body=await req.json().catch(()=>({}));const action=String(body?.action??"verify");if(action!=="verify"&&action!=="restore")return json({error:"unknown_action"},400);const purchaseToken=String(body?.purchaseToken??"").trim();const requestedProduct=String(body?.productId??PRODUCT_ID).trim();if(!purchaseToken)return json({error:"purchase_token_required"},400);if(requestedProduct!==PRODUCT_ID)return json({error:"invalid_product"},400);const accessToken=await googleAccessToken();const endpoint=\`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${'${encodeURIComponent(PACKAGE_NAME)}'}/purchases/subscriptionsv2/tokens/${'${encodeURIComponent(purchaseToken)}'}\`;const googleResponse=await fetch(endpoint,{headers:{Authorization:\`Bearer ${'${accessToken}'}\`,Accept:"application/json"}});const google=await googleResponse.json().catch(()=>({}));if(!googleResponse.ok)return json({error:"google_play_verification_failed",status:googleResponse.status},400);const lines=Array.isArray(google.lineItems)?google.lineItems:[];const line=lines.find((item:any)=>String(item?.productId??"")===PRODUCT_ID);if(!line)return json({error:"product_not_found_in_purchase"},400);const basePlanId=String(line?.offerDetails?.basePlanId??"");if(![MONTHLY_PLAN,YEARLY_PLAN].includes(basePlanId))return json({error:"invalid_base_plan"},400);const obfuscated=String(google?.externalAccountIdentifiers?.obfuscatedExternalAccountId??"");const expectedObfuscated=user.id.replace(/-/g,"");if(obfuscated&&obfuscated!==expectedObfuscated)return json({error:"account_mismatch"},403);const expiry=line?.expiryTime?String(line.expiryTime):null;const state=String(google?.subscriptionState??"");let mapped=mapState(state,expiry);const latestOrderId=String(line?.latestSuccessfulOrderId??google?.latestOrderId??"");let orderState="UNKNOWN";if(latestOrderId){const orderEndpoint=\`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${'${encodeURIComponent(PACKAGE_NAME)}'}/orders/${'${encodeURIComponent(latestOrderId)}'}\`;const orderResponse=await fetch(orderEndpoint,{headers:{Authorization:\`Bearer ${'${accessToken}'}\`,Accept:"application/json"}});const order=await orderResponse.json().catch(()=>({}));if(!orderResponse.ok)return json({error:"google_play_order_verification_failed",status:orderResponse.status},502);orderState=String(order?.state??"UNKNOWN");if(["REFUNDED","PENDING_REFUND","CANCELED"].includes(orderState))mapped={status:"PLUS_REFUNDED",entitled:false};}const autoRenewing=Boolean(line?.autoRenewingPlan?.autoRenewEnabled);const tokenHash=await sha256(purchaseToken);const {data:existing}=await adminDb.from("drabornpark_subscriptions").select("id,user_id").eq("purchase_token_hash",tokenHash).maybeSingle();if(existing&&existing.user_id!==user.id)return json({error:"purchase_already_claimed"},409);const row={user_id:user.id,provider:"google_play",product_id:PRODUCT_ID,base_plan_id:basePlanId,purchase_token_hash:tokenHash,status:mapped.status,expires_at:expiry,auto_renewing:autoRenewing,last_verified_at:new Date().toISOString(),raw_provider_state:{subscriptionState:state,orderState,basePlanId,productId:PRODUCT_ID,latestOrderId:latestOrderId||null},updated_at:new Date().toISOString()};if(existing){const {error}=await adminDb.from("drabornpark_subscriptions").update(row).eq("id",existing.id);if(error)throw error;}else{const {error}=await adminDb.from("drabornpark_subscriptions").insert(row);if(error)throw error;}const {data:profile}=await adminDb.from("drabornpark_profiles").select("plus_trial_until").eq("user_id",user.id).maybeSingle();const activeTrial=profile?.plus_trial_until&&Date.parse(profile.plus_trial_until)>Date.now();const profileStatus=mapped.entitled?mapped.status:(activeTrial&&mapped.status!=="PLUS_REFUNDED"?"PLUS_TRIAL":"BASIC");const {error:profileError}=await adminDb.from("drabornpark_profiles").update({subscription_status:profileStatus,updated_at:new Date().toISOString()}).eq("user_id",user.id);if(profileError)throw profileError;return json({ok:true,version:VERSION,entitled:mapped.entitled,status:mapped.status,profileStatus,productId:PRODUCT_ID,basePlanId,expiresAt:expiry,autoRenewing,orderState});}catch(error){const message=String((error as any)?.message||error||"");console.error(error);if(message==="google_play_not_configured")return json({error:message,setupRequired:true},503);if(message==="google_play_credentials_invalid"||message==="google_oauth_failed")return json({error:message},502);return json({error:"verification_failed"},500);}});`;
dkd_write('supabase/functions/dkd-drabornpark-google-play/index.ts',dkd_google_fn);

console.log('DraBornPark v1.0.14 source transforms ready • strict server entitlement • refunded order lock • Premium route/card gate.');
