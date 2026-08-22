import fs from 'node:fs';
const file='scripts/apply-v055.mjs';
const source=fs.readFileSync(file,'utf8');
const oldText='opacity:active?.32:.1';
const newText='opacity:active ? .32 : .1';
if(!source.includes(oldText)) throw new Error('v0.5.5 staged Plus syntax marker not found');
fs.writeFileSync(file,source.replace(oldText,newText));
console.log('DraBornPark v0.5.5 staged Plus animation syntax corrected.');
