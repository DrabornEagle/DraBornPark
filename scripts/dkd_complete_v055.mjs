import fs from 'node:fs';

const dkd_read=(dkd_path)=>fs.readFileSync(dkd_path,'utf8');
const dkd_write=(dkd_path,dkd_value)=>fs.writeFileSync(dkd_path,dkd_value);
function dkd_replace(dkd_path,dkd_from,dkd_to,dkd_label){
  const dkd_before=dkd_read(dkd_path);
  const dkd_after=dkd_before.replace(dkd_from,dkd_to);
  if(dkd_after===dkd_before)throw new Error(`Patch marker missing: ${dkd_label}`);
  dkd_write(dkd_path,dkd_after);
}

// Bottom navigation labels: make the requested right shift visible but still subtle.
dkd_replace(
  'src/components/AppChrome.tsx',
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:3}]}",
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:6}]}",
  'bottom dock label offset'
);

// Home: true live refresh, stronger offsets, premium foreground popup, clearer live vehicle hierarchy.
dkd_replace(
  'app/index.tsx',
  "import { Alert, Animated, Easing, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';",
  "import { Alert, Animated, AppState, Easing, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';",
  'home AppState import'
);
dkd_replace(
  'app/index.tsx',
  "  useFocusEffect(useCallback(()=>{if(session)void load(session,true);return undefined;},[load,session]));\n\n  const refresh=async()=>{",
  "  useFocusEffect(useCallback(()=>{if(session)void load(session,true);return undefined;},[load,session]));\n\n  useEffect(()=>{\n    const dkd_user_id=session?.user?.id;\n    if(!dkd_user_id)return;\n    const dkd_channel=supabase.channel(`dkd_home_sync_${dkd_user_id}`)\n      .on('postgres_changes',{event:'*',schema:'public',table:'drabornpark_vehicles',filter:`owner_user_id=eq.${dkd_user_id}`},()=>{void load(session,true)})\n      .on('postgres_changes',{event:'*',schema:'public',table:'drabornpark_tags',filter:`owner_user_id=eq.${dkd_user_id}`},()=>{void load(session,true)})\n      .subscribe();\n    return()=>{void supabase.removeChannel(dkd_channel)};\n  },[load,session]);\n\n  const refresh=async()=>{",
  'home realtime vehicle refresh'
);
dkd_replace(
  'app/index.tsx',
  "  const premiumShown=useRef(false);",
  "  const premiumShown=useRef(false);\n  const dkd_app_state=useRef(AppState.currentState);",
  'premium app state ref'
);
dkd_replace(
  'app/index.tsx',
  "  useEffect(()=>{if(!live||plus||premiumShown.current)return;premiumShown.current=true;const timer=setTimeout(()=>setPremiumOpen(true),520);return()=>clearTimeout(timer);},[live,plus]);",
  "  useEffect(()=>{\n    if(!live||plus)return;\n    const dkd_show=()=>{if(premiumShown.current)return;premiumShown.current=true;setPremiumOpen(true)};\n    const dkd_timer=setTimeout(dkd_show,420);\n    const dkd_subscription=AppState.addEventListener('change',dkd_next_state=>{\n      if(/inactive|background/.test(dkd_app_state.current)&&dkd_next_state==='active'){premiumShown.current=false;dkd_show()}\n      dkd_app_state.current=dkd_next_state;\n    });\n    return()=>{clearTimeout(dkd_timer);dkd_subscription.remove()};\n  },[live,plus]);",
  'premium foreground popup'
);
dkd_replace(
  'app/index.tsx',
  "body=\"İçiniz rahat olsun. Premium aboneliği alın, bütün DraBornPark+ içeriklerine sahip olun; aile paylaşımı, geçici sürücü, vale/servis, zaman kuralları ve gelişmiş güvenlik özelliklerini açın.\"",
  "body=\"İçiniz rahat olsun. Premium Aboneliği alın, Bütün içeriklere Sahip Olun. DraBornPark+ ile aile paylaşımı, geçici sürücü, vale/servis, zaman kuralları ve gelişmiş araç korumasını açın.\"",
  'premium exact copy'
);
dkd_replace('app/index.tsx','offsetX={-4}','offsetX={-7}','safe session offset');
dkd_replace('app/index.tsx',"<Text style={[s.coreEyebrow,{color:accent}]}>ARACIN HAZIR</Text>","<Text style={[s.coreEyebrow,{color:accent}]}>KİŞİSEL ARAÇ</Text>",'vehicle minimalist kicker');
dkd_replace('app/index.tsx','size={37} color={accent}','size={34} color={accent}','vehicle icon size');
dkd_replace(
  'app/index.tsx',
  "backgroundColor:accent+'11'",
  "backgroundColor:vehicle.vehicle_type==='motorcycle'?'#130D24':'#071B29'",
  'vehicle darker minimalist surface'
);
dkd_replace(
  'app/index.tsx',
  "liveBadge:{minHeight:50,borderRadius:18,borderWidth:1,borderColor:palette.green+'66',backgroundColor:palette.green+'12',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},liveDot:{width:8,height:8,borderRadius:4,backgroundColor:palette.green},liveOver:{color:palette.green,fontSize:9,fontWeight:'900',letterSpacing:1.5,textAlign:'center'},liveText:{color:palette.green,fontSize:10.5,fontWeight:'900',marginTop:1},vehicleMinimalMain:{flexDirection:'row',alignItems:'center',gap:12,marginTop:14},vehicleIconMini:{width:72,height:72,borderRadius:23,borderWidth:1,alignItems:'center',justifyContent:'center'},",
  "liveBadge:{minHeight:46,borderRadius:16,borderWidth:1,borderColor:palette.green+'72',backgroundColor:palette.green+'13',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:8},liveDot:{width:8,height:8,borderRadius:4,backgroundColor:palette.green},liveOver:{color:palette.green,fontSize:10.5,fontWeight:'900',letterSpacing:1.8,textAlign:'center',lineHeight:13},liveText:{color:palette.green,fontSize:11.5,fontWeight:'900',marginTop:1},vehicleMinimalMain:{flexDirection:'row',alignItems:'center',gap:11,marginTop:12},vehicleIconMini:{width:64,height:64,borderRadius:21,borderWidth:1,alignItems:'center',justifyContent:'center'},",
  'vehicle live hierarchy'
);
dkd_replace(
  'app/index.tsx',
  "coreName:{fontSize:24,fontWeight:'900',color:palette.text,marginTop:2,letterSpacing:-.5}",
  "coreName:{fontSize:22,fontWeight:'900',color:palette.text,marginTop:2,letterSpacing:-.45}",
  'vehicle name density'
);
dkd_replace(
  'app/index.tsx',
  "vehicleStatus:{flex:1,minHeight:50,borderRadius:16,borderWidth:1,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:8}",
  "vehicleStatus:{flex:1,minHeight:44,borderRadius:15,borderWidth:1,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:8}",
  'vehicle status density'
);

