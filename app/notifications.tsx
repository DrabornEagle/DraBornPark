import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { EvidencePhoto } from '@/src/components/EvidencePhoto';
import { loadCallRequests, respondCallRequest, type CallRequestState } from '@/src/lib/callRequests';
import { loadContactThreads, subscribeInboxChanges, type ContactMessage, type ContactSession } from '@/src/lib/contactThreads';
import { loadLiveDashboard, markReportSeen, quickReply } from '@/src/lib/drabornpark';
import { deleteReport } from '@/src/lib/reportActions';
import { palette, radius, type } from '@/src/theme';

const QUICK_REPLIES=['Geliyorum','2 dakika','5 dakika','10 dakika','Şu anda hareket ettiremiyorum','Güvenliğe bilgi verebilirsiniz','Teşekkür ederim'];
const CATEGORY_NAMES:Record<string,string>={call_request:'Acil Arama Talebi',blocked_exit:'Çıkış engelleniyor',blocking_exit:'Çıkış engelleniyor',move_vehicle:'Aracı hareket ettir',lights_on:'Farlar açık',window_open:'Cam açık',door_open:'Kapı açık',trunk_open:'Bagaj açık',damage:'Hasar',suspicious:'Şüpheli durum',towing:'Araç çekiliyor',animal:'Araçta hayvan',child:'Araçta çocuk',fire:'Yangın şüphesi',forgotten_item:'Eşya / anahtar unutuldu',witness:'Tanık bildirimi',emergency:'Acil durum',other:'Araç bildirimi'};
const STATUS_NAMES:Record<string,string>={new:'YENİ',seen:'OKUNDU',replied:'CEVAPLANDI',responded:'CEVAPLANDI',closed:'KAPALI',blocked:'ENGELLENDİ'};

