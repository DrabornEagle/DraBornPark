import { Platform } from 'react-native';
import { isExpoGoClient } from '@/src/lib/push';

export type NotificationRouteHandler=(route:string)=>void;

function resolveRoute(data:any){
  if(data?.type==='drabornpark_support_admin'&&data?.supportRequestId)return `/admin/support/${String(data.supportRequestId)}`;
  if(data?.type==='drabornpark_report'||data?.type==='drabornpark_chat')return '/notifications';
  return typeof data?.route==='string'&&data.route.startsWith('/')?data.route:null;
}

export function startNotificationRouting(onRoute:NotificationRouteHandler){
  let active=true;let subscription:{remove:()=>void}|null=null;
  if(Platform.OS==='web'||isExpoGoClient())return {remove:()=>{active=false}};
  void import('expo-notifications').then(async Notifications=>{
    if(!active)return;
    const last=await Notifications.getLastNotificationResponseAsync().catch(()=>null);
    const lastRoute=resolveRoute(last?.notification?.request?.content?.data);
    if(lastRoute&&active)setTimeout(()=>active&&onRoute(lastRoute),250);
    subscription=Notifications.addNotificationResponseReceivedListener(response=>{
      const route=resolveRoute(response.notification.request.content.data);
      if(route&&active)onRoute(route);
    });
  }).catch(error=>console.warn('[DraBornPark notification routing]',String((error as any)?.message||error)));
  return {remove:()=>{active=false;subscription?.remove()}};
}
