import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const VERSION="1.0.16";
const PACKAGE_NAME=Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")||"com.draborneagle.drabornpark";
const PRODUCT_ID="drabornpark_plus";
const MONTHLY_PLAN=Deno.env.get("GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID")||"monthly";
const YEARLY_PLAN=Deno.env.get("GOOGLE_PLAY_YEARLY_BASE_PLAN_ID")||"yearly";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});
const encoder=new TextEncoder();

function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?encoder.encode(input):input;let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function pemBytes(pem:string){const body=pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\s+/g,"");const binary=atob(body);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
async function sha256(value:string){const hash=await crypto.subtle.digest("SHA-256",encoder.encode(value));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function googleAccessToken(){const raw=Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");if(!raw)throw new Error("google_play_not_configured");const service=JSON.parse(raw);if(!service.client_email||!service.private_key)throw new Error("google_play_credentials_invalid");const tokenUri=service.token_uri||"https://oauth2.googleapis.com/token";const now=Math.floor(Date.now()/1000);const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));const claims=b64url(JSON.stringify({iss:service.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:tokenUri,iat:now,exp:now+3600}));const signingInput=`${header}.${claims}`;const key=await crypto.subtle.importKey("pkcs8",pemBytes(service.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const signature=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,encoder.encode(signingInput)));const assertion=`${signingInput}.${b64url(signature)}`;const response=await fetch(tokenUri,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});const payload=await response.json().catch(()=>({}));if(!response.ok||!payload.access_token)throw new Error("google_oauth_failed");return String(payload.access_token);}
function mapState(state:string,expiry:string|null){const future=expiry?Date.parse(expiry)>Date.now():false;switch(state){case "SUBSCRIPTION_STATE_ACTIVE":return{status:"PLUS_ACTIVE",entitled:future||!expiry};case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":return{status:"PLUS_GRACE_PERIOD",entitled:future||!expiry};case "SUBSCRIPTION_STATE_CANCELED":return{status:future?"PLUS_CANCELLED":"PLUS_EXPIRED",entitled:future};default:return{status:"PLUS_EXPIRED",entitled:false};}}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")??"";const anon=Deno.env.get("SUPABASE_ANON_KEY")??"";const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!url||!anon||!serviceKey)return json({error:"server_configuration_error"},500);
  const authorization=req.headers.get("Authorization")??"";
  const userDb=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const adminDb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:{user},error:userError}=await userDb.auth.getUser();if(userError||!user)return json({error:"authentication_required"},401);
    const body=await req.json().catch(()=>({}));const action=String(body?.action??"verify");if(action!=="verify"&&action!=="restore")return json({error:"unknown_action"},400);
    const purchaseToken=String(body?.purchaseToken??"").trim();const requestedProduct=String(body?.productId??PRODUCT_ID).trim();if(!purchaseToken)return json({error:"purchase_token_required"},400);if(requestedProduct!==PRODUCT_ID)return json({error:"invalid_product"},400);
    const accessToken=await googleAccessToken();
    const endpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const googleResponse=await fetch(endpoint,{headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"}});const google=await googleResponse.json().catch(()=>({}));if(!googleResponse.ok)return json({error:"google_play_verification_failed",status:googleResponse.status},400);
    const lines=Array.isArray(google.lineItems)?google.lineItems:[];const line=lines.find((item:any)=>String(item?.productId??"")===PRODUCT_ID);if(!line)return json({error:"product_not_found_in_purchase"},400);
    const basePlanId=String(line?.offerDetails?.basePlanId??"");if(![MONTHLY_PLAN,YEARLY_PLAN].includes(basePlanId))return json({error:"invalid_base_plan"},400);
    const obfuscated=String(google?.externalAccountIdentifiers?.obfuscatedExternalAccountId??"");const expectedObfuscated=user.id.replace(/-/g,"");if(obfuscated&&obfuscated!==expectedObfuscated)return json({error:"account_mismatch"},403);

    const googleExpiry=line?.expiryTime?String(line.expiryTime):null;const state=String(google?.subscriptionState??"");let mapped=mapState(state,googleExpiry);
    const latestOrderId=String(line?.latestSuccessfulOrderId??google?.latestOrderId??"");let orderState="UNKNOWN";
    if(latestOrderId){const orderEndpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/orders/${encodeURIComponent(latestOrderId)}`;const orderResponse=await fetch(orderEndpoint,{headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"}});const order=await orderResponse.json().catch(()=>({}));if(!orderResponse.ok)return json({error:"google_play_order_verification_failed",status:orderResponse.status},502);orderState=String(order?.state??"UNKNOWN");if(["REFUNDED","PENDING_REFUND","CANCELED"].includes(orderState))mapped={status:"PLUS_REFUNDED",entitled:false};}

    const autoRenewing=Boolean(line?.autoRenewingPlan?.autoRenewEnabled);const tokenHash=await sha256(purchaseToken);
    const {data:existing}=await adminDb.from("drabornpark_subscriptions").select("id,user_id,raw_provider_state").eq("purchase_token_hash",tokenHash).maybeSingle();if(existing&&existing.user_id!==user.id)return json({error:"purchase_already_claimed"},409);
    const {data:profile}=await adminDb.from("drabornpark_profiles").select("plus_trial_until").eq("user_id",user.id).maybeSingle();

    const nowMs=Date.now();
    const previousBonus=Number((existing as any)?.raw_provider_state?.dkd_v115?.trialBonusMs);
    const trialUntilMs=profile?.plus_trial_until?Date.parse(profile.plus_trial_until):0;
    const trialBonusMs=Number.isFinite(previousBonus)&&previousBonus>=0?previousBonus:Math.max(0,trialUntilMs-nowMs);
    const googleExpiryMs=googleExpiry?Date.parse(googleExpiry):0;
    const effectiveExpiryMs=googleExpiryMs>0?googleExpiryMs+trialBonusMs:0;
    const bonusTailAllowed=["SUBSCRIPTION_STATE_CANCELED","SUBSCRIPTION_STATE_EXPIRED"].includes(state)&&mapped.status!=="PLUS_REFUNDED";
    const bonusTailActive=bonusTailAllowed&&trialBonusMs>0&&effectiveExpiryMs>nowMs;
    const effectiveEntitled=mapped.entitled||bonusTailActive;
    const effectiveStatus=mapped.entitled?mapped.status:(bonusTailActive?"PLUS_CANCELLED":mapped.status);
    const effectiveExpiry=effectiveExpiryMs>0?new Date(effectiveExpiryMs).toISOString():googleExpiry;

    const row={user_id:user.id,provider:"google_play",product_id:PRODUCT_ID,base_plan_id:basePlanId,purchase_token_hash:tokenHash,status:effectiveStatus,expires_at:effectiveExpiry,auto_renewing:autoRenewing,last_verified_at:new Date().toISOString(),raw_provider_state:{subscriptionState:state,orderState,basePlanId,productId:PRODUCT_ID,latestOrderId:latestOrderId||null,dkd_v115:{googleExpiry,trialBonusMs,effectiveExpiry}},updated_at:new Date().toISOString()};
    if(existing){const {error}=await adminDb.from("drabornpark_subscriptions").update(row).eq("id",existing.id);if(error)throw error;}else{const {error}=await adminDb.from("drabornpark_subscriptions").insert(row);if(error)throw error;}

    const activeTrial=trialUntilMs>nowMs;
    const profileStatus=effectiveEntitled?effectiveStatus:(activeTrial&&effectiveStatus!=="PLUS_REFUNDED"?"PLUS_TRIAL":"BASIC");
    const {error:profileError}=await adminDb.from("drabornpark_profiles").update({subscription_status:profileStatus,updated_at:new Date().toISOString()}).eq("user_id",user.id);if(profileError)throw profileError;
    return json({ok:true,version:VERSION,entitled:effectiveEntitled,status:effectiveStatus,profileStatus,productId:PRODUCT_ID,basePlanId,expiresAt:effectiveExpiry,googleExpiresAt:googleExpiry,trialBonusMs,autoRenewing,orderState});
  }catch(error){const message=String((error as any)?.message||error||"");console.error(error);if(message==="google_play_not_configured")return json({error:message,setupRequired:true},503);if(message==="google_play_credentials_invalid"||message==="google_oauth_failed")return json({error:message},502);return json({error:"verification_failed"},500);}
});
