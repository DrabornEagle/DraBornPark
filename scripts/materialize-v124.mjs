import {spawnSync} from 'node:child_process';

const dkd_run=dkd_file=>{
  const dkd_result=spawnSync(process.execPath,[dkd_file],{stdio:'inherit'});
  if(dkd_result.status!==0)process.exit(dkd_result.status??1);
};

dkd_run('scripts/materialize-v101-brand.mjs');
dkd_run('scripts/apply-v124-safe.mjs');
console.log('DraBornPark v1.0.24 materialization complete.');
