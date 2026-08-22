import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,v)};
const json=(p,v)=>write(p,`${JSON.stringify(v,null,2)}\n`);
const VERSION='1.0.0', LABEL='v1.0', VC=1;

const pkg=JSON.parse(read('package.json'));pkg.version=VERSION;json('package.json',pkg);
const lock=JSON.parse(read('package-lock.json'));lock.version=VERSION;if(lock.packages?.[''])lock.packages[''].version=VERSION;json('package-lock.json',lock);
const app=JSON.parse(read('app.json'));
app.expo.version=VERSION;
app.expo.icon='./assets/branding/icon.png';
app.expo.splash={image:'./assets/branding/splash-icon.png',resizeMode:'contain',backgroundColor:'#050816'};
app.expo.android={...app.expo.android,versionCode:VC,icon:'./assets/branding/icon.png',adaptiveIcon:{foregroundImage:'./assets/branding/adaptive-icon.png',monochromeImage:'./assets/branding/monochrome-icon.png',backgroundColor:'#050816'}};
json('app.json',app);write('.github/VERSION',`${VERSION}\n`);

let home=read('app/index.tsx');home=home.replace('Pill label="v0.5.5"','Pill label="v1.0"').replace('Pill label="v0.5.6"','Pill label="v1.0"');write('app/index.tsx',home);
for(const f of ['app/hub.tsx','app/legal.tsx']){let s=read(f);s=s.replaceAll('v0.5.6',LABEL).replaceAll('v0.5.5',LABEL);write(f,s)}

