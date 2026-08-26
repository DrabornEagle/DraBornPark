import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_plus_before=fs.readFileSync(path.join(dkd_root,'src/components/DraBornParkPlusPanel.tsx'),'utf8');
if(!dkd_plus_before.includes('dkdPaidPremium'))await import('./apply-v111-source-transform.mjs');

function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.12 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,200)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('src/components/DraBornParkPlusPanel.tsx',[
  [
    "{id:'monthly',title:'Aylık',caption:'Esnek kullanım • her ay yenilenir',icon:'calendar-month-outline',fallback:'₺49,99 / ay'},",
    "{id:'monthly',title:'Aylık',caption:'Esnek kullanım • her ay yenilenir',icon:'calendar-month-outline',fallback:'69,99 TL / ay'},"
  ],
  [
    "{id:'yearly',title:'Yıllık',caption:'En avantajlı plan • yılda bir yenilenir',icon:'calendar-star',fallback:'₺399,99 / yıl'},",
    "{id:'yearly',title:'Yıllık',caption:'En avantajlı plan • yılda bir yenilenir',icon:'calendar-star',fallback:'599,99 TL / yıl'},"
  ],
  [
    "const displayPrice=(id:PlanId)=>{const store=planInfo[id]?.price;if(store)return store+(id==='monthly'?' / ay':' / yıl');return plans.find(plan=>plan.id===id)!.fallback;};",
    "const displayPrice=(id:PlanId)=>id==='monthly'?'69,99 TL / ay':'599,99 TL / yıl';"
  ],
  [
    "const trialUntil=data?.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());const dkdSubscriptionStatus=String(data?.subscription?.status||'').toUpperCase();const dkdPaidPremium=Boolean(lastVerified?.entitled||data?.subscription?.client_store_entitlement||['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdSubscriptionStatus));const dkdSubscriptionExpiryRaw=lastVerified?.expiresAt||data?.subscription?.expires_at||null;const dkdEntitlementExpiryRaw=dkdPaidPremium?dkdSubscriptionExpiryRaw:(trialActive?data?.profile?.plus_trial_until:null);const dkdEntitlementExpiry=dkdEntitlementExpiryRaw?new Date(dkdEntitlementExpiryRaw):null;const dkdRemainingMs=dkdEntitlementExpiry?Math.max(0,dkdEntitlementExpiry.getTime()-dkdCountdownNow):0;const dkdRemainingDays=dkdRemainingMs>0?Math.ceil(dkdRemainingMs/86400000):0;const dkdCountdownTitle=dkdPaidPremium?'PREMIUM SÜRESİ':'DENEME SÜRESİ';",
    "const trialUntil=data?.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());const dkdSubscriptionStatus=String(data?.subscription?.status||'').toUpperCase();const dkdPaidPremium=Boolean(lastVerified?.entitled||data?.subscription?.client_store_entitlement||['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdSubscriptionStatus));const dkdSubscriptionExpiryRaw=lastVerified?.expiresAt||data?.subscription?.expires_at||null;const dkdSubscriptionStartedRaw=data?.subscription?.transaction_date||data?.subscription?.last_verified_at||null;const dkdSubscriptionStarted=dkdSubscriptionStartedRaw?new Date(dkdSubscriptionStartedRaw):null;const dkdBasePlan=String(lastVerified?.basePlanId||data?.subscription?.base_plan_id||'').toLocaleLowerCase('tr-TR');const dkdPeriodMs=(dkdBasePlan.includes('year')||dkdBasePlan.includes('annual')||dkdBasePlan.includes('yıl')||dkdBasePlan.includes('yillik'))?365*86400000:30*86400000;let dkdEstimatedExpiry:Date|null=null;if(dkdPaidPremium&&!dkdSubscriptionExpiryRaw&&dkdSubscriptionStarted&&!Number.isNaN(dkdSubscriptionStarted.getTime())){let dkd_estimated_ms=dkdSubscriptionStarted.getTime()+dkdPeriodMs;let dkd_guard=0;while(dkd_estimated_ms<=dkdCountdownNow&&dkd_guard<36){dkd_estimated_ms+=dkdPeriodMs;dkd_guard+=1;}dkdEstimatedExpiry=new Date(dkd_estimated_ms);}const dkdEntitlementExpiry=dkdSubscriptionExpiryRaw?new Date(dkdSubscriptionExpiryRaw):(dkdEstimatedExpiry??(!dkdPaidPremium&&trialActive?trialUntil:null));const dkdCountdownEstimated=Boolean(dkdPaidPremium&&!dkdSubscriptionExpiryRaw&&dkdEstimatedExpiry);const dkdRemainingMs=dkdEntitlementExpiry?Math.max(0,dkdEntitlementExpiry.getTime()-dkdCountdownNow):0;const dkdRemainingDays=dkdRemainingMs>0?Math.ceil(dkdRemainingMs/86400000):0;const dkdCountdownTitle=dkdPaidPremium?'PREMIUM SÜRESİ':'DENEME SÜRESİ';"
  ],
  [
    "<Text style={s.countdownMeta}>{dkdEntitlementExpiry&&dkdRemainingMs>0?dkdEntitlementExpiry.toLocaleDateString('tr-TR')+' tarihinde yenileme / bitiş':'Google Play aboneliğin aktif'}</Text>",
    "<Text style={s.countdownMeta}>{dkdEntitlementExpiry&&dkdRemainingMs>0?(dkdCountdownEstimated?'Tahmini yenileme / bitiş • ':'Yenileme / bitiş • ')+dkdEntitlementExpiry.toLocaleDateString('tr-TR'):'Google Play aboneliğin aktif'}</Text>"
  ],
  [
    "<Text style={s.planSub}>Aylık ₺49,99 • Yıllık ₺399,99. Google Play bu hesap için yerel mağaza fiyatı döndürürse satın alma ekranındaki fiyat esas alınır.</Text>",
    "<Text style={s.planSub}>Aylık 69,99 TL • Yıllık 599,99 TL. Google Play ödeme ekranındaki güncel mağaza fiyatı satın alma sırasında esas alınır.</Text>"
  ],
  [
    "<Text style={s.bestText}>%33 AVANTAJ</Text>",
    "<Text style={s.bestText}>%29 AVANTAJ</Text>"
  ],
  [
    "{plan.id==='yearly'?'12 aya göre yaklaşık ₺199,89 avantaj':'İstediğin zaman plan yönetimi'}",
    "{plan.id==='yearly'?'12 aya göre yaklaşık 239,89 TL avantaj':'İstediğin zaman plan yönetimi'}"
  ]
]);