// Plus: make the requested plan prices impossible to miss and strengthen premium presentation.
dkd_replace(
  'src/components/DraBornParkPlusPanel.tsx',
  "    <View style={s.planHead}><Text style={s.planTitle}>Premium planını seç</Text><Text style={s.planSub}>Aylık hedef fiyat ₺49,99, yıllık hedef fiyat ₺399,99. Google Play yerel fiyat döndürürse ödeme ekranındaki mağaza fiyatı geçerlidir.</Text></View>",
  "    <View style={s.priceRail}><View style={[s.priceChip,{borderColor:palette.cyan+'65',backgroundColor:palette.cyan+'12'}]}><Text style={s.priceChipLabel}>AYLIK</Text><Text style={[s.priceChipValue,{color:palette.cyan}]}>₺49,99</Text><Text style={s.priceChipNote}>HER AY</Text></View><View style={[s.priceChip,{borderColor:palette.yellow+'70',backgroundColor:palette.yellow+'13'}]}><Text style={s.priceChipLabel}>YILLIK</Text><Text style={[s.priceChipValue,{color:palette.yellow}]}>₺399,99</Text><Text style={s.priceChipSave}>≈ %33 AVANTAJ</Text></View></View>\n    <View style={s.planHead}><Text style={s.planTitle}>Premium planını seç</Text><Text style={s.planSub}>Aylık ₺49,99 • Yıllık ₺399,99. Google Play bu hesap için yerel mağaza fiyatı döndürürse satın alma ekranındaki fiyat esas alınır.</Text></View>",
  'plus price rail'
);
dkd_replace(
  'src/components/DraBornParkPlusPanel.tsx',
  "const s=StyleSheet.create({status:{",
  "const s=StyleSheet.create({priceRail:{flexDirection:'row',gap:10,marginTop:14},priceChip:{flex:1,minHeight:82,borderRadius:20,borderWidth:1,padding:12,justifyContent:'center'},priceChipLabel:{color:palette.muted2,fontSize:9,fontWeight:'900',letterSpacing:1},priceChipValue:{fontSize:24,fontWeight:'900',marginTop:3},priceChipNote:{color:palette.muted,fontSize:10,fontWeight:'800',marginTop:3},priceChipSave:{color:palette.green,fontSize:10,fontWeight:'900',marginTop:3},status:{",
  'plus price rail styles'
);
dkd_replace('src/components/DraBornParkPlusPanel.tsx','plan:{minHeight:218','plan:{minHeight:226','plus plan height');
dkd_replace('src/components/DraBornParkPlusPanel.tsx','planPrice:{color:palette.yellow,fontSize:19','planPrice:{color:palette.yellow,fontSize:24','plus plan price prominence');

