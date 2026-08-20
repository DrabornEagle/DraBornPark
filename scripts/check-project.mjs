import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const fail=[];

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const repoVersion=read('.github/VERSION').trim();
const versions=[['package.json',pkg.version],['app.json',app.expo?.version],['.github/VERSION',repoVersion]];
const expected=versions[0][1];
for(const [file,value] of versions){if(value!==expected)fail.push(`Version mismatch: ${file}=${value}, expected ${expected}`)}
if(!Number.isInteger(app.expo?.android?.versionCode)||app.expo.android.versionCode<1)fail.push('app.json android.versionCode must be a positive integer for Play releases.');

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
const routeFiles=walk(path.join(root,'app')).filter(file=>file.endsWith('.tsx'));
for(const file of routeFiles){const src=fs.readFileSync(file,'utf8');if(!/export\s+default\s+/.test(src))fail.push(`Expo Router route has no default export: ${path.relative(root,file)}`)}
for(const required of ['app/legal.tsx','app/account.tsx']){if(!fs.existsSync(path.join(root,required)))fail.push(`Required release/privacy route missing: ${required}`)}

const uiFiles=[...routeFiles,...walk(path.join(root,'src','components')).filter(file=>file.endsWith('.tsx'))];
for(const file of uiFiles){const src=fs.readFileSync(file,'utf8');const regex=/fontSize\s*:\s*(\d+(?:\.\d+)?)/g;let match;while((match=regex.exec(src))){const size=Number(match[1]);if(size<11)fail.push(`Tiny text (${size}px) in ${path.relative(root,file)}. Use the shared readable type scale or >=11px.`)}}

const primitives=read('src/components/Primitives.tsx');
for(const legacy of ['car-plus','car-alert','shield-search-outline','map-marker-heart-outline']){
  if(!primitives.includes(`'${legacy}':`))fail.push(`Runtime icon alias missing for legacy Material icon: ${legacy}`);
}
if(!primitives.includes('materialGlyphMap[alias]'))fail.push('Material icon aliases must be registered in the glyph map to prevent Expo LogBox warnings from legacy dynamic demo records.');

const park=read('app/park.tsx');
if(!park.includes('Konumunu neden istiyoruz?')||!park.includes('requestForegroundPermissionsAsync'))fail.push('Park location permission must include an in-app prominent disclosure before the Android runtime permission.');
const account=read('app/account.tsx');
const hasDeleteCopy=account.includes('Hesabımı ve kullanıcı verilerimi kalıcı olarak sil')||account.includes('HESABIMI VE VERİLERİMİ KALICI SİL');
if(!hasDeleteCopy||!account.includes('deleteDraBornParkAccount')||!account.includes('ACCOUNT_DELETION_URL'))fail.push('Account deletion must be directly available in-app and expose the external deletion resource.');

if(fail.length){console.error('\nDraBornPark integrity check failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`DraBornPark integrity OK • v${expected} • ${routeFiles.length} routes • readable typography • runtime icon safety • release privacy/account checks verified.`);
