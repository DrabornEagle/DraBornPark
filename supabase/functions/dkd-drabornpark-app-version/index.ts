import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const VERSION="1.0.15";
const VERSION_CODE=15;
const PLAY_URL="https://play.google.com/store/apps/details?id=com.draborneagle.drabornpark";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="GET"&&req.method!=="POST")return json({error:"method_not_allowed"},405);
  let forceUpdateEnabled=false;let configuredMinimum=0;
  try{
    const url=Deno.env.get("SUPABASE_URL")??"";const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    if(url&&serviceKey){const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});const {data}=await db.rpc('dkd_drabornpark_get_update_policy');forceUpdateEnabled=Boolean(data?.force_update_enabled);configuredMinimum=Number(data?.minimum_version_code||0);}
  }catch(error){console.error('[DraBornPark update policy]',error);}
  const minimumVersionCode=forceUpdateEnabled?Math.max(1,configuredMinimum||13):0;
  return json({ok:true,latestVersion:VERSION,latestVersionCode:VERSION_CODE,minimumVersionCode,forceUpdateBelow:minimumVersionCode,forceUpdateEnabled,playUrl:PLAY_URL,message:"DraBornPark için yeni bir sürüm yayınlandı. Güvenlik, performans ve yeni özellikleri kullanmaya devam etmek için Google Play üzerinden güncelleme zorunludur."});
});