// Tags: never leak raw Postgres errors to users; transfer stays authenticated and friendly.
dkd_replace(
  'app/tags.tsx',
  "export default function TagsScreen(){",
  "function dkd_tag_error(dkd_message:string){const dkd_value=String(dkd_message||'');if(dkd_value.includes('invalid_transfer_code'))return 'Devir kodu geçersiz. Kodu kontrol edip tekrar dene.';if(dkd_value.includes('transfer_expired'))return 'Devir kodunun 24 saatlik süresi dolmuş. Eski araç sahibinden yeni kod iste.';if(dkd_value.includes('tag_not_found'))return 'Etiket bulunamadı veya bu hesaba ait değil.';if(dkd_value.includes('vehicle_not_found'))return 'Seçilen araç bulunamadı. Araç listesini yenileyip tekrar dene.';if(dkd_value.includes('authentication_required'))return 'Oturum süresi dolmuş. Tekrar giriş yap.';if(dkd_value.includes('gen_random_bytes'))return 'Etiket devir altyapısı güncelleniyor. Uygulamayı yeniden açıp tekrar dene.';return dkd_value||'Beklenmeyen hata.'}\n\nexport default function TagsScreen(){",
  'friendly tag transfer errors'
);
dkd_replace(
  'app/tags.tsx',
  "catch(e:any){Alert.alert('İşlem başarısız',e?.message||'Beklenmeyen hata.');return null;}",
  "catch(e:any){Alert.alert('İşlem başarısız',dkd_tag_error(e?.message));return null;}",
  'generic tag action error mapping'
);
dkd_replace(
  'app/tags.tsx',
  "catch(e:any){Alert.alert('Devir başlatılamadı',e?.message||'İşlem başarısız.')}",
  "catch(e:any){Alert.alert('Devir başlatılamadı',dkd_tag_error(e?.message))}",
  'transfer start error mapping'
);

