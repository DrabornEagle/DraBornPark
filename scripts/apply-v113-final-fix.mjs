import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(path.join(dkd_root,dkd_file),dkd_text);
function dkd_patch(dkd_file,dkd_from,dkd_to){
  let dkd_text=dkd_read(dkd_file);
  if(dkd_text.includes(dkd_to))return;
  if(!dkd_text.includes(dkd_from))throw new Error('DraBornPark v1.0.13 final entitlement marker missing in '+dkd_file);
  dkd_text=dkd_text.replace(dkd_from,dkd_to);dkd_write(dkd_file,dkd_text);
}

dkd_patch('src/lib/drabornpark.ts',
  "  if (!profile) return false;\n  if (profile.plus_trial_until && new Date(profile.plus_trial_until).getTime() > Date.now()) return true;",
  "  if (!profile) return false;\n  if(Platform.OS==='android'&&String(subscription?.status||'').toUpperCase()==='PLUS_NOT_OWNED')return false;\n  if (profile.plus_trial_until && new Date(profile.plus_trial_until).getTime() > Date.now()) return true;"
);

dkd_patch('src/lib/drabornpark.ts',
  "  const dkdResolvedSubscription=Platform.OS==='android'&&dkdLocalPlaySubscription?.dkdLocalOwnershipChecked?(dkdLocalPlaySubscription.subscription??null):(dkdLocalPlaySubscription?.subscription??(dkdServerActive?dkdServerSubscription:dkdServerSubscription));",
  "  const dkdProfileSubscriptionStatus=String(profileRes.data?.subscription_status||'').toUpperCase();\n  const dkdHadPaidMarker=Boolean(dkdServerSubscription)||['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdProfileSubscriptionStatus);\n  const dkdNotOwnedSubscription=dkdHadPaidMarker?{provider:'google_play_device',product_id:'drabornpark_plus',base_plan_id:null,status:'PLUS_NOT_OWNED',expires_at:null,auto_renewing:false,last_verified_at:null,client_store_entitlement:false,transaction_date:null}:null;\n  const dkdResolvedSubscription=Platform.OS==='android'&&dkdLocalPlaySubscription?.dkdLocalOwnershipChecked?(dkdLocalPlaySubscription.subscription??dkdNotOwnedSubscription):(dkdLocalPlaySubscription?.subscription??(dkdServerActive?dkdServerSubscription:dkdServerSubscription));"
);

dkd_patch('src/components/DraBornParkPlusPanel.tsx',
  "const dkdServerPremium=Boolean(data?.subscription?.client_store_entitlement||['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdSubscriptionStatus));const dkdPaidPremium=dkdStoreState==='active'?true:dkdStoreState==='inactive'?false:Boolean(lastVerified?.entitled||dkdServerPremium);const dkdResolvedTrialActive=dkdStoreState==='checking'?false:trialActive;",
  "const dkdServerPremium=Boolean(data?.subscription?.client_store_entitlement||['PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED'].includes(dkdSubscriptionStatus));const dkdPaidOwnershipEnded=dkdSubscriptionStatus==='PLUS_NOT_OWNED';const dkdPaidPremium=dkdStoreState==='active'?true:dkdStoreState==='inactive'?false:Boolean(lastVerified?.entitled||dkdServerPremium);const dkdResolvedTrialActive=(dkdStoreState==='checking'||dkdPaidOwnershipEnded)?false:trialActive;"
);

console.log('DraBornPark v1.0.13 final entitlement fix ready • refunded/removed Play ownership cannot fall back to stale Premium or trial state.');
