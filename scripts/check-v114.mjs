import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');
const dkd_exists=dkd_file=>fs.existsSync(path.join(dkd_root,dkd_file));
const dkd_fail=[];
const dkd_pkg=JSON.parse(dkd_read('package.json'));
const dkd_app=JSON.parse(dkd_read('app.json'));
const dkd_repo_version=dkd_read('.github/VERSION').trim();

if(dkd_pkg.version!=='1.0.14'||dkd_app.expo?.version!=='1.0.14'||dkd_repo_version!=='1.0.14')dkd_fail.push('v1.0.14 version coherence failed');
if(dkd_app.expo?.android?.versionCode!==14)dkd_fail.push('Android versionCode must be 14');
if(dkd_app.expo?.android?.package!=='com.draborneagle.drabornpark')dkd_fail.push('Android package mismatch');
for(const [dkd_name,dkd_script] of Object.entries(dkd_pkg.scripts??{}))if(!String(dkd_script).includes('apply-v114-safe.mjs'))dkd_fail.push('Script does not apply v1.0.14 transform: '+dkd_name);
for(const dkd_file of ['src/components/PremiumRouteGuard.tsx','src/components/DraBornParkPlusPanel.tsx','src/lib/drabornpark.ts','app/_layout.tsx','app/hub.tsx','scripts/apply-v114-source-transform.mjs','supabase/functions/dkd-drabornpark-google-play/index.ts'])if(!dkd_exists(dkd_file))dkd_fail.push('Required file missing: '+dkd_file);

const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
for(const dkd_marker of ["setDkdStoreState(dkd_verified.entitled?'active':'inactive')",'Premium özellikler doğrulama tamamlanana kadar kilitli','İade edilen abonelik tespit edildi',"const dkdPaidPremium=dkdStoreState==='active'&&Boolean"] )if(!dkd_plus.includes(dkd_marker))dkd_fail.push('DraBornPark+ strict entitlement marker missing: '+dkd_marker);
const dkd_lib=dkd_read('src/lib/drabornpark.ts');
for(const dkd_marker of ["provider:'google_play_verified'","status:'PLUS_UNVERIFIED'","['PLUS_NOT_OWNED','PLUS_REFUNDED','PLUS_UNVERIFIED','PLUS_EXPIRED']",'client_store_entitlement:dkd_verified.entitled===true'])if(!dkd_lib.includes(dkd_marker))dkd_fail.push('Strict dashboard entitlement marker missing: '+dkd_marker);
const dkd_guard=dkd_read('src/components/PremiumRouteGuard.tsx');
for(const dkd_marker of ['/family','/guest','/modes','/routing','/emergency','/timeline','/insights',"router.replace('/feature/plus')"])if(!dkd_guard.includes(dkd_marker))dkd_fail.push('Premium route guard marker missing: '+dkd_marker);
const dkd_hub=dkd_read('app/hub.tsx');
for(const dkd_marker of ['requiresPlus?:boolean','dkdPlusPopup','DRABORNPARK+ GEREKLİ','<Pill label="v1.0.14" color={palette.purple}/>'])if(!dkd_hub.includes(dkd_marker))dkd_fail.push('Premium hub gate marker missing: '+dkd_marker);
const dkd_layout=dkd_read('app/_layout.tsx');if(!dkd_layout.includes('<PremiumRouteGuard/>'))dkd_fail.push('Root PremiumRouteGuard missing');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
for(const dkd_marker of ['const VERSION="1.0.14";','latestSuccessfulOrderId','orders/','PENDING_REFUND','PLUS_REFUNDED','orderState'])if(!dkd_google.includes(dkd_marker))dkd_fail.push('Google Play refund verification marker missing: '+dkd_marker);
const dkd_admin=dkd_read('app/admin.tsx');if(!dkd_admin.includes('const DKD_LATEST_VERSION_CODE=14;'))dkd_fail.push('Admin latest version code must be 14');

if(dkd_fail.length){console.error('DraBornPark v1.0.14 integrity check failed:\n- '+dkd_fail.join('\n- '));process.exit(1);}
console.log('DraBornPark integrity OK • v1.0.14 • Android vc14 • refunded subscriptions fail closed • Premium cards/routes locked without entitlement.');
