import fs from 'node:fs';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_app=JSON.parse(dkd_read('app.json')).expo;
const dkd_pkg=JSON.parse(dkd_read('package.json'));
const dkd_admin=dkd_read('app/admin.tsx');
const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_lib=dkd_read('src/lib/drabornpark.ts');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_gate=dkd_read('src/components/MandatoryUpdateGate.tsx');
const dkd_legal=dkd_read('app/legal.tsx');
const dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');

const dkd_checks=[
  [dkd_app.version==='1.0.19','app version must be 1.0.19'],
  [dkd_app.android?.versionCode===19,'Android versionCode must be 19'],
  [dkd_pkg.version==='1.0.19','package version must be 1.0.19'],
  [dkd_admin.includes('if(dkdTerm.length<2)'),'admin users must require an explicit search'],
  [!dkd_admin.includes("dkd_query:''"),'admin must not preload all users'],
  [dkd_admin.includes("DKD_FALLBACK_LATEST_VERSION='1.0.19'")&&dkd_admin.includes('DKD_FALLBACK_LATEST_VERSION_CODE=19'),'admin fallback must target v1.0.19/vc19'],
  [!dkd_plus.includes('PLUS_LOCAL_CONFIRMED'),'local purchase must never create paid entitlement'],
  [!dkd_plus.includes('dkdEstimatedExpiry')&&!dkd_plus.includes('dkdPeriodMs'),'paid expiry must never be fabricated from a local plan'],
  [dkd_plus.includes("AsyncStorage.removeItem('@drabornpark:plus-local-v118')"),'stale v1.0.18 local receipt must be purged'],
  [dkd_plus.includes("action?:'verify'|'restore'")&&dkd_plus.includes("action:'restore'"),'restore must use authoritative server verification'],
  [dkd_plus.includes('dkd_verified_current?.serverError'),'new purchase must stop when an existing purchase cannot be verified'],
  [dkd_plus.includes('dkdCountdownEstimated=false'),'countdown must be based only on server expiry/trial expiry'],
  [dkd_plus.includes('replacementMode=6'),'verified plan replacement must use Google Play replacement flow'],
  [dkd_plus.includes("planInfo[id]?.price"),'subscription prices must come from Google Play'],
  [dkd_lib.includes("body:{action:'restore'")&&dkd_lib.indexOf("supabase.functions.invoke('dkd-drabornpark-google-play'")<dkd_lib.indexOf('dkd_iap.finishTransaction'),'dashboard must verify before finishing a purchase'],
  [dkd_google.includes('const VERSION="1.0.19"'),'Google Play verifier must be v1.0.19'],
  [!dkd_google.includes('PLUS_REFUNDED'),'server must only persist DB-supported subscription states'],
  [!dkd_google.includes('/orders/'),'order state must not override SubscriptionPurchaseV2 entitlement'],
  [dkd_google.includes('ACKNOWLEDGEMENT_STATE_PENDING')&&dkd_google.includes(':acknowledge'),'server must acknowledge verified pending subscriptions'],
  [dkd_google.includes('externalAccountMatched'),'legacy account-id mismatch must be recorded without inventing entitlement'],
  [dkd_google.includes('purchase_already_claimed'),'purchase token must remain single-user claimed'],
  [dkd_google.includes('purchaseStartMs')&&dkd_google.includes('trialBonusMs'),'remaining trial must be added once from purchase start'],
  [dkd_gate.includes('dkdEnabled&&dkdCurrent>0&&dkdRequired>0&&dkdCurrent<dkdRequired'),'mandatory update gate must respect enabled state'],
  [dkd_version.includes('FALLBACK_VERSION="1.0.19"')&&dkd_version.includes('FALLBACK_VERSION_CODE=19'),'app-version edge function must target v1.0.19/vc19'],
  [dkd_version.includes('previousVersionCode'),'app-version endpoint must expose previous code'],
  [dkd_legal.includes('27 Ağustos 2026 • v1.0.19'),'legal screen must show v1.0.19'],
];
for(const [dkd_ok,dkd_message] of dkd_checks){if(!dkd_ok)throw new Error(dkd_message)}
console.log('DraBornPark v1.0.19 checks: PASS');
