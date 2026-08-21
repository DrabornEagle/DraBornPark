import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { EvidencePhoto } from '@/src/components/EvidencePhoto';
import { loadContactThreads, subscribeInboxChanges, type ContactMessage, type ContactSession } from '@/src/lib/contactThreads';
import { loadLiveDashboard, markReportSeen, quickReply } from '@/src/lib/drabornpark';
import { deleteReport } from '@/src/lib/reportActions';
import { palette, radius, type } from '@/src/theme';

const QUICK_REPLIES=['Geliyorum','2 dakika','5 dakika','10 dakika','Şu anda hareket ettiremiyorum','Güvenliğe bilgi verebilirsiniz','Teşekkür ederim'];
const CATEGORY_NAMES:Record<string,string>={blocked_exit:'Çıkış engelleniyor',blocking_exit:'Çıkış engelleniyor',move_vehicle:'Aracı hareket ettir',lights_on:'Farlar açık',window_open:'Cam açık',door_open:'Kapı açık',trunk_open:'Bagaj açık',damage:'Hasar',suspicious:'Şüpheli durum',towing:'Araç çekiliyor',animal:'Araçta hayvan',child:'Araçta çocuk',fire:'Yangın şüphesi',forgotten_item:'Eşya / anahtar unutuldu',witness:'Tanık bildirimi',emergency:'Acil durum',other:'Araç bildirimi'};
const STATUS_NAMES:Record<string,string>={new:'YENİ',seen:'OKUNDU',replied:'CEVAPLANDI',responded:'CEVAPLANDI',closed:'KAPALI',blocked:'ENGELLENDİ'};

