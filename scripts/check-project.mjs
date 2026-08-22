import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const walk=dir=>!fs.existsSync(dir)?[]:fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]});
const fail=[];
const requireFile=file=>{if(!exists(file))fail.push(`Required file missing: ${file}`);return exists(file)};
const markers=(file,list,label=file)=>{if(!requireFile(file))return;const source=read(file);for(const marker of list)if(!source.includes(marker))fail.push(`${label} marker missing: ${marker}`)};

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const repoVersion=read('.github/VERSION').trim();
const expected='0.5.4';

for(const [file,value] of [['package.json',pkg.version],['app.json',app.expo?.version],['.github/VERSION',repoVersion]])if(value!==expected)fail.push(`Version mismatch: ${file}=${value}, expected ${expected}`);
if(app.expo?.android?.versionCode!==20)fail.push(`Android versionCode must be 20 for v0.5.4, found ${app.expo?.android?.versionCode}`);
if(app.expo?.android?.package!=='com.draborneagle.drabornpark')fail.push('Android package must remain com.draborneagle.drabornpark.');
if(app.expo?.experiments?.reactCompiler===true)fail.push('React Compiler must remain disabled for input stability.');
if(pkg.dependencies?.['expo-dev-client']!=='~57.0.10')fail.push('expo-dev-client ~57.0.10 is required.');
if(pkg.dependencies?.['react-native-worklets']!=='0.10.1'||pkg.overrides?.['react-native-worklets']!=='0.10.1')fail.push('Expo SDK 57 Worklets parity must stay on 0.10.1.');
if(pkg.dependencies?.['expo-iap']!=='5.3.1')fail.push('expo-iap 5.3.1 is required for DraBornPark+ billing.');
if(pkg.scripts?.start!=='expo start --dev-client --clear'||pkg.scripts?.dev!=='expo start --dev-client --clear')fail.push('Developer startup must use --dev-client --clear.');

const plugins=app.expo?.plugins??[];
const pluginNames=plugins.map(item=>Array.isArray(item)?item[0]:item);
for(const plugin of ['expo-router','expo-dev-client','expo-navigation-bar','expo-location','expo-image-picker','expo-notifications','expo-iap'])if(!pluginNames.includes(plugin))fail.push(`Expo plugin missing: ${plugin}`);

const routeFiles=walk(path.join(root,'app')).filter(file=>file.endsWith('.tsx'));
for(const file of routeFiles){const source=fs.readFileSync(file,'utf8');if(!/export\s+default\s+/.test(source))fail.push(`Expo Router route has no default export: ${path.relative(root,file)}`)}
for(const required of ['app/index.tsx','app/auth.tsx','app/account.tsx','app/vehicle.tsx','app/park.tsx','app/tags.tsx','app/activate/[id].tsx','app/feature/[slug].tsx','app/admin-support.tsx','app/notifications.tsx','app/hub.tsx'])requireFile(required);

const wrapperExpectations={
  'app/index.tsx':'HomeV054',
  'app/auth.tsx':'AuthV054',
  'app/account.tsx':'AccountV054',
  'app/vehicle.tsx':'VehicleV054',
  'app/park.tsx':'ParkV054',
  'app/tags.tsx':'TagsV054',
  'app/activate/[id].tsx':'ActivateV054',
  'app/feature/[slug].tsx':'FeatureV054',
};
for(const [file,marker] of Object.entries(wrapperExpectations))markers(file,[marker],file);

markers('src/screens/AuthV054.tsx',['TELEFON NUMARASI *','phone_e164','normalizePhone','bootstrapProfile(normalized,normalized)','Etiket aktivasyonunda 14 Gün DraBornPark+ Hediye'],'Kayıt ekranı');
if(read('src/screens/AuthV054.tsx').includes('bootstrapProfile(normalized,normalized,undefined'))fail.push('AuthV054 still contains the invalid four-argument bootstrapProfile call.');
markers('src/screens/VehicleV054.tsx',['DkdActionModal','Araç başarıyla eklendi','ETİKETİ ŞİMDİ AKTİVE ET'],'Araç ekranı');
markers('src/screens/HomeV054.tsx',['PlusSpotlight','DraBornPark+','function ParkPulse','accuracy_meters','SON PARK • KAYDEDİLEN KONUM','Animated.View','CANLI ARAÇ'],'Ana sayfa');
markers('src/components/AppChrome.tsx',["label:'Ana Sayfa'","label:'Park Alanı'","label:'Bildirimler'","label:'Merkezim'"],'Alt menü');
markers('src/screens/TagsV054.tsx',['useState(false)','Etiket devralma','claimOpen?','chevron-down'],'Etiketler');
markers('src/screens/ParkV054.tsx',['DkdActionModal','Konumunu neden istiyoruz?','requestForegroundPermissionsAsync',"from '@/src/lib/notificationConsent'",'Park Alanı'],'Park Alanı');
markers('src/screens/ActivateV054.tsx',['14 Gün DraBornPark+ Hediye','14 GÜN PREMIUM',"router.replace('/feature/plus')"],'Aktivasyon');
markers('src/screens/FeatureV054.tsx',['Nasıl Yardımcı Olabiliriz?','drabornpark-support-notify','supportId','PlusExperience'],'Destek / Plus yönlendirmesi');
markers('src/screens/AccountV054.tsx',['Telefon Numaram','phone_e164',"router.push('/feature/support')",'TELEFON NUMARASINI KAYDET'],'Hesap');

