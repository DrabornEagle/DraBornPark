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

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}

const routeFiles=walk(path.join(root,'app')).filter(file=>file.endsWith('.tsx'));
for(const file of routeFiles){const src=fs.readFileSync(file,'utf8');if(!/export\s+default\s+/.test(src))fail.push(`Expo Router route has no default export: ${path.relative(root,file)}`)}

const uiFiles=[...routeFiles,...walk(path.join(root,'src','components')).filter(file=>file.endsWith('.tsx'))];
for(const file of uiFiles){const src=fs.readFileSync(file,'utf8');const regex=/fontSize\s*:\s*(\d+(?:\.\d+)?)/g;let match;while((match=regex.exec(src))){const size=Number(match[1]);if(size<11)fail.push(`Tiny text (${size}px) in ${path.relative(root,file)}. Use the shared readable type scale or >=11px.`)}}

if(fail.length){console.error('\nDraBornPark integrity check failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`DraBornPark integrity OK • v${expected} • ${routeFiles.length} routes checked • readable typography verified.`);
