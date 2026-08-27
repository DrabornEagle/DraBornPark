import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_run=dkd_file=>{
  const dkd_result=spawnSync(process.execPath,[dkd_file],{stdio:'inherit'});
  if(dkd_result.status!==0)process.exit(dkd_result.status??1);
};

const dkd_factory=dkd_read('app/factory.tsx');
const dkd_admin=dkd_read('app/admin.tsx');
const dkd_google=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
const dkd_version=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');

const dkd_already_materialized=
  dkd_factory.includes('dkd_drabornpark_factory_update_tag_v123')&&
  dkd_factory.includes('nfc_url:dkd_row.public_alias?dkd_physical_url')&&
  dkd_admin.includes('dkd_drabornpark_admin_search_users_v123')&&
  dkd_admin.includes('dkd_drabornpark_admin_update_user_v123')&&
  dkd_admin.includes('PREMİUM ABONELİK SÜRESİ EKLE (GÜN)')&&
  dkd_admin.includes('PREMİUM KALAN')&&
  !dkd_admin.includes('GÖRÜNEN AD')&&
  dkd_google.includes('const VERSION="1.0.23"')&&
  dkd_version.includes('const FALLBACK_VERSION="1.0.23"')&&
  dkd_version.includes('const FALLBACK_VERSION_CODE=23');

if(dkd_already_materialized){
  console.log('DraBornPark v1.0.23 source transforms already materialized; idempotent pass skipped.');
}else{
  dkd_run('scripts/apply-v123-safe.mjs');
}
