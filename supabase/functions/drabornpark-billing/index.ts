import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION="0.5.4";
const PACKAGE_NAME="com.draborneagle.drabornpark";
const PLUS_PRODUCT_ID="drabornpark_plus";
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const encoder=new TextEncoder();
const b64url=(value:Uint8Array|string)=>{const bytes=typeof value==="string"?encoder.encode(value):value;let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");};
function pemToBytes(pem:string){const clean=pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\s+/g,"");const raw=atob(clean);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}
async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",encoder.encode(value));return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function googleAccessToken(service:any){const now=Math.floor(Date.now()/1000);const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));const claims=b64url(JSON.stringify({iss:service.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3500}));const unsigned=`${header}.${claims}`;const key=await crypto.subtle.importKey("pkcs8",pemToBytes(String(service.private_key)),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,encoder.encode(unsigned));const assertion=`${unsigned}.${b64url(new Uint8Array(signature))}`;const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});const payload=await response.json().catch(()=>null);if(!response.ok||!payload?.access_token)throw new Error(`google_oauth_failed:${response.status}`);return String(payload.access_token);}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")??"";const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";const token=(req.headers.get("authorization")??"").replace(/^Bearer\s+/i,"").trim();
  if(!url||!serviceKey||!token)return json({error:"server_configuration_error"},500);
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:userData,error:userError}=await db.auth.getUser(token);if(userError||!userData.user)return json({error:"unauthorized"},401);
    const input=await req.json().catch(()=>({}));if(String(input?.action??"verify_google")!=="verify_google")return json({error:"unknown_action"},400);
    const purchaseToken=String(input?.purchaseToken??"").trim();const productId=String(input?.productId??PLUS_PRODUCT_ID).trim();const requestedBasePlan=String(input?.basePlanId??"").trim()||null;
    if(!purchaseToken||productId!==PLUS_PRODUCT_ID)return json({error:"invalid_purchase_payload"},400);
    const secret=Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")??"";if(!secret)return json({error:"provider_not_configured",message:"Google Play service account secret is not configured."},503);
    let service:any;try{service=JSON.parse(secret);}catch{return json({error:"provider_configuration_invalid"},500);}if(!service?.client_email||!service?.private_key)return json({error:"provider_configuration_invalid"},500);
    const accessToken=await googleAccessToken(service);const endpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${accessToken}`}});const provider=await response.json().catch(()=>null);if(!response.ok)return json({error:"purchase_verification_failed",providerStatus:response.status},400);
    const lineItems=Array.isArray(provider?.lineItems)?provider.lineItems:[];const productLine=lineItems.find((item:any)=>String(item?.productId??"")===PLUS_PRODUCT_ID);if(!productLine)return json({error:"product_mismatch"},400);
    const expiresAt=productLine?.expiryTime?new Date(productLine.expiryTime):null;const expiryFuture=Boolean(expiresAt&&Number.isFinite(expiresAt.getTime())&&expiresAt.getTime()>Date.now());const providerState=String(provider?.subscriptionState??"");const entitledStates=new Set(["SUBSCRIPTION_STATE_ACTIVE","SUBSCRIPTION_STATE_IN_GRACE_PERIOD","SUBSCRIPTION_STATE_CANCELED"]);const entitlement=entitledStates.has(providerState)&&expiryFuture;const status=providerState==="SUBSCRIPTION_STATE_IN_GRACE_PERIOD"?"grace_period":entitlement?"active":providerState==="SUBSCRIPTION_STATE_ON_HOLD"?"on_hold":"inactive";const basePlanId=String(productLine?.offerDetails?.basePlanId??requestedBasePlan??"")||null;const autoRenewing=Boolean(productLine?.autoRenewingPlan?.autoRenewEnabled);const purchaseHash=await sha256(purchaseToken);const safeState={subscriptionState:providerState,acknowledgementState:provider?.acknowledgementState??null,latestOrderId:provider?.latestOrderId??null,lineItem:{productId:PLUS_PRODUCT_ID,basePlanId,expiryTime:productLine?.expiryTime??null,autoRenewing}};
    const {error:subError}=await db.from("drabornpark_subscriptions").upsert({user_id:userData.user.id,provider:"google_play",product_id:PLUS_PRODUCT_ID,base_plan_id:basePlanId,purchase_token_hash:purchaseHash,status,expires_at:expiresAt?.toISOString()??null,auto_renewing:autoRenewing,last_verified_at:new Date().toISOString(),raw_provider_state:safeState,updated_at:new Date().toISOString()},{onConflict:"user_id,provider,product_id"});if(subError)throw subError;
    const {data:profile}=await db.from("drabornpark_profiles").select("plus_trial_until").eq("user_id",userData.user.id).maybeSingle();const trialActive=Boolean(profile?.plus_trial_until&&new Date(profile.plus_trial_until).getTime()>Date.now());const nextProfileStatus=entitlement?"PLUS_ACTIVE":trialActive?"PLUS_TRIAL":"BASIC";const {error:profileError}=await db.from("drabornpark_profiles").update({subscription_status:nextProfileStatus,updated_at:new Date().toISOString()}).eq("user_id",userData.user.id);if(profileError)throw profileError;
    return json({ok:true,version:VERSION,entitlement,status,subscriptionState:providerState,productId:PLUS_PRODUCT_ID,basePlanId,expiresAt:expiresAt?.toISOString()??null,autoRenewing});
  }catch(error){console.error("billing_error",error);return json({error:"request_failed"},500);}
});
