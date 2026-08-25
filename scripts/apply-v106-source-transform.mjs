import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.6 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,90)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('src/components/AppChrome.tsx',[[
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:6}]}",
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:0}]}"
]]);

dkd_patch('app/index.tsx',[[
  '<StatusPill compact offsetX={-12}',
  '<StatusPill compact offsetX={-17}'
]]);

dkd_patch('app/_layout.tsx',[[
  "const PERMISSION_PROMPT_KEY='drabornpark_notification_prompt_v054';",
  "const PERMISSION_PROMPT_KEY='drabornpark_notification_prompt_v106b';"
]]);

const dkd_call_helper="async function presentLocalCallRequest(call:any){const callId=String(call?.id||'');const key=callId?`call:${callId}`:`call:${String(call?.created_at||'')}`;if(rememberNotification(key))return;await presentSystemNotification({title:'Acil arama talebi',body:'Aracınız için yeni bir güvenli arama talebi geldi.',data:{type:'drabornpark_call_request',callRequestId:call?.id,source:'realtime-local-call'}});}\n";
const dkd_poll_fallback="catch(error){console.warn('[DraBornPark bildirim] mesaj yedek sorgusu başarısız',String((error as any)?.message||error));}finally{pollBusy=false;}};const pollReports=async(userId:string)=>{if(!active||AppState.currentState!=='active')return;const since=new Date(Math.max(lastPollAt-2500,Date.now()-30000)).toISOString();try{const {data,error}=await supabase.from('drabornpark_reports').select('id,category,message_safe,created_at').eq('owner_user_id',userId).gt('created_at',since).order('created_at',{ascending:true}).limit(30);if(error)throw error;for(const report of data??[])await presentLocalReport(report);}catch(error){console.warn('[DraBornPark bildirim] rapor yedek sorgusu başarısız',String((error as any)?.message||error));}};const pollCalls=async(userId:string)=>{if(!active||AppState.currentState!=='active')return;const since=new Date(Math.max(lastPollAt-2500,Date.now()-30000)).toISOString();try{const {data,error}=await supabase.from('drabornpark_call_requests').select('id,created_at').eq('owner_user_id',userId).gt('created_at',since).order('created_at',{ascending:true}).limit(30);if(error)throw error;for(const call of data??[])await presentLocalCallRequest(call);}catch(error){console.warn('[DraBornPark bildirim] arama yedek sorgusu başarısız',String((error as any)?.message||error));}};void currentUser().then";

dkd_patch('src/lib/push.ts',[
  ["witness:'Bir olaya şahit olundu',emergency:'Acil durum bildirimi',other:'Yeni araç bildirimi'","witness:'Bir olaya şahit olundu',emergency:'Acil durum bildirimi',direct_message:'Doğrudan güvenli mesaj',other:'Yeni araç bildirimi'"],
  ["const projectId=(Constants.expoConfig?.extra as any)?.eas?.projectId??(Constants as any).easConfig?.projectId??null;","const projectId=(Constants.expoConfig?.extra as any)?.eas?.projectId??(Constants as any).easConfig?.projectId??((globalThis as any)?.process?.env?.EXPO_PUBLIC_EAS_PROJECT_ID??null);"],
  ["export function startForegroundReportNotifications():PushSubscription{",dkd_call_helper+"export function startForegroundReportNotifications():PushSubscription{"],
  [".on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_messages'},payload=>{void presentLocalVisitorMessage((payload as any).new);}).subscribe();",".on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_messages'},payload=>{void presentLocalVisitorMessage((payload as any).new);}).on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_call_requests',filter:`owner_user_id=eq.${user.id}`},payload=>{void presentLocalCallRequest((payload as any).new);}).subscribe();"],
  ["await Notifications.scheduleNotificationAsync({content:{title:input.title,body:input.body,data:input.data},trigger:Platform.OS==='android'?{channelId:DKD_PUSH_CHANNEL_ID}:null});","await Notifications.scheduleNotificationAsync({content:{title:input.title,body:input.body,data:input.data,sound:'default'},trigger:null});"],
  ["if(granted)void syncPushRegistration();return granted;","if(granted){void syncPushRegistration();void presentSystemNotification({title:'DraBornPark bildirimleri aktif',body:'Araç uyarıları ve güvenli mesajlar bu cihazda sistem bildirimi olarak gösterilecek.',data:{type:'drabornpark_notification_ready',source:'permission-confirmation'}});}return granted;"],
  ["catch{}finally{pollBusy=false;}};void currentUser().then",dkd_poll_fallback],
  ["pollTimer=setInterval(()=>{void pollMessages(user.id);},2000);","pollTimer=setInterval(()=>{void pollMessages(user.id);void pollReports(user.id);void pollCalls(user.id);},2000);"]
]);

console.log('DraBornPark v1.0.6 source transforms ready • foreground Android notifications hardened.');
