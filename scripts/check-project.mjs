import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const fail=[];

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const repoVersion=read('.github/VERSION').trim();
const versions=[['package.json',pkg.version],['app.json',app.expo?.version],['.github/VERSION',repoVersion]];
const expected=versions[0][1];
for(const [file,value] of versions){if(value!==expected)fail.push(`Version mismatch: ${file}=${value}, expected ${expected}`)}
if(expected!=='0.5.0')fail.push(`Release audit expected 0.5.0 but found ${expected}. Update this guard intentionally for the next release.`);
if(!Number.isInteger(app.expo?.android?.versionCode)||app.expo.android.versionCode<14)fail.push('app.json android.versionCode must be >=14 for the current DraBornPark standalone developer APK.');
if(app.expo?.experiments?.reactCompiler===true)fail.push('React Compiler must remain disabled for v0.5.0 controlled-input/focus stability.');
if(pkg.dependencies?.['expo-file-system']!=='~57.0.1')fail.push('expo-file-system ~57.0.1 is required for reliable Android local image reads.');

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
const routeFiles=walk(path.join(root,'app')).filter(file=>file.endsWith('.tsx'));
for(const file of routeFiles){const src=fs.readFileSync(file,'utf8');if(!/export\s+default\s+/.test(src))fail.push(`Expo Router route has no default export: ${path.relative(root,file)}`)}
for(const required of ['app/legal.tsx','app/account.tsx','app/tags.tsx','app/factory.tsx','app/hub.tsx']){if(!exists(required))fail.push(`Required release route missing: ${required}`)}

const uiFiles=[...routeFiles,...walk(path.join(root,'src','components')).filter(file=>file.endsWith('.tsx'))];
for(const file of uiFiles){const src=fs.readFileSync(file,'utf8');const regex=/fontSize\s*:\s*(\d+(?:\.\d+)?)/g;let match;while((match=regex.exec(src))){const size=Number(match[1]);if(size<9)fail.push(`Tiny text (${size}px) in ${path.relative(root,file)}. Use a readable type scale.`)}}

const allAppSource=[...routeFiles,...walk(path.join(root,'src')).filter(file=>/\.(tsx?|js|mjs)$/.test(file))].map(file=>fs.readFileSync(file,'utf8')).join('\n');
if(allAppSource.includes('ImagePicker.MediaTypeOptions'))fail.push('Deprecated ImagePicker.MediaTypeOptions remains in source. Use ImagePicker.MediaType values.');

const chrome=read('src/components/AppChrome.tsx');
if(!chrome.includes('numberOfLines={1}')||!chrome.includes('adjustsFontSizeToFit'))fail.push('ScreenHeader must protect long titles from wrapping.');
const home=read('app/index.tsx');
if(!home.includes('title="Merkezim"')||home.includes('title="Gizlilik & Veri" body="İzinler, veriler ve hesap"'))fail.push('Home secondary feature card must be Merkezim.');
if(!home.includes('loadingStage')||!home.includes('loadingOrbitOuter')||!home.includes('loadingCoreSweep')||!home.includes('loadingSpectrum'))fail.push('Loading experience must keep the fixed centered stage and v0.5.0 colorful motion markers.');
if(home.includes('ImagePicker.MediaTypeOptions'))fail.push('Home avatar picker still uses deprecated ImagePicker.MediaTypeOptions.');
const auth=read('app/auth.tsx');
if(auth.includes('ImagePicker.MediaTypeOptions'))fail.push('Auth avatar picker still uses deprecated ImagePicker.MediaTypeOptions.');
if(!auth.includes('keyboardShouldPersistTaps="always"')||!auth.includes('keyboardDismissMode="none"'))fail.push('Auth form must preserve keyboard focus while typing.');
const tags=read('app/tags.tsx');
if(!tags.includes('activateSpectrum')||!tags.includes('activateSweep'))fail.push('Tag activation CTA v0.5.0 animation markers are missing.');

