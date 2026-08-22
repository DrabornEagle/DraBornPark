import fs from 'node:fs';
const file='src/lib/push.ts';
const src=fs.readFileSync(file,'utf8');
const pattern=/export function startAdminSupportNotifications\(\):PushSubscription\{[\s\S]*?\nfunction openNotificationData/;
const match=src.match(pattern);
if(!match)throw new Error('v0.5.4 support notification typing guard did not match');
const replacement=`export function startAdminSupportNotifications():PushSubscription{let active=true;let channel:ReturnType<typeof supabase.channel>|null=null;void (async()=>{try{const {data}=await supabase.rpc('drabornpark_is_admin');if(!active||!data)return;channel=supabase.channel(\`dkd-support-admin-v054-\${Date.now()}\`).on('postgres_changes',{event:'INSERT',schema:'public',table:'drabornpark_support_requests'},payload=>{if(remotePushReady)return;const row=(payload as any).new;const key=\`support:\${row?.id}\`;if(rememberNotification(key))return;void presentSystemNotification({title:'Yeni Destek Kaydı',body:String(row?.subject||'Yeni bir DraBornPark destek kaydı geldi.'),data:{type:'drabornpark_support',supportId:row?.id,source:'realtime-local-support'}});}).subscribe();}catch{}})();return {remove:()=>{active=false;if(channel)void supabase.removeChannel(channel);}};}
function openNotificationData`;
fs.writeFileSync(file,src.replace(pattern,replacement));
console.log('DraBornPark v0.5.4 support notification type fix applied.');
