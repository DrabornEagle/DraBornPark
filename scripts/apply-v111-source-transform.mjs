import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
await import('./apply-v110-billing-hotfix.mjs');

function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.11 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,180)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('src/components/DraBornParkPlusPanel.tsx',[
  [
    "const trialUntil=data?.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());const dkdSubscriptionExpiryRaw=lastVerified?.expiresAt||data?.subscription?.expires_at||null;const dkdEntitlementExpiryRaw=dkdSubscriptionExpiryRaw||(trialActive?data?.profile?.plus_trial_until:null);const dkdEntitlementExpiry=dkdEntitlementExpiryRaw?new Date(dkdEntitlementExpiryRaw):null;const dkdRemainingMs=dkdEntitlementExpiry?Math.max(0,dkdEntitlementExpiry.getTime()-dkdCountdownNow):0;const dkdRemainingDays=dkdRemainingMs>0?Math.ceil(dkdRemainingMs/86400000):0;const dkdRemainingHours=dkdRemainingMs>0?Math.floor((dkdRemainingMs%86400000)/3600000):0;const dkdCountdownTitle=dkdSubscriptionExpiryRaw?'ABONELİK SÜRESİ':'DENEME SÜRESİ';",
    "const trialUntil=data?.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());const dkdSubscriptionStatus=String(data?.subscription?.status||'').toUpperCase();const dkdPaidPremium=Boolean(lastVerified?.entitled||data?.subscription?.client_store_entitlement||['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdSubscriptionStatus));const dkdSubscriptionExpiryRaw=lastVerified?.expiresAt||data?.subscription?.expires_at||null;const dkdEntitlementExpiryRaw=dkdPaidPremium?dkdSubscriptionExpiryRaw:(trialActive?data?.profile?.plus_trial_until:null);const dkdEntitlementExpiry=dkdEntitlementExpiryRaw?new Date(dkdEntitlementExpiryRaw):null;const dkdRemainingMs=dkdEntitlementExpiry?Math.max(0,dkdEntitlementExpiry.getTime()-dkdCountdownNow):0;const dkdRemainingDays=dkdRemainingMs>0?Math.ceil(dkdRemainingMs/86400000):0;const dkdCountdownTitle=dkdPaidPremium?'PREMIUM SÜRESİ':'DENEME SÜRESİ';"
  ],
  [
    "    {dkdEntitlementExpiry&&dkdRemainingMs>0?<View style={s.countdownCard}><View style={s.countdownIcon}><MaterialCommunityIcons name=\"timer-sand-complete\" size={29} color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text style={s.countdownKicker}>{dkdCountdownTitle}</Text><View style={s.countdownRow}><Text style={s.countdownDays}>{dkdRemainingDays}</Text><Text style={s.countdownUnit}>GÜN KALDI</Text></View><Text style={s.countdownMeta}>{dkdRemainingHours} saatlik bölüm • {dkdEntitlementExpiry.toLocaleDateString('tr-TR')} tarihinde yenileme / bitiş</Text></View><MaterialCommunityIcons name=\"shield-check\" size={24} color={palette.green}/></View>:null}",
    "    {(dkdPaidPremium||(dkdEntitlementExpiry&&dkdRemainingMs>0))?<View style={s.countdownCard}><View style={s.countdownIcon}><MaterialCommunityIcons name=\"timer-sand-complete\" size={29} color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text style={s.countdownKicker}>{dkdCountdownTitle}</Text><View style={s.countdownRow}>{dkdEntitlementExpiry&&dkdRemainingMs>0?<><Text style={s.countdownDays}>{dkdRemainingDays}</Text><Text style={s.countdownUnit}>GÜN KALDI</Text></>:<Text style={s.countdownActive}>AKTİF</Text>}</View><Text style={s.countdownMeta}>{dkdEntitlementExpiry&&dkdRemainingMs>0?dkdEntitlementExpiry.toLocaleDateString('tr-TR')+' tarihinde yenileme / bitiş':'Google Play aboneliğin aktif'}</Text></View><MaterialCommunityIcons name=\"shield-check\" size={24} color={palette.green}/></View>:null}"
  ],
  [
    "countdownDays:{color:palette.text,fontSize:32,fontWeight:'900',letterSpacing:-1},countdownUnit:{color:palette.yellow,fontSize:type.caption,fontWeight:'900'},countdownMeta:",
    "countdownDays:{color:palette.text,fontSize:32,fontWeight:'900',letterSpacing:-1},countdownUnit:{color:palette.yellow,fontSize:type.caption,fontWeight:'900'},countdownActive:{color:palette.green,fontSize:28,fontWeight:'900',letterSpacing:.4},countdownMeta:"
  ],
  [
    "  async function buy(planId:PlanId){const info=planInfo[planId];if(!connected){setMessage('Google Play bağlantısı hazır değil. Developer/Internal Test build kullan.');return;}if(!info?.offer?.offerToken){setMessage('Google Play bu hesap için '+(planId==='monthly'?'aylık':'yıllık')+' DraBornPark+ teklifini döndürmedi. Mağaza bağlantısı yenileniyor; birkaç saniye sonra tekrar deneyin.');void fetchProducts({skus:[PRODUCT_ID],type:'subs'});return;}setSelected(planId);setBusy(true);setMessage('');try{const {data:userData}=await supabase.auth.getUser();const obfuscated=String(userData.user?.id||'').replace(/-/g,'');await requestPurchase({request:{google:{skus:[PRODUCT_ID],obfuscatedAccountId:obfuscated,subscriptionOffers:[{sku:PRODUCT_ID,offerToken:info.offer.offerToken}]},apple:{sku:PRODUCT_ID}},type:'subs'} as any);}catch(error:any){setBusy(false);setMessage(error?.message||'Google Play satın alma ekranı açılamadı.');}}",
    "  async function buy(planId:PlanId){const info=planInfo[planId];if(!connected){setMessage('Google Play bağlantısı hazır değil. Developer/Internal Test build kullan.');return;}if(!info?.offer?.offerToken){setMessage('Google Play bu hesap için '+(planId==='monthly'?'aylık':'yıllık')+' DraBornPark+ teklifini döndürmedi. Mağaza bağlantısı yenileniyor; birkaç saniye sonra tekrar deneyin.');void fetchProducts({skus:[PRODUCT_ID],type:'subs'});return;}setSelected(planId);setBusy(true);setMessage('');try{const dkd_existing=await getStorePurchases();for(const dkd_purchase of dkd_existing.filter((dkd_item:any)=>dkd_item.productId===PRODUCT_ID&&dkd_item.purchaseToken&&String(dkd_item.purchaseState||'purchased')!=='pending'))await dkdFinishOwnedPurchase(dkd_purchase);if(dkd_existing.length)await new Promise(dkd_resolve=>setTimeout(dkd_resolve,350));const {data:userData}=await supabase.auth.getUser();const obfuscated=String(userData.user?.id||'').replace(/-/g,'');await requestPurchase({request:{google:{skus:[PRODUCT_ID],obfuscatedAccountId:obfuscated,subscriptionOffers:[{sku:PRODUCT_ID,offerToken:info.offer.offerToken}]},apple:{sku:PRODUCT_ID}},type:'subs'} as any);}catch(error:any){setBusy(false);const dkd_message=String(error?.message||'');setMessage(/acknowledg|first purchase|ilk alışveriş/i.test(dkd_message)?'Mevcut Google Play aboneliğin onaylanıyor. Birkaç saniye sonra tekrar dene.':(dkd_message||'Google Play satın alma ekranı açılamadı.'));}}"
  ]
]);

