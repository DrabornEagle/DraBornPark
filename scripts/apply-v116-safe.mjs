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
  dkd_tags=dkd_tags.replace("import {AuroraBackground,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';","import {AuroraBackground,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';\nimport {ColorPopup} from '@/src/components/ColorPopup';");
}
if(!dkd_tags.includes('dkdPlusPopup')){
  dkd_tags=dkd_tags.replace('export default function TagsScreen(){',"export default function TagsScreen(){\n  const [dkdPlusPopup,setDkdPlusPopup]=useState(false);\n  const [dkdPlusTag,setDkdPlusTag]=useState<any>(null);");
}
if(!dkd_tags.includes('const dkd_subscription_suspended=Boolean(dkd_tag.dkd_subscription_suspended_at);')){
  const dkd_map='dkd_data.tags.map((dkd_tag:any)=><View key={dkd_tag.id}';
  dkd_require(dkd_tags.includes(dkd_map),'tags map anchor');
  dkd_tags=dkd_tags.replace(dkd_map,"dkd_data.tags.map((dkd_tag:any)=>{const dkd_subscription_suspended=Boolean(dkd_tag.dkd_subscription_suspended_at);return <View key={dkd_tag.id}");
  dkd_tags=dkd_tags.replace('</View>):<View style={s.empty}>','</View>}):<View style={s.empty}>');
}
dkd_tags=dkd_tags.replace('<Text style={s.tagStatus}>{dkd_tag.status} • {dkd_tag.serial_number}</Text>',"<Text style={[s.tagStatus,dkd_subscription_suspended&&{color:palette.yellow}]}>{dkd_subscription_suspended?'PLUS GEREKLİ':dkd_tag.status} • {dkd_tag.serial_number}</Text>");
dkd_tags=dkd_tags.replace("<MaterialCommunityIcons name={dkd_tag.status==='DISABLED'?'shield-off-outline':'shield-check'} size={29} color={dkd_tag.status==='DISABLED'?palette.red:palette.green}/>","<MaterialCommunityIcons name={dkd_subscription_suspended?'crown-outline':dkd_tag.status==='DISABLED'?'shield-off-outline':'shield-check'} size={29} color={dkd_subscription_suspended?palette.yellow:dkd_tag.status==='DISABLED'?palette.red:palette.green}/>");
if(!dkd_tags.includes("dkd_subscription_suspended?'Tekrar aktif et':'Yeni araca bağla'")){
  const dkd_action='title="Yeni araca bağla" disabled={dkd_busy} onPress={()=>{const dkd_target=dkd_data.vehicles[0];';
  const dkd_action_next="title={dkd_subscription_suspended?'Tekrar aktif et':'Yeni araca bağla'} disabled={dkd_busy} onPress={()=>{if(dkd_subscription_suspended){setDkdPlusTag(dkd_tag);setDkdPlusPopup(true);return;}const dkd_target=dkd_data.vehicles[0];";
  dkd_require(dkd_tags.includes(dkd_action),'tag rebind action');
  dkd_tags=dkd_tags.replace(dkd_action,dkd_action_next);
}
if(!dkd_tags.includes('ETİKETİN PLUS İLE KORUNUYOR')){
  const dkd_info='    <View style={s.info}>';
  const dkd_popup=`    <ColorPopup visible={dkdPlusPopup} icon="shield-lock-outline" eyebrow="ETİKETİN PLUS İLE KORUNUYOR" title="DraBornPark+ gerekli" body={\`\${dkdPlusTag?.tag_code||'Etiketin'} DraBornPark+ süresi sona erdiği için güvenli şekilde devre dışı bırakıldı. Plus üyeliğin tekrar aktif olduğunda aynı araçla otomatik olarak yeniden bağlanacak.\`} accent={palette.yellow} secondary={palette.purple} primaryLabel="DRABORNPARK+ SAYFASINA GİT" onPrimary={()=>{setDkdPlusPopup(false);router.push('/feature/plus')}} secondaryLabel="ŞİMDİ DEĞİL" onSecondary={()=>setDkdPlusPopup(false)} chips={['OTOMATİK YENİDEN BAĞLANTI','NFC + QR','PLUS KORUMASI']}/>\n`;
  dkd_require(dkd_tags.includes(dkd_info),'tags info anchor');
  dkd_tags=dkd_tags.replace(dkd_info,dkd_popup+dkd_info);
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
  dkd_feature=dkd_feature.replace("const [data,setData]=useState<any>(null);const [busy,setBusy]=useState(false);const [privacy,setPrivacy]","const [data,setData]=useState<any>(null);const [busy,setBusy]=useState(false);const [dkdNoTagPopup,setDkdNoTagPopup]=useState(false);const [privacy,setPrivacy]");
  dkd_feature=dkd_feature.replace("loadLiveDashboard().then(next=>{setData(next);const current=next.profile?.privacy_settings||{};","loadLiveDashboard().then(next=>{setData(next);if(key==='plus'&&(next.tags??[]).length===0)setDkdNoTagPopup(true);const current=next.profile?.privacy_settings||{};");
  const dkd_close='  </ScrollView></SafeAreaView>;';
  const dkd_popup=`    <ColorPopup visible={dkdNoTagPopup} icon="nfc" eyebrow="BAĞLI ETİKET BULUNMUYOR" title="DraBornPark+ ve etiket birlikte daha güçlü" body="Abonelik seçeneklerini yine de inceleyebilirsin. Etiket bağladığında 14 günlük etiket ödülü, NFC/QR araç iletişimi ve Plus ile otomatik etiket koruması devreye girer." accent={palette.cyan} secondary={palette.yellow} primaryLabel="DRABORNPARK+ SAYFASINI AÇ" onPrimary={()=>setDkdNoTagPopup(false)} secondaryLabel="ETİKET AKTİVE ET" onSecondary={()=>{setDkdNoTagPopup(false);router.push('/activate/new')}} chips={['ETİKET ÖDÜLÜ','NFC + QR','GOOGLE PLAY']}/>\n`;
  dkd_require(dkd_feature.includes(dkd_close),'feature screen close anchor');
  dkd_feature=dkd_feature.replace(dkd_close,dkd_popup+dkd_close);
}
dkd_write('app/feature/[slug].tsx',dkd_feature);

// Edge function visible versions.
for(const dkd_edge of ['supabase/functions/dkd-drabornpark-google-play/index.ts','supabase/functions/dkd-drabornpark-app-version/index.ts']){
  if(!fs.existsSync(path.join(dkd_root,dkd_edge)))continue;
  let dkd_edge_text=dkd_read(dkd_edge).replace('const VERSION="1.0.15";','const VERSION="1.0.16";');
  if(dkd_edge.includes('app-version'))dkd_edge_text=dkd_edge_text.replace('const VERSION_CODE=15;','const VERSION_CODE=16;');
  dkd_write(dkd_edge,dkd_edge_text);
}

// Package lock top-level release metadata.
if(fs.existsSync(path.join(dkd_root,'package-lock.json'))){
  let dkd_lock=dkd_read('package-lock.json');
  dkd_lock=dkd_lock.replace(/"version": "1\.0\.15"/g,'"version": "1.0.16"');
  dkd_write('package-lock.json',dkd_lock);
}

console.log('DraBornPark v1.0.16 source transforms ready • Plus-tag lifecycle • no-tag Plus guidance • admin user controls.');
