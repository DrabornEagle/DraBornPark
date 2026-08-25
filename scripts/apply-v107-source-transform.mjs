import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.7 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,110)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}
function dkd_replace_block(dkd_file,dkd_start_marker,dkd_end_marker,dkd_replacement,dkd_done_marker){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  if(dkd_text.includes(dkd_done_marker))return;
  const dkd_start=dkd_text.indexOf(dkd_start_marker);
  const dkd_end=dkd_text.indexOf(dkd_end_marker,dkd_start);
  if(dkd_start<0||dkd_end<0)throw new Error(`DraBornPark v1.0.7 block marker missing in ${dkd_file}`);
  dkd_text=dkd_text.slice(0,dkd_start)+dkd_replacement+dkd_text.slice(dkd_end);
  fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('src/components/AppChrome.tsx',[[
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:6}]}",
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:8}]}"
]]);

dkd_patch('app/index.tsx',[[
  '<StatusPill compact offsetX={-12}',
  '<StatusPill compact offsetX={-20}'
]]);

dkd_patch('app/_layout.tsx',[
  ["import {AppState,Linking,Platform} from 'react-native';","import {AppState,Platform} from 'react-native';"],
  ["const PERMISSION_PROMPT_KEY='drabornpark_notification_prompt_v106b';","const PERMISSION_PROMPT_KEY='drabornpark_notification_prompt_v107';"],
  ["const allow=async()=>{setBusy(true);try{if(permissionStatus==='denied'){await AsyncStorage.removeItem(PERMISSION_PROMPT_KEY);await Linking.openSettings();setVisible(false);return;}const granted=await requestNotificationPermission();if(granted){await AsyncStorage.removeItem(PERMISSION_PROMPT_KEY);setPermissionStatus('granted');setVisible(false);}else{setPermissionStatus(await getNotificationPermissionStatus());setVisible(true);}}finally{setBusy(false)}};","const allow=async()=>{setBusy(true);try{const granted=await requestNotificationPermission();if(granted){await AsyncStorage.removeItem(PERMISSION_PROMPT_KEY);setPermissionStatus('granted');setVisible(false);}else{setPermissionStatus(await getNotificationPermissionStatus());setVisible(true);}}finally{setBusy(false)}};"],
  ["body={denied?'Android bildirim izni kapalı. Ayarlar ekranından DraBornPark bildirimlerine izin verdiğinde araç uyarıları ve güvenli mesajlar uygulama açıkken de sistem bildirimi olarak görünür.':'Araç bildirimi, anonim mesaj, destek kaydı ve önemli DraBornPark uyarılarını kaçırmaman için bildirim izni gerekir. İzin, yalnızca bu bildirimleri göstermek için kullanılır.'}","body={denied?'Android bildirim izni kapalı. BİLDİRİMLERİ AÇ düğmesine dokunduğunda DraBornPark Android bildirim iznini doğrudan yeniden ister; uygulama içinden Ayarlar ekranına yönlendirme yapılmaz.':'Araç bildirimi, anonim mesaj, destek kaydı ve önemli DraBornPark uyarılarını kaçırmaman için bildirim izni gerekir. BİLDİRİMLERİ AÇ düğmesi Android izin penceresini doğrudan açar.'}"],
  ["primaryLabel={denied?'AYARLARI AÇ':'BİLDİRİMLERE İZİN VER'}","primaryLabel=\"BİLDİRİMLERİ AÇ\""]
]);

