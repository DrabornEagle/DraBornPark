import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const dkd_run=dkd_file=>{
  const dkd_result=spawnSync(process.execPath,[dkd_file],{stdio:'inherit'});
  if(dkd_result.status!==0)process.exit(dkd_result.status??1);
};
const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_patch_admin=()=>{
  const dkd_file='app/admin.tsx';
  let dkd_text=dkd_read(dkd_file);
  dkd_text=dkd_text.replace("const DKD_FALLBACK_LATEST_VERSION='1.0.18';","const DKD_FALLBACK_LATEST_VERSION='1.0.19';");
  dkd_text=dkd_text.replace('const DKD_FALLBACK_LATEST_VERSION_CODE=18;','const DKD_FALLBACK_LATEST_VERSION_CODE=19;');
  dkd_text=dkd_text.replace('const [dkdMinimum,setDkdMinimum]=useState(17);','const [dkdMinimum,setDkdMinimum]=useState(18);');
  fs.writeFileSync(dkd_file,dkd_text);
};

dkd_patch_admin();
const dkd_app=JSON.parse(dkd_read('app.json')).expo;
const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');
const dkd_admin=dkd_read('app/admin.tsx');
const dkd_ready=dkd_app.version==='1.0.19'&&dkd_app.android?.versionCode===19&&dkd_plus.includes("AsyncStorage.removeItem('@drabornpark:plus-local-v118')")&&!dkd_plus.includes('PLUS_LOCAL_CONFIRMED')&&!dkd_plus.includes('dkdEstimatedExpiry')&&dkd_google.includes('const VERSION="1.0.19"')&&dkd_version.includes('FALLBACK_VERSION="1.0.19"')&&dkd_admin.includes("DKD_FALLBACK_LATEST_VERSION='1.0.19'")&&dkd_admin.includes('DKD_FALLBACK_LATEST_VERSION_CODE=19');

dkd_run('scripts/materialize-v101-brand.mjs');
if(dkd_ready){
  console.log('DraBornPark v1.0.19 source already materialized; transforms skipped.');
  process.exit(0);
}

for(const dkd_file of [
  'scripts/apply-v115-safe.mjs',
  'scripts/apply-v116-safe.mjs',
  'scripts/apply-v117-safe.mjs',
  'scripts/apply-v118-safe.mjs',
  'scripts/apply-v118-idempotency.mjs',
  'scripts/apply-v118-pricing.mjs',
  'scripts/apply-v119-safe.mjs',
])dkd_run(dkd_file);

dkd_patch_admin();
console.log('DraBornPark v1.0.19 materialization complete.');
