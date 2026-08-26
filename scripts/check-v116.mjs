import fs from 'node:fs';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_app=JSON.parse(dkd_read('app.json')).expo;
const dkd_pkg=JSON.parse(dkd_read('package.json'));
const dkd_lib=dkd_read('src/lib/drabornpark.ts');
const dkd_tags=dkd_read('app/tags.tsx');
const dkd_hub=dkd_read('app/hub.tsx');
const dkd_feature=dkd_read('app/feature/[slug].tsx');
const dkd_admin=dkd_read('app/admin.tsx');
const dkd_legal=dkd_read('app/legal.tsx');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');

const dkd_checks=[
  [dkd_app.version==='1.0.16','app version must be 1.0.16'],
  [dkd_app.android?.versionCode===16,'Android versionCode must be 16'],
  [dkd_pkg.version==='1.0.16','package version must be 1.0.16'],
  [dkd_lib.includes('profile.dkd_unlimited_plus===true'),'unlimited Plus must grant entitlement'],
  [dkd_lib.includes("dkd_drabornpark_sync_plus_tags"),'dashboard must synchronize tag entitlement'],
  [dkd_lib.includes('dkd_subscription_suspended_at'),'dashboard tags must expose subscription suspension'],
  [dkd_tags.includes('ETİKETİN PLUS İLE KORUNUYOR')&&dkd_tags.includes("dkd_subscription_suspended_at"),'tags screen must gate subscription-suspended tag reactivation'],
  [dkd_tags.includes('OTOMATİK YENİDEN BAĞLANTI'),'tag restore popup must explain automatic reactivation'],
  [dkd_hub.includes('dkdNoTagPlusPopup')&&dkd_hub.includes('BAĞLI ETİKET BULUNMUYOR'),'hub must warn no-tag user before Plus page'],
  [dkd_feature.includes('dkdNoTagPopup')&&dkd_feature.includes('DRABORNPARK+ SAYFASINI AÇ'),'deep-link Plus page must show no-tag guidance'],
  [dkd_admin.includes('dkd_drabornpark_admin_search_users'),'admin must search users'],
  [dkd_admin.includes('dkd_drabornpark_admin_update_user'),'admin must edit user profile/Unlimited Plus'],
  [dkd_admin.includes('dkd_unlimited_plus'),'admin must expose Unlimited Plus'],
  [dkd_legal.includes('27 Ağustos 2026 • v1.0.16'),'legal screen must show v1.0.16'],
  [dkd_google.includes('const VERSION="1.0.16";'),'Google Play verifier must be v1.0.16'],
  [dkd_version.includes('const VERSION="1.0.16";')&&dkd_version.includes('const VERSION_CODE=16;'),'app-version function must be v1.0.16/vc16'],
];
for(const [dkd_ok,dkd_message] of dkd_checks){if(!dkd_ok)throw new Error(dkd_message)}
console.log('DraBornPark v1.0.16 checks: PASS');