const dkd_call_helper="async function presentLocalCallRequest(call:any){const callId=String(call?.id||'');const key=callId?`call:${callId}`:`call:${String(call?.created_at||'')}`;if(rememberNotification(key))return;await presentSystemNotification({title:'Acil arama talebi',body:'Aracınız için yeni bir güvenli arama talebi geldi.',data:{type:'drabornpark_call_request',callRequestId:call?.id,source:'realtime-local-call'}});}\n";
const dkd_poll_fallback="catch(error){console.warn('[DraBornPark bildirim] mesaj yedek sorgusu başarısız',String((error as any)?.message||error));}finally{pollBusy=false;}};const pollReports=async(userId:string)=>{if(!active||AppState.currentState!=='active')return;const since=new Date(Math.max(lastPollAt-2500,Date.now()-30000)).toISOString();try{const {data,error}=await supabase.from('drabornpark_reports').select('id,category,message_safe,created_at').eq('owner_user_id',userId).gt('created_at',since).order('created_at',{ascending:true}).limit(30);if(error)throw error;for(const report of data??[])await presentLocalReport(report);}catch(error){console.warn('[DraBornPark bildirim] rapor yedek sorgusu başarısız',String((error as any)?.message||error));}};const pollCalls=async(userId:string)=>{if(!active||AppState.currentState!=='active')return;const since=new Date(Math.max(lastPollAt-2500,Date.now()-30000)).toISOString();try{const {data,error}=await supabase.from('drabornpark_call_requests').select('id,created_at').eq('owner_user_id',userId).gt('created_at',since).order('created_at',{ascending:true}).limit(30);if(error)throw error;for(const call of data??[])await presentLocalCallRequest(call);}catch(error){console.warn('[DraBornPark bildirim] arama yedek sorgusu başarısız',String((error as any)?.message||error));}};void currentUser().then";

dkd_patch('src/lib/push.ts',[
  ["showBadge:true});","showBadge:true,sound:'default'});"],
  ["witness:'Bir olaya şahit olundu',emergency:'Acil durum bildirimi',other:'Yeni araç bildirimi'","witness:'Bir olaya şahit olundu',emergency:'Acil durum bildirimi',direct_message:'Doğrudan güvenli mesaj',other:'Yeni araç bildirimi'"],
  ["const projectId=(Constants.expoConfig?.extra as any)?.eas?.projectId??(Constants as any).easConfig?.projectId??null;","const projectId=(Constants.expoConfig?.extra as any)?.eas?.projectId??(Constants as any).easConfig?.projectId??((globalThis as any)?.process?.env?.EXPO_PUBLIC_EAS_PROJECT_ID??null);"],
  ["export function startForegroundReportNotifications():PushSubscription{",dkd_call_helper+"export function startForegroundReportNotifications():PushSubscription{"],
  [".on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_messages'},payload=>{void presentLocalVisitorMessage((payload as any).new);}).subscribe();",".on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_messages'},payload=>{void presentLocalVisitorMessage((payload as any).new);}).on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_call_requests',filter:`owner_user_id=eq.${user.id}`},payload=>{void presentLocalCallRequest((payload as any).new);}).subscribe();"],
  ["await Notifications.scheduleNotificationAsync({content:{title:input.title,body:input.body,data:input.data},trigger:Platform.OS==='android'?{channelId:DKD_PUSH_CHANNEL_ID}:null});","await Notifications.scheduleNotificationAsync({content:{title:input.title,body:input.body,data:input.data,sound:'default'},trigger:null});"],
  ["if(granted)void syncPushRegistration();return granted;","if(granted){void syncPushRegistration();void presentSystemNotification({title:'DraBornPark bildirimleri aktif',body:'Araç uyarıları ve güvenli mesajlar bu cihazda sistem bildirimi olarak gösterilecek.',data:{type:'drabornpark_notification_ready',source:'permission-confirmation'}});}return granted;"],
  ["catch{}finally{pollBusy=false;}};void currentUser().then",dkd_poll_fallback],
  ["pollTimer=setInterval(()=>{void pollMessages(user.id);},2000);","pollTimer=setInterval(()=>{void pollMessages(user.id);void pollReports(user.id);void pollCalls(user.id);},2000);"]
]);

dkd_patch('app/factory.tsx',[
  ["import * as Haptics from 'expo-haptics';","import * as Haptics from 'expo-haptics';\nimport * as FileSystem from 'expo-file-system/legacy';"],
  ["import React,{useEffect,useMemo,useState} from 'react';","import React,{useEffect,useMemo,useRef,useState} from 'react';"],
  ["import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';","import {ActivityIndicator,Alert,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';"],
  ["NFC + QR ETİKET MERKEZİ • v1.0.5","NFC + QR ETİKET MERKEZİ • v1.0.7"],
  ["copyWideText:{color:palette.ink,fontSize:10,fontWeight:'900'},list:","copyWideText:{color:palette.ink,fontSize:10,fontWeight:'900'},downloadWide:{minHeight:44,borderRadius:14,borderWidth:1,borderColor:`${palette.cyan}75`,backgroundColor:`${palette.cyan}12`,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:10,marginTop:8},downloadWideText:{color:palette.text,fontSize:9.5,fontWeight:'900'},qrExport:{position:'absolute',left:-1400,top:-1400,width:1024,height:1024,opacity:0},list:"
  ]
]);

