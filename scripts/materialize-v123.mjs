import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const dkd_run=dkd_file=>{const dkd_result=spawnSync(process.execPath,[dkd_file],{stdio:'inherit'});if(dkd_result.status!==0)process.exit(dkd_result.status??1);};
const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');

dkd_run('scripts/materialize-v101-brand.mjs');
dkd_run('scripts/apply-v123-safe.mjs');

const dkd_app_json=JSON.parse(dkd_read('app.json'));
dkd_app_json.expo.version='1.0.23';
dkd_app_json.expo.android.versionCode=23;
fs.writeFileSync('app.json',JSON.stringify(dkd_app_json,null,2)+'\n');

const dkd_package=JSON.parse(dkd_read('package.json'));
dkd_package.version='1.0.23';
for(const dkd_key of Object.keys(dkd_package.scripts||{})){
  dkd_package.scripts[dkd_key]=String(dkd_package.scripts[dkd_key]).replaceAll('materialize-v122.mjs','materialize-v123.mjs').replaceAll('check-v122.mjs','check-v123.mjs');
}
fs.writeFileSync('package.json',JSON.stringify(dkd_package,null,2)+'\n');

if(fs.existsSync('package-lock.json')){
  const dkd_lock=JSON.parse(dkd_read('package-lock.json'));
  dkd_lock.version='1.0.23';
  if(dkd_lock.packages?.[''])dkd_lock.packages[''].version='1.0.23';
  fs.writeFileSync('package-lock.json',JSON.stringify(dkd_lock,null,2)+'\n');
}
fs.writeFileSync('.github/VERSION','1.0.23\n');
console.log('DraBornPark v1.0.23 materialization complete.');