export default function NotificationsScreen(){
  const [reports,setReports]=useState<any[]>([]);
  const [messagesByReport,setMessagesByReport]=useState<Record<string,ContactMessage[]>>({});
  const [sessionsByReport,setSessionsByReport]=useState<Record<string,ContactSession>>({});
  const [callsByReport,setCallsByReport]=useState<Record<string,CallRequestState>>({});
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [visibleCount,setVisibleCount]=useState(5);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [sending,setSending]=useState<string|null>(null);
  const [deleting,setDeleting]=useState<string|null>(null);
  const [deciding,setDeciding]=useState<string|null>(null);

  const load=useCallback(async(silent=false)=>{
    try{
      const dashboard=await loadLiveDashboard();
      const reportList=dashboard.reports??[];
      const ids=reportList.map((item:any)=>String(item.id));
      const [threads,calls]=await Promise.all([loadContactThreads(ids),loadCallRequests(ids)]);
      setReports(reportList);
      setMessagesByReport(threads.messagesByReport);
      setSessionsByReport(threads.sessionsByReport);
      setCallsByReport(calls);
    }catch{
      if(!silent)router.replace('/auth');
    }finally{if(!silent)setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|null=null;
    const subscription=subscribeInboxChanges(()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>{void load(true);},180);
    });
    return()=>{if(timer)clearTimeout(timer);subscription.remove();};
  },[load]);

  async function refresh(){setRefreshing(true);await load(true);setRefreshing(false);}
  async function seen(id:string){try{await markReportSeen(id);setReports(items=>items.map(item=>item.id===id?{...item,seen_at:new Date().toISOString(),status:item.status==='new'?'seen':item.status}:item));}catch(e:any){Alert.alert('İşlem başarısız',e?.message||'Bildirim güncellenemedi.');}}
  async function sendReply(report:any,text:string){
    const clean=text.trim();if(!clean||sending===report.id)return;
    const session=sessionsByReport[report.id];
    if(session&&(session.status!=='open'||new Date(session.expires_at).getTime()<=Date.now())){Alert.alert('Oturum kapandı','Geçici iletişim süresi sona erdi.');return;}
    setSending(report.id);
    try{await quickReply(report.id,clean);setDrafts(current=>({...current,[report.id]:''}));void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);await load(true);}catch(e:any){const msg=String(e?.message||'');Alert.alert(msg.includes('session_closed')?'Oturum kapandı':'Cevap gönderilemedi',msg.includes('session_closed')?'Geçici iletişim süresi dolmuş veya oturum kapanmış.':msg||'Mesaj gönderilemedi.');}finally{setSending(null);}
  }
  async function decideCall(reportId:string,decision:'approved'|'rejected'){
    if(deciding)return;
    const run=async()=>{
      setDeciding(reportId);
      try{
        const result=await respondCallRequest(reportId,decision);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await load(true);
        Alert.alert(decision==='approved'?'Numara paylaşımı onaylandı':'Arama talebi reddedildi',decision==='approved'?'Telefon numaran yalnızca bu geçici talep süresi boyunca web ziyaretçisine gösterilecek.':'Telefon numaran paylaşılmadı.');
        return result;
      }catch(e:any){
        const msg=String(e?.message||'');
        if(msg.includes('phone_missing'))Alert.alert('Telefon numarası gerekli','Numaranı paylaşabilmek için Hesabım sayfasındaki Telefon Numaram alanını kaydet.');
        else Alert.alert('Talep güncellenemedi',msg||'Lütfen tekrar dene.');
      }finally{setDeciding(null);}
    };
    if(decision==='approved')Alert.alert('Numaramı paylaş','Bu talep için telefon numaranı 30 dakikalık güvenli oturum boyunca ziyaretçiye göstermek istiyor musun?',[{text:'Vazgeç',style:'cancel'},{text:'ONAYLA & NUMARAMI PAYLAŞ',onPress:()=>{void run();}}]);
    else Alert.alert('Arama talebini reddet','Telefon numaran paylaşılmayacak.',[{text:'Vazgeç',style:'cancel'},{text:'Reddet',style:'destructive',onPress:()=>{void run();}}]);
  }
  function confirmDelete(report:any){if(deleting)return;Alert.alert('Bildirimi sil','Bu bildirim ve ona bağlı anonim mesaj geçmişi kalıcı olarak silinecek.',[{text:'Vazgeç',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>{void removeReport(String(report.id));}}]);}
  async function removeReport(id:string){setDeleting(id);try{const removed=await deleteReport(id);if(!removed)throw new Error('Bildirim bulunamadı veya zaten silinmiş.');setReports(items=>items.filter(item=>String(item.id)!==id));setMessagesByReport(current=>{const next={...current};delete next[id];return next;});setSessionsByReport(current=>{const next={...current};delete next[id];return next;});setCallsByReport(current=>{const next={...current};delete next[id];return next;});setDrafts(current=>{const next={...current};delete next[id];return next;});void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);}catch(e:any){Alert.alert('Bildirim silinemedi',e?.message||'Lütfen tekrar deneyin.');}finally{setDeleting(null);}}

  if(loading)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange}/><View style={s.loading}><ActivityIndicator color={palette.orange}/><Text style={s.loadingText}>Bildirim Merkezi açılıyor…</Text></View></SafeAreaView>;
  const unread=reports.filter(item=>!item.seen_at).length;const urgent=reports.filter(item=>item.priority==='emergency').length;const answered=reports.filter(item=>['replied','responded'].includes(String(item.status))).length;const visibleReports=reports.slice(0,visibleCount);
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange} secondary={palette.pink}/><ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.orange}/>} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Bildirim Merkezi" eyebrow="ANONİM ARAÇ İLETİŞİMİ" accent={palette.orange} subtitle="QR/NFC üzerinden gelen olayları, fotoğraflı arama taleplerini ve anonim mesajları tek yerden yönet."/>
    <View style={s.stats}><Stat icon="bell-badge-outline" value={unread} label="Yeni" color={palette.orange}/><Stat icon="shield-alert-outline" value={urgent} label="Acil" color={palette.red}/><Stat icon="message-check-outline" value={answered} label="Cevaplandı" color={palette.green}/></View>
    <SectionHeading title="Gelen kutusu" subtitle="İlk 5 kayıt gösterilir" badge={`${reports.length} KAYIT`} color={palette.orange}/>
    {reports.length===0?<View style={s.empty}><MaterialCommunityIcons name="bell-check-outline" size={38} color={palette.green}/><Text style={s.emptyTitle}>Her şey sakin</Text><Text style={s.emptyBody}>Etiketin tarandığında bildirimler burada görünecek.</Text></View>:visibleReports.map(report=><ReportCard key={report.id} report={report} messages={messagesByReport[report.id]??[]} session={sessionsByReport[report.id]} callRequest={callsByReport[report.id]} sending={sending===report.id} deleting={deleting===report.id} deciding={deciding===report.id} draft={drafts[report.id]??''} setDraft={value=>setDrafts(current=>({...current,[report.id]:value}))} onSeen={()=>seen(report.id)} onReply={text=>sendReply(report,text)} onDelete={()=>confirmDelete(report)} onCallDecision={decision=>decideCall(String(report.id),decision)}/>)}
    {visibleCount<reports.length?<Pressable style={s.more} onPress={()=>setVisibleCount(count=>Math.min(count+5,reports.length))}><MaterialCommunityIcons name="chevron-down-circle-outline" size={22} color={palette.cyan}/><Text style={s.moreText}>Daha Fazla</Text><Text style={s.moreCount}>+{Math.min(5,reports.length-visibleCount)}</Text></Pressable>:null}
    <View style={s.privacy}><MaterialCommunityIcons name="shield-lock-outline" size={23} color={palette.green}/><Text style={s.privacyText}>Telefon numarası yalnızca fotoğraflı arama talebini açıkça onayladığında ve sadece geçici talep süresince paylaşılır.</Text></View>
    <BottomDock active="inbox"/>
  </ScrollView></SafeAreaView>;
}