export default function NotificationsScreen(){
  const [reports,setReports]=useState<any[]>([]);
  const [messagesByReport,setMessagesByReport]=useState<Record<string,ContactMessage[]>>({});
  const [sessionsByReport,setSessionsByReport]=useState<Record<string,ContactSession>>({});
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [visibleCount,setVisibleCount]=useState(5);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [sending,setSending]=useState<string|null>(null);
  const [deleting,setDeleting]=useState<string|null>(null);

  const load=useCallback(async(silent=false)=>{
    try{
      const dashboard=await loadLiveDashboard();
      const reportList=dashboard.reports??[];
      const threads=await loadContactThreads(reportList.map((item:any)=>String(item.id)));
      setReports(reportList);
      setMessagesByReport(threads.messagesByReport);
      setSessionsByReport(threads.sessionsByReport);
    }catch{
      if(!silent)router.replace('/auth');
    }finally{
      if(!silent)setLoading(false);
    }
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
  async function seen(id:string){
    try{
      await markReportSeen(id);
      setReports(items=>items.map(item=>item.id===id?{...item,seen_at:new Date().toISOString(),status:item.status==='new'?'seen':item.status}:item));
    }catch(e:any){Alert.alert('İşlem başarısız',e?.message||'Bildirim güncellenemedi.');}
  }
  async function sendReply(report:any,text:string){
    const clean=text.trim();
    if(!clean||sending===report.id)return;
    const session=sessionsByReport[report.id];
    if(session&&(session.status!=='open'||new Date(session.expires_at).getTime()<=Date.now())){
      Alert.alert('Oturum kapandı','Geçici iletişim süresi sona erdi.');
      return;
    }
    setSending(report.id);
    try{
      await quickReply(report.id,clean);
      setDrafts(current=>({...current,[report.id]:''}));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load(true);
    }catch(e:any){
      const msg=String(e?.message||'');
      Alert.alert(msg.includes('session_closed')?'Oturum kapandı':'Cevap gönderilemedi',msg.includes('session_closed')?'Geçici iletişim süresi dolmuş veya oturum kapanmış.':msg||'Mesaj gönderilemedi.');
    }finally{setSending(null);}
  }
  function confirmDelete(report:any){
    if(deleting)return;
    Alert.alert('Bildirimi sil','Bu bildirim ve ona bağlı anonim mesaj geçmişi kalıcı olarak silinecek.',[
      {text:'Vazgeç',style:'cancel'},
      {text:'Sil',style:'destructive',onPress:()=>{void removeReport(String(report.id));}},
    ]);
  }
  async function removeReport(id:string){
    setDeleting(id);
    try{
      const removed=await deleteReport(id);
      if(!removed)throw new Error('Bildirim bulunamadı veya zaten silinmiş.');
      setReports(items=>items.filter(item=>String(item.id)!==id));
      setMessagesByReport(current=>{const next={...current};delete next[id];return next;});
      setSessionsByReport(current=>{const next={...current};delete next[id];return next;});
      setDrafts(current=>{const next={...current};delete next[id];return next;});
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }catch(e:any){Alert.alert('Bildirim silinemedi',e?.message||'Lütfen tekrar deneyin.');}
    finally{setDeleting(null);}
  }

  if(loading)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange}/><View style={s.loading}><ActivityIndicator color={palette.orange}/><Text style={s.loadingText}>Bildirim Merkezi açılıyor…</Text></View></SafeAreaView>;

  const unread=reports.filter(item=>!item.seen_at).length;
  const urgent=reports.filter(item=>item.priority==='emergency').length;
  const answered=reports.filter(item=>['replied','responded'].includes(String(item.status))).length;
  const visibleReports=reports.slice(0,visibleCount);

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange} secondary={palette.pink}/><ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.orange}/>} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Bildirim Merkezi" eyebrow="ANONİM ARAÇ İLETİŞİMİ" accent={palette.orange} subtitle="QR/NFC üzerinden gelen olayları, kanıt fotoğraflarını ve anonim mesajları tek yerden yanıtla."/>
    <View style={s.stats}><Stat icon="bell-badge-outline" value={unread} label="Yeni" color={palette.orange}/><Stat icon="shield-alert-outline" value={urgent} label="Acil" color={palette.red}/><Stat icon="message-check-outline" value={answered} label="Cevaplandı" color={palette.green}/></View>
    <SectionHeading title="Gelen kutusu" subtitle="İlk 5 kayıt gösterilir" badge={`${reports.length} KAYIT`} color={palette.orange}/>
    {reports.length===0?<View style={s.empty}><View style={s.emptyIcon}><MaterialCommunityIcons name="bell-check-outline" size={38} color={palette.green}/></View><Text style={s.emptyTitle}>Her şey sakin</Text><Text style={s.emptyBody}>DraBornPark etiketin tarandığında güvenli araç bildirimleri burada görünecek.</Text></View>:visibleReports.map(report=><ReportCard key={report.id} report={report} messages={messagesByReport[report.id]??[]} session={sessionsByReport[report.id]} sending={sending===report.id} deleting={deleting===report.id} draft={drafts[report.id]??''} setDraft={value=>setDrafts(current=>({...current,[report.id]:value}))} onSeen={()=>seen(report.id)} onReply={text=>sendReply(report,text)} onDelete={()=>confirmDelete(report)}/>)}
    {visibleCount<reports.length?<Pressable style={s.more} onPress={()=>setVisibleCount(count=>Math.min(count+5,reports.length))}><MaterialCommunityIcons name="chevron-down-circle-outline" size={22} color={palette.cyan}/><Text style={s.moreText}>Daha Fazla</Text><Text style={s.moreCount}>+{Math.min(5,reports.length-visibleCount)}</Text></Pressable>:null}
    <View style={s.privacy}><MaterialCommunityIcons name="shield-lock-outline" size={23} color={palette.green}/><Text style={s.privacyText}>Kanıt fotoğrafları özel alanda saklanır. Mesajlar geçici DraBornPark oturumuna gider; telefon ve e-posta iki tarafta da maskelenir.</Text></View>
    <BottomDock active="inbox"/>
  </ScrollView></SafeAreaView>;
}

