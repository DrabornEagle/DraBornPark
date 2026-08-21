import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const walk=dir=>!fs.existsSync(dir)?[]:fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]});
const fail=[];
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const repoVersion=read('.github/VERSION').trim();
const expected=pkg.version;

for(const [file,value] of [['package.json',pkg.version],['app.json',app.expo?.version],['.github/VERSION',repoVersion]])if(value!==expected)fail.push(`Version mismatch: ${file}=${value}, expected ${expected}`);
if(expected!=='0.5.1')fail.push(`Release audit expected 0.5.1 but found ${expected}.`);
if(!Number.isInteger(app.expo?.android?.versionCode)||app.expo.android.versionCode<17)fail.push('Android versionCode must be >=17 for v0.5.1.');
if(app.expo?.experiments?.reactCompiler===true)fail.push('React Compiler must remain disabled for input stability.');
if(pkg.dependencies?.['expo-dev-client']!=='~57.0.10')fail.push('expo-dev-client ~57.0.10 is required.');
if(pkg.dependencies?.['react-native-worklets']!=='0.10.1'||pkg.overrides?.['react-native-worklets']!=='0.10.1')fail.push('Expo SDK 57 Worklets parity must stay on 0.10.1.');
if(pkg.scripts?.start!=='expo start --dev-client --clear'||pkg.scripts?.dev!=='expo start --dev-client --clear')fail.push('Developer startup must use --dev-client --clear.');

const plugins=app.expo?.plugins??[];
if(!plugins.some(p=>(Array.isArray(p)?p[0]:p)==='expo-dev-client'))fail.push('expo-dev-client plugin is required.');
if(!plugins.some(p=>(Array.isArray(p)?p[0]:p)==='expo-notifications'))fail.push('expo-notifications plugin is required.');

const routeFiles=walk(path.join(root,'app')).filter(file=>file.endsWith('.tsx'));
for(const file of routeFiles){const src=fs.readFileSync(file,'utf8');if(!/export\s+default\s+/.test(src))fail.push(`Expo Router route has no default export: ${path.relative(root,file)}`)}
for(const required of ['app/legal.tsx','app/account.tsx','app/tags.tsx','app/factory.tsx','app/hub.tsx','app/notifications.tsx'])if(!exists(required))fail.push(`Required route missing: ${required}`);
for(const removed of ['app/public-demo.tsx','app/demo/[section].tsx','docs/ui-nfc-demo-validation.md'])if(exists(removed))fail.push(`Retired demo artifact must be removed: ${removed}`);

const allSource=[...routeFiles,...walk(path.join(root,'src')).filter(file=>/\.(tsx?|js|mjs)$/.test(file))].map(file=>fs.readFileSync(file,'utf8')).join('\n');
if(allSource.includes('ImagePicker.MediaTypeOptions'))fail.push('Deprecated ImagePicker.MediaTypeOptions remains in source.');

const inbox=read('app/notifications.tsx');
for(const marker of ['visibleCount','Daha Fazla','Anonim mesajlaşma','Kısa bir mesaj yaz','subscribeInboxChanges'])if(!inbox.includes(marker))fail.push(`v0.5.1 inbox marker missing: ${marker}`);
if(!exists('src/lib/contactThreads.ts'))fail.push('Live contact thread helper is missing.');
else{
  const threads=read('src/lib/contactThreads.ts');
  for(const marker of ['drabornpark_contact_sessions','drabornpark_messages','postgres_changes'])if(!threads.includes(marker))fail.push(`Live thread helper marker missing: ${marker}`);
}

const push=read('src/lib/push.ts');
if(/import\s+.*from\s+['\"]expo-notifications['\"]/.test(push))fail.push('expo-notifications must remain dynamically imported.');
for(const marker of ["import('expo-notifications')",'getExpoPushTokenAsync','drabornpark_push_tokens','drabornpark-alerts-v2','drabornpark_messages','presentLocalVisitorMessage','scheduleNotificationAsync'])if(!push.includes(marker))fail.push(`Push marker missing: ${marker}`);
const layout=read('app/_layout.tsx');
if(!layout.includes('startForegroundReportNotifications')||!layout.includes('syncPushRegistration'))fail.push('Root layout notification registration is incomplete.');

const publicContact=read('supabase/functions/drabornpark-public-contact/index.ts');
for(const marker of ['VERSION="0.5.1"','initialMessage','drabornpark_messages','Yeni anonim araç mesajı','limit(100)'])if(!publicContact.includes(marker))fail.push(`Public contact v0.5.1 marker missing: ${marker}`);
const migration='supabase/migrations/20260821083000_drabornpark_v051_live_chat_realtime.sql';
if(!exists(migration))fail.push(`Migration missing: ${migration}`);

const home=read('app/index.tsx');
if(!home.includes('title="Merkezim"'))fail.push('Home must expose Merkezim.');
const park=read('app/park.tsx');
if(!park.includes('Konumunu neden istiyoruz?')||!park.includes('requestForegroundPermissionsAsync'))fail.push('Park location disclosure is missing.');

const ci=read('.github/workflows/ci.yml');
if(!ci.includes('vc17-developer-debug')||!ci.includes('DraBornPark-v0.5.1')||!ci.includes('assembleDebug')||!ci.includes('expo start --dev-client --clear'))fail.push('v0.5.1 Developer APK CI pipeline is incomplete.');

if(fail.length){console.error('\nDraBornPark integrity check failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`DraBornPark integrity OK • v${expected} • Android vc${app.expo.android.versionCode} • ${routeFiles.length} routes • 5+5 inbox pagination • live anonymous chat • foreground Android notifications • Developer APK pipeline verified.`);
