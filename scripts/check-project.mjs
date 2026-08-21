import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const walk=(dir)=>!fs.existsSync(dir)?[]:fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]});
const fail=[];
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const repoVersion=read('.github/VERSION').trim();
const expected=pkg.version;

for(const [file,value] of [['package.json',pkg.version],['app.json',app.expo?.version],['.github/VERSION',repoVersion]])if(value!==expected)fail.push(`Version mismatch: ${file}=${value}, expected ${expected}`);
if(expected!=='0.5.0')fail.push(`Release audit expected 0.5.0 but found ${expected}.`);
if(!Number.isInteger(app.expo?.android?.versionCode)||app.expo.android.versionCode<16)fail.push('Android versionCode must be >=16.');
if(app.expo?.experiments?.reactCompiler===true)fail.push('React Compiler must remain disabled for input stability.');
if(pkg.dependencies?.['expo-file-system']!=='~57.0.1')fail.push('expo-file-system ~57.0.1 is required.');
if(pkg.dependencies?.['expo-dev-client']!=='~57.0.10')fail.push('expo-dev-client ~57.0.10 is required.');
if(pkg.dependencies?.['react-native-worklets']!=='0.10.1')fail.push('Expo SDK 57 requires react-native-worklets 0.10.1 for native/JS parity.');
if(pkg.overrides?.['react-native-worklets']!=='0.10.1'||pkg.overrides?.['@expo/cli']!=='57.0.9'||pkg.overrides?.['@expo/metro-runtime']!=='57.0.9')fail.push('CLI, Metro runtime and Worklets overrides must stay pinned.');
if(pkg.scripts?.start!=='expo start --dev-client --clear'||pkg.scripts?.dev!=='expo start --dev-client --clear')fail.push('Start/dev scripts must use --dev-client --clear.');
const plugins=app.expo?.plugins??[];
if(!plugins.some(p=>(Array.isArray(p)?p[0]:p)==='expo-dev-client'))fail.push('expo-dev-client plugin is required.');
if(!plugins.some(p=>(Array.isArray(p)?p[0]:p)==='expo-notifications'))fail.push('expo-notifications plugin is required.');

const routeFiles=walk(path.join(root,'app')).filter(file=>file.endsWith('.tsx'));
for(const file of routeFiles){const src=fs.readFileSync(file,'utf8');if(!/export\s+default\s+/.test(src))fail.push(`Expo Router route has no default export: ${path.relative(root,file)}`)}
for(const required of ['app/legal.tsx','app/account.tsx','app/tags.tsx','app/factory.tsx','app/hub.tsx','app/notifications.tsx'])if(!exists(required))fail.push(`Required route missing: ${required}`);
for(const removed of ['app/public-demo.tsx','app/demo/[section].tsx','docs/ui-nfc-demo-validation.md'])if(exists(removed))fail.push(`Retired demo artifact must be removed: ${removed}`);

const uiFiles=[...routeFiles,...walk(path.join(root,'src','components')).filter(file=>file.endsWith('.tsx'))];
for(const file of uiFiles){const src=fs.readFileSync(file,'utf8');for(const match of src.matchAll(/fontSize\s*:\s*(\d+(?:\.\d+)?)/g)){if(Number(match[1])<9)fail.push(`Tiny text (${match[1]}px) in ${path.relative(root,file)}`)}}
const allSource=[...routeFiles,...walk(path.join(root,'src')).filter(file=>/\.(tsx?|js|mjs)$/.test(file))].map(file=>fs.readFileSync(file,'utf8')).join('\n');
if(allSource.includes('ImagePicker.MediaTypeOptions'))fail.push('Deprecated ImagePicker.MediaTypeOptions remains in source.');

const home=read('app/index.tsx');
if(!home.includes('title="Merkezim"'))fail.push('Home must expose Merkezim.');
if(!home.includes('loadingStage')||!home.includes('loadingSpectrum'))fail.push('Home loading experience markers are missing.');
const hub=read('app/hub.tsx');
for(const retired of ['/public-demo','/demo/[section]','Dış NFC / QR Demo','useDemo','DemoSection'])if(hub.includes(retired))fail.push(`Retired demo marker remains in Merkezim: ${retired}`);