const primitives=read('src/components/Primitives.tsx');
for(const legacy of ['car-plus','car-alert','shield-search-outline','map-marker-heart-outline']){
  if(!primitives.includes(`'${legacy}':`))fail.push(`Runtime icon alias missing for legacy Material icon: ${legacy}`);
}
if(!primitives.includes('materialGlyphMap[alias]'))fail.push('Material icon aliases must be registered in the glyph map to prevent Expo LogBox warnings from legacy dynamic demo records.');

const park=read('app/park.tsx');
if(!park.includes('Konumunu neden istiyoruz?')||!park.includes('requestForegroundPermissionsAsync'))fail.push('Park location permission must include an in-app prominent disclosure before the Android runtime permission.');
if(park.includes('Konum kontrolü tamamen sende'))fail.push('Removed location privacy card text must not return to Park Ettim.');
if(!park.includes('locationSweep')||!park.includes('saveSweep')||!park.includes('actionSpectrum')||!park.includes('saveSpectrum'))fail.push('Park location/save CTAs must retain the modern animated solid-color treatment.');
if(!park.includes('resizeMode="cover"')||!park.includes('mediaPhotoFooter'))fail.push('Park photo preview must crop cleanly into its frame and expose a retake affordance.');
if(!park.includes('keyboardShouldPersistTaps="always"')||!park.includes('keyboardDismissMode="none"'))fail.push('Park form must preserve keyboard focus while editing parking details.');

const localFile=read('src/lib/localFile.ts');
const drabornpark=read('src/lib/drabornpark.ts');
const storage=read('src/lib/storage.ts');
if(!localFile.includes("from 'expo-file-system'")||!localFile.includes('arrayBuffer()'))fail.push('Reliable local file reader is missing Expo FileSystem binary reads.');
if(!drabornpark.includes('readLocalFileBytes')||!storage.includes('readLocalFileBytes'))fail.push('Avatar and private image uploads must both use the reliable local file reader.');

const account=read('app/account.tsx');
const hasDeleteCopy=account.includes('Hesabımı ve kullanıcı verilerimi kalıcı olarak sil')||account.includes('HESABIMI VE VERİLERİMİ KALICI SİL');
if(!hasDeleteCopy||!account.includes('deleteDraBornParkAccount')||!account.includes('ACCOUNT_DELETION_URL'))fail.push('Account deletion must be directly available in-app and expose the external deletion resource.');

const ci=read('.github/workflows/ci.yml');
if(!ci.includes('assembleRelease')||ci.includes('assembleDebug')||!ci.includes('actions/upload-artifact@v4')||!ci.includes('developer-apk'))fail.push('CI must build and upload a standalone release-variant Developer APK with embedded JavaScript.');
if(!ci.includes('index\\.android\\.bundle')||!ci.includes('apksigner'))fail.push('CI standalone APK must verify the embedded JS bundle and APK signature before upload.');

for(const dirty of ['.github/workflows/v050-finalize.yml','scripts/.v050.part1','scripts/.v050.part2','scripts/.v050.part3','scripts/.v050.part4','scripts/.v050.part5']){
  if(exists(dirty))fail.push(`Temporary release artifact must be removed: ${dirty}`);
}
for(const migration of [
  'supabase/migrations/20260820211711_drabornpark_v050_profile_username_avatar_admin.sql',
  'supabase/migrations/20260820211832_drabornpark_v050_admin_session_access.sql',
  'supabase/migrations/20260820223248_drabornpark_v050_release_hardening.sql',
]){if(!exists(migration))fail.push(`v0.5.0 Supabase migration missing from repository: ${migration}`)}

if(fail.length){console.error('\nDraBornPark integrity check failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`DraBornPark integrity OK • v${expected} • Android vc${app.expo.android.versionCode} • ${routeFiles.length} routes • standalone APK bundle verification • animated park/loading UI • Android-safe image reads • release hygiene verified.`);