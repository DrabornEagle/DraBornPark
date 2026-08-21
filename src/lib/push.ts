import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export const DKD_PUSH_CHANNEL_ID='drabornpark-alerts-v3';

type NotificationsModule=typeof import('expo-notifications');
type PushSubscription={remove:()=>void};
type SessionMeta={reportId:string|null;category:string;priority:string;title:string;initialMessageId:string|null};

let notificationsPromise:Promise<NotificationsModule|null>|null=null;
let handlerConfigured=false;
let remotePushReady=false;
const recentNotificationKeys=new Map<string,number>();
const sessionMetaCache=new Map<string,{value:SessionMeta;expiresAt:number}>();
const ALERT_DEDUPE_MS=12000;

const CATEGORY_TITLES:Record<string,string>={
  blocked_exit:'Aracınızı hareket ettirmeniz isteniyor',
  blocking_exit:'Aracınızı hareket ettirmeniz isteniyor',
  move_vehicle:'Aracınızı hareket ettirebilir misiniz?',
  lights_on:'Farlarınız açık olabilir',
  window_open:'Camınız açık olabilir',
  door_open:'Kapınız açık olabilir',
  trunk_open:'Bagajınız açık olabilir',
  damage:'Aracınızda hasar fark edilmiş olabilir',
  suspicious:'Şüpheli durum bildirimi',
  towing:'Aracınız çekiliyor olabilir',
  animal:'Araçta hayvan var',
  child:'Araçta çocuk var',
  fire:'Duman / yangın şüphesi',
  forgotten_item:'Eşya veya anahtar unutulmuş olabilir',
  witness:'Bir olaya şahit olundu',
  emergency:'Acil durum bildirimi',
  other:'Yeni araç bildirimi',
};

function categoryTitle(category:unknown){
  const key=String(category||'other');
  return CATEGORY_TITLES[key]||CATEGORY_TITLES.other;
}

export function isExpoGoClient(){
  const ownership=(Constants as any).appOwnership;
  const environment=String((Constants as any).executionEnvironment||'').toLowerCase();
  return ownership==='expo'||environment==='storeclient';
}

async function loadNotifications(allowExpoGoLocal=false):Promise<NotificationsModule|null>{
  if(Platform.OS==='web')return null;
  if(isExpoGoClient()&&!allowExpoGoLocal)return null;
  if(!notificationsPromise){
    notificationsPromise=import('expo-notifications').then(module=>{
      if(!handlerConfigured){
        module.setNotificationHandler({
          handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:true}),
          handleError:error=>console.warn('[DraBornPark bildirim] foreground handler hatası',String((error as any)?.message||error)),
        });
        handlerConfigured=true;
      }
      return module;
    }).catch(error=>{
      console.warn('[DraBornPark bildirim] expo-notifications yüklenemedi',String((error as any)?.message||error));
      return null;
    });
  }
  return notificationsPromise;
}

async function ensureAndroidChannel(Notifications:NotificationsModule){
  if(Platform.OS!=='android')return;
  await Notifications.setNotificationChannelAsync(DKD_PUSH_CHANNEL_ID,{
    name:'DraBornPark Araç Bildirimleri',
    description:'Araç bildirimi, anonim mesaj ve önemli DraBornPark uyarıları',
    importance:Notifications.AndroidImportance.MAX,
    vibrationPattern:[0,250,150,250],
    lightColor:'#FF5CBD',
    enableVibrate:true,
    enableLights:true,
    showBadge:true,
  });
}

async function ensurePermission(Notifications:NotificationsModule){
  const current=await Notifications.getPermissionsAsync();
  let status=current.status;
  if(status!=='granted')status=(await Notifications.requestPermissionsAsync()).status;
  return status==='granted';
}

export function initializeNotificationPresentation(){
  if(Platform.OS==='web')return;
  void loadNotifications(true).then(async Notifications=>{
    if(!Notifications)return;
    await ensureAndroidChannel(Notifications);
    await ensurePermission(Notifications);
  }).catch(error=>console.warn('[DraBornPark bildirim] foreground hazırlığı başarısız',String((error as any)?.message||error)));
}

function rememberNotification(key:unknown){
  const now=Date.now();
  for(const [savedKey,time] of recentNotificationKeys){if(now-time>ALERT_DEDUPE_MS)recentNotificationKeys.delete(savedKey);}
  const normalized=String(key||'').trim();
  if(!normalized)return false;
  const previous=recentNotificationKeys.get(normalized)??0;
  recentNotificationKeys.set(normalized,now);
  return now-previous<ALERT_DEDUPE_MS;
}

