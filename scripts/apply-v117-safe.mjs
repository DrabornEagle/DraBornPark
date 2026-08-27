import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(path.join(dkd_root,dkd_file),dkd_text);
const dkd_require=(dkd_ok,dkd_label)=>{if(!dkd_ok)throw new Error(`DraBornPark v1.0.17 marker missing: ${dkd_label}`)};

// Release-visible version labels.
for(const dkd_file of ['app/index.tsx','app/hub.tsx','app/legal.tsx','app/factory.tsx']){
  if(!fs.existsSync(path.join(dkd_root,dkd_file)))continue;
  let dkd_text=dkd_read(dkd_file).replace(/v1\.0\.16/g,'v1.0.17');
  if(dkd_file==='app/legal.tsx')dkd_text=dkd_text.replace(/Son güncelleme: [^<]+/,'Son güncelleme: 27 Ağustos 2026 • v1.0.17');
  dkd_write(dkd_file,dkd_text);
}

// Admin panel: server-backed Google Play release state; previous code is always visible.
let dkd_admin=dkd_read('app/admin.tsx');
dkd_admin=dkd_admin.replace("const DKD_LATEST_VERSION='1.0.16';\nconst DKD_LATEST_VERSION_CODE=16;","const DKD_FALLBACK_LATEST_VERSION='1.0.17';\nconst DKD_FALLBACK_LATEST_VERSION_CODE=17;");
dkd_admin=dkd_admin.replace("type DkdPolicy={force_update_enabled?:boolean;minimum_version_code?:number};","type DkdPolicy={force_update_enabled?:boolean;minimum_version_code?:number;latest_version?:string;latest_version_code?:number};");
if(!dkd_admin.includes('const [dkdLatestVersion,setDkdLatestVersion]')){
  dkd_admin=dkd_admin.replace("  const [dkdMinimum,setDkdMinimum]=useState(0);","  const [dkdMinimum,setDkdMinimum]=useState(16);\n  const [dkdLatestVersion,setDkdLatestVersion]=useState(DKD_FALLBACK_LATEST_VERSION);\n  const [dkdLatestCode,setDkdLatestCode]=useState(DKD_FALLBACK_LATEST_VERSION_CODE);");
}
const dkd_policy_set="      setDkdEnabled(Boolean(dkdValue.force_update_enabled));\n      setDkdMinimum(Number(dkdValue.minimum_version_code||0));";
const dkd_policy_set_new="      setDkdEnabled(Boolean(dkdValue.force_update_enabled));\n      setDkdLatestVersion(String(dkdValue.latest_version||DKD_FALLBACK_LATEST_VERSION));\n      setDkdLatestCode(Number(dkdValue.latest_version_code||DKD_FALLBACK_LATEST_VERSION_CODE));\n      setDkdMinimum(Number(dkdValue.minimum_version_code||Math.max(1,Number(dkdValue.latest_version_code||DKD_FALLBACK_LATEST_VERSION_CODE)-1)));";
dkd_admin=dkd_admin.replace(dkd_policy_set,dkd_policy_set_new);
dkd_admin=dkd_admin.replace("{dkd_enabled:dkdNext,dkd_latest_version_code:DKD_LATEST_VERSION_CODE}","{dkd_enabled:dkdNext,dkd_latest_version_code:dkdLatestCode}");
// The same policy state appears again after toggling.
dkd_admin=dkd_admin.replace(dkd_policy_set,dkd_policy_set_new);
dkd_admin=dkd_admin.replace(/`v\$\{DKD_LATEST_VERSION\} altındaki sürümler güncellemeye zorlanır\.`/g,"`Google Play'deki v${dkdLatestVersion} yüklü değilse güncelleme zorunlu olur.`");
dkd_admin=dkd_admin.replace(/<Text style=\{s\.infoValue\}>v\{DKD_LATEST_VERSION\}<\/Text><Text style=\{s\.infoSmall\}>versionCode \{DKD_LATEST_VERSION_CODE\}<\/Text>/g,"<Text style={s.infoValue}>v{dkdLatestVersion}</Text><Text style={s.infoSmall}>versionCode {dkdLatestCode} • Google Play son sürüm</Text>");
dkd_admin=dkd_admin.replace(/<Text style=\{s\.infoValue\}>\{dkdEnabled\?dkdMinimum:'—'\}<\/Text><Text style=\{s\.infoSmall\}>\{dkdEnabled\?'Daha düşük kodlar engellenir':'Politika devre dışı'\}<\/Text>/g,"<Text style={s.infoValue}>{dkdMinimum}</Text><Text style={s.infoSmall}>Bir önceki Google Play versionCode</Text>");
dkd_require(dkd_admin.includes('dkdLatestVersion')&&dkd_admin.includes("Google Play'deki v${dkdLatestVersion}"),'dynamic admin latest version');
dkd_require(dkd_admin.includes('Bir önceki Google Play versionCode'),'admin previous version card');
dkd_write('app/admin.tsx',dkd_admin);

// Mandatory gate: PASIF means never show; AKTIF means require the latest published Play code.
let dkd_gate=dkd_read('src/components/MandatoryUpdateGate.tsx');
dkd_gate=dkd_gate.replace("  minimumVersionCode?:number;\n  forceUpdateBelow?:number;","  minimumVersionCode?:number;\n  requiredVersionCode?:number;\n  forceUpdateEnabled?:boolean;\n  forceUpdateBelow?:number;");
const dkd_old_check="      const dkdMinimum=Number(dkdPayload.minimumVersionCode??dkdPayload.forceUpdateBelow??0);";
const dkd_new_check="      const dkdEnabled=Boolean(dkdPayload.forceUpdateEnabled);\n      const dkdRequired=Number(dkdPayload.requiredVersionCode??dkdPayload.forceUpdateBelow??dkdPayload.latestVersionCode??dkdPayload.minimumVersionCode??0);";
dkd_gate=dkd_gate.replace(dkd_old_check,dkd_new_check);
dkd_gate=dkd_gate.replace("setDkdVisible(Boolean(dkdCurrent>0&&dkdMinimum>0&&dkdCurrent<dkdMinimum));","setDkdVisible(Boolean(dkdEnabled&&dkdCurrent>0&&dkdRequired>0&&dkdCurrent<dkdRequired));");
dkd_require(dkd_gate.includes('dkdEnabled&&dkdCurrent>0&&dkdRequired>0'),'force update gate respects enable flag');
dkd_write('src/components/MandatoryUpdateGate.tsx',dkd_gate);

// Package-lock top-level release metadata.
if(fs.existsSync(path.join(dkd_root,'package-lock.json'))){
  let dkd_lock=dkd_read('package-lock.json');
  dkd_lock=dkd_lock.replace(/"version": "1\.0\.16"/g,'"version": "1.0.17"');
  dkd_write('package-lock.json',dkd_lock);
}

console.log('DraBornPark v1.0.17 source transforms ready • dynamic Play update policy • explicit enable gate • previous-code card.');
