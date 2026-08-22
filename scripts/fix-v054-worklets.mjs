import fs from 'node:fs';
const file='package.json';
const pkg=JSON.parse(fs.readFileSync(file,'utf8'));
pkg.dependencies={...(pkg.dependencies||{}),'react-native-worklets':'0.12.1'};
pkg.overrides={...(pkg.overrides||{}),'react-native-worklets':'0.12.1'};
fs.writeFileSync(file,JSON.stringify(pkg,null,2)+'\n');
console.log('DraBornPark v0.5.4: react-native-worklets pinned to 0.12.1 for Reanimated 4.6.x / RN 0.86 compatibility.');