export type PushRegistrationResult={ok:boolean;token?:string;reason?:string;projectId?:string|null};

async function currentUser(){
  const {data,error}=await supabase.auth.getUser();
  if(error)throw error;
  return data.user;
}

export async function syncPushRegistration():Promise<PushRegistrationResult>{
  remotePushReady=false;
  if(Platform.OS==='web')return {ok:false,reason:'Web push bu istemcide kullanılmıyor.'};
  if(isExpoGoClient())return {ok:false,reason:'Expo Go Android uzak push bildirimlerini desteklemiyor. DraBornPark Developer APK kullan.'};
  if(!Device.isDevice)return {ok:false,reason:'Push bildirimi fiziksel cihaz gerektirir.'};
  const Notifications=await loadNotifications();
  if(!Notifications)return {ok:false,reason:'Bildirim modülü bu istemcide kullanılamıyor.'};
  await ensureAndroidChannel(Notifications);
  if(!await ensurePermission(Notifications))return {ok:false,reason:'Bildirim izni verilmedi.'};
  const user=await currentUser();
  if(!user)return {ok:false,reason:'Oturum bulunamadı.'};
  const projectId=(Constants.expoConfig?.extra as any)?.eas?.projectId??(Constants as any).easConfig?.projectId??null;
  if(!projectId)return {ok:false,reason:'Expo push projectId yapılandırılmadı. Uygulama açıkken canlı Android sistem bildirimi çalışır.',projectId};
  try{
    const result=await Notifications.getExpoPushTokenAsync({projectId});
    const token=result.data;
    if(!token)return {ok:false,reason:'Expo push token üretilemedi.',projectId};
    const {error}=await supabase.from('drabornpark_push_tokens').upsert({user_id:user.id,expo_push_token:token,platform:Platform.OS,device_label:[Device.brand,Device.modelName].filter(Boolean).join(' ')||'Android cihaz',is_enabled:true,last_seen_at:new Date().toISOString()},{onConflict:'expo_push_token'});
    if(error)throw error;
    remotePushReady=true;
    return {ok:true,token,projectId};
  }catch(error:any){
    const message=String(error?.message||error||'Push kaydı tamamlanamadı.');
    console.warn('[DraBornPark bildirim]',message);
    return {ok:false,reason:message,projectId};
  }
}

async function presentSystemNotification(input:{title:string;body:string;data:Record<string,unknown>}){
  const Notifications=await loadNotifications(true);
  if(!Notifications)return;
  await ensureAndroidChannel(Notifications);
  if(!await ensurePermission(Notifications))return;
  const content={title:input.title,body:input.body,data:input.data};
  try{
    await Notifications.scheduleNotificationAsync({
      content,
      trigger:Platform.OS==='android'?{channelId:DKD_PUSH_CHANNEL_ID}:null,
    });
  }catch(error){
    console.warn('[DraBornPark bildirim] sistem bildirimi gösterilemedi',String((error as any)?.message||error));
  }
}

async function resolveSessionMeta(sessionId:unknown):Promise<SessionMeta>{
  const id=String(sessionId||'');
  const fallback:SessionMeta={reportId:null,category:'other',priority:'normal',title:CATEGORY_TITLES.other,initialMessageId:null};
  if(!id)return fallback;
  const cached=sessionMetaCache.get(id);
  if(cached&&cached.expiresAt>Date.now())return cached.value;
  try{
    const {data:session,error:sessionError}=await supabase.from('drabornpark_contact_sessions').select('report_id').eq('id',id).maybeSingle();
    if(sessionError)throw sessionError;
    const reportId=String(session?.report_id||'')||null;
    let category='other';
    let priority='normal';
    if(reportId){
      const {data:report,error:reportError}=await supabase.from('drabornpark_reports').select('category,priority').eq('id',reportId).maybeSingle();
      if(reportError)throw reportError;
      category=String(report?.category||'other');
      priority=String(report?.priority||'normal');
    }
    const {data:firstMessage}=await supabase.from('drabornpark_messages').select('id').eq('session_id',id).order('created_at',{ascending:true}).limit(1).maybeSingle();
    const value:SessionMeta={reportId,category,priority,title:categoryTitle(category),initialMessageId:String(firstMessage?.id||'')||null};
    sessionMetaCache.set(id,{value,expiresAt:Date.now()+60000});
    return value;
  }catch{
    return fallback;
  }
}