dkd_patch('src/lib/drabornpark.ts',[[
  "return {provider:'google_play_device',product_id:'drabornpark_plus',base_plan_id:null,status:'PLUS_ACTIVE',expires_at:null,auto_renewing:Boolean((dkd_purchase as any).autoRenewingAndroid??(dkd_purchase as any).isAutoRenewing),last_verified_at:null,client_store_entitlement:true,transaction_date:(dkd_purchase as any).transactionDate??null};",
  "return {provider:'google_play_device',product_id:'drabornpark_plus',base_plan_id:String((dkd_purchase as any).basePlanIdAndroid??(dkd_purchase as any).currentPlanId??'')||null,status:'PLUS_ACTIVE',expires_at:null,auto_renewing:Boolean((dkd_purchase as any).autoRenewingAndroid??(dkd_purchase as any).isAutoRenewing),last_verified_at:null,client_store_entitlement:true,transaction_date:(dkd_purchase as any).transactionDate??null};"
]]);

dkd_patch('app/index.tsx',[[
  '<Pill label="v1.0.11" color={palette.purple}/>','<Pill label="v1.0.12" color={palette.purple}/>'
]]);

dkd_patch('app/hub.tsx',[[
  '<Pill label="v1.0.11" color={palette.purple}/>','<Pill label="v1.0.12" color={palette.purple}/>'
]]);

dkd_patch('app/factory.tsx',[[
  'NFC + QR ETİKET MERKEZİ • v1.0.11','NFC + QR ETİKET MERKEZİ • v1.0.12'
]]);

dkd_patch('app/t/[id].tsx',[[
  "stampLabel:'DraBornPark v1.0.11 • Güvenli Araç İletişimi'","stampLabel:'DraBornPark v1.0.12 • Güvenli Araç İletişimi'"
]]);

dkd_patch('supabase/functions/drabornpark-public-contact/index.ts',[[
  'const VERSION="1.0.11";','const VERSION="1.0.12";'
]]);

dkd_patch('supabase/functions/dkd-drabornpark-google-play/index.ts',[[
  'const VERSION="1.0.11";','const VERSION="1.0.12";'
]]);

dkd_patch('supabase/functions/dkd-drabornpark-app-version/index.ts',[
  ['const VERSION="1.0.11";','const VERSION="1.0.12";'],
  ['const VERSION_CODE=11;','const VERSION_CODE=12;']
]);

console.log('DraBornPark v1.0.12 source transforms ready • 69,99 TL monthly • 599,99 TL yearly • premium remaining-day estimate • forced update vc12 source.');
