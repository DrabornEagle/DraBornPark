import { Platform } from 'react-native';
import { isExpoGoClient, DKD_PUSH_CHANNEL_ID } from '@/src/lib/push';
import { isCurrentUserAdmin } from '@/src/lib/v060';
import { supabase } from '@/src/lib/supabase';

export function startAdminSupportNotifications(){
  let active=true;let channel:ReturnType<typeof supabase.channel>|null=null;
  void (async()=>{
    const {data:userData}=await supabase.auth.getUser();const user=userData.user;
    if(!active||!user||!await isCurrentUserAdmin())return;
    channel=supabase.channel(`drabornpark-admin-support-v060-${user.id}-${Date.now()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_admin_notifications',filter:`admin_user_id=eq.${user.id}`},payload=>{
      const row:any=(payload as any).new;
      if(!active||Platform.OS==='web'||isExpoGoClient())return;
      void import('expo-notifications').then(Notifications=>Notifications.scheduleNotificationAsync({content:{title:String(row?.title||'Yeni DraBornPark destek kaydı'),body:String(row?.body||'Yeni destek kaydı geldi.'),data:{type:'drabornpark_support_admin',supportRequestId:row?.support_request_id,route:row?.route}},trigger:Platform.OS==='android'?{channelId:DKD_PUSH_CHANNEL_ID}:null})).catch(()=>{});
    }).subscribe();
  })().catch(error=>console.warn('[DraBornPark admin support]',String((error as any)?.message||error)));
  return {remove:()=>{active=false;if(channel)void supabase.removeChannel(channel)}};
}
