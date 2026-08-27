import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const dkd_run=dkd_file=>{const dkd_result=spawnSync(process.execPath,[dkd_file],{stdio:'inherit'});if(dkd_result.status!==0)process.exit(dkd_result.status??1);};
const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
dkd_run('scripts/materialize-v101-brand.mjs');
const dkd_app=JSON.parse(dkd_read('app.json')).expo;
const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_ready=dkd_app.version==='1.0.21'&&dkd_app.android?.versionCode===21&&dkd_plus.includes('PLUS_OTHER_ACCOUNT')&&dkd_plus.includes('obfuscatedProfileId:obfuscated')&&dkd_google.includes('const VERSION="1.0.21"')&&dkd_google.includes('purchase_missing_account_binding');
if(!dkd_ready){
  if(dkd_app.version!=='1.0.20'&&dkd_app.version!=='1.0.21')dkd_run('scripts/materialize-v120.mjs');
  dkd_run('scripts/apply-v121-account-billing.mjs');
  dkd_run('scripts/apply-v121-server-billing.mjs');
}
const dkd_app_json=JSON.parse(dkd_read('app.json'));dkd_app_json.expo.version='1.0.21';dkd_app_json.expo.android.versionCode=21;fs.writeFileSync('app.json',JSON.stringify(dkd_app_json,null,2)+'\n');
const dkd_package=JSON.parse(dkd_read('package.json'));dkd_package.version='1.0.21';fs.writeFileSync('package.json',JSON.stringify(dkd_package,null,2)+'\n');
if(fs.existsSync('package-lock.json')){const dkd_lock=JSON.parse(dkd_read('package-lock.json'));dkd_lock.version='1.0.21';if(dkd_lock.packages?.[''])dkd_lock.packages[''].version='1.0.21';fs.writeFileSync('package-lock.json',JSON.stringify(dkd_lock,null,2)+'\n');}
fs.writeFileSync('.github/VERSION','1.0.21\n');
console.log('DraBornPark v1.0.21 materialization complete.');
