import { AppState, Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

const DKD_SUPPORT_CHANNEL='drabornpark-alerts-v3';
const DKD_DEDUPE_MS=15000;
const dkdSeen=new Map<string,number>();

type DkdSubscription={remove:()=>void};

function dkdRemember(id:unknown){
  const key=String(id||'').trim();
  if(!key)return false;
  const now=Date.now();
  for(const [saved,time] of dkdSeen){if(now-time>DKD_DEDUPE_MS)dkdSeen.delete(saved);}
  const previous=dkdSeen.get(key)??0;
  dkdSeen.set(key,now);
  return now-previous<DKD_DEDUPE_MS;
}

async function dkdPresentSupport(row:any){
  if(Platform.OS==='web')return;
  const id=String(row?.id||'');
  if(!id||dkdRemember(`support:${id}`))return;
  try{
    const Notifications=await import('expo-notifications');
    const permission=await Notifications.getPermissionsAsync();
    if(permission.status!=='granted')return;
    await Notifications.scheduleNotificationAsync({
      content:{
        title:'Yeni Destek Kaydı',
        body:String(row?.subject||'Yeni bir DraBornPark destek talebi geldi.').slice(0,140),
        data:{type:'drabornpark_support',supportId:id,source:'admin-support-local-v054'},
      },
      trigger:Platform.OS==='android'?{channelId:DKD_SUPPORT_CHANNEL}:null,
    });
  }catch(error){
    console.warn('[DraBornPark admin destek bildirimi]',String((error as any)?.message||error));
  }
}

export function startAdminSupportNotifications():DkdSubscription{
  let active=true;
  let admin=false;
  let channel:ReturnType<typeof supabase.channel>|null=null;
  let timer:ReturnType<typeof setInterval>|null=null;
  let polling=false;
  let lastPollAt=Date.now();

  const poll=async()=>{
    if(!active||!admin||polling||AppState.currentState!=='active')return;
    polling=true;
    const started=Date.now();
    try{
      const since=new Date(Math.max(lastPollAt-2500,Date.now()-30000)).toISOString();
      const {data,error}=await supabase
        .from('drabornpark_support_requests')
        .select('id,subject,created_at')
        .gt('created_at',since)
        .order('created_at',{ascending:true})
        .limit(40);
      if(error)throw error;
      for(const row of data??[])await dkdPresentSupport(row);
      lastPollAt=started;
    }catch{
      // Realtime koparsa bir sonraki aktif turda tekrar denenir.
    }finally{
      polling=false;
    }
  };

  void (async()=>{
    try{
      const {data:userData}=await supabase.auth.getUser();
      if(!active||!userData.user)return;
      const {data:isAdmin,error}=await supabase.rpc('drabornpark_is_admin');
      if(error||!isAdmin)return;
      admin=true;
      channel=supabase
        .channel(`dkd-admin-support-v054-${userData.user.id}-${Date.now()}`)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_support_requests'},payload=>{void dkdPresentSupport((payload as any).new);})
        .subscribe();
      timer=setInterval(()=>{void poll();},2500);
    }catch(error){
      console.warn('[DraBornPark admin destek]',String((error as any)?.message||error));
    }
  })();

  return {remove:()=>{
    active=false;
    if(timer)clearInterval(timer);
    if(channel)void supabase.removeChannel(channel);
  }};
}
