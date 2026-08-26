import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
const dkd_read=dkd_file=>fs.readFileSync(path.join(dkd_root,dkd_file),'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(path.join(dkd_root,dkd_file),dkd_text);
const dkd_require=(dkd_ok,dkd_label)=>{if(!dkd_ok)throw new Error(`DraBornPark v1.0.16 marker missing: ${dkd_label}`)};

// Visible release labels.
for(const dkd_file of ['app/index.tsx','app/hub.tsx','app/legal.tsx','app/factory.tsx']){
  if(!fs.existsSync(path.join(dkd_root,dkd_file)))continue;
  let dkd_text=dkd_read(dkd_file).replace(/v1\.0\.15/g,'v1.0.16');
  if(dkd_file==='app/legal.tsx')dkd_text=dkd_text.replace(/Son güncelleme: [^<]+/,'Son güncelleme: 27 Ağustos 2026 • v1.0.16');
  dkd_write(dkd_file,dkd_text);
}

// Unlimited Plus + subscription synchronized tags.
let dkd_lib=dkd_read('src/lib/drabornpark.ts');
if(!dkd_lib.includes('profile.dkd_unlimited_plus===true')){
  dkd_lib=dkd_lib.replace('  if (!profile) return false;\n  if (profile.plus_trial_until',"  if (!profile) return false;\n  if (profile.dkd_unlimited_plus===true) return true;\n  if (profile.plus_trial_until");
}
dkd_require(dkd_lib.includes('profile.dkd_unlimited_plus===true'),'unlimited plus entitlement');
dkd_lib=dkd_lib.replace("select('id,tag_code,serial_number,nfc_url,status,vehicle_id,manufactured_at,sold_at,activated_at,disabled_at,transfer_expires_at')","select('id,tag_code,serial_number,nfc_url,status,vehicle_id,manufactured_at,sold_at,activated_at,disabled_at,transfer_expires_at,dkd_subscription_suspended_at,dkd_subscription_previous_status')");
if(!dkd_lib.includes('let dkdResolvedTags=tagsRes.data??[];')){
  const dkd_anchor="  const dkdResolvedSubscription=Platform.OS==='android'&&dkdLocalPlaySubscription?.dkdLocalOwnershipChecked?(dkdLocalPlaySubscription.subscription??dkdNotOwnedSubscription):(dkdLocalPlaySubscription?.subscription??(dkdServerActive?dkdServerSubscription:dkdServerSubscription));\n\n  return {";
  const dkd_insert="  const dkdResolvedSubscription=Platform.OS==='android'&&dkdLocalPlaySubscription?.dkdLocalOwnershipChecked?(dkdLocalPlaySubscription.subscription??dkdNotOwnedSubscription):(dkdLocalPlaySubscription?.subscription??(dkdServerActive?dkdServerSubscription:dkdServerSubscription));\n  let dkdResolvedTags=tagsRes.data??[];\n  try{\n    await supabase.rpc('dkd_drabornpark_sync_plus_tags');\n    const {data:dkdSyncedTags,error:dkdSyncTagsError}=await supabase.from('drabornpark_tags').select('id,tag_code,serial_number,nfc_url,status,vehicle_id,manufactured_at,sold_at,activated_at,disabled_at,transfer_expires_at,dkd_subscription_suspended_at,dkd_subscription_previous_status').eq('owner_user_id',userId).order('created_at',{ascending:false});\n    if(!dkdSyncTagsError&&dkdSyncedTags)dkdResolvedTags=dkdSyncedTags;\n  }catch(dkdTagSyncError){console.warn('[DraBornPark+] etiket abonelik eşitlemesi başarısız',String((dkdTagSyncError as any)?.message||dkdTagSyncError));}\n\n  return {";
  dkd_require(dkd_lib.includes(dkd_anchor),'dashboard tag sync anchor');
  dkd_lib=dkd_lib.replace(dkd_anchor,dkd_insert);
}
dkd_lib=dkd_lib.replace('    tags: tagsRes.data ?? [],','    tags: dkdResolvedTags,');
dkd_write('src/lib/drabornpark.ts',dkd_lib);

// Tags page: subscription-suspended tag gets a modern Plus gate instead of manual rebind.
let dkd_tags=dkd_read('app/tags.tsx');
if(!dkd_tags.includes("@/src/components/ColorPopup")){
  dkd_tags=dkd_tags.replace("import {AuroraBackground,BottomDock,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';","import {AuroraBackground,BottomDock,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';\nimport {ColorPopup} from '@/src/components/ColorPopup';");
}
if(!dkd_tags.includes('dkdPlusPopup')){
  const dkd_component_marker='export default function TagsScreen(){';
  dkd_require(dkd_tags.includes(dkd_component_marker),'tags component');
  dkd_tags=dkd_tags.replace(dkd_component_marker,dkd_component_marker+"\n  const [dkdPlusPopup,setDkdPlusPopup]=useState(false);\n  const [dkdPlusTag,setDkdPlusTag]=useState<any>(null);");
}
if(!dkd_tags.includes('const dkd_subscription_suspended=Boolean(dkd_tag.dkd_subscription_suspended_at);')){
  dkd_tags=dkd_tags.replace(/\{dkd_data\.tags\.map\(\(dkd_tag:any\)=>\{/,'{dkd_data.tags.map((dkd_tag:any)=>{const dkd_subscription_suspended=Boolean(dkd_tag.dkd_subscription_suspended_at);');
}
// Status text becomes explicit for auto-suspended tags.
dkd_tags=dkd_tags.replace('{dkd_tag.status}',"{dkd_subscription_suspended?'PLUS GEREKLİ':dkd_tag.status}");
// Turn the rebind action into a restore/Plus action only for subscription-suspended tags.
if(!dkd_tags.includes("dkd_subscription_suspended?'Tekrar aktif et':'Yeni araca bağla'")){
  dkd_tags=dkd_tags.replace(/<ActionCard([^>]*?)title="Yeni araca bağla"([^>]*?)onPress=\{\(\)=>\{/,"<ActionCard$1title={dkd_subscription_suspended?'Tekrar aktif et':'Yeni araca bağla'}$2onPress={()=>{if(dkd_subscription_suspended){setDkdPlusTag(dkd_tag);setDkdPlusPopup(true);return;}");
  dkd_tags=dkd_tags.replace(/<DkdAction([^>]*?)title="Yeni araca bağla"([^>]*?)onPress=\{\(\)=>\{/,"<DkdAction$1title={dkd_subscription_suspended?'Tekrar aktif et':'Yeni araca bağla'}$2onPress={()=>{if(dkd_subscription_suspended){setDkdPlusTag(dkd_tag);setDkdPlusPopup(true);return;}");
}
if(!dkd_tags.includes('ETİKETİN PLUS İLE KORUNUYOR')){
  const dkd_dock='    <BottomDock active="hub"';
  const dkd_popup=`    <ColorPopup visible={dkdPlusPopup} icon="shield-lock-outline" eyebrow="ETİKETİN PLUS İLE KORUNUYOR" title="DraBornPark+ gerekli" body={\`\${dkdPlusTag?.tag_code||'Etiketin'} DraBornPark+ süresi sona erdiği için güvenli şekilde devre dışı bırakıldı. Plus üyeliğin tekrar aktif olduğunda aynı araçla otomatik olarak yeniden bağlanacak.\`} accent={palette.yellow} secondary={palette.purple} primaryLabel="DRABORNPARK+ SAYFASINA GİT" onPrimary={()=>{setDkdPlusPopup(false);router.push('/feature/plus')}} secondaryLabel="ŞİMDİ DEĞİL" onSecondary={()=>setDkdPlusPopup(false)} chips={['OTOMATİK YENİDEN BAĞLANTI','NFC + QR','PLUS KORUMASI']}/>\n`;
  dkd_require(dkd_tags.includes(dkd_dock),'tags dock anchor');
  dkd_tags=dkd_tags.replace(dkd_dock,dkd_popup+dkd_dock);
}
dkd_write('app/tags.tsx',dkd_tags);

// Hub: warn users without a tag before entering Plus, but allow them to continue.
let dkd_hub=dkd_read('app/hub.tsx');
if(!dkd_hub.includes('dkdNoTagPlusPopup')){
  dkd_hub=dkd_hub.replace("  const [dkdPlusPopup,setDkdPlusPopup]=useState(false);","  const [dkdPlusPopup,setDkdPlusPopup]=useState(false);\n  const [dkdHasTag,setDkdHasTag]=useState<boolean|null>(null);\n  const [dkdNoTagPlusPopup,setDkdNoTagPlusPopup]=useState(false);");
  dkd_hub=dkd_hub.replace("setDkdPlusActive(hasPlusEntitlement(dkd_dashboard.profile,dkd_dashboard.subscription));setDkdPlusChecked(true)","setDkdPlusActive(hasPlusEntitlement(dkd_dashboard.profile,dkd_dashboard.subscription));setDkdHasTag((dkd_dashboard.tags??[]).length>0);setDkdPlusChecked(true)");
  dkd_hub=dkd_hub.replace("setDkdPlusActive(false);setDkdPlusChecked(true)","setDkdPlusActive(false);setDkdHasTag(false);setDkdPlusChecked(true)");
  dkd_hub=dkd_hub.replace("const open=(item:MenuItem)=>{if(item.requiresPlus&&(!dkdPlusChecked||!dkdPlusActive)){setDkdPlusPopup(true);return;}router.push(item.route as any)};","const open=(item:MenuItem)=>{if(item.route==='/feature/plus'&&dkdHasTag===false){setDkdNoTagPlusPopup(true);return;}if(item.requiresPlus&&(!dkdPlusChecked||!dkdPlusActive)){setDkdPlusPopup(true);return;}router.push(item.route as any)};");
  const dkd_existing_popup='    <ColorPopup visible={dkdPlusPopup}';
  const dkd_no_tag_popup=`    <ColorPopup visible={dkdNoTagPlusPopup} icon="nfc" eyebrow="ÖNCE ETİKETİNİ BAĞLA" title="Bağlı etiket bulunmuyor" body="DraBornPark+ sayfasını açabilirsin; ancak 14 günlük etiket ödülü, NFC/QR araç iletişimi ve otomatik etiket koruması için hesabına bir DraBornPark etiketi bağlaman gerekir." accent={palette.cyan} secondary={palette.yellow} primaryLabel="DRABORNPARK+ SAYFASINA GİT" onPrimary={()=>{setDkdNoTagPlusPopup(false);router.push('/feature/plus')}} secondaryLabel="ETİKET AKTİVE ET" onSecondary={()=>{setDkdNoTagPlusPopup(false);router.push('/activate/new')}} chips={['14 GÜN ETİKET ÖDÜLÜ','NFC + QR','PLUS']}/>\n`;
  dkd_require(dkd_hub.includes(dkd_existing_popup),'hub popup anchor');
  dkd_hub=dkd_hub.replace(dkd_existing_popup,dkd_no_tag_popup+dkd_existing_popup);
}
dkd_write('app/hub.tsx',dkd_hub);

// Direct/deep-link Plus page gets the same no-tag guidance.
let dkd_feature=dkd_read('app/feature/[slug].tsx');
if(!dkd_feature.includes("@/src/components/ColorPopup")){
  dkd_feature=dkd_feature.replace("import {AuroraBackground,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';","import {AuroraBackground,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';\nimport {ColorPopup} from '@/src/components/ColorPopup';");
}
if(!dkd_feature.includes('dkdNoTagPopup')){
  dkd_feature=dkd_feature.replace("const [data,setData]=useState<any>(null);const [busy,setBusy]=useState(false);","const [data,setData]=useState<any>(null);const [busy,setBusy]=useState(false);const [dkdNoTagPopup,setDkdNoTagPopup]=useState(false);");
  dkd_feature=dkd_feature.replace("loadLiveDashboard().then(next=>{setData(next);const current=next.profile?.privacy_settings||{};","loadLiveDashboard().then(next=>{setData(next);if(key==='plus'&&(next.tags??[]).length===0)setDkdNoTagPopup(true);const current=next.profile?.privacy_settings||{};");
  const dkd_close='  </ScrollView></SafeAreaView>;';
  const dkd_popup=`    <ColorPopup visible={dkdNoTagPopup} icon="nfc" eyebrow="BAĞLI ETİKET BULUNMUYOR" title="DraBornPark+ ve etiket birlikte daha güçlü" body="Abonelik seçeneklerini yine de inceleyebilirsin. Etiket bağladığında 14 günlük etiket ödülü, NFC/QR araç iletişimi ve Plus ile otomatik etiket koruması devreye girer." accent={palette.cyan} secondary={palette.yellow} primaryLabel="DRABORNPARK+ SAYFASINI AÇ" onPrimary={()=>setDkdNoTagPopup(false)} secondaryLabel="ETİKET AKTİVE ET" onSecondary={()=>{setDkdNoTagPopup(false);router.push('/activate/new')}} chips={['ETİKET ÖDÜLÜ','NFC + QR','GOOGLE PLAY']}/>\n`;
  dkd_require(dkd_feature.includes(dkd_close),'feature screen close anchor');
  dkd_feature=dkd_feature.replace(dkd_close,dkd_popup+dkd_close);
}
dkd_write('app/feature/[slug].tsx',dkd_feature);

// Package lock top-level release metadata.
if(fs.existsSync(path.join(dkd_root,'package-lock.json'))){
  let dkd_lock=dkd_read('package-lock.json');
  dkd_lock=dkd_lock.replace(/"version": "1\.0\.15"/g,'"version": "1.0.16"');
  dkd_write('package-lock.json',dkd_lock);
}

console.log('DraBornPark v1.0.16 source transforms ready • Plus-tag lifecycle • no-tag Plus guidance • admin user controls.');
