import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');

const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_hub=dkd_read('app/hub.tsx');
const dkd_lib=dkd_read('src/lib/drabornpark.ts');

const dkd_v113_applied=
  dkd_plus.includes("const dkdPaidPremium=dkdStoreState==='active'") &&
  dkd_plus.includes('dkdStoreState') &&
  dkd_hub.includes("title:'Admin Paneli'") &&
  dkd_lib.includes('dkdLocalOwnershipChecked');

if(dkd_v113_applied){
  console.log('DraBornPark v1.0.13 source transforms already applied • repeat-safe skip.');
}else{
  await import('./apply-v113-source-transform.mjs');
}
