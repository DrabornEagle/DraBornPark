import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_dir=path.join(dkd_root,'assets','branding','v101');
const dkd_parts=['part01.b64','part02a.b64','part02b.b64','part03.b64'];
const dkd_expected_sha256='a53b48a25effd28631cb07881f210365c9649f65a6eb2a39596abb9634c493d2';
const dkd_missing=dkd_parts.filter((dkd_name)=>!fs.existsSync(path.join(dkd_dir,dkd_name)));
if(dkd_missing.length)throw new Error(`DraBornPark v1.0.1 branding payload missing: ${dkd_missing.join(', ')}`);
const dkd_base64=dkd_parts.map((dkd_name)=>fs.readFileSync(path.join(dkd_dir,dkd_name),'utf8').trim()).join('');
const dkd_png=Buffer.from(dkd_base64,'base64');
const dkd_signature='89504e470d0a1a0a';
if(dkd_png.subarray(0,8).toString('hex')!==dkd_signature)throw new Error('DraBornPark v1.0.1 branding payload is not a valid PNG.');
const dkd_sha256=crypto.createHash('sha256').update(dkd_png).digest('hex');
if(dkd_sha256!==dkd_expected_sha256)throw new Error(`DraBornPark v1.0.1 branding payload SHA-256 mismatch: ${dkd_sha256}`);
for(const dkd_target of ['icon.png','adaptive-icon.png','splash-icon.png']){
  const dkd_path=path.join(dkd_root,'assets','branding',dkd_target);
  if(!fs.existsSync(dkd_path)||!fs.readFileSync(dkd_path).equals(dkd_png))fs.writeFileSync(dkd_path,dkd_png);
}
console.log(`DraBornPark v1.0.1 branding ready • ${Math.round(dkd_png.length/1024)} KB • SHA-256 ${dkd_sha256.slice(0,12)}`);
