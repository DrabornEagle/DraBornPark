import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationBar } from 'expo-navigation-bar';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DkdActionModal } from '@/src/components/DkdActionModal';
import { getNotificationPermissionStatus, requestDkdNotificationPermission } from '@/src/lib/notificationConsent';
import { initializeNotificationPresentation, startForegroundReportNotifications, startPushTokenRefresh, syncPushRegistration } from '@/src/lib/push';
import { supabase } from '@/src/lib/supabase';
import { palette } from '@/src/theme';

const DKD_NOTIFICATION_GATE_KEY='dkd_drabornpark_notification_gate_v054';

function LivePushRegistration(){
  const [permissionModal,setPermissionModal]=useState(false);
  const reportListener=useRef<{remove:()=>void}|null>(null);
  const tokenListener=useRef<{remove:()=>void}|null>(null);
  const responseListener=useRef<{remove:()=>void}|null>(null);
  const startedForUser=useRef<string|null>(null);

  const stop=()=>{reportListener.current?.remove();reportListener.current=null;tokenListener.current?.remove();tokenListener.current=null;responseListener.current?.remove();responseListener.current=null;startedForUser.current=null;};
  const routeNotification=(data:any)=>{const type=String(data?.type||'');if(type==='drabornpark_support'&&data?.supportId){router.push({pathname:'/admin-support',params:{id:String(data.supportId)}} as any);return;}if(type.startsWith('drabornpark_'))router.push('/notifications');};
  const start=async(userId:string)=>{
    if(startedForUser.current===userId)return;
    stop();startedForUser.current=userId;
    initializeNotificationPresentation();
    void syncPushRegistration();
    reportListener.current=startForegroundReportNotifications();
    tokenListener.current=startPushTokenRefresh();
    if(Platform.OS!=='web'){
      try{const Notifications=await import('expo-notifications');responseListener.current=Notifications.addNotificationResponseReceivedListener(response=>routeNotification(response.notification.request.content.data));const last=await Notifications.getLastNotificationResponseAsync();if(last)routeNotification(last.notification.request.content.data);}catch{}
    }
  };
  const prepare=async(session:any)=>{
    if(!session?.user?.id){stop();setPermissionModal(false);return;}
    const status=await getNotificationPermissionStatus();
    if(status==='granted'){await AsyncStorage.setItem(DKD_NOTIFICATION_GATE_KEY,'granted');await start(session.user.id);return;}
    const saved=await AsyncStorage.getItem(DKD_NOTIFICATION_GATE_KEY);
    if(saved!=='later'&&saved!=='denied')setPermissionModal(true);
  };
  useEffect(()=>{let active=true;supabase.auth.getSession().then(({data})=>{if(active)void prepare(data.session)});const {data:auth}=supabase.auth.onAuthStateChange((_event,session)=>{if(active)void prepare(session)});return()=>{active=false;auth.subscription.unsubscribe();stop();};},[]);
  const allow=async()=>{setPermissionModal(false);const granted=await requestDkdNotificationPermission();await AsyncStorage.setItem(DKD_NOTIFICATION_GATE_KEY,granted?'granted':'denied');if(granted){const {data}=await supabase.auth.getSession();if(data.session)await start(data.session.user.id);}};
  const later=async()=>{setPermissionModal(false);await AsyncStorage.setItem(DKD_NOTIFICATION_GATE_KEY,'later');};
  return <DkdActionModal visible={permissionModal} eyebrow="BİLDİRİM İZNİ" title="Aracın sana ulaşabilsin" body="DraBornPark; QR/NFC araç bildirimleri, anonim mesajlar, acil arama talepleri ve park hatırlatıcıları için bildirim izni kullanır." icon="bell-ring-outline" color={palette.orange} secondaryColor={palette.cyan} badge="SEN KONTROL EDERSİN" bullets={['Bildirim izni telefon numaranı paylaşmaz.','Acil araç olaylarını kaçırmamanı sağlar.','Bildirim tercihlerini daha sonra Ayarlar’dan değiştirebilirsin.']} primaryLabel="BİLDİRİMLERE İZİN VER" onPrimary={()=>void allow()} secondaryLabel="ŞİMDİ DEĞİL" onSecondary={()=>void later()}/>;
}

export default function RootLayout(){return <SafeAreaProvider><LivePushRegistration/><StatusBar style="light"/>{Platform.OS==='android'?<NavigationBar style="dark" hidden={false}/>:null}<Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:palette.bg},animation:'fade_from_bottom',animationDuration:220,gestureEnabled:true,fullScreenGestureEnabled:true}}/></SafeAreaProvider>}
