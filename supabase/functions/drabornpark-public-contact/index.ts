import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION="0.5.2";
const PUSH_CHANNEL="drabornpark-alerts-v3";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
type Priority="normal"|"high"|"emergency";
const categories:Record<string,{title:string;body:string;priority:Priority}>={
  blocked_exit:{title:"Aracınızı hareket ettirmeniz isteniyor",body:"Bir kullanıcı aracınızın başka bir aracın çıkışını engellediğini bildirdi.",priority:"high"},
  blocking_exit:{title:"Aracınızı hareket ettirmeniz isteniyor",body:"Bir kullanıcı aracınızın başka bir aracın çıkışını engellediğini bildirdi.",priority:"high"},
  move_vehicle:{title:"Aracınızı hareket ettirebilir misiniz?",body:"Aracınızın kısa süre içinde hareket ettirilmesi isteniyor.",priority:"normal"},
  lights_on:{title:"Farlarınız açık olabilir",body:"Aracınız için farların açık olabileceğine dair bildirim gönderildi.",priority:"normal"},
  window_open:{title:"Camınız açık olabilir",body:"Aracınızın camlarından birinin açık olabileceği bildirildi.",priority:"normal"},
  door_open:{title:"Kapınız açık olabilir",body:"Aracınızın kapılarından birinin açık olabileceği bildirildi.",priority:"high"},
  trunk_open:{title:"Bagajınız açık olabilir",body:"Aracınızın bagajının açık olabileceği bildirildi.",priority:"high"},
  damage:{title:"Aracınızda hasar fark edilmiş olabilir",body:"Aracınızla ilgili olası bir hasar bildirimi aldınız.",priority:"high"},
  suspicious:{title:"Şüpheli durum bildirimi",body:"Aracınızın çevresinde şüpheli bir durum olabileceği bildirildi.",priority:"high"},
  towing:{title:"Aracınız çekiliyor olabilir",body:"Aracınızın çekilmekte olabileceğine dair yüksek öncelikli bildirim geldi.",priority:"emergency"},
  animal:{title:"Araçta hayvan var",body:"Araçta bir hayvan bulunduğuna dair acil bildirim gönderildi.",priority:"emergency"},
  child:{title:"Araçta çocuk var",body:"Araçta bir çocuk bulunduğuna dair acil bildirim gönderildi.",priority:"emergency"},
  fire:{title:"Duman / yangın şüphesi",body:"Aracınızla ilgili duman veya yangın şüphesi bildirildi.",priority:"emergency"},
  forgotten_item:{title:"Eşya veya anahtar unutulmuş olabilir",body:"Aracınızda eşya veya anahtar unutulmuş olabileceği bildirildi.",priority:"normal"},
  witness:{title:"Bir olaya şahit olundu",body:"Aracınızla ilgili bir olaya şahit olan kullanıcı bildirim gönderdi.",priority:"high"},
  emergency:{title:"Acil durum bildirimi",body:"Aracınızla ilgili acil müdahale gerektirebilecek bir durum bildirildi.",priority:"emergency"},
  other:{title:"Yeni araç bildirimi",body:"DraBornPark üzerinden aracınızla ilgili yeni bir bildirim gönderildi.",priority:"normal"}
};

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});
async function sha256(value:string){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
function sanitizeMessage(input?:string){if(!input)return null;let v=input.trim().slice(0,700);v=v.replace(/(?:\+?90\s*)?(?:0\s*)?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g,"[telefon numarası gizlendi]");v=v.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,"[e-posta gizlendi]");if(/(amk|aq|orospu|siktir|piç|gerizekalı|salak|aptal|lan\b)/gi.test(v))return "Araçla ilgili serbest mesaj DraBornPark güvenlik filtresi tarafından nötrleştirildi. Lütfen bildirimin kategorisini dikkate alın.";return v;}
async function hitRateLimit(db:any,key:string,limit=6,windowSeconds=600,blockSeconds=1800){const {data,error}=await db.rpc("drabornpark_hit_rate_limit",{drabornpark_bucket_key:key,drabornpark_limit:limit,drabornpark_window_seconds:windowSeconds,drabornpark_block_seconds:blockSeconds});if(error)throw error;const r=Array.isArray(data)?data[0]:data;return{blocked:Boolean(r?.blocked),retryAfter:Number(r?.retry_after??0)};}
async function resolveTag(db:any,input:string){const raw=String(input??"").trim();if(!raw)return null;const {data:snapshot,error}=await db.rpc("drabornpark_public_tag_snapshot",{drabornpark_tag_code:raw});if(error)throw error;if(!snapshot?.tagCode)return null;const {data:tag,error:tagError}=await db.from("drabornpark_tags").select("id,tag_code,public_alias,vehicle_id,owner_user_id,status").eq("tag_code",snapshot.tagCode).maybeSingle();if(tagError)throw tagError;return tag?{tag,snapshot}:null;}
async function sendExpoPush(db:any,userIds:string[],title:string,body:string,data:Record<string,unknown>,priority:Priority="normal"){
  if(!userIds.length)return{sent:0,reason:"no_recipients"};
  const {data:tokens}=await db.from("drabornpark_push_tokens").select("id,user_id,expo_push_token").in("user_id",userIds).eq("is_enabled",true);
  if(!tokens?.length)return{sent:0,reason:"no_tokens"};
  const messages=tokens.filter((t:any)=>/^(ExponentPushToken|ExpoPushToken)\[/.test(String(t.expo_push_token||""))).map((t:any)=>({to:t.expo_push_token,title,body,priority:priority==="emergency"?"high":"default",channelId:PUSH_CHANNEL,data}));
  if(!messages.length)return{sent:0,reason:"invalid_tokens"};
  try{const response=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(messages)});const result=await response.json().catch(()=>null);console.log("expo_push",JSON.stringify({status:response.status,result}));return{sent:messages.length,status:response.status};}catch(e){console.error("push_delivery_error",e);return{sent:0,reason:"network_error"};}
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method==="GET")return json({ok:true,service:"drabornpark-public-contact",version:VERSION,publicWeb:"https://www.draborneagle.com/DraBornPark/"});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")??"";
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!url||!key)return json({error:"server_configuration_error"},500);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

  try{
    const payload=await req.json();
    const action=String(payload?.action??"lookup");
    const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||req.headers.get("cf-connecting-ip")||"unknown";
    const ipHash=await sha256(ip);
    const userAgent=(req.headers.get("user-agent")||"unknown").slice(0,400);

    if(action==="lookup"){
      const rate=await hitRateLimit(db,`${ipHash}:lookup`,30,600,600);
      if(rate.blocked)return json({error:"rate_limited",retryAfter:rate.retryAfter},429);
      const resolved=await resolveTag(db,String(payload?.tagCode??""));
      if(!resolved)return json({error:"tag_not_found"},404);
      await db.from("drabornpark_scan_events").insert({tag_id:resolved.tag.id,ip_hash:ipHash,user_agent:userAgent,action:"lookup"});
      return json({ok:true,version:VERSION,snapshot:resolved.snapshot,categories:Object.entries(categories).filter(([k])=>k!=="blocked_exit").map(([categoryKey,value])=>({key:categoryKey,...value}))});
    }

    if(action==="notify"){
      const resolved=await resolveTag(db,String(payload?.tagCode??""));
      if(!resolved||resolved.tag.status!=="ACTIVATED"||!resolved.tag.owner_user_id)return json({error:"tag_not_available"},404);
      const tag=resolved.tag;
      const sessionKey=String(payload?.sessionKey??crypto.randomUUID()).slice(0,100);
      const categoryKey=String(payload?.category??"other");
      const category=categories[categoryKey]??categories.other;
      const rate=await hitRateLimit(db,`${ipHash}:${tag.tag_code}`);
      if(rate.blocked)return json({error:"rate_limited",retryAfter:rate.retryAfter},429);
      const original=payload?.message?String(payload.message).slice(0,700):null;
      const safe=sanitizeMessage(original)||category.body;
      const {data:report,error:reportError}=await db.from("drabornpark_reports").insert({tag_id:tag.id,vehicle_id:tag.vehicle_id,owner_user_id:tag.owner_user_id,category:categoryKey,priority:category.priority,message_original:original,message_safe:safe,sender_session_key:sessionKey,sender_ip_hash:ipHash,sender_user_agent:userAgent}).select("id").single();
      if(reportError)throw reportError;
      const {data:session,error:sessionError}=await db.from("drabornpark_contact_sessions").insert({report_id:report.id,tag_id:tag.id,owner_user_id:tag.owner_user_id}).select("id,public_token,expires_at").single();
      if(sessionError)throw sessionError;
      const {data:initialMessage,error:initialError}=await db.from("drabornpark_messages").insert({session_id:session.id,sender_role:"visitor",body_original:original??safe,body_safe:safe}).select("id,sender_role,body_safe,created_at").single();
      if(initialError)throw initialError;
      await db.from("drabornpark_scan_events").insert({tag_id:tag.id,session_key:sessionKey,ip_hash:ipHash,user_agent:userAgent,action:"notify"});
      await db.from("drabornpark_timeline_events").insert({owner_user_id:tag.owner_user_id,vehicle_id:tag.vehicle_id,event_type:"REPORT_RECEIVED",title:category.title,description:safe,metadata:{reportId:report.id,priority:category.priority}});
      const push=await sendExpoPush(db,[tag.owner_user_id],category.title,safe,{type:"drabornpark_report",reportId:report.id,category:categoryKey},category.priority);
      return json({ok:true,reportId:report.id,sessionToken:session.public_token,expiresAt:session.expires_at,initialMessage,push,ownerMessage:"Bildirim DraBornPark üzerinden güvenli şekilde iletildi."},201);
    }

    if(action==="chat"){
      const token=String(payload?.sessionToken??"");
      const bodyOriginal=String(payload?.message??"").trim().slice(0,700);
      if(!token||!bodyOriginal)return json({error:"invalid_chat_payload"},400);
      const {data:session}=await db.from("drabornpark_contact_sessions").select("id,status,expires_at,tag_id,owner_user_id,report_id").eq("public_token",token).maybeSingle();
      if(!session||session.status!=="open"||new Date(session.expires_at)<=new Date())return json({error:"session_closed"},410);
      const rate=await hitRateLimit(db,`${ipHash}:chat:${token}`,30,600,1200);
      if(rate.blocked)return json({error:"rate_limited",retryAfter:rate.retryAfter},429);
      const bodySafe=sanitizeMessage(bodyOriginal)||"Mesaj güvenlik filtresi tarafından temizlendi.";
      const {data:message,error:messageError}=await db.from("drabornpark_messages").insert({session_id:session.id,sender_role:"visitor",body_original:bodyOriginal,body_safe:bodySafe}).select("id,sender_role,body_safe,created_at").single();
      if(messageError)throw messageError;
      await db.from("drabornpark_contact_sessions").update({last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id);
      await db.from("drabornpark_scan_events").insert({tag_id:session.tag_id,ip_hash:ipHash,user_agent:userAgent,action:"chat"});
      const {data:report}=await db.from("drabornpark_reports").select("category,priority").eq("id",session.report_id).maybeSingle();
      const categoryKey=String(report?.category||"other");
      const category=categories[categoryKey]??categories.other;
      const priority=(String(report?.priority||category.priority) as Priority);
      const push=await sendExpoPush(db,[session.owner_user_id],category.title,bodySafe,{type:"drabornpark_chat",reportId:session.report_id,sessionId:session.id,messageId:message.id,category:categoryKey},priority);
      return json({ok:true,message,push,category:categoryKey,title:category.title},201);
    }

    if(action==="status"){
      const token=String(payload?.sessionToken??"");
      const {data:session}=await db.from("drabornpark_contact_sessions").select("id,status,expires_at").eq("public_token",token).maybeSingle();
      if(!session)return json({error:"session_not_found"},404);
      if(session.status!=="open"||new Date(session.expires_at)<=new Date())return json({error:"session_closed"},410);
      const {data:messages}=await db.from("drabornpark_messages").select("id,sender_role,body_safe,created_at").eq("session_id",session.id).order("created_at",{ascending:true}).limit(100);
      return json({ok:true,status:session.status,expiresAt:session.expires_at,messages:messages??[]});
    }

    return json({error:"unknown_action"},400);
  }catch(e){
    console.error(e);
    return json({error:"request_failed"},500);
  }
});
