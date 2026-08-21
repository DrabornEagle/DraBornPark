import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export const DKD_PUSH_CHANNEL_ID='drabornpark-alerts-v2';

type NotificationsModule=typeof import('expo-notifications');
type PushSubscription={remove:()=>void};
let notificationsPromise:Promise<NotificationsModule|null>|null=null;
let handlerConfigured=false;
let remotePushReady=false;

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
    showBadge:true,
  });
}

async function ensurePermission(Notifications:NotificationsModule){
  const current=await Notifications.getPermissionsAsync();
  let status=current.status;
  if(status!=='granted')status=(await Notifications.requestPermissionsAsync()).status;
  return status==='granted';
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
  if(!projectId)return {ok:false,reason:'Expo push projectId yapılandırılmadı. Uygulama açıkken canlı yerel sistem bildirimi çalışır.',projectId};
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

async function presentLocalVisitorMessage(message:any){
  if(remotePushReady||String(message?.sender_role)!=='visitor')return;
  const Notifications=await loadNotifications(true);
  if(!Notifications)return;
  await ensureAndroidChannel(Notifications);
  if(!await ensurePermission(Notifications))return;
  const body=String(message?.body_safe||'Yeni anonim araç mesajı geldi.');
  const content={
    title:'DraBornPark • Yeni anonim mesaj',
    body,
    data:{type:'drabornpark_chat',messageId:message?.id,sessionId:message?.session_id,source:'realtime-local'},
  };
  if(Platform.OS==='android'){
    await Notifications.scheduleNotificationAsync({
      content,
      trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:1,repeats:false,channelId:DKD_PUSH_CHANNEL_ID},
    });
  }else{
    await Notifications.scheduleNotificationAsync({content,trigger:null});
  }
}

export function startForegroundReportNotifications():PushSubscription{
  let active=true;
  let channel:ReturnType<typeof supabase.channel>|null=null;
  void currentUser().then(user=>{
    if(!active||!user)return;
    channel=supabase
      .channel(`drabornpark-live-message-alerts-${user.id}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_messages'},payload=>{
        void presentLocalVisitorMessage((payload as any).new);
      })
      .subscribe();
  }).catch(error=>console.warn('[DraBornPark bildirim] canlı mesaj bildirimi başlatılamadı',String((error as any)?.message||error)));
  return {remove:()=>{active=false;if(channel)void supabase.removeChannel(channel);}};
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
