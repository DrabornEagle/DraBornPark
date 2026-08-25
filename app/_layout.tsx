import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import React,{useEffect,useState} from 'react';
import {AppState,Linking,Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ColorPopup} from '@/src/components/ColorPopup';
import {DkdStartupSplash} from '@/src/components/DkdStartupSplash';
import {getNotificationPermissionStatus,initializeNotificationPresentation,requestNotificationPermission,startAdminSupportNotifications,startForegroundReportNotifications,startNotificationResponseRouting,startPushTokenRefresh,syncPushRegistration} from '@/src/lib/push';
import {supabase} from '@/src/lib/supabase';
import {palette} from '@/src/theme';

if(Platform.OS!=='web')void SplashScreen.preventAutoHideAsync().catch(()=>undefined);

const PERMISSION_PROMPT_KEY='drabornpark_notification_prompt_v106b';
const PERMISSION_SNOOZE_MS=30*60*1000;
function LivePushRegistration(){
  useEffect(()=>{
    let mounted=true;let reportListener:{remove:()=>void}|null=null;let supportListener:{remove:()=>void}|null=null;
    initializeNotificationPresentation();
    const sync=()=>{if(mounted)void syncPushRegistration();};
    const startListeners=()=>{if(!mounted)return;if(!reportListener)reportListener=startForegroundReportNotifications();if(!supportListener)supportListener=startAdminSupportNotifications();};
    const stopListeners=()=>{reportListener?.remove();supportListener?.remove();reportListener=null;supportListener=null;};
    supabase.auth.getSession().then(({data})=>{if(data.session){sync();startListeners();}});
    const {data:auth}=supabase.auth.onAuthStateChange((_event,session)=>{if(session){sync();stopListeners();startListeners();}else stopListeners();});
    const tokenListener=startPushTokenRefresh();const responseListener=startNotificationResponseRouting();
    return()=>{mounted=false;auth.subscription.unsubscribe();tokenListener.remove();responseListener.remove();stopListeners();};
  },[]);return null;
}
function NotificationPermissionPrompt(){
  const [visible,setVisible]=useState(false);const [busy,setBusy]=useState(false);const [permissionStatus,setPermissionStatus]=useState('undetermined');
  useEffect(()=>{let active=true;
    const check=async()=>{if(Platform.OS==='web')return;const {data}=await supabase.auth.getSession();if(!data.session){if(active)setVisible(false);return;}const status=await getNotificationPermissionStatus();if(!active)return;setPermissionStatus(status);if(status==='granted'||status==='unavailable'){setVisible(false);if(status==='granted')void syncPushRegistration();return;}const seen=await AsyncStorage.getItem(PERMISSION_PROMPT_KEY);const snoozedAt=seen?.startsWith('later:')?Number(seen.slice(6)):0;if(snoozedAt&&Date.now()-snoozedAt<PERMISSION_SNOOZE_MS){setVisible(false);return;}setVisible(true);};
    void check();const {data:auth}=supabase.auth.onAuthStateChange((_event,session)=>{if(session)void check();else if(active)setVisible(false);});const appState=AppState.addEventListener('change',next=>{if(next==='active')void check();});return()=>{active=false;auth.subscription.unsubscribe();appState.remove()};
  },[]);
  const dismiss=async()=>{await AsyncStorage.setItem(PERMISSION_PROMPT_KEY,`later:${Date.now()}`);setVisible(false)};
  const allow=async()=>{setBusy(true);try{if(permissionStatus==='denied'){await AsyncStorage.removeItem(PERMISSION_PROMPT_KEY);await Linking.openSettings();setVisible(false);return;}const granted=await requestNotificationPermission();if(granted){await AsyncStorage.removeItem(PERMISSION_PROMPT_KEY);setPermissionStatus('granted');setVisible(false);}else{setPermissionStatus(await getNotificationPermissionStatus());setVisible(true);}}finally{setBusy(false)}};
  const denied=permissionStatus==='denied';
  return <ColorPopup visible={visible&&!busy} icon="bell-ring-outline" eyebrow="BİLDİRİMLER" title={denied?'Bildirim iznini aç':'Aracından haberin olsun'} body={denied?'Android bildirim izni kapalı. Ayarlar ekranından DraBornPark bildirimlerine izin verdiğinde araç uyarıları ve güvenli mesajlar uygulama açıkken de sistem bildirimi olarak görünür.':'Araç bildirimi, anonim mesaj, destek kaydı ve önemli DraBornPark uyarılarını kaçırmaman için bildirim izni gerekir. İzin, yalnızca bu bildirimleri göstermek için kullanılır.'} accent={palette.pink} secondary={palette.cyan} primaryLabel={denied?'AYARLARI AÇ':'BİLDİRİMLERE İZİN VER'} onPrimary={()=>void allow()} secondaryLabel="ŞİMDİLİK DEĞİL" onSecondary={()=>void dismiss()} chips={['ARAÇ UYARILARI','DESTEK','GÜVENLİ MESAJLAR']}/>;
}
export default function RootLayout(){
  const [dkd_startup,setDkdStartup]=useState(true);
  useEffect(()=>{
    let dkd_alive=true;
    if(Platform.OS==='android'){
      NavigationBar.setStyle('dark');
      void NavigationBar.setVisibilityAsync('visible').catch(()=>undefined);
    }
    const dkd_begin=async()=>{if(Platform.OS!=='web')await SplashScreen.hideAsync().catch(()=>undefined);setTimeout(()=>{if(dkd_alive)setDkdStartup(false)},1850)};
    void dkd_begin();
    return()=>{dkd_alive=false};
  },[]);
  return <SafeAreaProvider><LivePushRegistration/><NotificationPermissionPrompt/><StatusBar style="light"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:palette.bg},animation:'fade_from_bottom',animationDuration:220,gestureEnabled:true,fullScreenGestureEnabled:true}}/>{dkd_startup?<DkdStartupSplash/>:null}</SafeAreaProvider>;
}
