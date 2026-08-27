import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const FALLBACK_VERSION="1.0.21";
const FALLBACK_VERSION_CODE=21;
const PLAY_URL="https://play.google.com/store/apps/details?id=com.draborneagle.drabornpark";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="GET"&&req.method!=="POST")return json({error:"method_not_allowed"},405);

  let forceUpdateEnabled=false;
  let latestVersion=FALLBACK_VERSION;
  let latestVersionCode=FALLBACK_VERSION_CODE;
  let previousVersionCode=Math.max(1,FALLBACK_VERSION_CODE-1);

  try{
    const url=Deno.env.get("SUPABASE_URL")??"";
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    if(url&&serviceKey){
      const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data,error}=await db.rpc('dkd_drabornpark_get_update_policy');
      if(error)throw error;
      forceUpdateEnabled=Boolean(data?.force_update_enabled);
      latestVersion=String(data?.latest_version||FALLBACK_VERSION);
      latestVersionCode=Math.max(1,Number(data?.latest_version_code||FALLBACK_VERSION_CODE));
      previousVersionCode=Math.max(1,Number(data?.minimum_version_code||latestVersionCode-1));
    }
  }catch(error){
    console.error('[DraBornPark update policy]',error);
  }

  const requiredVersionCode=forceUpdateEnabled?latestVersionCode:0;
  return json({
    ok:true,
    latestVersion,
    latestVersionCode,
    previousVersionCode,
    policyMinimumVersionCode:previousVersionCode,
    minimumVersionCode:requiredVersionCode,
    requiredVersionCode,
    forceUpdateBelow:requiredVersionCode,
    forceUpdateEnabled,
    playUrl:PLAY_URL,
    message:`Google Play'de DraBornPark v${latestVersion} yayınlandı. Uygulamayı kullanmaya devam etmek için son sürümü yüklemelisin.`
  });
});
