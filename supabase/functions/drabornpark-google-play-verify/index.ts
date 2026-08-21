import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const dkdJsonHeaders={"content-type":"application/json","cache-control":"no-store"};
const DKD_PACKAGE_NAME="com.draborneagle.drabornpark";
const DKD_ALLOWED_PRODUCTS=new Set(["drabornpark_plus_monthly","drabornpark_plus_yearly"]);

function dkdB64url(input:Uint8Array|string){const dkdBytes=typeof input==="string"?new TextEncoder().encode(input):input;let dkdBinary="";for(const dkdByte of dkdBytes)dkdBinary+=String.fromCharCode(dkdByte);return btoa(dkdBinary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
function dkdPemBytes(pem:string){const dkdBase64=pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\s+/g,"");const dkdRaw=atob(dkdBase64);const dkdOut=new Uint8Array(dkdRaw.length);for(let dkdIndex=0;dkdIndex<dkdRaw.length;dkdIndex++)dkdOut[dkdIndex]=dkdRaw.charCodeAt(dkdIndex);return dkdOut;}
async function dkdAccessToken(serviceAccount:any){const dkdNow=Math.floor(Date.now()/1000);const dkdHeader=dkdB64url(JSON.stringify({alg:"RS256",typ:"JWT"}));const dkdClaim=dkdB64url(JSON.stringify({iss:serviceAccount.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:"https://oauth2.googleapis.com/token",iat:dkdNow,exp:dkdNow+3500}));const dkdUnsigned=`${dkdHeader}.${dkdClaim}`;const dkdKey=await crypto.subtle.importKey("pkcs8",dkdPemBytes(serviceAccount.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const dkdSignature=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",dkdKey,new TextEncoder().encode(dkdUnsigned)));const dkdAssertion=`${dkdUnsigned}.${dkdB64url(dkdSignature)}`;const dkdBody=new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:dkdAssertion});const dkdResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:dkdBody});const dkdPayload=await dkdResponse.json();if(!dkdResponse.ok||!dkdPayload.access_token)throw new Error(dkdPayload.error_description||dkdPayload.error||"google_oauth_failed");return String(dkdPayload.access_token);}
async function dkdSha256(value:string){const dkdDigest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));return Array.from(dkdDigest).map(dkdValue=>dkdValue.toString(16).padStart(2,"0")).join("");}
function dkdMapStatus(state:string){if(state==="SUBSCRIPTION_STATE_ACTIVE")return "active";if(state==="SUBSCRIPTION_STATE_IN_GRACE_PERIOD")return "grace_period";if(state==="SUBSCRIPTION_STATE_CANCELED")return "canceled";if(state==="SUBSCRIPTION_STATE_PAUSED")return "paused";if(state==="SUBSCRIPTION_STATE_ON_HOLD")return "on_hold";if(state==="SUBSCRIPTION_STATE_PENDING")return "pending";return "expired";}
function dkdResponse(payload:unknown,status=200){return new Response(JSON.stringify(payload),{status,headers:dkdJsonHeaders});}

Deno.serve(async(dkdReq:Request)=>{
  if(dkdReq.method!=="POST")return dkdResponse({error:"method_not_allowed"},405);
  const dkdUrl=Deno.env.get("SUPABASE_URL")!;const dkdAnon=Deno.env.get("SUPABASE_ANON_KEY")!;const dkdService=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;const dkdAuth=dkdReq.headers.get("authorization")||"";
  const dkdUserClient=createClient(dkdUrl,dkdAnon,{global:{headers:{Authorization:dkdAuth}}});const {data:dkdUserData,error:dkdUserError}=await dkdUserClient.auth.getUser();
  if(dkdUserError||!dkdUserData.user)return dkdResponse({error:"unauthorized"},401);
  const dkdBody=await dkdReq.json().catch(()=>({}));const dkdProductId=String(dkdBody?.productId||"");const dkdPurchaseToken=String(dkdBody?.purchaseToken||"");const dkdRequestedBasePlan=dkdBody?.basePlanId?String(dkdBody.basePlanId):null;
  if(!DKD_ALLOWED_PRODUCTS.has(dkdProductId)||!dkdPurchaseToken)return dkdResponse({error:"invalid_purchase_payload"},400);
  const dkdRawSecret=Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");if(!dkdRawSecret)return dkdResponse({error:"google_play_service_account_not_configured"},503);
  try{
    const dkdServiceAccount=JSON.parse(dkdRawSecret);const dkdGoogleToken=await dkdAccessToken(dkdServiceAccount);
    const dkdEndpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(DKD_PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(dkdPurchaseToken)}`;
    const dkdGoogleRes=await fetch(dkdEndpoint,{headers:{authorization:`Bearer ${dkdGoogleToken}`}});const dkdGoogle=await dkdGoogleRes.json();
    if(!dkdGoogleRes.ok)return dkdResponse({error:"google_play_verification_failed",details:dkdGoogle?.error?.message||null},400);

    const dkdExternalId=String(dkdGoogle?.externalAccountIdentifiers?.obfuscatedExternalAccountId||"");
    if(dkdExternalId&&dkdExternalId!==dkdUserData.user.id)return dkdResponse({error:"purchase_account_mismatch"},403);

    const dkdLineItems=Array.isArray(dkdGoogle.lineItems)?dkdGoogle.lineItems:[];const dkdMatching=dkdLineItems.find((dkdItem:any)=>dkdItem?.productId===dkdProductId)||dkdLineItems[0]||{};
    if(dkdMatching?.productId&&dkdMatching.productId!==dkdProductId)return dkdResponse({error:"product_mismatch"},400);
    const dkdBasePlanId=dkdMatching?.offerDetails?.basePlanId||dkdRequestedBasePlan||null;const dkdExpiresAt=dkdMatching?.expiryTime||null;const dkdStatus=dkdMapStatus(String(dkdGoogle.subscriptionState||""));const dkdAutoRenewing=Boolean(dkdMatching?.autoRenewingPlan?.autoRenewEnabled);const dkdPurchaseTokenHash=await dkdSha256(dkdPurchaseToken);
    const dkdAdmin=createClient(dkdUrl,dkdService,{auth:{persistSession:false,autoRefreshToken:false}});

    const {data:dkdExisting,error:dkdExistingError}=await dkdAdmin.from("drabornpark_subscriptions").select("id,user_id").eq("purchase_token_hash",dkdPurchaseTokenHash).maybeSingle();
    if(dkdExistingError)throw dkdExistingError;
    if(dkdExisting?.user_id&&dkdExisting.user_id!==dkdUserData.user.id)return dkdResponse({error:"purchase_owner_mismatch"},403);

    let dkdAcknowledged=dkdGoogle.acknowledgementState==="ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
    if(!dkdAcknowledged){
      const dkdAckUrl=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(DKD_PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(dkdProductId)}/tokens/${encodeURIComponent(dkdPurchaseToken)}:acknowledge`;
      const dkdAckRes=await fetch(dkdAckUrl,{method:"POST",headers:{authorization:`Bearer ${dkdGoogleToken}`,"content-type":"application/json"},body:"{}"});
      if(!dkdAckRes.ok){const dkdAckError=await dkdAckRes.json().catch(()=>({}));return dkdResponse({error:"google_play_acknowledgement_failed",details:dkdAckError?.error?.message||null},502);}
      dkdAcknowledged=true;
    }

    const dkdRecord={user_id:dkdUserData.user.id,provider:"google_play",product_id:dkdProductId,base_plan_id:dkdBasePlanId,purchase_token_hash:dkdPurchaseTokenHash,status:dkdStatus,started_at:dkdGoogle.startTime||new Date().toISOString(),expires_at:dkdExpiresAt,auto_renewing:dkdAutoRenewing,last_verified_at:new Date().toISOString(),order_id:dkdMatching?.latestSuccessfulOrderId||dkdGoogle.latestOrderId||null,package_name:DKD_PACKAGE_NAME,environment:"production",acknowledged:dkdAcknowledged,raw_provider_state:{subscriptionState:dkdGoogle.subscriptionState,accountBound:Boolean(dkdExternalId),lineItems:dkdLineItems.map((dkdItem:any)=>({productId:dkdItem?.productId,expiryTime:dkdItem?.expiryTime,basePlanId:dkdItem?.offerDetails?.basePlanId||null,autoRenewEnabled:dkdItem?.autoRenewingPlan?.autoRenewEnabled??null}))},updated_at:new Date().toISOString()};
    const {data:dkdStored,error:dkdStoreError}=await dkdAdmin.from("drabornpark_subscriptions").upsert(dkdRecord,{onConflict:"purchase_token_hash"}).select("id,status,product_id,base_plan_id,expires_at,auto_renewing,acknowledged").single();if(dkdStoreError)throw dkdStoreError;

    const dkdNotExpired=!dkdExpiresAt||new Date(dkdExpiresAt).getTime()>Date.now();const dkdEntitled=["active","grace_period","canceled"].includes(dkdStatus)&&dkdNotExpired;
    if(dkdEntitled){
      await dkdAdmin.from("drabornpark_profiles").update({subscription_status:"PLUS_ACTIVE",updated_at:new Date().toISOString()}).eq("user_id",dkdUserData.user.id);
    }else{
      const {data:dkdProfile}=await dkdAdmin.from("drabornpark_profiles").select("plus_trial_until").eq("user_id",dkdUserData.user.id).maybeSingle();const dkdTrialActive=Boolean(dkdProfile?.plus_trial_until&&new Date(dkdProfile.plus_trial_until).getTime()>Date.now());
      await dkdAdmin.from("drabornpark_profiles").update({subscription_status:dkdTrialActive?"PLUS_TRIAL":"BASIC",updated_at:new Date().toISOString()}).eq("user_id",dkdUserData.user.id);
    }
    return dkdResponse({ok:true,verified:true,entitled:dkdEntitled,subscription:dkdStored});
  }catch(dkdError:any){console.error("drabornpark-google-play-verify",String(dkdError?.message||dkdError));return dkdResponse({error:"verification_internal_error"},500);}
});
