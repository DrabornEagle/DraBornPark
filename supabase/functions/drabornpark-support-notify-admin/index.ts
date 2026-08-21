import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"content-type":"application/json","cache-control":"no-store"};

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:cors});
  const auth=req.headers.get("authorization")||"";
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:userData,error:userError}=await userClient.auth.getUser();
  if(userError||!userData.user) return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:cors});
  const payload=await req.json().catch(()=>({}));
  const supportRequestId=String(payload?.supportRequestId||"");
  if(!supportRequestId) return new Response(JSON.stringify({error:"support_request_id_required"}),{status:400,headers:cors});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ticket,error:ticketError}=await admin.from("drabornpark_support_requests").select("id,owner_user_id,subject,body,created_at").eq("id",supportRequestId).maybeSingle();
  if(ticketError||!ticket) return new Response(JSON.stringify({error:"support_request_not_found"}),{status:404,headers:cors});
  if(ticket.owner_user_id!==userData.user.id) return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers:cors});
  const {data:admins}=await admin.from("drabornpark_admin_users").select("user_id");
  const adminIds=(admins||[]).map((x:any)=>x.user_id).filter(Boolean);
  if(!adminIds.length) return new Response(JSON.stringify({ok:true,sent:0,reason:"no_admin"}),{status:200,headers:cors});
  const {data:tokens}=await admin.from("drabornpark_push_tokens").select("expo_push_token,user_id").in("user_id",adminIds).eq("is_enabled",true);
  const messages=(tokens||[]).filter((x:any)=>String(x.expo_push_token||"").startsWith("ExponentPushToken[")||String(x.expo_push_token||"").startsWith("ExpoPushToken[")).map((x:any)=>({
    to:x.expo_push_token,sound:"default",priority:"high",title:"Yeni DraBornPark destek kaydı",body:String(ticket.subject||"Yeni destek kaydı").slice(0,180),
    data:{type:"drabornpark_support_admin",supportRequestId:ticket.id,route:`/admin/support/${ticket.id}`},channelId:"drabornpark-alerts-v3"
  }));
  if(messages.length){
    const push=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"content-type":"application/json","accept":"application/json","accept-encoding":"gzip, deflate"},body:JSON.stringify(messages)});
    if(!push.ok) console.warn("Expo push failed",push.status,await push.text());
  }
  return new Response(JSON.stringify({ok:true,sent:messages.length}),{status:200,headers:cors});
});
