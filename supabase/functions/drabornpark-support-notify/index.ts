import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION="0.5.4";
const CHANNEL="drabornpark-alerts-v3";
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")??"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  const token=(req.headers.get("authorization")??"").replace(/^Bearer\s+/i,"").trim();
  if(!url||!serviceKey||!token)return json({error:"server_configuration_error"},500);
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:userData,error:userError}=await db.auth.getUser(token);
    if(userError||!userData.user)return json({error:"unauthorized"},401);
    const payload=await req.json().catch(()=>({}));
    const supportId=String(payload?.supportId??"");
    if(!supportId)return json({error:"support_id_required"},400);
    const {data:ticket,error:ticketError}=await db.from("drabornpark_support_requests").select("id,owner_user_id,subject,body,created_at").eq("id",supportId).eq("owner_user_id",userData.user.id).maybeSingle();
    if(ticketError)throw ticketError;if(!ticket)return json({error:"support_request_not_found"},404);
    const adminIds:string[]=[];
    for(let page=1;page<=10;page++){
      const {data,error}=await db.auth.admin.listUsers({page,perPage:100});if(error)throw error;
      for(const user of data.users){const email=String(user.email??"").toLowerCase();const role=String((user.app_metadata as any)?.drabornpark_role??"");if(email==="draborneagle@gmail.com"||role==="admin")adminIds.push(user.id);}
      if(data.users.length<100)break;
    }
    const uniqueAdmins=[...new Set(adminIds)];
    if(!uniqueAdmins.length)return json({ok:true,version:VERSION,sent:0,reason:"no_admin_user"});
    const {data:tokens,error:tokenError}=await db.from("drabornpark_push_tokens").select("expo_push_token,user_id").in("user_id",uniqueAdmins).eq("is_enabled",true);if(tokenError)throw tokenError;
    const messages=(tokens??[]).filter((row:any)=>/^(ExponentPushToken|ExpoPushToken)\[/.test(String(row.expo_push_token||""))).map((row:any)=>({to:row.expo_push_token,title:"Yeni Destek Kaydı",body:String(ticket.subject||"Yeni destek talebi").slice(0,120),priority:"high",channelId:CHANNEL,data:{type:"drabornpark_support",supportId:ticket.id,source:"support-v054"}}));
    if(!messages.length)return json({ok:true,version:VERSION,sent:0,reason:"no_admin_push_token"});
    const response=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(messages)});
    const result=await response.json().catch(()=>null);
    return json({ok:response.ok,version:VERSION,sent:messages.length,status:response.status,result},response.ok?200:502);
  }catch(error){console.error("support_notify_error",error);return json({error:"request_failed"},500);}
});
