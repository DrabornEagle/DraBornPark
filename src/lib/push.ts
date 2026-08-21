import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export const DKD_PUSH_CHANNEL_ID='drabornpark-core';

type NotificationsModule=typeof import('expo-notifications');
type PushSubscription={remove:()=>void};
let notificationsPromise:Promise<NotificationsModule|null>|null=null;
let handlerConfigured=false;

export function isExpoGoClient(){
  const ownership=(Constants as any).appOwnership;
  const environment=String((Constants as any).executionEnvironment||'').toLowerCase();
  return ownership==='expo'||environment==='storeclient';
}

async function loadNotifications():Promise<NotificationsModule|null>{
  if(isExpoGoClient()||Platform.OS==='web')return null;
  if(!notificationsPromise){
    notificationsPromise=import('expo-notifications').then(module=>{
      if(!handlerConfigured){
        module.setNotificationHandler({
          handleNotification:async()=>({
            shouldShowBanner:true,
            shouldShowList:true,
            shouldPlaySound:true,
            shouldSetBadge:true,
          }),
        });
        handlerConfigured=true;
      }
      return module;
    }).catch(error=>{
      console.warn('[DraBornPark push] expo-notifications yüklenemedi',String((error as any)?.message||error));
      return null;
    });
  }
  return notificationsPromise;
}

export type PushRegistrationResult={
  ok:boolean;
  token?:string;
  reason?:string;
  projectId?:string|null;
};

async function currentUser(){
  const {data,error}=await supabase.auth.getUser();
  if(error)throw error;
  return data.user;
}

export async function syncPushRegistration():Promise<PushRegistrationResult>{
  if(Platform.OS==='web')return {ok:false,reason:'Web push bu istemcide kullanılmıyor.'};
  if(isExpoGoClient())return {ok:false,reason:'Expo Go uzak push bildirimlerini desteklemiyor. Push kaydı yalnızca DraBornPark Developer APK içinde çalışır.'};
  if(!Device.isDevice)return {ok:false,reason:'Push bildirimi fiziksel cihaz gerektirir.'};

  const Notifications=await loadNotifications();
  if(!Notifications)return {ok:false,reason:'Bildirim modülü bu istemcide kullanılamıyor.'};

  const user=await currentUser();
  if(!user)return {ok:false,reason:'Oturum bulunamadı.'};

  if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(DKD_PUSH_CHANNEL_ID,{
      name:'DraBornPark Bildirimleri',
      description:'Araç bildirimi, güvenli mesaj ve önemli DraBornPark uyarıları',
      importance:Notifications.AndroidImportance.MAX,
      vibrationPattern:[0,250,150,250],
      lightColor:'#FF5CBD',
      sound:'default',
      enableVibrate:true,
      showBadge:true,
    });
  }

  const current=await Notifications.getPermissionsAsync();
  let status=current.status;
  if(status!=='granted'){
    const requested=await Notifications.requestPermissionsAsync();
    status=requested.status;
  }
  if(status!=='granted')return {ok:false,reason:'Bildirim izni verilmedi.'};

  const projectId=(Constants.expoConfig?.extra as any)?.eas?.projectId??(Constants as any).easConfig?.projectId??null;
  if(!projectId)return {ok:false,reason:'Expo push projectId yapılandırılmadı. Developer APK çalışır; uzak push tokenı için EAS projectId gerekir.',projectId};

  try{
    const result=await Notifications.getExpoPushTokenAsync({projectId});
    const token=result.data;
    if(!token)return {ok:false,reason:'Expo push token üretilemedi.',projectId};
    const {error}=await supabase.from('drabornpark_push_tokens').upsert({
      user_id:user.id,
      expo_push_token:token,
      platform:Platform.OS,
      device_label:[Device.brand,Device.modelName].filter(Boolean).join(' ')||'Android cihaz',
      is_enabled:true,
      last_seen_at:new Date().toISOString(),
    },{onConflict:'expo_push_token'});
    if(error)throw error;
    return {ok:true,token,projectId};
  }catch(error:any){
    const message=String(error?.message||error||'Push kaydı tamamlanamadı.');
    console.warn('[DraBornPark push]',message);
    return {ok:false,reason:message,projectId};
  }
}

export function startPushTokenRefresh():PushSubscription{
  let active=true;
  let subscription:PushSubscription|null=null;
  if(isExpoGoClient()||Platform.OS==='web')return {remove:()=>{active=false}};

  void loadNotifications().then(Notifications=>{
    if(!active||!Notifications)return;
    subscription=Notifications.addPushTokenListener(()=>{void syncPushRegistration();});
  });

  return {remove:()=>{active=false;subscription?.remove();}};
}