const auth=read('app/auth.tsx');
if(!auth.includes('keyboardShouldPersistTaps="always"')||!auth.includes('keyboardDismissMode="none"'))fail.push('Auth form keyboard stability markers are missing.');
const park=read('app/park.tsx');
if(!park.includes('Konumunu neden istiyoruz?')||!park.includes('requestForegroundPermissionsAsync'))fail.push('Park location disclosure is missing.');
if(!park.includes('keyboardShouldPersistTaps="always"')||!park.includes('keyboardDismissMode="none"'))fail.push('Park form keyboard stability markers are missing.');

const localFile=read('src/lib/localFile.ts');
const drabornpark=read('src/lib/drabornpark.ts');
const storage=read('src/lib/storage.ts');
if(!localFile.includes("from 'expo-file-system'")||!localFile.includes('arrayBuffer()'))fail.push('Reliable local file reader is missing.');
if(!drabornpark.includes('readLocalFileBytes')||!storage.includes('readLocalFileBytes'))fail.push('Image uploads must use reliable local file reads.');

const push=read('src/lib/push.ts');
if(/import\s+.*from\s+['\"]expo-notifications['\"]/.test(push))fail.push('expo-notifications must remain dynamically imported.');
for(const marker of ["import('expo-notifications')",'getExpoPushTokenAsync','drabornpark_push_tokens','drabornpark-alerts-v2','startForegroundReportNotifications','scheduleNotificationAsync'])if(!push.includes(marker))fail.push(`Push marker missing: ${marker}`);
if(push.includes("sound:'default'")||push.includes('sound:"default"'))fail.push('Android notification channel must not declare default as a custom sound file.');
const layout=read('app/_layout.tsx');
if(!layout.includes('LivePushRegistration')||!layout.includes('startForegroundReportNotifications')||layout.includes('DemoProvider'))fail.push('Root layout push/realtime integration is incomplete.');

const inbox=read('app/notifications.tsx');
for(const marker of ["blocking_exit:'Çıkış engelleniyor'","new:'YENİ'","replied:'CEVAPLANDI'","status:'replied'"])if(!inbox.includes(marker))fail.push(`Turkish notification UI marker missing: ${marker}`);
if(inbox.includes("status:'responded'"))fail.push('Notification UI must not write invalid responded status.');
const timeline=read('app/timeline.tsx');
if(timeline.includes('DraBornPark Timeline')||timeline.includes("Timeline'ı"))fail.push('Vehicle history must remain Turkish.');

for(const migration of [
  'supabase/migrations/20260820211711_drabornpark_v050_profile_username_avatar_admin.sql',
  'supabase/migrations/20260820211832_drabornpark_v050_admin_session_access.sql',
  'supabase/migrations/20260820223248_drabornpark_v050_release_hardening.sql',
  'supabase/migrations/20260821010000_drabornpark_v050_production_cleanup.sql',
  'supabase/migrations/20260821011000_drabornpark_v050_factory_status_flow_guard.sql',
  'supabase/migrations/20260821102000_drabornpark_v050_reply_status_and_category_fix.sql',
  'supabase/migrations/20260821102100_drabornpark_v050_reports_realtime_notifications.sql',
])if(!exists(migration))fail.push(`Migration missing: ${migration}`);

const ci=read('.github/workflows/ci.yml');
if(!ci.includes('android-developer-apk')||!ci.includes('assembleDebug')||!ci.includes('vc16-developer-debug')||!ci.includes('expo start --dev-client --clear'))fail.push('CI Developer APK pipeline is incomplete.');

if(fail.length){console.error('\nDraBornPark integrity check failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`DraBornPark integrity OK • v${expected} • Android vc${app.expo.android.versionCode} • ${routeFiles.length} routes • Developer APK • --dev-client • Worklets 0.10.1 parity • foreground system notifications • Turkish inbox • release hygiene verified.`);