function ReportCard({report,messages,session,callRequest,sending,deleting,deciding,draft,setDraft,onSeen,onReply,onDelete,onCallDecision}:{report:any;messages:ContactMessage[];session?:ContactSession;callRequest?:CallRequestState;sending:boolean;deleting:boolean;deciding:boolean;draft:string;setDraft:(value:string)=>void;onSeen:()=>void;onReply:(text:string)=>void;onDelete:()=>void;onCallDecision:(decision:'approved'|'rejected')=>void}){
  const isCall=report.category==='call_request';
  const color=isCall?palette.red:report.priority==='emergency'?palette.red:report.priority==='high'?palette.orange:palette.cyan;
  const thread=useMemo(()=>messages.filter((message,index)=>!(index===0&&message.sender_role==='visitor'&&message.body_safe===report.message_safe&&!message.attachment_path)),[messages,report.message_safe]);
  const open=!session||(session.status==='open'&&new Date(session.expires_at).getTime()>Date.now());
  return <View style={[s.card,isCall&&s.callCard,{borderColor:!report.seen_at?`${color}70`:palette.line}]}>
    <View style={s.cardHead}><View style={[s.icon,{backgroundColor:`${color}20`}]}><MaterialCommunityIcons name={isCall?'phone-alert-outline':report.priority==='emergency'?'alert-octagon-outline':'bell-ring-outline'} size={27} color={color}/></View><View style={{flex:1}}><Text style={s.category}>{CATEGORY_NAMES[report.category]||'Araç bildirimi'}</Text><Text style={s.time}>{new Date(report.created_at).toLocaleString('tr-TR')}</Text></View><View style={s.cardActions}><View style={[s.status,{borderColor:`${color}50`,backgroundColor:`${color}10`}]}><Text style={[s.statusText,{color}]}>{isCall?callStatusLabel(callRequest?.status):STATUS_NAMES[String(report.status||'new')]||'BİLDİRİM'}</Text></View><Pressable disabled={deleting} onPress={onDelete} style={s.deleteButton}>{deleting?<ActivityIndicator size="small" color={palette.red}/>:<><MaterialCommunityIcons name="trash-can-outline" size={16} color={palette.red}/><Text style={s.deleteText}>Sil</Text></>}</Pressable></View></View>
    <Text style={s.body}>{report.message_safe||'Aracınız için yeni bir bildirim gönderildi.'}</Text>
    {!report.seen_at?<Pressable onPress={onSeen} style={s.seen}><MaterialCommunityIcons name="check-all" size={19} color={palette.cyan}/><Text style={s.seenText}>Okundu işaretle</Text></Pressable>:null}
    {thread.length?<View style={s.thread}>{thread.slice(-8).map(message=><View key={message.id} style={[s.bubble,message.sender_role==='owner'?s.ownerBubble:s.visitorBubble]}><Text style={s.bubbleRole}>{message.sender_role==='owner'?'SEN':'ZİYARETÇİ'}</Text><Text style={s.bubbleText}>{message.body_safe}</Text>{message.attachment_kind==='evidence_photo'&&message.attachment_path?<EvidencePhoto path={message.attachment_path} capturedAt={message.attachment_captured_at}/>:null}<Text style={s.bubbleTime}>{new Date(message.created_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</Text></View>)}</View>:null}
    {isCall?<CallDecision callRequest={callRequest} loading={deciding} onDecision={onCallDecision}/>:null}
    <Text style={s.replyLabel}>{open?'MESAJLAŞMA':'OTURUM KAPALI'}</Text>
    {open?<><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.replyRail}>{QUICK_REPLIES.map(text=><Pressable disabled={sending||deleting} key={text} onPress={()=>onReply(text)} style={s.reply}>{sending?<ActivityIndicator size="small" color={palette.green}/>:<Text style={s.replyText}>{text}</Text>}</Pressable>)}</ScrollView><View style={s.compose}><TextInput value={draft} onChangeText={setDraft} editable={!sending&&!deleting} maxLength={700} placeholder="Kısa bir mesaj yaz…" placeholderTextColor={palette.muted2} style={s.input}/><Pressable disabled={sending||deleting||!draft.trim()} onPress={()=>onReply(draft)} style={[s.sendButton,(!draft.trim()||sending||deleting)&&s.sendButtonDisabled]}>{sending?<ActivityIndicator size="small" color={palette.bg}/>:<MaterialCommunityIcons name="send" size={20} color={palette.bg}/>}</Pressable></View></>:null}
  </View>;
}

function CallDecision({callRequest,loading,onDecision}:{callRequest?:CallRequestState;loading:boolean;onDecision:(d:'approved'|'rejected')=>void}){
  const status=callRequest?.status??'pending';
  if(status==='approved')return <View style={[s.callState,{borderColor:`${palette.green}55`,backgroundColor:`${palette.green}0D`}]}><MaterialCommunityIcons name="phone-check-outline" size={23} color={palette.green}/><View style={{flex:1}}><Text style={s.callStateTitle}>Numara paylaşımı onaylandı</Text><Text style={s.callStateBody}>Telefon numaran yalnızca bu geçici talep süresince gösteriliyor.</Text></View></View>;
  if(status==='rejected')return <View style={[s.callState,{borderColor:`${palette.red}45`,backgroundColor:`${palette.red}0B`}]}><MaterialCommunityIcons name="phone-cancel-outline" size={23} color={palette.red}/><View style={{flex:1}}><Text style={s.callStateTitle}>Talep reddedildi</Text><Text style={s.callStateBody}>Telefon numaran paylaşılmadı.</Text></View></View>;
  if(status==='expired')return <View style={s.callState}><MaterialCommunityIcons name="timer-off-outline" size={23} color={palette.muted}/><Text style={s.callStateBody}>Arama talebinin süresi doldu.</Text></View>;
  return <View style={s.callBox}><View style={s.callInfo}><MaterialCommunityIcons name="shield-lock-outline" size={22} color={palette.orange}/><Text style={s.callInfoText}>Ziyaretçi zorunlu anlık fotoğrafla numaranı talep ediyor. Onay vermeden numaran görünmez.</Text></View><Pressable disabled={loading} onPress={()=>onDecision('approved')} style={s.approve}>{loading?<ActivityIndicator color={palette.bg}/>:<><MaterialCommunityIcons name="phone-check-outline" size={22} color={palette.bg}/><Text style={s.approveText}>ONAYLA • NUMARAMI PAYLAŞ</Text></>}</Pressable><Pressable disabled={loading} onPress={()=>onDecision('rejected')} style={s.reject}><MaterialCommunityIcons name="phone-cancel-outline" size={20} color={palette.red}/><Text style={s.rejectText}>Talebi Reddet</Text></Pressable></View>;
}
function callStatusLabel(status?:string){return status==='approved'?'ONAYLANDI':status==='rejected'?'REDDEDİLDİ':status==='expired'?'SÜRESİ DOLDU':'ARAMA TALEBİ';}
function Stat({icon,value,label,color}:{icon:any;value:number;label:string;color:string}){return <View style={[s.stat,{borderColor:`${color}45`,backgroundColor:`${color}0E`}]}><MaterialCommunityIcons name={icon} size={24} color={color}/><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:22},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:13},loadingText:{color:palette.muted,fontSize:type.body},stats:{flexDirection:'row',gap:9},stat:{flex:1,minHeight:126,borderRadius:radius.md,borderWidth:1,padding:14},statValue:{color:palette.text,fontSize:27,fontWeight:'900',marginTop:13},statLabel:{color:palette.muted,fontSize:type.caption,fontWeight:'800',marginTop:3},
  card:{marginTop:11,borderRadius:radius.lg,borderWidth:1,backgroundColor:palette.panel,padding:17},callCard:{backgroundColor:`${palette.red}08`},cardHead:{flexDirection:'row',alignItems:'flex-start',gap:12},icon:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center'},category:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},time:{color:palette.muted,fontSize:type.caption,marginTop:3},cardActions:{alignItems:'flex-end',gap:7},status:{borderWidth:1,borderRadius:999,paddingHorizontal:10,paddingVertical:7},statusText:{fontSize:type.micro,fontWeight:'900'},deleteButton:{minWidth:58,height:34,borderRadius:12,borderWidth:1,borderColor:`${palette.red}3D`,backgroundColor:`${palette.red}0D`,paddingHorizontal:9,flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center'},deleteText:{color:palette.red,fontSize:type.micro,fontWeight:'900'},body:{color:palette.text,fontSize:type.body,lineHeight:22,marginTop:15},seen:{marginTop:13,flexDirection:'row',gap:7,alignItems:'center'},seenText:{color:palette.cyan,fontSize:type.caption,fontWeight:'900'},
  thread:{marginTop:16,borderTopWidth:1,borderTopColor:palette.line,paddingTop:13,gap:8},bubble:{borderRadius:16,padding:11,borderWidth:1},ownerBubble:{alignSelf:'flex-end',backgroundColor:`${palette.cyan}12`,borderColor:`${palette.cyan}35`,maxWidth:'88%'},visitorBubble:{alignSelf:'stretch',backgroundColor:`${palette.purple}10`,borderColor:`${palette.purple}30`},bubbleRole:{color:palette.muted2,fontSize:type.micro,fontWeight:'900'},bubbleText:{color:palette.text,fontSize:type.caption,lineHeight:20,marginTop:4},bubbleTime:{color:palette.muted2,fontSize:type.micro,marginTop:5},
  callBox:{marginTop:15,borderTopWidth:1,borderTopColor:`${palette.red}35`,paddingTop:14,gap:9},callInfo:{flexDirection:'row',gap:9,alignItems:'flex-start',padding:11,borderRadius:14,backgroundColor:`${palette.orange}0D`,borderWidth:1,borderColor:`${palette.orange}35`},callInfoText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19},approve:{minHeight:58,borderRadius:18,backgroundColor:palette.green,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingHorizontal:12},approveText:{color:palette.bg,fontSize:type.caption,fontWeight:'900'},reject:{minHeight:48,borderRadius:16,borderWidth:1,borderColor:`${palette.red}45`,backgroundColor:`${palette.red}0A`,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},rejectText:{color:palette.red,fontSize:type.caption,fontWeight:'900'},callState:{marginTop:14,borderRadius:16,borderWidth:1,borderColor:palette.line,padding:12,flexDirection:'row',alignItems:'center',gap:10},callStateTitle:{color:palette.text,fontSize:type.caption,fontWeight:'900'},callStateBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:2},
  replyLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900',marginTop:15},replyRail:{gap:8,paddingTop:9,paddingRight:14},reply:{minHeight:42,borderRadius:14,borderWidth:1,borderColor:`${palette.green}35`,backgroundColor:`${palette.green}0A`,paddingHorizontal:14,alignItems:'center',justifyContent:'center'},replyText:{color:palette.green,fontSize:type.caption,fontWeight:'900'},compose:{marginTop:10,flexDirection:'row',gap:8},input:{flex:1,minHeight:48,borderRadius:15,borderWidth:1,borderColor:palette.line,backgroundColor:palette.bg2,color:palette.text,paddingHorizontal:13},sendButton:{width:50,height:48,borderRadius:15,backgroundColor:palette.cyan,alignItems:'center',justifyContent:'center'},sendButtonDisabled:{opacity:.35},
  more:{marginTop:14,minHeight:54,borderRadius:18,borderWidth:1,borderColor:`${palette.cyan}38`,backgroundColor:`${palette.cyan}0A`,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},moreText:{color:palette.cyan,fontWeight:'900'},moreCount:{color:palette.muted,fontSize:type.caption},privacy:{marginTop:18,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}32`,backgroundColor:`${palette.green}08`,padding:14,flexDirection:'row',gap:10,alignItems:'flex-start'},privacyText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:20},empty:{marginTop:12,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,padding:24,alignItems:'center'},emptyTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:10},emptyBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,textAlign:'center',marginTop:5}
});
