import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const app=JSON.parse(read('app.json')).expo;
const pkg=JSON.parse(read('package.json'));
const home=read('app/index.tsx');
const hub=read('app/hub.tsx');
const layout=read('app/_layout.tsx');
const plusPanel=read('src/components/DraBornParkPlusPanel.tsx');
const lib=read('src/lib/drabornpark.ts');
const legal=read('app/legal.tsx');
const google=read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const versionFn=read('supabase/functions/dkd-drabornpark-app-version/index.ts');

const checks=[
  [app.version==='1.0.15','app version must be 1.0.15'],
  [app.android?.versionCode===15,'Android versionCode must be 15'],
  [pkg.version==='1.0.15','package version must be 1.0.15'],
  [home.includes('__dkdPremiumPopupShownThisLaunch'),'Premium popup must be once per app launch'],
  [!home.includes('premiumShown.current=false'),'Premium popup must not reset on foreground'],
  [home.includes('offsetX={-4}')&&home.includes('text="GÜVENLİ OTURUM"'),'GÜVENLİ OTURUM badge offset must be updated'],
  [home.includes('<Pill label="v1.0.15" color={palette.purple}/>'),'home visible version must be v1.0.15'],
  [plusPanel.includes("fallback:'69,99 TL / ay'")&&plusPanel.includes("fallback:'599,99 TL / yıl'"),'v1.0.14 Plus pricing/UI must be preserved'],
  [plusPanel.includes("const dkdResolvedTrialActive=dkdStoreState==='checking'?false:trialActive"),'tag trial must remain visible after Google Play ownership check'],
  [plusPanel.includes("const dkdPaidPremium=dkdStoreState==='active'&&Boolean(lastVerified?.entitled||dkdServerPremium)"),'paid Premium must remain server/store verified'],
  [layout.includes('PremiumRouteGuard'),'Premium deep-link route guard must be preserved'],
  [hub.includes('requiresPlus')&&hub.includes('dkdPlusPopup'),'Premium hub access gate must be preserved'],
  [lib.indexOf('profile.plus_trial_until')<lib.indexOf("const dkd_subscription_status=String(subscription?.status"),'tag trial entitlement must be evaluated before negative Google Play state'],
  [lib.includes("provider:'google_play_verified'")&&lib.includes('dkdLocalOwnershipChecked'),'strict Google Play dashboard verification must be preserved'],
  [legal.includes('26 Ağustos 2026 • v1.0.15'),'legal screen must show v1.0.15'],
  [google.includes('const VERSION="1.0.15";'),'Google Play verifier must be v1.0.15'],
  [google.includes('trialBonusMs')&&google.includes('effectiveExpiry'),'Google Play verifier must preserve remaining trial bonus'],
  [versionFn.includes('const VERSION="1.0.15";')&&versionFn.includes('const VERSION_CODE=15;'),'app-version function must be v1.0.15/vc15'],
];
for(const [ok,message] of checks){if(!ok)throw new Error(message)}
console.log('DraBornPark v1.0.15 checks: PASS');
