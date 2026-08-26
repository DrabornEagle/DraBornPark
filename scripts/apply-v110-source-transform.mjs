import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_home_before=fs.readFileSync(path.join(dkd_root,'app/index.tsx'),'utf8');
if(!dkd_home_before.includes('<Pill label="v1.0.10" color={palette.purple}/>')){
  await import('./apply-v109-source-transform.mjs');
}

function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.10 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,160)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('app/_layout.tsx',[
  [
    "import {DkdStartupSplash} from '@/src/components/DkdStartupSplash';",
    "import {DkdStartupSplash} from '@/src/components/DkdStartupSplash';\nimport {MandatoryUpdateGate} from '@/src/components/MandatoryUpdateGate';"
  ],
  [
    'return <SafeAreaProvider><LivePushRegistration/><NotificationPermissionPrompt/>',
    'return <SafeAreaProvider><MandatoryUpdateGate/><LivePushRegistration/><NotificationPermissionPrompt/>'
  ]
]);

dkd_patch('src/components/DraBornParkPlusPanel.tsx',[
  [
    "const [selected,setSelected]=useState<PlanId>('yearly');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [popup,setPopup]=useState(false);const [lastVerified,setLastVerified]=useState<any>(null);const pulse=useRef(new Animated.Value(0)).current;const sweep=useRef(new Animated.Value(0)).current;",
    "const [selected,setSelected]=useState<PlanId>('yearly');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [popup,setPopup]=useState(false);const [lastVerified,setLastVerified]=useState<any>(null);const [dkdCountdownNow,setDkdCountdownNow]=useState(Date.now());const pulse=useRef(new Animated.Value(0)).current;const sweep=useRef(new Animated.Value(0)).current;"
  ],
  [
    "useEffect(()=>{if(connected)void fetchProducts({skus:[PRODUCT_ID],type:'subs'});},[connected,fetchProducts]);",
    "useEffect(()=>{if(connected)void fetchProducts({skus:[PRODUCT_ID],type:'subs'});},[connected,fetchProducts]);\n  useEffect(()=>{const dkdTimer=setInterval(()=>setDkdCountdownNow(Date.now()),60000);return()=>clearInterval(dkdTimer);},[]);"
  ],
  [
    "const trialUntil=data?.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());",
    "const trialUntil=data?.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());const dkdSubscriptionExpiryRaw=lastVerified?.expiresAt||data?.subscription?.expires_at||null;const dkdEntitlementExpiryRaw=dkdSubscriptionExpiryRaw||(trialActive?data?.profile?.plus_trial_until:null);const dkdEntitlementExpiry=dkdEntitlementExpiryRaw?new Date(dkdEntitlementExpiryRaw):null;const dkdRemainingMs=dkdEntitlementExpiry?Math.max(0,dkdEntitlementExpiry.getTime()-dkdCountdownNow):0;const dkdRemainingDays=dkdRemainingMs>0?Math.ceil(dkdRemainingMs/86400000):0;const dkdRemainingHours=dkdRemainingMs>0?Math.floor((dkdRemainingMs%86400000)/3600000):0;const dkdCountdownTitle=dkdSubscriptionExpiryRaw?'ABONELİK SÜRESİ':'DENEME SÜRESİ';"
  ],
  [
    "    <View style={s.plans}>{plans.map(plan=>{const active=selected===plan.id;return <Animated.View key={plan.id}",
    "    {dkdEntitlementExpiry&&dkdRemainingMs>0?<View style={s.countdownCard}><View style={s.countdownIcon}><MaterialCommunityIcons name=\"timer-sand-complete\" size={29} color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text style={s.countdownKicker}>{dkdCountdownTitle}</Text><View style={s.countdownRow}><Text style={s.countdownDays}>{dkdRemainingDays}</Text><Text style={s.countdownUnit}>GÜN KALDI</Text></View><Text style={s.countdownMeta}>{dkdRemainingHours} saatlik bölüm • {dkdEntitlementExpiry.toLocaleDateString('tr-TR')} tarihinde yenileme / bitiş</Text></View><MaterialCommunityIcons name=\"shield-check\" size={24} color={palette.green}/></View>:null}\n    <View style={s.plans}>{plans.map(plan=>{const active=selected===plan.id;return <Animated.View key={plan.id}"
  ],
  [
    "<ColorPopup visible={popup} icon=\"crown-circle-outline\" eyebrow=\"GOOGLE PLAY DOĞRULANDI\" title=\"DraBornPark+ hazır\" body={lastVerified?.expiresAt?'Premium hakkın '+new Date(lastVerified.expiresAt).toLocaleString('tr-TR')+' tarihine kadar doğrulandı.':'Premium satın alman Google Play üzerinden doğrulandı.'} accent={palette.yellow} secondary={palette.purple} primaryLabel=\"HARİKA\" onPrimary={()=>setPopup(false)} chips={[lastVerified?.basePlanId==='yearly'?'YILLIK PLAN':'AYLIK PLAN','GOOGLE PLAY','SUNUCU DOĞRULAMASI']}/>",
    "<ColorPopup visible={popup} icon=\"crown-circle-outline\" eyebrow=\"DRABORNPARK+ AKTİF\" title=\"Premium özelliklerin açıldı\" body={lastVerified?.expiresAt?'Aboneliğin '+new Date(lastVerified.expiresAt).toLocaleDateString('tr-TR')+' tarihine kadar doğrulandı. DraBornPark+ ile aşağıdaki özelliklerin tamamı artık hesabında aktif.':'Google Play satın alman doğrulandı. DraBornPark+ ile aşağıdaki özelliklerin tamamı artık hesabında aktif.'} accent={palette.yellow} secondary={palette.purple} primaryLabel=\"DRABORNPARK+ KULLAN\" onPrimary={()=>setPopup(false)} chips={['DraBornPark Aile','Geçici Sürücü','Vale / Servis Modu','Zaman Kuralları','Acil Durum Zinciri','Gelişmiş Araç Geçmişi','Aylık Özet']}/>"
  ],
  [
    "const s=StyleSheet.create({priceRail:",
    "const s=StyleSheet.create({countdownCard:{minHeight:104,borderRadius:22,borderWidth:1,borderColor:palette.cyan+'58',backgroundColor:palette.cyan+'0D',padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12,overflow:'hidden'},countdownIcon:{width:54,height:54,borderRadius:18,borderWidth:1,borderColor:palette.cyan+'55',backgroundColor:palette.cyan+'16',alignItems:'center',justifyContent:'center'},countdownKicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},countdownRow:{flexDirection:'row',alignItems:'baseline',gap:7,marginTop:2},countdownDays:{color:palette.text,fontSize:32,fontWeight:'900',letterSpacing:-1},countdownUnit:{color:palette.yellow,fontSize:type.caption,fontWeight:'900'},countdownMeta:{color:palette.muted,fontSize:type.micro,lineHeight:15,marginTop:2},priceRail:"
  ]
]);

dkd_patch('app/index.tsx',[[
  '<Pill label="v1.0.9" color={palette.purple}/>','<Pill label="v1.0.10" color={palette.purple}/>'
]]);

dkd_patch('app/factory.tsx',[[
  'NFC + QR ETİKET MERKEZİ • v1.0.9','NFC + QR ETİKET MERKEZİ • v1.0.10'
]]);

dkd_patch('app/t/[id].tsx',[[
  "stampLabel:'DraBornPark v1.0.9 • Güvenli Araç İletişimi'","stampLabel:'DraBornPark v1.0.10 • Güvenli Araç İletişimi'"
]]);

dkd_patch('supabase/functions/drabornpark-public-contact/index.ts',[[
  'const VERSION="1.0.9";','const VERSION="1.0.10";'
]]);

dkd_patch('supabase/functions/dkd-drabornpark-google-play/index.ts',[[
  'const VERSION="1.0.9";','const VERSION="1.0.10";'
]]);

console.log('DraBornPark v1.0.10 source transforms ready • mandatory Google Play update gate • premium success feature popup • live entitlement countdown.');
