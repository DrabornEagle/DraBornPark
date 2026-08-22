import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';

const root=process.cwd();
const payloadDir=path.join(root,'.github','v054-payload');
const encoded=fs.readdirSync(payloadDir).filter(name=>name.endsWith('.txt')).sort().map(name=>fs.readFileSync(path.join(payloadDir,name),'utf8').trim()).join('');
const payload=JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString('utf8'));
const decode=value=>Buffer.from(value,'base64').toString('utf8');
const full=file=>path.join(root,file);
const read=file=>fs.readFileSync(full(file),'utf8');
const write=(file,content)=>{fs.mkdirSync(path.dirname(full(file)),{recursive:true});fs.writeFileSync(full(file),content)};

for(const item of payload.replacements){
  let src=read(item.path);
  const oldText=decode(item.old),newText=decode(item.new);
  const hits=src.split(oldText).length-1,expected=item.count??1;
  if(hits!==expected)throw new Error(`v0.5.4 guard failed: ${item.path} expected ${expected} match(es), found ${hits}.`);
  write(item.path,src.split(oldText).join(newText));
}
for(const item of payload.regexReplacements){
  let src=read(item.path);
  const re=new RegExp(item.pattern,`g${item.flags||''}`);
  const matches=[...src.matchAll(re)];
  if(matches.length!==1)throw new Error(`v0.5.4 regex guard failed: ${item.path} expected 1 match, found ${matches.length}.`);
  write(item.path,src.replace(re,item.replacement));
}

const pkg=JSON.parse(read('package.json'));
pkg.version='0.5.4';
pkg.dependencies['expo-iap']='5.3.2';
pkg.dependencies['expo-build-properties']='~57.0.8';
write('package.json',JSON.stringify(pkg,null,2)+'\n');

const app=JSON.parse(read('app.json'));
app.expo.version='0.5.4';
app.expo.android.versionCode=20;
const plugins=app.expo.plugins??[];
if(!plugins.some(p=>(Array.isArray(p)?p[0]:p)==='expo-iap'))plugins.push('expo-iap');
if(!plugins.some(p=>(Array.isArray(p)?p[0]:p)==='expo-build-properties'))plugins.push(['expo-build-properties',{android:{kotlinVersion:'2.2.0'}}]);
app.expo.plugins=plugins;
write('app.json',JSON.stringify(app,null,2)+'\n');
write('.github/VERSION','0.5.4\n');

for(const [file,encodedFile] of Object.entries(payload.newFiles))write(file,decode(encodedFile));
console.log(`DraBornPark v0.5.4 patch applied • ${payload.replacements.length} guarded replacements • ${Object.keys(payload.newFiles).length} generated files.`);
