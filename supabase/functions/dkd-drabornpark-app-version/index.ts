import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERSION="1.0.10";
const VERSION_CODE=10;
const PLAY_URL="https://play.google.com/store/apps/details?id=com.draborneagle.drabornpark";
const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store, max-age=0"
};

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});

Deno.serve((req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="GET"&&req.method!=="POST")return json({error:"method_not_allowed"},405);
  return json({
    ok:true,
    latestVersion:VERSION,
    latestVersionCode:VERSION_CODE,
    minimumVersionCode:VERSION_CODE,
    forceUpdateBelow:VERSION_CODE,
    playUrl:PLAY_URL,
    message:"DraBornPark için yeni bir sürüm yayınlandı. Güvenlik, performans ve yeni özellikleri kullanmaya devam etmek için Google Play üzerinden güncelleme zorunludur."
  });
});