dkd_patch('app/index.tsx',[[
  '<Pill label="v1.0.10" color={palette.purple}/>','<Pill label="v1.0.11" color={palette.purple}/>'
]]);

dkd_patch('app/hub.tsx',[[
  '<Pill label="v1.0" color={palette.purple}/>','<Pill label="v1.0.11" color={palette.purple}/>'
]]);

dkd_patch('app/factory.tsx',[[
  'NFC + QR ETİKET MERKEZİ • v1.0.10','NFC + QR ETİKET MERKEZİ • v1.0.11'
]]);

dkd_patch('app/t/[id].tsx',[[
  "stampLabel:'DraBornPark v1.0.10 • Güvenli Araç İletişimi'","stampLabel:'DraBornPark v1.0.11 • Güvenli Araç İletişimi'"
]]);

dkd_patch('supabase/functions/drabornpark-public-contact/index.ts',[[
  'const VERSION="1.0.10";','const VERSION="1.0.11";'
]]);

dkd_patch('supabase/functions/dkd-drabornpark-google-play/index.ts',[[
  'const VERSION="1.0.10";','const VERSION="1.0.11";'
]]);

dkd_patch('supabase/functions/dkd-drabornpark-app-version/index.ts',[
  ['const VERSION="1.0.10";','const VERSION="1.0.11";'],
  ['const VERSION_CODE=10;','const VERSION_CODE=11;']
]);

console.log('DraBornPark v1.0.11 source transforms ready • paid subscription shows PREMIUM SÜRESİ • hourly countdown detail removed • purchase acknowledgement reinforced.');
