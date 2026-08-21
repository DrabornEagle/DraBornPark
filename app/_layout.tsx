import { NavigationBar } from 'expo-navigation-bar';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startNotificationRouting } from '@/src/lib/notificationRouting';
import { initializeNotificationPresentation, startForegroundReportNotifications, startPushTokenRefresh, syncPushRegistration } from '@/src/lib/push';
import { supabase } from '@/src/lib/supabase';
import { palette } from '@/src/theme';

function LivePushRegistration(){
  useEffect(()=>{
    let mounted=true;let reportListener:{remove:()=>void}|null=null;
    initializeNotificationPresentation();
    const routing=startNotificationRouting(route=>router.push(route as any));
    const sync=()=>{if(mounted)void syncPushRegistration();};
    const startReportListener=()=>{if(mounted&&!reportListener)reportListener=startForegroundReportNotifications();};
    const stopReportListener=()=>{reportListener?.remove();reportListener=null;};
    supabase.auth.getSession().then(({data})=>{if(data.session){sync();startReportListener();}});
    const {data:auth}=supabase.auth.onAuthStateChange((_event,session)=>{if(session){sync();stopReportListener();startReportListener();}else stopReportListener();});
    const tokenListener=startPushTokenRefresh();
    return()=>{mounted=false;auth.subscription.unsubscribe();tokenListener.remove();routing.remove();stopReportListener();};
  },[]);
  return null;
}

export default function RootLayout(){return <SafeAreaProvider><LivePushRegistration/><StatusBar style="light"/>{Platform.OS==='android'?<NavigationBar style="dark" hidden={false}/>:null}<Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:palette.bg},animation:'fade_from_bottom',animationDuration:220,gestureEnabled:true,fullScreenGestureEnabled:true}}/></SafeAreaProvider>}
