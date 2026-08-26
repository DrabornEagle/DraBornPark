import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
await import('./apply-v108-source-transform.mjs');

function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.9 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,140)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('src/components/DraBornParkPlusPanel.tsx',[
  [
    "const product:any=subscriptions.find(item=>item.id===PRODUCT_ID);const offers:any[]=product?.subscriptionOfferDetailsAndroid??[];",
    "const product:any=subscriptions.find(item=>item.id===PRODUCT_ID);const dkdLegacyOffers:any[]=product?.subscriptionOfferDetailsAndroid??[];const dkdUnifiedOffers:any[]=product?.subscriptionOffers??[];const offers:any[]=[...dkdLegacyOffers.map(offer=>({...offer,basePlanId:offer?.basePlanId??offer?.basePlanIdAndroid,offerToken:offer?.offerToken??offer?.offerTokenAndroid,pricingPhases:offer?.pricingPhases??offer?.pricingPhasesAndroid})),...dkdUnifiedOffers.map(offer=>({...offer,basePlanId:offer?.basePlanId??offer?.basePlanIdAndroid,offerToken:offer?.offerToken??offer?.offerTokenAndroid,pricingPhases:offer?.pricingPhases??offer?.pricingPhasesAndroid}))].filter((offer,index,list)=>Boolean(offer?.offerToken)&&list.findIndex(item=>String(item?.offerToken||'')===String(offer?.offerToken||''))===index);"
  ],
  [
    "const planInfo=useMemo(()=>Object.fromEntries(plans.map(plan=>{const matches=offers.filter(offer=>String(offer.basePlanId||'')===plan.id);const offer=matches.find(offer=>!offer.offerId)||matches[0];const phases=offer?.pricingPhases?.pricingPhaseList??[];const paid=[...phases].reverse().find((phase:any)=>Number(phase.priceAmountMicros||0)>0)||phases.at?.(-1);return [plan.id,{offer,price:paid?.formattedPrice||null,period:paid?.billingPeriod||null}];})),[offers]);",
    "const planInfo=useMemo(()=>Object.fromEntries(plans.map(plan=>{const dkdPeriod=plan.id==='monthly'?'P1M':'P1Y';const dkdWords=plan.id==='monthly'?['monthly','month','aylik','aylık']:['yearly','annual','year','yillik','yıllık'];const dkdMatches=offers.filter(offer=>{const dkdBase=String(offer?.basePlanId||'').toLocaleLowerCase('tr-TR');const dkdPhases=offer?.pricingPhases?.pricingPhaseList??offer?.pricingPhases??[];return dkdBase===plan.id||dkdWords.some(word=>dkdBase.includes(word))||dkdPhases.some((phase:any)=>String(phase?.billingPeriod||'').toUpperCase()===dkdPeriod);});const offer=dkdMatches.find(item=>!item?.offerId&&!item?.id)||dkdMatches[0];const phases=offer?.pricingPhases?.pricingPhaseList??offer?.pricingPhases??[];const paid=[...phases].reverse().find((phase:any)=>Number(phase?.priceAmountMicros||0)>0)||phases.at?.(-1);return [plan.id,{offer,price:paid?.formattedPrice||paid?.displayPrice||null,period:paid?.billingPeriod||null}];})),[offers]);"
  ],
  [
    "if(!info?.offer?.offerToken){setMessage(PRODUCT_ID+' / '+planId+' planı henüz bu Google Play test hesabına sunulmuyor.');return;}",
    "if(!info?.offer?.offerToken){setMessage('Google Play bu hesap için '+(planId==='monthly'?'aylık':'yıllık')+' DraBornPark+ teklifini döndürmedi. Mağaza bağlantısı yenileniyor; birkaç saniye sonra tekrar deneyin.');void fetchProducts({skus:[PRODUCT_ID],type:'subs'});return;}"
  ]
]);

dkd_patch('src/lib/push.ts',[[
  "direct_message:'Doğrudan güvenli mesaj'",
  "direct_message:'Aracınız Hakkında Mesajınız Var'"
]]);

dkd_patch('app/index.tsx',[[
  '<Pill label="v1.0.8" color={palette.purple}/>',
  '<Pill label="v1.0.9" color={palette.purple}/>'
]]);

dkd_patch('app/factory.tsx',[[
  'NFC + QR ETİKET MERKEZİ • v1.0.8',
  'NFC + QR ETİKET MERKEZİ • v1.0.9'
]]);

dkd_patch('app/t/[id].tsx',[[
  "stampLabel:'DraBornPark v0.5.5 • Güvenli Araç İletişimi'",
  "stampLabel:'DraBornPark v1.0.9 • Güvenli Araç İletişimi'"
]]);

dkd_patch('supabase/functions/drabornpark-public-contact/index.ts',[
  ['const VERSION="1.0.8";','const VERSION="1.0.9";'],
  ['direct_message:{title:"Doğrudan güvenli mesaj"','direct_message:{title:"Aracınız Hakkında Mesajınız Var"']
]);

dkd_patch('supabase/functions/dkd-drabornpark-google-play/index.ts',[[
  'const VERSION="1.0.8";',
  'const VERSION="1.0.9";'
]]);

console.log('DraBornPark v1.0.9 source transforms ready • Google Play subscription offer compatibility • direct-message notification title • current visible version labels.');