// Public web communication: direct inline composer first, desktop JPEG picker, larger badges, promo after communication.
dkd_replace(
  'app/t/[id].tsx',
  "import { ActivityIndicator, Animated, Easing, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';",
  "import { ActivityIndicator, Animated, Easing, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';",
  'public web Platform import'
);
dkd_replace('app/t/[id].tsx',"type Evidence={uri:string;base64:string;capturedAt:string};","type Evidence={uri:string;base64:string;mime:'image/jpeg';capturedAt:string};",'evidence mime type');
dkd_replace(
  'app/t/[id].tsx',
  "  async function pickEvidence(){setError('');try{const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted){setError('Fotoğraf eklemek için kamera izni gerekiyor.');return;}const result=await ImagePicker.launchCameraAsync({mediaTypes:['images'] as ImagePicker.MediaType[],allowsEditing:false,quality:.72,base64:true});if(result.canceled||!result.assets?.[0])return;const asset:any=result.assets[0];if(!asset.base64){setError('Fotoğraf hazırlanamadı. Lütfen tekrar deneyin.');return;}if(asset.mimeType&&asset.mimeType!=='image/jpeg'){setError('Güvenli fotoğraf gönderimi için JPEG formatı gerekiyor. Lütfen kamerayla yeniden çekin.');return;}setEvidence({uri:asset.uri,base64:asset.base64,capturedAt:new Date().toISOString()});}catch{setError('Kamera açılamadı. Lütfen tarayıcı kamera iznini kontrol edin.')}}",
  "  async function pickEvidence(){setError('');try{let result:ImagePicker.ImagePickerResult;if(Platform.OS==='web'){result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'] as ImagePicker.MediaType[],allowsEditing:false,quality:.78,base64:true});}else{const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted){setError('Fotoğraf eklemek için kamera izni gerekiyor.');return;}result=await ImagePicker.launchCameraAsync({mediaTypes:['images'] as ImagePicker.MediaType[],allowsEditing:false,quality:.72,base64:true});}if(result.canceled||!result.assets?.[0])return;const asset:any=result.assets[0];if(!asset.base64){setError('Fotoğraf hazırlanamadı. Lütfen tekrar deneyin.');return;}const dkd_mime=String(asset.mimeType||'image/jpeg').toLowerCase();if(dkd_mime!=='image/jpeg'){setError(Platform.OS==='web'?'Web fotoğraf ekleme için şimdilik JPG/JPEG dosyası seçmelisin.':'Güvenli fotoğraf gönderimi için JPEG formatı gerekiyor. Lütfen kamerayla yeniden çek.');return;}setEvidence({uri:asset.uri,base64:asset.base64,mime:'image/jpeg',capturedAt:new Date().toISOString()});}catch{setError(Platform.OS==='web'?'Fotoğraf seçici açılamadı. Tarayıcı dosya erişimini kontrol et.':'Kamera açılamadı. Kamera iznini kontrol et.')}}",
  'web evidence picker'
);
dkd_replace("app/t/[id].tsx","evidence:evidence?{base64:evidence.base64,mime:'image/jpeg',capturedAt:evidence.capturedAt","evidence:evidence?{base64:evidence.base64,mime:evidence.mime,capturedAt:evidence.capturedAt",'evidence mime payload');
dkd_replace(
  'app/t/[id].tsx',
  "<Text style={s.photoPickBody}>Kamerayı aç • isteğe bağlı • en fazla 4 MB</Text>",
  "<Text style={s.photoPickBody}>{Platform.OS==='web'?'JPG/JPEG seç • isteğe bağlı • en fazla 4 MB':'Kamerayı aç • isteğe bağlı • en fazla 4 MB'}</Text>",
  'web picker hint'
);
dkd_replace(
  'app/t/[id].tsx',
  "    <MarketplacePromo/>\n    {!sessionToken?",
  "    {!sessionToken?",
  'remove promo before communication'
);
dkd_replace(
  'app/t/[id].tsx',
  "    <Text style={s.footer}>DraBornPark • Aracına numaranı değil, DraBornPark'ı bırak.</Text>",
  "    <MarketplacePromo/>\n    <Text style={s.footer}>DraBornPark • Aracına numaranı değil, DraBornPark'ı bırak.</Text>",
  'move promo after communication'
);
dkd_replace('app/t/[id].tsx','name="account-check-outline" size={18}','name="account-check-outline" size={21}','owner badge icon size');
dkd_replace('app/t/[id].tsx','name="nfc-variant" size={18}','name="nfc-variant" size={21}','nfc badge icon size');
dkd_replace(
  'app/t/[id].tsx',
  "publicBadge:{minHeight:34,borderRadius:999,borderWidth:1,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:5},publicBadgeText:{fontSize:10.8,fontWeight:'900',letterSpacing:.3}",
  "publicBadge:{minHeight:40,borderRadius:999,borderWidth:1,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:6},publicBadgeText:{fontSize:12,fontWeight:'900',letterSpacing:.35}",
  'public badge size'
);
dkd_replace(
  'app/t/[id].tsx',
  "<Text style={s.promoKicker}>REKLAM • ÖRNEK SATIŞ ALANLARI</Text><Text style={s.promoTitle}>DraBornPark etiketini edin</Text><Text style={s.promoBody}>Bu alan v0.5.5 için örnek yerleşimdir. İleride resmi mağaza ve kampanya bağlantıları buradan yönetilebilir.</Text>",
  "<Text style={s.promoKicker}>REKLAM • ÖRNEK SATIŞ ALANLARI</Text><Text style={s.promoTitle}>Senin aracında da DraBornPark olsun</Text><Text style={s.promoBody}>DraBornPark'ı kullanmak istersen örnek satış kanallarını inceleyebilirsin. Kendi resmi e-ticaret mağazamız için ayrılan alan da şimdiden hazır.</Text>",
  'visitor promo copy'
);
dkd_replace('app/t/[id].tsx',"promo:{marginTop:14","promo:{marginTop:24",'promo spacing');

