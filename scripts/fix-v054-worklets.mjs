import fs from 'node:fs';
const file='package.json';
const pkg=JSON.parse(fs.readFileSync(file,'utf8'));
pkg.dependencies={
  ...(pkg.dependencies||{}),
  'react-native-reanimated':'4.5.1',
  'react-native-worklets':'0.10.1'
};
pkg.overrides={
  ...(pkg.overrides||{}),
  'react-native-reanimated':'4.5.1',
  'react-native-worklets':'0.10.1'
};
fs.writeFileSync(file,JSON.stringify(pkg,null,2)+'\n');
console.log('DraBornPark v0.5.4: Expo SDK 57 native pair pinned — Reanimated 4.5.1 + Worklets 0.10.1.');
