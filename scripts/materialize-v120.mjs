import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const dkd_run=dkd_file=>{const dkd_result=spawnSync(process.execPath,[dkd_file],{stdio:'inherit'});if(dkd_result.status!==0)process.exit(dkd_result.status??1);};
const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_finalize=()=>{
  fs.writeFileSync('.github/VERSION','1.0.20\n');
  if(fs.existsSync('package-lock.json')){
    const dkd_lock=JSON.parse(dkd_read('package-lock.json'));
    dkd_lock.version='1.0.20';
    if(dkd_lock.packages?.[''])dkd_lock.packages[''].version='1.0.20';
    fs.writeFileSync('package-lock.json',JSON.stringify(dkd_lock,null,2)+'\n');
  }
  if(fs.existsSync('supabase/functions/dkd-drabornpark-google-play/index.ts')){
    const dkd_google_file='supabase/functions/dkd-drabornpark-google-play/index.ts';
    const dkd_google_text=dkd_read(dkd_google_file).replace(/urn:ietf:params:oauth2:grant-type:jwt-bearer/g,'urn:ietf:params:oauth:grant-type:jwt-bearer');
    fs.writeFileSync(dkd_google_file,dkd_google_text);
  }
};
const dkd_app=JSON.parse(dkd_read('app.json')).expo;
const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');
const dkd_ready=dkd_app.version==='1.0.20'&&dkd_app.android?.versionCode===20&&dkd_google.includes('const VERSION="1.0.20"')&&dkd_google.includes('orderHistory?.refundEvent')&&dkd_plus.includes('visible={dkdInfoPopup}')&&!dkd_plus.includes("Aylık ve yıllık güncel fiyatlar Google Play'den canlı alınır.")&&dkd_version.includes('FALLBACK_VERSION="1.0.20"');
dkd_run('scripts/materialize-v101-brand.mjs');
if(dkd_ready){dkd_finalize();console.log('DraBornPark v1.0.20 source already materialized; transforms skipped.');process.exit(0);}
const dkd_current=JSON.parse(dkd_read('app.json')).expo.version;
if(dkd_current!=='1.0.19'&&dkd_current!=='1.0.20')dkd_run('scripts/materialize-v119.mjs');
dkd_run('scripts/apply-v120-safe.mjs');
dkd_finalize();
console.log('DraBornPark v1.0.20 materialization complete.');