function ReportCard({report,messages,session,sending,deleting,draft,setDraft,onSeen,onReply,onDelete}:{report:any;messages:ContactMessage[];session?:ContactSession;sending:boolean;deleting:boolean;draft:string;setDraft:(value:string)=>void;onSeen:()=>void;onReply:(text:string)=>void;onDelete:()=>void}){
  const color=report.priority==='emergency'?palette.red:report.priority==='high'?palette.orange:palette.cyan;
  const thread=useMemo(()=>messages.filter((message,index)=>!(index===0&&message.sender_role==='visitor'&&message.body_safe===report.message_safe&&!message.attachment_path)),[messages,report.message_safe]);
  const open=!session||(session.status==='open'&&new Date(session.expires_at).getTime()>Date.now());
  return <View style={[s.card,{borderColor:!report.seen_at?`${color}65`:palette.line}]}>
    <View style={s.cardHead}><View style={[s.icon,{backgroundColor:`${color}20`}]}><MaterialCommunityIcons name={report.priority==='emergency'?'alert-octagon-outline':'bell-ring-outline'} size={26} color={color}/></View><View style={{flex:1}}><Text style={s.category}>{CATEGORY_NAMES[report.category]||'Araç bildirimi'}</Text><Text style={s.time}>{new Date(report.created_at).toLocaleString('tr-TR')}</Text></View><View style={s.cardActions}><View style={[s.status,{borderColor:`${color}50`,backgroundColor:`${color}10`}]}><Text style={[s.statusText,{color}]}>{STATUS_NAMES[String(report.status||'new')]||'BİLDİRİM'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Bildirimi sil" disabled={deleting} onPress={onDelete} style={s.deleteButton}>{deleting?<ActivityIndicator size="small" color={palette.red}/>:<><MaterialCommunityIcons name="trash-can-outline" size={16} color={palette.red}/><Text style={s.deleteText}>Sil</Text></>}</Pressable></View></View>
    <Text style={s.body}>{report.message_safe||'Aracınız için yeni bir bildirim gönderildi.'}</Text>
    {!report.seen_at?<Pressable onPress={onSeen} style={s.seen}><MaterialCommunityIcons name="check-all" size={19} color={palette.cyan}/><Text style={s.seenText}>Okundu işaretle</Text></Pressable>:null}
    {thread.length?<View style={s.thread}><View style={s.threadHead}><MaterialCommunityIcons name="message-processing-outline" size={18} color={palette.purple}/><Text style={s.threadTitle}>Anonim mesajlaşma</Text><Text style={s.threadCount}>{thread.length} mesaj</Text></View>{thread.slice(-8).map(message=><View key={message.id} style={[s.bubble,message.sender_role==='owner'?s.ownerBubble:s.visitorBubble]}><Text style={s.bubbleRole}>{message.sender_role==='owner'?'SEN':'ZİYARETÇİ'}</Text><Text style={s.bubbleText}>{message.body_safe}</Text>{message.attachment_kind==='evidence_photo'&&message.attachment_path?<EvidencePhoto path={message.attachment_path} capturedAt={message.attachment_captured_at}/>:null}<Text style={s.bubbleTime}>{new Date(message.created_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</Text></View>)}</View>:null}
    <Text style={s.replyLabel}>{open?'HIZLI CEVAP':'OTURUM KAPALI'}</Text>
    {open?<><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.replyRail}>{QUICK_REPLIES.map(text=><Pressable disabled={sending||deleting} key={text} onPress={()=>onReply(text)} style={s.reply}>{sending?<ActivityIndicator size="small" color={palette.green}/>:<Text style={s.replyText}>{text}</Text>}</Pressable>)}</ScrollView><View style={s.compose}><TextInput value={draft} onChangeText={setDraft} editable={!sending&&!deleting} maxLength={700} placeholder="Kısa bir mesaj yaz…" placeholderTextColor={palette.muted2} style={s.input}/><Pressable disabled={sending||deleting||!draft.trim()} onPress={()=>onReply(draft)} style={[s.sendButton,(!draft.trim()||sending||deleting)&&s.sendButtonDisabled]}>{sending?<ActivityIndicator size="small" color={palette.bg}/>:<MaterialCommunityIcons name="send" size={20} color={palette.bg}/>}</Pressable></View></>:null}
  </View>;
}

function Stat({icon,value,label,color}:{icon:any;value:number;label:string;color:string}){return <View style={[s.stat,{borderColor:`${color}45`,backgroundColor:`${color}0E`}]}><MaterialCommunityIcons name={icon} size={24} color={color}/><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:22},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:13},loadingText:{color:palette.muted,fontSize:type.body},stats:{flexDirection:'row',gap:9},stat:{flex:1,minHeight:126,borderRadius:radius.md,borderWidth:1,padding:14},statValue:{color:palette.text,fontSize:27,fontWeight:'900',marginTop:13},statLabel:{color:palette.muted,fontSize:type.caption,fontWeight:'800',marginTop:3},card:{marginTop:11,borderRadius:radius.lg,borderWidth:1,backgroundColor:palette.panel,padding:17},cardHead:{flexDirection:'row',alignItems:'flex-start',gap:12},icon:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center'},category:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},time:{color:palette.muted,fontSize:type.caption,marginTop:3},cardActions:{alignItems:'flex-end',gap:7},status:{borderWidth:1,borderRadius:999,paddingHorizontal:10,paddingVertical:7},statusText:{fontSize:type.micro,fontWeight:'900'},deleteButton:{minWidth:58,height:34,borderRadius:12,borderWidth:1,borderColor:`${palette.red}3D`,backgroundColor:`${palette.red}0D`,paddingHorizontal:9,flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center'},deleteText:{color:palette.red,fontSize:type.micro,fontWeight:'900'},body:{color:palette.text,fontSize:type.body,lineHeight:22,marginTop:15},seen:{marginTop:13,flexDirection:'row',gap:7,alignItems:'center'},seenText:{color:palette.cyan,fontSize:type.caption,fontWeight:'900'},thread:{marginTop:16,borderTopWidth:1,borderTopColor:palette.line,paddingTop:13,gap:8},threadHead:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:2},threadTitle:{color:palette.text,fontSize:type.caption,fontWeight:'900',flex:1},threadCount:{color:palette.muted2,fontSize:type.micro,fontWeight:'800'},bubble:{maxWidth:'88%',borderRadius:16,borderWidth:1,paddingHorizontal:12,paddingVertical:10},ownerBubble:{alignSelf:'flex-end',borderColor:`${palette.cyan}45`,backgroundColor:`${palette.cyan}10`},visitorBubble:{alignSelf:'flex-start',borderColor:`${palette.purple}45`,backgroundColor:`${palette.purple}10`},bubbleRole:{color:palette.muted2,fontSize:type.micro,fontWeight:'900'},bubbleText:{color:palette.text,fontSize:type.caption,lineHeight:19,marginTop:3},bubbleTime:{color:palette.muted2,fontSize:type.micro,marginTop:5},replyLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900',letterSpacing:.8,marginTop:18,marginBottom:9},replyRail:{gap:8,paddingRight:12},reply:{minHeight:43,borderRadius:14,borderWidth:1,borderColor:`${palette.green}40`,backgroundColor:`${palette.green}0E`,paddingHorizontal:13,justifyContent:'center'},replyText:{color:palette.green,fontSize:type.caption,fontWeight:'900',maxWidth:220},compose:{flexDirection:'row',gap:9,alignItems:'center',marginTop:11},input:{flex:1,minHeight:48,borderRadius:15,borderWidth:1,borderColor:palette.line,backgroundColor:palette.bg2,color:palette.text,paddingHorizontal:14,fontSize:type.caption},sendButton:{width:48,height:48,borderRadius:15,backgroundColor:palette.green,alignItems:'center',justifyContent:'center'},sendButtonDisabled:{opacity:.35},more:{marginTop:15,minHeight:54,borderRadius:18,borderWidth:1,borderColor:`${palette.cyan}45`,backgroundColor:`${palette.cyan}0D`,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},moreText:{color:palette.cyan,fontWeight:'900',fontSize:type.body},moreCount:{color:palette.muted,fontSize:type.caption,fontWeight:'800'},empty:{borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:28,alignItems:'center'},emptyIcon:{width:70,height:70,borderRadius:24,backgroundColor:`${palette.green}18`,alignItems:'center',justifyContent:'center'},emptyTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginTop:13},emptyBody:{color:palette.muted,fontSize:type.body,lineHeight:21,textAlign:'center',marginTop:6},privacy:{marginTop:16,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}3D`,backgroundColor:`${palette.green}0D`,padding:15,flexDirection:'row',gap:11},privacyText:{color:palette.muted,fontSize:type.caption,lineHeight:19,flex:1}});
