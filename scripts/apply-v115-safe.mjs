import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(path.join(dkd_root,dkd_file),dkd_text);

function dkd_replace(dkd_file,dkd_from,dkd_to,dkd_label){
  let dkd_text=dkd_read(dkd_file);
  if(dkd_text.includes(dkd_to))return;
  if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.15 marker missing (${dkd_label}) in ${dkd_file}`);
  dkd_text=dkd_text.replace(dkd_from,dkd_to);
  dkd_write(dkd_file,dkd_text);
}

function dkd_regex(dkd_file,dkd_pattern,dkd_to,dkd_label){
  let dkd_text=dkd_read(dkd_file);
  if(dkd_text.includes(dkd_to))return;
  if(!dkd_pattern.test(dkd_text))throw new Error(`DraBornPark v1.0.15 regex marker missing (${dkd_label}) in ${dkd_file}`);
  dkd_pattern.lastIndex=0;
  dkd_text=dkd_text.replace(dkd_pattern,dkd_to);
  dkd_write(dkd_file,dkd_text);
}

// Premium tanıtımı yalnız aynı uygulama süreci içinde bir kez gösterilir.
let dkd_home=dkd_read('app/index.tsx');
dkd_home=dkd_home.replace("import { Alert, Animated, AppState, Easing, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';","import { Alert, Animated, Easing, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';");
dkd_home=dkd_home.replace("  const premiumShown=useRef(false);\n  const dkd_app_state=useRef(AppState.currentState);\n",'');
const dkd_old_popup=`  useEffect(()=>{\n    if(!live||plus)return;\n    const dkd_show=()=>{if(premiumShown.current)return;premiumShown.current=true;setPremiumOpen(true)};\n    const dkd_timer=setTimeout(dkd_show,420);\n    const dkd_subscription=AppState.addEventListener('change',dkd_next_state=>{\n      if(/inactive|background/.test(dkd_app_state.current)&&dkd_next_state==='active'){premiumShown.current=false;dkd_show()}\n      dkd_app_state.current=dkd_next_state;\n    });\n    return()=>{clearTimeout(dkd_timer);dkd_subscription.remove()};\n  },[live,plus]);`;
const dkd_new_popup=`  useEffect(()=>{\n    if(!live||plus)return;\n    const dkd_runtime=globalThis as any;\n    if(dkd_runtime.__dkdPremiumPopupShownThisLaunch)return;\n    dkd_runtime.__dkdPremiumPopupShownThisLaunch=true;\n    const dkd_timer=setTimeout(()=>setPremiumOpen(true),420);\n    return()=>clearTimeout(dkd_timer);\n  },[live,plus]);`;
if(!dkd_home.includes(dkd_new_popup)){
  if(!dkd_home.includes(dkd_old_popup))throw new Error('DraBornPark v1.0.15 premium popup block not found');
  dkd_home=dkd_home.replace(dkd_old_popup,dkd_new_popup);
}
dkd_home=dkd_home.replace('StatusPill compact offsetX={-12} icon="shield-check-outline" text="GÜVENLİ OTURUM"','StatusPill compact offsetX={-4} icon="shield-check-outline" text="GÜVENLİ OTURUM"');
dkd_home=dkd_home.replace('<Pill label="v1.0" color={palette.purple}/>','<Pill label="v1.0.15" color={palette.purple}/>');
dkd_write('app/index.tsx',dkd_home);

// Deneme hakkı, Google Play durumundan bağımsız olarak etiket aktivasyonundan itibaren 14 gün geçerlidir.
const dkd_entitlement=`export function hasPlusEntitlement(profile: any | null, subscription: any | null) {\n  if (!profile) return false;\n  if (profile.plus_trial_until && new Date(profile.plus_trial_until).getTime() > Date.now()) return true;\n  const profileStatus=String(profile.subscription_status||'').toUpperCase();\n  const subscriptionStatus=String(subscription?.status||'').toUpperCase();\n  const subscriptionExpiry=subscription?.expires_at?new Date(subscription.expires_at).getTime():null;\n  if (['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(subscriptionStatus)) return !subscriptionExpiry || subscriptionExpiry>Date.now();\n  return ['PLUS_ACTIVE','PLUS_GRACE_PERIOD'].includes(profileStatus);\n}\n\nexport async function isUsernameAvailable`;
dkd_regex('src/lib/drabornpark.ts',/export function hasPlusEntitlement\(profile: any \| null, subscription: any \| null\) \{[\s\S]*?\n\}\n\nexport async function isUsernameAvailable/,dkd_entitlement,'trial-first entitlement');

// Uygulama içi görünür sürüm ve gizlilik merkezi.
let dkd_legal=dkd_read('app/legal.tsx');
dkd_legal=dkd_legal.replace('<Pill label="v1.0" color={palette.green}/>','<Pill label="v1.0.15" color={palette.green}/>');
dkd_legal=dkd_legal.replace(/DraBornPark • DrabornEagle • Son güncelleme: [^<]+/,'DraBornPark • DrabornEagle • Son güncelleme: 26 Ağustos 2026 • v1.0.15');
dkd_write('app/legal.tsx',dkd_legal);

// package-lock kök metadata'sı eski sürüm gösteriyorsa release çalışma ağacında güncelle.
if(fs.existsSync(path.join(dkd_root,'package-lock.json'))){
  let dkd_lock=dkd_read('package-lock.json');
  dkd_lock=dkd_lock.replace('"version": "1.0.8"','"version": "1.0.15"');
  dkd_lock=dkd_lock.replace('"version": "1.0.8"','"version": "1.0.15"');
  dkd_write('package-lock.json',dkd_lock);
}

console.log('DraBornPark v1.0.15 source materialization applied.');
