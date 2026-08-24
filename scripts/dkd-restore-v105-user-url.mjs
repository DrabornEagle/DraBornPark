import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const dkd_v104='f9a18b9ab174117ba30277580d471ce8d10a20e9';
let dkd_factory=execFileSync('git',['show',`${dkd_v104}:app/factory.tsx`],{encoding:'utf8'});

const dkd_replacements=[
  ['v1.0.4','v1.0.5'],
  ['Sistem etikete özel kısa kodu ve kalıcı fiziksel NFC/QR URL’sini otomatik oluşturur.','Sistem etikete özel NFC bağlantı kodunu ve kalıcı fiziksel NFC/QR URL’sini otomatik oluşturur.'],
  ['Ekrandaki QR tam olarak fiziksel NFC/QR bağlantısını içerir. Her fiziksel etiket kendine özel kısa kod taşır.','Ekrandaki QR tam olarak fiziksel NFC/QR bağlantısını içerir. Her fiziksel etiket kendine özel NFC bağlantı kodu taşır.'],
  ['Kısa kod geçersiz','NFC bağlantı kodu geçersiz'],
  ['Kısa fiziksel etiket kodu 1234-4321 biçiminde olmalıdır.','NFC bağlantı kodu 1234-4321 biçiminde olmalıdır.'],
  ['Fiziksel etiket kısa kodu kalıcıdır; sahip ve araç eşleşmesi Supabase üzerinden dinamik değişir.','NFC bağlantı kodu kalıcıdır; sahip ve araç eşleşmesi Supabase üzerinden dinamik değişir.'],
  ['label="Kısa URL"','label="NFC URL"'],
  ['Sistem otomatik benzersiz 1234-4321 kısa kod üretir','Sistem otomatik benzersiz 1234-4321 NFC bağlantı kodu üretir'],
  ['Kısa kod, kullanıcı adı ve fiziksel NFC/QR eşleşmesini yönet','NFC bağlantı kodunu, kullanıcı URL’sini ve fiziksel NFC/QR eşleşmesini yönet'],
  ['KISA ETİKET KODU • FİZİKSEL NFC/QR','NFC BAĞLANTI KODU • FİZİKSEL NFC/QR'],
  ['Kısa fiziksel NFC/QR bağlantısı kaydedildi. Kullanıcı adı varsa ayrıca kişisel paylaşım bağlantısı da aynı aktif etiketi çözer.','NFC/QR kısa bağlantısı kaydedildi. Kullanıcı URL’si varsa ayrıca kişisel paylaşım bağlantısı da aynı aktif etiketi çözer.'],
  ['Etiket ID, seri, kısa kod veya kullanıcı adı başka bir kayıtta kullanılıyor.','Etiket ID, seri, NFC bağlantı kodu veya kullanıcı adı başka bir kayıtta kullanılıyor.']
];
for(const [dkd_from,dkd_to] of dkd_replacements){
  if(!dkd_factory.includes(dkd_from))throw new Error(`Factory marker missing: ${dkd_from}`);
  dkd_factory=dkd_factory.replaceAll(dkd_from,dkd_to);
}
fs.writeFileSync('app/factory.tsx',dkd_factory);

let dkd_check=fs.readFileSync('scripts/check-project.mjs','utf8');
dkd_check=dkd_check.replace(
  "'supabase/migrations/20260824205500_dkd_drabornpark_v105_nfc_short_url.sql','app/legal.tsx'",
  "'supabase/migrations/20260824205500_dkd_drabornpark_v105_nfc_short_url.sql','supabase/migrations/20260824215000_dkd_drabornpark_v105_restore_username_url.sql','app/legal.tsx'"
);
dkd_check=dkd_check.replace(
  "const factory=read('app/factory.tsx');for(const dkd_marker of ['QRCode','expo-clipboard','dkd_drabornpark_factory_update_tag_v105','NFC BAĞLANTI KODU','/DraBornPark/tag/','Uzun UUID bağlantısı üretilmez'])if(!factory.includes(dkd_marker))fail.push('Factory v1.0.5 marker missing: '+dkd_marker);",
  "const factory=read('app/factory.tsx');for(const dkd_marker of ['QRCode','expo-clipboard','dkd_drabornpark_factory_update_tag_v104','NFC BAĞLANTI KODU','KULLANICI ADI / KİŞİSEL BAĞLANTI','KİŞİSEL URL','/DraBornPark/tag/'])if(!factory.includes(dkd_marker))fail.push('Factory v1.0.5 marker missing: '+dkd_marker);"
);
dkd_check=dkd_check.replace(
  "for(const dkd_forbidden of ['KULLANICI ADI / KİŞİSEL BAĞLANTI','KISA ETİKET KODU'])if(factory.includes(dkd_forbidden))fail.push('Legacy factory label must be removed: '+dkd_forbidden);",
  "for(const dkd_forbidden of ['KISA ETİKET KODU'])if(factory.includes(dkd_forbidden))fail.push('Legacy factory label must be removed: '+dkd_forbidden);"
);
if(!dkd_check.includes('20260824215000_dkd_drabornpark_v105_restore_username_url.sql'))throw new Error('Migration check patch failed');
if(!dkd_check.includes("'KULLANICI ADI / KİŞİSEL BAĞLANTI'"))throw new Error('Factory username marker patch failed');
fs.writeFileSync('scripts/check-project.mjs',dkd_check);

console.log('DraBornPark v1.0.5 username URL UI restored while canonical NFC URL remains numeric short /tag/NNNN-NNNN.');
