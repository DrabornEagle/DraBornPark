import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_path=>fs.readFileSync(path.join(dkd_root,dkd_path),'utf8');
const dkd_exists=dkd_path=>fs.existsSync(path.join(dkd_root,dkd_path));
const dkd_fail=[];
const dkd_pkg=JSON.parse(dkd_read('package.json'));
const dkd_app=JSON.parse(dkd_read('app.json'));
const dkd_repo_version=dkd_read('.github/VERSION').trim();

if(dkd_pkg.version!=='1.0.10'||dkd_app.expo?.version!=='1.0.10'||dkd_repo_version!=='1.0.10')dkd_fail.push('v1.0.10 version coherence failed');
if(dkd_app.expo?.android?.versionCode!==10)dkd_fail.push('Android versionCode must be 10');
if(dkd_app.expo?.android?.package!=='com.draborneagle.drabornpark')dkd_fail.push('Android package mismatch');
if(dkd_app.expo?.owner!=='draborneagle'||dkd_app.expo?.slug!=='drabornpark')dkd_fail.push('Expo owner/slug mismatch');
if(dkd_app.expo?.extra?.eas?.projectId!=='db4ce418-3c4a-4323-9a1f-e39614b64e27')dkd_fail.push('EAS projectId mismatch');
if(!Object.values(dkd_pkg.scripts??{}).every(dkd_script=>String(dkd_script).includes('apply-v110-source-transform.mjs')))dkd_fail.push('All project scripts must apply v1.0.10 source transform');
for(const dkd_file of ['google-services.json','assets/branding/icon.png','assets/branding/adaptive-icon.png','assets/branding/splash-icon.png','scripts/apply-v110-source-transform.mjs','src/components/DraBornParkPlusPanel.tsx','src/components/MandatoryUpdateGate.tsx','supabase/functions/dkd-drabornpark-app-version/index.ts'])if(!dkd_exists(dkd_file))dkd_fail.push('Required file missing: '+dkd_file);

const dkd_layout=dkd_read('app/_layout.tsx');
for(const dkd_marker of ["MandatoryUpdateGate} from '@/src/components/MandatoryUpdateGate'",'<MandatoryUpdateGate/><LivePushRegistration/>'])if(!dkd_layout.includes(dkd_marker))dkd_fail.push('Mandatory update layout marker missing: '+dkd_marker);
const dkd_update=dkd_read('src/components/MandatoryUpdateGate.tsx');
for(const dkd_marker of ['dkd-drabornpark-app-version','minimumVersionCode','forceUpdateBelow','ZORUNLU GÜNCELLEME','primaryLabel="GÜNCELLE"','play.google.com/store/apps/details?id=com.draborneagle.drabornpark'])if(!dkd_update.includes(dkd_marker))dkd_fail.push('Mandatory update marker missing: '+dkd_marker);

const dkd_plus=dkd_read('src/components/DraBornParkPlusPanel.tsx');
for(const dkd_marker of ['dkdCountdownNow','dkdRemainingDays','ABONELİK SÜRESİ','GÜN KALDI','Premium özelliklerin açıldı','DraBornPark Aile','Geçici Sürücü','Vale / Servis Modu','Zaman Kuralları','Acil Durum Zinciri','Gelişmiş Araç Geçmişi','Aylık Özet'])if(!dkd_plus.includes(dkd_marker))dkd_fail.push('DraBornPark+ v1.0.10 marker missing: '+dkd_marker);
for(const dkd_marker of ['subscriptionOfferDetailsAndroid','subscriptionOffers','offerTokenAndroid','basePlanIdAndroid',"dkdPeriod=plan.id==='monthly'?'P1M':'P1Y'"])if(!dkd_plus.includes(dkd_marker))dkd_fail.push('Google Play compatibility marker missing: '+dkd_marker);

const dkd_home=dkd_read('app/index.tsx');
if(!dkd_home.includes('<Pill label="v1.0.10" color={palette.purple}/>'))dkd_fail.push('Visible app v1.0.10 marker missing');
const dkd_factory=dkd_read('app/factory.tsx');
if(!dkd_factory.includes('NFC + QR ETİKET MERKEZİ • v1.0.10'))dkd_fail.push('Factory visible v1.0.10 marker missing');
const dkd_tag=dkd_read('app/t/[id].tsx');
if(!dkd_tag.includes("DraBornPark v1.0.10 • Güvenli Araç İletişimi"))dkd_fail.push('Tag evidence v1.0.10 marker missing');

const dkd_public_contact=dkd_read('supabase/functions/drabornpark-public-contact/index.ts');
if(!dkd_public_contact.includes('const VERSION="1.0.10";'))dkd_fail.push('Public contact v1.0.10 source mismatch');
const dkd_google_play=dkd_read('supabase/functions/dkd-drabornpark-google-play/index.ts');
if(!dkd_google_play.includes('const VERSION="1.0.10";'))dkd_fail.push('Google Play verifier v1.0.10 source mismatch');
const dkd_version_fn=dkd_read('supabase/functions/dkd-drabornpark-app-version/index.ts');
for(const dkd_marker of ['const VERSION="1.0.10";','const VERSION_CODE=10;','minimumVersionCode:VERSION_CODE','forceUpdateBelow:VERSION_CODE'])if(!dkd_version_fn.includes(dkd_marker))dkd_fail.push('Version policy source mismatch: '+dkd_marker);

const dkd_notification_plugin=(dkd_app.expo?.plugins??[]).find(dkd_plugin=>Array.isArray(dkd_plugin)&&dkd_plugin[0]==='expo-notifications');
if(!Array.isArray(dkd_notification_plugin)||dkd_notification_plugin[1]?.defaultChannel!=='drabornpark-alerts-v4')dkd_fail.push('Android notification channel configuration mismatch');
if(dkd_pkg.dependencies?.['expo-dev-client'])dkd_fail.push('expo-dev-client must not exist in production dependencies');

if(dkd_fail.length){console.error('DraBornPark v1.0.10 integrity check failed:\n- '+dkd_fail.join('\n- '));process.exit(1);}
console.log('DraBornPark integrity OK • v1.0.10 • Android vc10 • mandatory Google Play update gate • Premium success feature popup • live subscription countdown • signed release gate ready.');
