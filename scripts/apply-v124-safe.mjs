import fs from 'node:fs';
import path from 'node:path';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(dkd_file,dkd_text);
const dkd_replace_required=(dkd_text,dkd_from,dkd_to,dkd_label)=>{
  if(dkd_text.includes(dkd_to))return dkd_text;
  if(!dkd_text.includes(dkd_from))throw new Error(`v1.0.24 dönüşümü için desen bulunamadı: ${dkd_label}`);
  return dkd_text.replace(dkd_from,dkd_to);
};

// Package / native release identity.
const dkd_app_file='app.json';
const dkd_app_json=JSON.parse(dkd_read(dkd_app_file));
dkd_app_json.expo.version='1.0.24';
dkd_app_json.expo.android.versionCode=24;
dkd_write(dkd_app_file,JSON.stringify(dkd_app_json,null,2)+'\n');

for(const dkd_package_file of ['package.json','package-lock.json']){
  const dkd_package_json=JSON.parse(dkd_read(dkd_package_file));
  dkd_package_json.version='1.0.24';
  if(dkd_package_json.packages?.[''])dkd_package_json.packages[''].version='1.0.24';
  dkd_write(dkd_package_file,JSON.stringify(dkd_package_json,null,2)+'\n');
}
if(fs.existsSync('.github/VERSION'))dkd_write('.github/VERSION','1.0.24\n');

// Refresh all runtime-visible app version labels without touching historical migrations/releases.
for(const dkd_root of ['app','src','supabase/functions']){
  if(!fs.existsSync(dkd_root))continue;
  const dkd_walk=dkd_dir=>{
    for(const dkd_name of fs.readdirSync(dkd_dir)){
      const dkd_file=path.join(dkd_dir,dkd_name);
      const dkd_stat=fs.statSync(dkd_file);
      if(dkd_stat.isDirectory()){dkd_walk(dkd_file);continue;}
      if(!/\.(?:ts|tsx|js|jsx|json|mjs|md)$/.test(dkd_file))continue;
      let dkd_text=dkd_read(dkd_file);
      const dkd_before=dkd_text;
      dkd_text=dkd_text.replaceAll('v1.0.23','v1.0.24').replaceAll('1.0.23','1.0.24');
      if(dkd_text!==dkd_before)dkd_write(dkd_file,dkd_text);
    }
  };
  dkd_walk(dkd_root);
}

// App-version edge fallback has a separate numeric versionCode.
const dkd_version_file='supabase/functions/dkd-drabornpark-app-version/index.ts';
let dkd_version=dkd_read(dkd_version_file);
dkd_version=dkd_replace_required(dkd_version,'const FALLBACK_VERSION_CODE=23;','const FALLBACK_VERSION_CODE=24;','app-version fallback versionCode');
dkd_write(dkd_version_file,dkd_version);

// v1.0.24: personal URL is stored on the LABEL itself, not inferred from account username.
const dkd_factory_file='app/factory.tsx';
let dkd_factory=dkd_read(dkd_factory_file);
dkd_factory=dkd_replace_required(
  dkd_factory,
  ".select('id,tag_code,serial_number,public_alias,nfc_url,status,owner_user_id,vehicle_id,manufactured_at,sold_at,activated_at,last_verified_at,factory_notes')",
  ".select('id,tag_code,serial_number,public_alias,dkd_personal_alias,nfc_url,status,owner_user_id,vehicle_id,manufactured_at,sold_at,activated_at,last_verified_at,factory_notes')",
  'factory personal alias select'
);
dkd_factory=dkd_replace_required(
  dkd_factory,
  "username:dkd_tag.owner_username||'',pin:'',notes:dkd_tag.factory_notes||''",
  "username:dkd_tag.dkd_personal_alias||'',pin:'',notes:dkd_tag.factory_notes||''",
  'factory personal alias edit value'
);
dkd_factory=dkd_factory.replace("    if(dkd_username&&!dkd_tag.owner_user_id)return Alert.alert('Etiket henüz sahipsiz','Kullanıcı adı ancak etiket bir hesaba aktive edildikten sonra kullanıcı profiline atanabilir.');\n",'');
dkd_factory=dkd_factory.replaceAll("supabase.rpc('dkd_drabornpark_factory_update_tag_v123'","supabase.rpc('dkd_drabornpark_factory_update_tag_v124'");
dkd_factory=dkd_replace_required(
  dkd_factory,
  "const dkd_friend=dkd_friendly_url(dkd_tag.owner_username||'');",
  "const dkd_friend=dkd_friendly_url(dkd_tag.dkd_personal_alias||'');",
  'factory queue personal URL source'
);
dkd_factory=dkd_replace_required(
  dkd_factory,
  "<Text style={s.label}>KULLANICI ADI / KİŞİSEL BAĞLANTI (OPSİYONEL)</Text><TextInput editable={!dkd_busy&&Boolean(dkd_tag.owner_user_id)} style={[s.input,!dkd_tag.owner_user_id&&s.disabled]} autoCapitalize=\"none\" autoCorrect={false} value={dkd_edit.username} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,username:dkd_value.toLowerCase().replace(/[^a-z0-9._-]/g,'')}))} placeholder={dkd_tag.owner_user_id?'draborneagle':'Önce etiket aktive edilmeli'} placeholderTextColor={palette.muted2}/>",
  "<Text style={s.label}>ETİKETE ÖZEL KULLANICI ADI / KİŞİSEL URL (OPSİYONEL)</Text><TextInput editable={!dkd_busy} style={s.input} autoCapitalize=\"none\" autoCorrect={false} value={dkd_edit.username} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,username:dkd_value.toLowerCase().replace(/[^a-z0-9._-]/g,'')}))} placeholder=\"draborneagle\" placeholderTextColor={palette.muted2}/>",
  'factory owner-independent username editor'
);
dkd_factory=dkd_factory.replace(
  "Alert.alert('Etiket güncellendi','Fiziksel NFC/QR bağlantısı /tag/1234-5678 biçiminde kaydedildi. Hesapta kullanıcı adı varsa /tag/kullaniciadi kişisel bağlantısı da aynı etiketi açar.');",
  "Alert.alert('Etiket güncellendi',dkd_username?'Kişisel URL bu etikete özel olarak aktif edildi. NFC/QR fiziksel bağlantısı değişmeden çalışmaya devam eder.':'Etiket güncellendi. Fiziksel NFC/QR bağlantısı çalışmaya devam eder.');"
);
dkd_factory=dkd_factory.replace(
  'Kullanıcı adı yoksa kişisel URL oluşturulmaz. Fiziksel kısa URL çalışmaya devam eder.',
  'Kişisel URL adı bu etikete özeldir; etiket aktive edilmeden önce de hazırlanabilir. Boş bırakırsan yalnız fiziksel NFC/QR URL kullanılır.'
);
dkd_write(dkd_factory_file,dkd_factory);

console.log('DraBornPark v1.0.24 source, label-specific personal URLs and visible version labels materialized.');
