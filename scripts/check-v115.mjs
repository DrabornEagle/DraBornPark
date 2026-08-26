import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const app=JSON.parse(read('app.json')).expo;
const pkg=JSON.parse(read('package.json'));
const home=read('app/index.tsx');
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
  [home.includes('offsetX={-4} icon="shield-check-outline" text="GÜVENLİ OTURUM"'),'GÜVENLİ OTURUM badge offset must be updated'],
  [home.includes('<Pill label="v1.0.15" color={palette.purple}/>'),'home visible version must be v1.0.15'],
  [lib.indexOf('profile.plus_trial_until')<lib.indexOf("const profileStatus=String(profile.subscription_status"),'trial entitlement must be evaluated before profile/store status'],
  [legal.includes('26 Ağustos 2026 • v1.0.15'),'legal screen must show v1.0.15'],
  [google.includes('const VERSION="1.0.15";'),'Google Play verifier must be v1.0.15'],
  [google.includes('trialBonusMs')&&google.includes('effectiveExpiry'),'Google Play verifier must preserve remaining trial bonus'],
  [versionFn.includes('const VERSION="1.0.15";')&&versionFn.includes('const VERSION_CODE=15;'),'app-version function must be v1.0.15/vc15'],
];
for(const [ok,message] of checks){if(!ok)throw new Error(message)}
console.log('DraBornPark v1.0.15 checks: PASS');