markers('src/components/DkdActionModal.tsx',['Modal','Animated.spring','primaryLabel','secondaryLabel'],'Modern izin/popup');
markers('src/lib/notificationConsent.ts',['getNotificationPermissionStatus','requestDkdNotificationPermission','isNotificationPermissionGranted'],'Bildirim izin katmanı');
markers('app/_layout.tsx',['DkdActionModal','startAdminSupportNotifications','drabornpark_support','admin-support','BİLDİRİM İZNİ'],'Root bildirim akışı');
markers('src/lib/adminSupportNotifications.ts',['drabornpark_is_admin','drabornpark_support_requests','postgres_changes','scheduleNotificationAsync','supportId'],'Admin destek bildirim yedeği');
markers('app/admin-support.tsx',['dkd_drabornpark_admin_support_v054','dkd_drabornpark_admin_support_mark_v054','Admin Destek Merkezi','DURUMU GÜNCELLE'],'Admin destek ekranı');

markers('src/components/PlusExperience.tsx',['useIAP','fetchProducts','requestPurchase','finishTransaction','getAvailablePurchases','drabornpark_plus','Aylık','Yıllık','Google Play'],'DraBornPark+');
markers('src/lib/billing.ts',["DKD_PLUS_PRODUCT_ID='drabornpark_plus'","DKD_PLUS_MONTHLY_BASE_PLAN='monthly'","DKD_PLUS_YEARLY_BASE_PLAN='yearly'",'drabornpark-billing','purchaseToken'],'Billing istemcisi');
markers('supabase/functions/drabornpark-billing/index.ts',['VERSION="0.5.4"','GOOGLE_PLAY_SERVICE_ACCOUNT_JSON','purchases/subscriptionsv2','purchase_token_hash','PLUS_ACTIVE','sha256'],'Billing Edge Function');
markers('supabase/functions/drabornpark-support-notify/index.ts',['VERSION="0.5.4"','drabornpark_push_tokens','drabornpark_support','supportId','draborneagle@gmail.com'],'Destek bildirim Edge Function');

markers('supabase/migrations/20260822033000_dkd_drabornpark_v054_support_billing.sql',['dkd_drabornpark_subscriptions_user_provider_product_uq','drabornpark_support_admin_select','dkd_drabornpark_admin_support_v054','dkd_drabornpark_admin_support_mark_v054'],'v0.5.4 destek/billing migration');
markers('supabase/migrations/20260822104500_dkd_drabornpark_v054_phone_trial.sql',['phone_e164','PLUS_TRIAL','plusRewardDays','14 days','public.drabornpark_activate_tag','public.drabornpark_bootstrap_user'],'v0.5.4 telefon/ödül migration');

// v0.5.3 güvenli web iletişimi ve fotoğraflı kanıt katmanı geriye dönük korunmalı.
for(const required of ['src/components/EvidencePhoto.tsx','src/lib/contactThreads.ts','src/lib/callRequests.ts','supabase/functions/drabornpark-public-contact/index.ts','supabase/functions/drabornpark-call-request/index.ts','supabase/migrations/20260821143000_dkd_drabornpark_v053_evidence_photo.sql','supabase/migrations/20260821172000_dkd_drabornpark_call_requests_v053.sql'])requireFile(required);
markers('src/components/EvidencePhoto.tsx',['getEvidenceSignedUrl','resizeMode="contain"','Kanıt fotoğrafı'],'Kanıt görüntüleyici');
markers('src/lib/callRequests.ts',['drabornpark_call_requests','dkd_drabornpark_respond_call_request_v053','approved','rejected'],'Güvenli arama talebi');
markers('src/lib/contactThreads.ts',['drabornpark_contact_sessions','drabornpark_messages','postgres_changes','attachment_path'],'Anonim mesajlaşma');

const allSource=[...routeFiles,...walk(path.join(root,'src')).filter(file=>/\.(tsx?|js|mjs)$/.test(file))].map(file=>fs.readFileSync(file,'utf8')).join('\n');
if(allSource.includes('ImagePicker.MediaTypeOptions'))fail.push('Deprecated ImagePicker.MediaTypeOptions remains in source.');

const ci=read('.github/workflows/ci.yml');
for(const marker of ['DraBornPark-v0.5.4-vc20-developer-debug.apk','DraBornPark-v0.5.4-vc20-developer-apk','Android versionCode: 20','expo-iap','assembleDebug'])if(!ci.includes(marker))fail.push(`v0.5.4 CI marker missing: ${marker}`);

markers('docs/RELEASE_v0.5.4.md',['DraBornPark v0.5.4','drabornpark_plus','monthly','yearly','GOOGLE_PLAY_SERVICE_ACCOUNT_JSON','Termux'],'v0.5.4 release notes');

if(fail.length){console.error('\nDraBornPark v0.5.4 integrity check failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`DraBornPark integrity OK • v${expected} • Android vc${app.expo.android.versionCode} • ${routeFiles.length} routes • phone signup • 14-day tag reward • Plus billing bridge • admin support notifications • secure v0.5.3 contact stack preserved.`);