const dkd_qr_component=`function DkdQr({url,onCopy}:{url:string;onCopy:()=>void}){const dkd_valid=/^https:\\/\\/www\\.draborneagle\\.com\\/DraBornPark\\/tag\\/[a-z0-9._-]{3,24}$/i.test(url);const dkd_qr_ref=useRef<any>(null);const [dkd_downloading,setDkdDownloading]=useState(false);const dkd_download=async()=>{if(!dkd_valid||!dkd_qr_ref.current||dkd_downloading)return;setDkdDownloading(true);try{const dkd_base64=await new Promise<string>((dkd_resolve,dkd_reject)=>{try{dkd_qr_ref.current.toDataURL((dkd_value:string)=>dkd_resolve(dkd_value));}catch(dkd_problem){dkd_reject(dkd_problem);}});const dkd_slug=String(url).split('/').filter(Boolean).pop()||'etiket';const dkd_name=\`DraBornPark-QR-\${dkd_slug}-1024.png\`;if(Platform.OS==='android'){const dkd_access=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();if(!dkd_access.granted)return;const dkd_uri=await FileSystem.StorageAccessFramework.createFileAsync(dkd_access.directoryUri,dkd_name,'image/png');await FileSystem.writeAsStringAsync(dkd_uri,dkd_base64,{encoding:FileSystem.EncodingType.Base64});}else{if(!FileSystem.documentDirectory)throw new Error('Dosya klasörü kullanılamıyor.');const dkd_uri=FileSystem.documentDirectory+dkd_name;await FileSystem.writeAsStringAsync(dkd_uri,dkd_base64,{encoding:FileSystem.EncodingType.Base64});}await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>undefined);Alert.alert('QR indirildi','Baskıya uygun 1024 × 1024 PNG QR dosyası seçtiğin klasöre kaydedildi.');}catch(dkd_problem:any){Alert.alert('QR indirilemedi',dkd_problem?.message||'Lütfen tekrar dene.');}finally{setDkdDownloading(false)}};return <View style={s.qrCard}><View pointerEvents="none" style={s.qrExport}>{dkd_valid?<QRCode getRef={dkd_ref=>{dkd_qr_ref.current=dkd_ref}} value={url} size={1024} backgroundColor="#FFFFFF" color="#050816"/>:null}</View><View style={s.qrBox}>{dkd_valid?<QRCode value={url} size={154} backgroundColor="#FFFFFF" color="#050816"/>:<MaterialCommunityIcons name="qrcode-remove" size={62} color={palette.muted}/>}</View><View style={{flex:1,minWidth:0}}><Text style={s.qrTitle}>NFC + QR • AYNI BAĞLANTI</Text><Text selectable style={s.qrUrl}>{url||'Geçerli bağlantı yok.'}</Text><Pressable disabled={!dkd_valid} onPress={onCopy} style={[s.copyWide,!dkd_valid&&s.disabled]}><MaterialCommunityIcons name="content-copy" size={18} color={palette.ink}/><Text style={s.copyWideText}>BAĞLANTIYI KOPYALA</Text></Pressable><Pressable disabled={!dkd_valid||dkd_downloading} onPress={()=>void dkd_download()} style={[s.downloadWide,(!dkd_valid||dkd_downloading)&&s.disabled]}>{dkd_downloading?<ActivityIndicator color={palette.text}/>:<MaterialCommunityIcons name="download" size={19} color={palette.text}/>}<Text style={s.downloadWideText}>{dkd_downloading?'HAZIRLANIYOR':'YÜKSEK KALİTE QR İNDİR'}</Text></Pressable></View></View>}\n`;
dkd_replace_block('app/factory.tsx','function DkdQr({url,onCopy}',"\n\nconst s=StyleSheet.create",dkd_qr_component,'YÜKSEK KALİTE QR İNDİR');

console.log('DraBornPark v1.0.7 source transforms ready • direct notification permission • QR export • UI alignment.');