let readme=read('README.md');
readme=readme.replace(/## Aktif sürüm — v[^\n]+/,`## Aktif sürüm — ${LABEL}`).replace(/- Android `versionCode`: `\d+`/,`- Android \`versionCode\`: \`${VC}\``);
if(!readme.includes('## v1.0 — Google Play ilk yayın adayı')){
  const marker='## v0.5.5 — Premium, araç kartı, etiket devri ve web iletişimi';
  const notes=`## v1.0 — Google Play ilk yayın adayı\n\n- Uygulama sürümü \`${VERSION}\`, Android \`versionCode=${VC}\` olarak sabitlendi.\n- Android/Expo varsayılan daire-çizgi açılış görseli kaldırıldı; özel DraBornPark ikonu ve koyu yerel splash kullanılıyor.\n- Yerel splash sonrasında animasyonlu DraBornPark Loading ekranı devreye giriyor.\n- Google Play için release APK ve AAB üretim hattı eklendi ve imza doğrulaması yapılıyor.\n\n`;
  if(!readme.includes(marker))throw new Error('README release marker missing');readme=readme.replace(marker,notes+marker);
}
write('README.md',readme);

let check=read('scripts/check-project.mjs');
check=check
.replace("if(pkg.version!=='0.5.6'||app.expo?.version!=='0.5.6'||repoVersion!=='0.5.6')fail.push('v0.5.6 version coherence failed');","if(pkg.version!=='1.0.0'||app.expo?.version!=='1.0.0'||repoVersion!=='1.0.0')fail.push('v1.0 version coherence failed');")
.replace("if(app.expo?.android?.versionCode!==22)fail.push('Android versionCode must be 22');","if(app.expo?.android?.versionCode!==1)fail.push('Android versionCode must be 1');")
.replace("for(const m of ['adminOnly:true','drabornpark_is_admin','v0.5.6'])if(!hub.includes(m))fail.push('Hub v0.5.6 marker missing: '+m);","for(const m of ['adminOnly:true','drabornpark_is_admin','v1.0'])if(!hub.includes(m))fail.push('Hub v1.0 marker missing: '+m);")
.replace("for(const m of ['GOOGLE PLAY UYUMLU ŞEFFAFLIK','Yaklaşık / kesin konum','Vercel / web hosting','23 Ağustos 2026','v0.5.6'])if(!legal.includes(m))fail.push('Privacy v0.5.6 marker missing: '+m);","for(const m of ['GOOGLE PLAY UYUMLU ŞEFFAFLIK','Yaklaşık / kesin konum','Vercel / web hosting','23 Ağustos 2026','v1.0'])if(!legal.includes(m))fail.push('Privacy v1.0 marker missing: '+m);")
.replace("const ci=read('.github/workflows/ci.yml');for(const m of ['DraBornPark-v0.5.6-vc22-developer-apk',\"versionCode='22'\",\"versionName='0.5.6'\",\"if: github.event_name == 'workflow_dispatch'\"])if(!ci.includes(m))fail.push('Permanent CI v0.5.6 marker missing: '+m);","const ci=read('.github/workflows/ci.yml');for(const m of ['DraBornPark-v1.0-vc1-developer-apk',\"versionCode='1'\",\"versionName='1.0.0'\",\"if: github.event_name == 'workflow_dispatch'\"])if(!ci.includes(m))fail.push('Permanent CI v1.0 marker missing: '+m);")
.replace("console.log('DraBornPark integrity OK • v0.5.6 • Android vc22 • Google Play privacy disclosures • admin-only factory • Realtime hot-refresh guard • APK manual-only.');","console.log('DraBornPark integrity OK • v1.0 • Android vc1 • Google Play release candidate • custom icon/splash • admin-only factory.');");
write('scripts/check-project.mjs',check);

const ci=`name: DraBornPark CI\n\non:\n  workflow_dispatch:\n  push:\n    branches: [main, feature/**, feat/**, build/**, fix/**]\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n\nconcurrency:\n  group: drabornpark-ci-\${{ github.ref }}\n  cancel-in-progress: true\n\njobs:\n  expo-check:\n    runs-on: ubuntu-latest\n    timeout-minutes: 25\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci --no-audit --no-fund\n      - run: npm run check\n      - run: npx expo install --check\n      - run: npm run typecheck\n      - run: npx expo export --platform web\n      - run: git diff --exit-code -- .\n\n  android-developer-apk:\n    name: Android Developer APK\n    needs: expo-check\n    if: github.event_name == 'workflow_dispatch'\n    runs-on: ubuntu-latest\n    timeout-minutes: 55\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - uses: actions/setup-java@v4\n        with:\n          distribution: temurin\n          java-version: '17'\n      - uses: gradle/actions/setup-gradle@v4\n      - run: npm ci --no-audit --no-fund\n      - run: npx expo prebuild --platform android --clean --no-install\n        env:\n          CI: '1'\n      - run: ./gradlew :app:assembleDebug --no-daemon\n        working-directory: android\n      - name: Verify Developer APK\n        run: |\n          APK=\"android/app/build/outputs/apk/debug/app-debug.apk\"\n          AAPT=\"$(find \"$ANDROID_HOME/build-tools\" -type f -name aapt | sort -V | tail -n 1)\"\n          APKSIGNER=\"$(find \"$ANDROID_HOME/build-tools\" -type f -name apksigner | sort -V | tail -n 1)\"\n          test -f \"$APK\"\n          \"$AAPT\" dump badging \"$APK\" | grep \"package: name='com.draborneagle.drabornpark'\"\n          \"$AAPT\" dump badging \"$APK\" | grep \"versionCode='1'\"\n          \"$AAPT\" dump badging \"$APK\" | grep \"versionName='1.0.0'\"\n          \"$APKSIGNER\" verify --verbose \"$APK\"\n      - name: Prepare artifact\n        run: |\n          mkdir -p artifacts\n          cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/DraBornPark-v1.0-vc1-developer-debug.apk\n          sha256sum artifacts/*.apk > artifacts/SHA256.txt\n      - uses: actions/upload-artifact@v4\n        with:\n          name: DraBornPark-v1.0-vc1-developer-apk\n          path: artifacts/\n          retention-days: 14\n`;
write('.github/workflows/ci.yml',ci);
console.log('DraBornPark v1.0 release source prepared.');
