import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION="0.5.3";
const PUSH_CHANNEL="drabornpark-alerts-v3";
const EVIDENCE_BUCKET="drabornpark-private";
const MAX_EVIDENCE_BYTES=4*1024*1024;
const MAX_EVIDENCE_BASE64=5_700_000;
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});
async function sha256(value:string){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function hitRateLimit(db:any,key:string,limit=3,windowSeconds=1800,blockSeconds=1800){const {data,error}=await db.rpc("drabornpark_hit_rate_limit",{drabornpark_bucket_key:key,drabornpark_limit:limit,drabornpark_window_seconds:windowSeconds,drabornpark_block_seconds:blockSeconds});if(error)throw error;const r=Array.isArray(data)?data[0]:data;return{blocked:Boolean(r?.blocked),retryAfter:Number(r?.retry_after??0)};}
async function resolveTag(db:any,input:string){const raw=String(input??"").trim();if(!raw)return null;const {data:snapshot,error}=await db.rpc("drabornpark_public_tag_snapshot",{drabornpark_tag_code:raw});if(error)throw error;if(!snapshot?.tagCode)return null;const {data:tag,error:tagError}=await db.from("drabornpark_tags").select("id,tag_code,public_alias,vehicle_id,owner_user_id,status").eq("tag_code",snapshot.tagCode).maybeSingle();if(tagError)throw tagError;return tag?{tag,snapshot}:null;}
function parseEvidence(value:any){if(!value)throw new Error("evidence_required");const base64=String(value?.base64||"").replace(/^data:image\/jpeg;base64,/i,"");const mime=String(value?.mime||"");const capturedAt=String(value?.capturedAt||"");if(!base64||base64.length>MAX_EVIDENCE_BASE64||mime!=="image/jpeg")throw new Error("invalid_evidence");const capturedTime=Date.parse(capturedAt);if(!Number.isFinite(capturedTime))throw new Error("invalid_evidence_time");const now=Date.now();if(capturedTime>now+5*60_000||capturedTime<now-30*60_000)throw new Error("invalid_evidence_time");return{base64,mime:"image/jpeg",capturedAt:new Date(capturedTime).toISOString()};}
function decodeEvidence(base64:string){const binary=atob(base64);if(binary.length>MAX_EVIDENCE_BYTES)throw new Error("evidence_too_large");const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
async function uploadEvidence(db:any,ownerUserId:string,sessionId:string,evidence:any){const bytes=decodeEvidence(evidence.base64);const path=`${ownerUserId}/evidence/${sessionId}/${crypto.randomUUID()}.jpg`;const {error}=await db.storage.from(EVIDENCE_BUCKET).upload(path,bytes,{contentType:"image/jpeg",cacheControl:"3600",upsert:false});if(error)throw error;return{attachment_kind:"evidence_photo",attachment_path:path,attachment_captured_at:evidence.capturedAt,attachment_mime:"image/jpeg"};}
async function sendExpoPush(db:any,userId:string,reportId:string){const {data:tokens}=await db.from("drabornpark_push_tokens").select("expo_push_token").eq("user_id",userId).eq("is_enabled",true);const messages=(tokens??[]).filter((t:any)=>/^(ExponentPushToken|ExpoPushToken)\[/.test(String(t.expo_push_token||""))).map((t:any)=>({to:t.expo_push_token,title:"Acil Arama Talebi",body:"Bir ziyaretçi zorunlu kanıt fotoğrafıyla arama talebi gönderdi. Numaranız yalnızca onay verirseniz paylaşılır.",priority:"high",channelId:PUSH_CHANNEL,data:{type:"drabornpark_call_request",reportId,category:"call_request"}}));if(!messages.length)return{sent:0,reason:"no_tokens"};try{const response=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(messages)});return{sent:messages.length,status:response.status};}catch{return{sent:0,reason:"network_error"};}}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method==="GET")return json({ok:true,service:"drabornpark-call-request",version:VERSION,cameraEvidenceRequired:true});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")??"";const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";if(!url||!key)return json({error:"server_configuration_error"},500);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const payload=await req.json();const action=String(payload?.action??"create");const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||req.headers.get("cf-connecting-ip")||"unknown";const ipHash=await sha256(ip);const userAgent=(req.headers.get("user-agent")||"unknown").slice(0,400);
    if(action==="create"){
      const resolved=await resolveTag(db,String(payload?.tagCode??""));if(!resolved||resolved.tag.status!=="ACTIVATED"||!resolved.tag.owner_user_id)return json({error:"tag_not_available"},404);
      const evidence=parseEvidence(payload?.evidence);const tag=resolved.tag;const rate=await hitRateLimit(db,`${ipHash}:call:${tag.tag_code}`);if(rate.blocked)return json({error:"rate_limited",retryAfter:rate.retryAfter},429);
      const message="Zorunlu kanıt fotoğrafıyla acil arama talebi oluşturuldu. Telefon numaranız yalnızca açık onayınızla geçici olarak paylaşılır.";
      const sessionKey=String(payload?.sessionKey??crypto.randomUUID()).slice(0,100);
      const {data:report,error:reportError}=await db.from("drabornpark_reports").insert({tag_id:tag.id,vehicle_id:tag.vehicle_id,owner_user_id:tag.owner_user_id,category:"call_request",priority:"emergency",message_original:message,message_safe:message,sender_session_key:sessionKey,sender_ip_hash:ipHash,sender_user_agent:userAgent}).select("id").single();if(reportError)throw reportError;
      const {data:session,error:sessionError}=await db.from("drabornpark_contact_sessions").insert({report_id:report.id,tag_id:tag.id,owner_user_id:tag.owner_user_id}).select("id,public_token,expires_at").single();if(sessionError)throw sessionError;
      let attachment:any=null;
      try{attachment=await uploadEvidence(db,tag.owner_user_id,session.id,evidence);}catch(error){await db.from("drabornpark_reports").delete().eq("id",report.id);throw error;}
      const {error:messageError}=await db.from("drabornpark_messages").insert({session_id:session.id,sender_role:"visitor",body_original:message,body_safe:message,...attachment});if(messageError){await db.storage.from(EVIDENCE_BUCKET).remove([attachment.attachment_path]);await db.from("drabornpark_reports").delete().eq("id",report.id);throw messageError;}
      const {error:requestError}=await db.from("drabornpark_call_requests").insert({report_id:report.id,session_id:session.id,tag_id:tag.id,owner_user_id:tag.owner_user_id,status:"pending",evidence_path:attachment.attachment_path,captured_at:evidence.capturedAt,expires_at:session.expires_at});if(requestError){await db.storage.from(EVIDENCE_BUCKET).remove([attachment.attachment_path]);await db.from("drabornpark_reports").delete().eq("id",report.id);throw requestError;}
      await db.from("drabornpark_scan_events").insert({tag_id:tag.id,session_key:sessionKey,ip_hash:ipHash,user_agent:userAgent,action:"call_request"});
      await db.from("drabornpark_timeline_events").insert({owner_user_id:tag.owner_user_id,vehicle_id:tag.vehicle_id,event_type:"CALL_REQUEST_RECEIVED",title:"Acil Arama Talebi",description:"Fotoğraflı arama talebi alındı. Telefon numarası yalnızca onayla paylaşılır.",metadata:{reportId:report.id,evidence:true}});
      const push=await sendExpoPush(db,tag.owner_user_id,report.id);
      return json({ok:true,version:VERSION,reportId:report.id,sessionToken:session.public_token,expiresAt:session.expires_at,status:"pending",push},201);
    }
    if(action==="status"){
      const token=String(payload?.sessionToken??"");if(!token)return json({error:"invalid_session"},400);
      const {data:session}=await db.from("drabornpark_contact_sessions").select("id,status,expires_at,owner_user_id").eq("public_token",token).maybeSingle();if(!session)return json({error:"session_not_found"},404);
      const {data:callRequest}=await db.from("drabornpark_call_requests").select("status,expires_at,decided_at").eq("session_id",session.id).maybeSingle();if(!callRequest)return json({error:"call_request_not_found"},404);
      const expired=new Date(callRequest.expires_at)<=new Date();if(expired)return json({ok:true,status:"expired",expiresAt:callRequest.expires_at});
      if(callRequest.status==="approved"){
        const {data:profile}=await db.from("drabornpark_profiles").select("phone_e164").eq("user_id",session.owner_user_id).maybeSingle();const phone=String(profile?.phone_e164||"").trim();if(!phone)return json({ok:true,status:"approved",phoneUnavailable:true,expiresAt:callRequest.expires_at});return json({ok:true,status:"approved",phone,expiresAt:callRequest.expires_at,decidedAt:callRequest.decided_at});
      }
      return json({ok:true,status:callRequest.status,expiresAt:callRequest.expires_at,decidedAt:callRequest.decided_at});
    }
    return json({error:"unknown_action"},400);
  }catch(e){const message=String((e as any)?.message||e||"");console.error(e);if(["evidence_required","invalid_evidence","invalid_evidence_time","evidence_too_large"].includes(message))return json({error:message},400);return json({error:"request_failed"},500);}
});