async function presentLocalReport(report:any){
  const reportId=String(report?.id||'');
  const key=reportId?`report:${reportId}`:`report:${String(report?.created_at||'')}:${String(report?.category||'')}`;
  if(rememberNotification(key))return;
  const body=String(report?.message_safe||'Aracınız için yeni bir bildirim geldi.');
  const category=String(report?.category||'other');
  await presentSystemNotification({
    title:categoryTitle(category),
    body,
    data:{type:'drabornpark_report',reportId:report?.id,category,source:'realtime-local-report'},
  });
}

async function presentLocalVisitorMessage(message:any){
  if(String(message?.sender_role)!=='visitor')return;
  const meta=await resolveSessionMeta(message?.session_id);
  const messageId=String(message?.id||'');
  const key=messageId&&meta.initialMessageId===messageId&&meta.reportId?`report:${meta.reportId}`:messageId?`message:${messageId}`:`message:${String(message?.created_at||'')}:${String(message?.body_safe||'')}`;
  if(rememberNotification(key))return;
  const body=String(message?.body_safe||'Yeni anonim araç mesajı geldi.');
  await presentSystemNotification({
    title:meta.title,
    body,
    data:{type:'drabornpark_chat',messageId:message?.id,sessionId:message?.session_id,reportId:meta.reportId,category:meta.category,source:'live-local-message'},
  });
}

export function startForegroundReportNotifications():PushSubscription{
  let active=true;
  let channel:ReturnType<typeof supabase.channel>|null=null;
  let pollTimer:ReturnType<typeof setInterval>|null=null;
  let pollBusy=false;
  let lastPollAt=Date.now();

  const pollMessages=async(userId:string)=>{
    if(!active||pollBusy||AppState.currentState!=='active')return;
    pollBusy=true;
    const pollStarted=Date.now();
    try{
      const {data:sessions,error:sessionError}=await supabase
        .from('drabornpark_contact_sessions')
        .select('id')
        .eq('owner_user_id',userId)
        .order('created_at',{ascending:false})
        .limit(30);
      if(sessionError)throw sessionError;
      const sessionIds=(sessions??[]).map((row:any)=>String(row.id)).filter(Boolean);
      if(sessionIds.length){
        const since=new Date(Math.max(lastPollAt-2500,Date.now()-30000)).toISOString();
        const {data:messages,error:messageError}=await supabase
          .from('drabornpark_messages')
          .select('id,session_id,sender_role,body_safe,created_at')
          .in('session_id',sessionIds)
          .eq('sender_role','visitor')
          .gt('created_at',since)
          .order('created_at',{ascending:true})
          .limit(60);
        if(messageError)throw messageError;
        for(const message of messages??[])await presentLocalVisitorMessage(message);
      }
      lastPollAt=pollStarted;
    }catch{
      // Realtime koparsa bu yedek döngü bir sonraki turda sessizce yeniden dener.
    }finally{
      pollBusy=false;
    }
  };

  void currentUser().then(user=>{
    if(!active||!user)return;
    channel=supabase
      .channel(`drabornpark-live-v052-${user.id}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_reports',filter:`owner_user_id=eq.${user.id}`},payload=>{
        void presentLocalReport((payload as any).new);
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_messages'},payload=>{
        void presentLocalVisitorMessage((payload as any).new);
      })
      .subscribe();
    pollTimer=setInterval(()=>{void pollMessages(user.id);},2000);
  }).catch(error=>console.warn('[DraBornPark bildirim] canlı sistem bildirimi başlatılamadı',String((error as any)?.message||error)));

  return {remove:()=>{
    active=false;
    if(pollTimer)clearInterval(pollTimer);
    if(channel)void supabase.removeChannel(channel);
  }};
}

export function startPushTokenRefresh():PushSubscription{
  let active=true;
  let subscription:PushSubscription|null=null;
  if(isExpoGoClient()||Platform.OS==='web')return {remove:()=>{active=false;}};
  void loadNotifications().then(Notifications=>{
    if(!active||!Notifications)return;
    subscription=Notifications.addPushTokenListener(()=>{void syncPushRegistration();});
  });
  return {remove:()=>{active=false;subscription?.remove();}};
}
