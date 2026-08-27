import fs from 'node:fs';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_app=JSON.parse(dkd_read('app.json')).expo;
const dkd_pkg=JSON.parse(dkd_read('package.json'));
const dkd_admin=dkd_read('app/admin.tsx');
const dkd_gate=dkd_read('src/components/MandatoryUpdateGate.tsx');
const dkd_legal=dkd_read('app/legal.tsx');
const dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');

const dkd_checks=[
  [dkd_app.version==='1.0.17','app version must be 1.0.17'],
  [dkd_app.android?.versionCode===17,'Android versionCode must be 17'],
  [dkd_pkg.version==='1.0.17','package version must be 1.0.17'],
  [dkd_admin.includes('dkdLatestVersion')&&dkd_admin.includes("Google Play'deki v${dkdLatestVersion}"),'admin must use server-backed latest Play version'],
  [dkd_admin.includes('Bir önceki Google Play versionCode'),'admin minimum card must show previous Play version code'],
  [dkd_admin.includes('dkd_latest_version_code:dkdLatestCode'),'force-update toggle must use loaded latest Play code'],
  [dkd_gate.includes('forceUpdateEnabled?:boolean'),'mandatory update payload must expose force-update flag'],
  [dkd_gate.includes('dkdEnabled&&dkdCurrent>0&&dkdRequired>0&&dkdCurrent<dkdRequired'),'mandatory popup must only appear when policy is enabled and installed version is older'],
  [dkd_version.includes('FALLBACK_VERSION="1.0.17"')&&dkd_version.includes('FALLBACK_VERSION_CODE=17'),'app-version edge function must target v1.0.17/vc17'],
  [dkd_version.includes('requiredVersionCode=forceUpdateEnabled?latestVersionCode:0'),'edge function must fully disable mandatory update when policy is off'],
  [dkd_version.includes('previousVersionCode'),'edge function must expose previous Play code separately'],
  [dkd_legal.includes('27 Ağustos 2026 • v1.0.17'),'legal screen must show v1.0.17'],
];
for(const [dkd_ok,dkd_message] of dkd_checks){if(!dkd_ok)throw new Error(dkd_message)}
console.log('DraBornPark v1.0.17 checks: PASS');
