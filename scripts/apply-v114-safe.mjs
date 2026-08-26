import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');
const dkd_exists=dkd_file=>fs.existsSync(path.join(dkd_root,dkd_file));

const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
const dkd_lib=dkd_read('src/lib/drabornpark.ts');
const dkd_hub=dkd_read('app/hub.tsx');
const dkd_layout=dkd_read('app/_layout.tsx');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_applied=
  dkd_plus.includes("setDkdStoreState(dkd_verified.entitled?'active':'inactive')")&&
  dkd_lib.includes("provider:'google_play_verified'")&&
  dkd_lib.includes("'PLUS_REFUNDED','PLUS_UNVERIFIED'")&&
  dkd_hub.includes('requiresPlus?:boolean')&&
  dkd_layout.includes('PremiumRouteGuard')&&
  dkd_google.includes('orderState')&&
  dkd_google.includes('const VERSION="1.0.14";')&&
  dkd_exists('src/components/PremiumRouteGuard.tsx');

if(dkd_applied)console.log('DraBornPark v1.0.14 source transforms already applied • repeat-safe skip.');
else await import('./apply-v114-source-transform.mjs');
