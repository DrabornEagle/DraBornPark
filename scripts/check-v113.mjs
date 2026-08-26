import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_path=>fs.readFileSync(path.join(dkd_root,dkd_path),'utf8');
const dkd_exists=dkd_path=>fs.existsSync(path.join(dkd_root,dkd_path));
const dkd_fail=[];
const dkd_pkg=JSON.parse(dkd_read('package.json'));
const dkd_app=JSON.parse(dkd_read('app.json'));
const dkd_repo_version=dkd_read('.github/VERSION').trim();

if(dkd_pkg.version!=='1.0.13'||dkd_app.expo?.version!=='1.0.13'||dkd_repo_version!=='1.0.13')dkd_fail.push('v1.0.13 version coherence failed');
if(dkd_app.expo?.android?.versionCode!==13)dkd_fail.push('Android versionCode must be 13');
if(dkd_app.expo?.android?.package!=='com.draborneagle.drabornpark')dkd_fail.push('Android package mismatch');
if(!Object.values(dkd_pkg.scripts??{}).every(dkd_script=>String(dkd_script).includes('apply-v113-source-transform.mjs')))dkd_fail.push('All project scripts must apply v1.0.13 source transform');
for(const dkd_file of ['app/admin.tsx','src/components/DraBornParkPlusPanel.tsx','src/components/MandatoryUpdateGate.tsx','src/lib/drabornpark.ts','scripts/apply-v113-source-transform.mjs','supabase/functions/dkd-drabornpark-app-version/index.ts'])if(!dkd_exists(dkd_file))dkd_fail.push('Required file missing: '+dkd_file);

const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
for(const dkd_marker of ["dkdStoreState", "'checking'|'active'|'inactive'|'unknown'",'GOOGLE PLAY KONTROLÜ','Deneme veya Premium bilgisi doğrulama bitmeden gösterilmez.',"dkdStoreState==='inactive'?false",'PREMIUM SÜRESİ'])if(!dkd_plus.includes(dkd_marker))dkd_fail.push('DraBornPark+ v1.0.13 marker missing: '+dkd_marker);
const dkd_lib=dkd_read('src/lib/drabornpark.ts');
for(const dkd_marker of ['dkdLocalOwnershipChecked','Platform.OS===\'android\'&&dkdLocalPlaySubscription?.dkdLocalOwnershipChecked','if(Platform.OS===\'android\')return false;'])if(!dkd_lib.includes(dkd_marker))dkd_fail.push('Refund/entitlement marker missing: '+dkd_marker);
const dkd_hub=dkd_read('app/hub.tsx');
for(const dkd_marker of ["title:'Admin Paneli'","route:'/admin'",'<Pill label="v1.0.13" color={palette.purple}/>'])if(!dkd_hub.includes(dkd_marker))dkd_fail.push('Admin hub marker missing: '+dkd_marker);
const dkd_admin=dkd_read('app/admin.tsx');
for(const dkd_marker of ['dkd_drabornpark_set_force_update','drabornpark_is_admin','ZORUNLU GÜNCELLEME',"const DKD_LATEST_VERSION_CODE=13;"])if(!dkd_admin.includes(dkd_marker))dkd_fail.push('Admin panel marker missing: '+dkd_marker);
const dkd_version_fn=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');
for(const dkd_marker of ['const VERSION="1.0.13";','const VERSION_CODE=13;','dkd_drabornpark_get_update_policy','forceUpdateEnabled','minimumVersionCode'])if(!dkd_version_fn.includes(dkd_marker))dkd_fail.push('Update policy marker missing: '+dkd_marker);
const dkd_home=dkd_read('app/index.tsx');if(!dkd_home.includes('<Pill label="v1.0.13" color={palette.purple}/>'))dkd_fail.push('Visible home version missing');
const dkd_factory=dkd_read('app/factory.tsx');if(!dkd_factory.includes('NFC + QR ETİKET MERKEZİ • v1.0.13'))dkd_fail.push('Factory version missing');

if(dkd_fail.length){console.error('DraBornPark v1.0.13 integrity check failed:\n- '+dkd_fail.join('\n- '));process.exit(1);}
console.log('DraBornPark integrity OK • v1.0.13 • Android vc13 • entitlement flicker blocked • refunded Play ownership removed • admin force-update control ready.');