// Strengthen integrity checks for the items that were previously too weak.
dkd_replace(
  'scripts/check-project.mjs',
  "if(fail.length){console.error('DraBornPark integrity check failed:\\n- '+fail.join('\\n- '));",
  "if(!chrome.includes('translateX:6'))fail.push('Bottom navigation label right offset is not v0.5.5 completion value');for(const m of ['dkd_home_sync_','AppState.currentState','offsetX={-7}','İçiniz rahat olsun. Premium Aboneliği alın, Bütün içeriklere Sahip Olun.'])if(!home.includes(m))fail.push('Home v0.5.5 completion marker missing: '+m);for(const m of [\"Platform.OS==='web'\",'JPG/JPEG seç','Senin aracında da DraBornPark olsun'])if(!publicTag.includes(m))fail.push('Public web completion marker missing: '+m);if(!exists('supabase/migrations/20260822193200_dkd_drabornpark_v055_realtime_vehicle_refresh.sql'))fail.push('Realtime vehicle refresh migration missing');if(fail.length){console.error('DraBornPark integrity check failed:\\n- '+fail.join('\\n- '));",
  'completion integrity checks'
);

const dkd_migration=`alter table public.drabornpark_vehicles replica identity full;\nalter table public.drabornpark_tags replica identity full;\n\ndo $$\nbegin\n  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='drabornpark_vehicles') then\n    execute 'alter publication supabase_realtime add table public.drabornpark_vehicles';\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='drabornpark_tags') then\n    execute 'alter publication supabase_realtime add table public.drabornpark_tags';\n  end if;\nend $$;\n`;
dkd_write('supabase/migrations/20260822193200_dkd_drabornpark_v055_realtime_vehicle_refresh.sql',dkd_migration);

dkd_replace(
  'README.md',
  "- Ana sayfa tekrar odaklandığında canlı dashboard yenilenir; yeni eklenen araç manuel refresh gerektirmeden görünür.",
  "- Ana sayfa tekrar odaklandığında canlı dashboard yenilenir; ayrıca araç/etiket değişiklikleri Supabase Realtime ile anında senkronlanır, yeni eklenen araç manuel refresh gerektirmeden görünür."
  ,'README realtime note'
);
dkd_replace(
  'README.md',
  "- Web iletişim ekranına isteğe bağlı canlı kamera fotoğrafı eklendi; kanıt private storage alanında tutulur.",
  "- Web iletişim ekranına fotoğraf ekleme alanı eklendi; masaüstü web JPG/JPEG dosyası seçebilir, mobil akış kamerayı kullanır ve kanıt private storage alanında tutulur."
  ,'README web photo note'
);

console.log('DraBornPark v0.5.5 completion patch applied.');
