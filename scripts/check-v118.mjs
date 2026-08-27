import fs from 'node:fs';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_app=JSON.parse(dkd_read('app.json')).expo;
const dkd_pkg=JSON.parse(dkd_read('package.json'));
const dkd_admin=dkd_read('app/admin.tsx');
const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_gate=dkd_read('src/components/MandatoryUpdateGate.tsx');
const dkd_legal=dkd_read('app/legal.tsx');
const dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');

const dkd_checks=[
  [dkd_app.version==='1.0.18','app version must be 1.0.18'],
  [dkd_app.android?.versionCode===18,'Android versionCode must be 18'],
  [dkd_pkg.version==='1.0.18','package version must be 1.0.18'],
  [dkd_admin.includes('if(dkdTerm.length<2)'),'admin users must require an explicit search'],
  [!dkd_admin.includes("dkd_query:''"),'admin must not preload all users'],
  [dkd_admin.includes("DKD_FALLBACK_LATEST_VERSION='1.0.18'")&&dkd_admin.includes('DKD_FALLBACK_LATEST_VERSION_CODE=18'),'admin fallback must target v1.0.18/vc18'],
  [dkd_plus.includes('PLUS_LOCAL_CONFIRMED'),'billing must preserve a Play-confirmed local entitlement while server sync is unavailable'],
  [dkd_plus.includes('replacementMode=6'),'billing plan replacement must use deferred Google Play replacement mode'],
  [dkd_plus.includes("@drabornpark:plus-local-v118"),'billing must persist local Play receipt state'],
  [dkd_plus.includes('dkdTrialBonusMs'),'billing countdown must include remaining trial bonus'],
  [dkd_plus.includes('Sunucu doğrulaması geçici olarak erişilemiyorsa aktif Google Play satın alması kaybolmuş gibi gösterilmez'),'billing copy must not misreport a verified Play purchase during server outage'],
  [dkd_google.includes('const VERSION="1.0.18"'),'Google Play verifier must be v1.0.18'],
  [dkd_google.includes('purchaseStartMs')&&dkd_google.includes('google?.startTime'),'trial bonus must be captured from purchase start time'],
  [dkd_gate.includes('dkdEnabled&&dkdCurrent>0&&dkdRequired>0&&dkdCurrent<dkdRequired'),'mandatory update gate must still respect enabled state'],
  [dkd_version.includes('FALLBACK_VERSION="1.0.18"')&&dkd_version.includes('FALLBACK_VERSION_CODE=18'),'app-version edge function must target v1.0.18/vc18'],
  [dkd_version.includes('previousVersionCode'),'app-version endpoint must expose previous code'],
  [dkd_legal.includes('27 Ağustos 2026 • v1.0.18'),'legal screen must show v1.0.18'],
];
for(const [dkd_ok,dkd_message] of dkd_checks){if(!dkd_ok)throw new Error(dkd_message)}
console.log('DraBornPark v1.0.18 checks: PASS');
