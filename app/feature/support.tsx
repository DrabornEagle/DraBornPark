import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { createSupportRequestV060 } from '@/src/lib/v060';
import { supabase } from '@/src/lib/supabase';
import { palette, radius, type } from '@/src/theme';

type DkdSupportRow={id:string;subject:string;body:string;status:string;created_at:string;updated_at:string};

const dkdStatusMeta:Record<string,{label:string;color:string;icon:any}>={
  open:{label:'AÇIK',color:palette.orange,icon:'email-alert-outline'},
  in_progress:{label:'İŞLEMDE',color:palette.cyan,icon:'progress-clock'},
  resolved:{label:'ÇÖZÜLDÜ',color:palette.green,icon:'check-decagram-outline'},
};

export default function DkdSupportCenter(){
  const [dkdSubject,setDkdSubject]=useState('');
  const [dkdBody,setDkdBody]=useState('');
  const [dkdRows,setDkdRows]=useState<DkdSupportRow[]>([]);
  const [dkdBusy,setDkdBusy]=useState(false);
  const [dkdLoading,setDkdLoading]=useState(true);
  const [dkdRefreshing,setDkdRefreshing]=useState(false);

  const dkdLoad=useCallback(async()=>{
    try{
      const {data:dkdUserData,error:dkdUserError}=await supabase.auth.getUser();
      if(dkdUserError)throw dkdUserError;
      if(!dkdUserData.user){router.replace('/auth');return;}
      const {data:dkdData,error:dkdError}=await supabase.from('drabornpark_support_requests').select('id,subject,body,status,created_at,updated_at').eq('owner_user_id',dkdUserData.user.id).order('created_at',{ascending:false}).limit(20);
      if(dkdError)throw dkdError;
      setDkdRows((dkdData??[]) as DkdSupportRow[]);
    }catch(dkdError:any){
      Alert.alert('Destek kayıtları alınamadı',dkdError?.message||'Lütfen tekrar dene.');
    }finally{
      setDkdLoading(false);setDkdRefreshing(false);
    }
  },[]);

  useEffect(()=>{void dkdLoad()},[dkdLoad]);

  async function dkdSend(){
    const dkdCleanSubject=dkdSubject.trim();const dkdCleanBody=dkdBody.trim();
    if(dkdCleanSubject.length<3||dkdCleanBody.length<8){Alert.alert('Biraz daha ayrıntı gerekli','Konu en az 3, açıklama en az 8 karakter olmalı.');return;}
    setDkdBusy(true);
    try{
      await createSupportRequestV060(dkdCleanSubject,dkdCleanBody);
      setDkdSubject('');setDkdBody('');
      await dkdLoad();
      Alert.alert('Destek kaydın oluşturuldu','Talebin hesabına kaydedildi. DraBornPark yöneticisine yeni destek kaydı bildirimi gönderildi.');
    }catch(dkdError:any){Alert.alert('Destek kaydı oluşturulamadı',dkdError?.message||'Lütfen tekrar dene.');}
    finally{setDkdBusy(false)}
  }

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.blue} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={dkdRefreshing} onRefresh={()=>{setDkdRefreshing(true);void dkdLoad()}} tintColor={palette.blue}/>}>
    <ScreenHeader title="Nasıl Yardımcı Olabiliriz?" eyebrow="DESTEK MERKEZİ" accent={palette.blue} subtitle="Etiket, park, bildirim, abonelik veya hesap sorununu güvenli destek kaydıyla ilet."/>
    <View style={s.hero}><View style={s.heroIcon}><MaterialCommunityIcons name="lifebuoy" size={38} color={palette.blue}/></View><View style={{flex:1}}><Text style={s.heroKicker}>DRABORNPARK DESTEK</Text><Text style={s.heroTitle}>Sorununu doğru yere ulaştır.</Text><Text style={s.heroBody}>Kayıtların hesabına bağlı tutulur. Yeni talep yönetici destek ekranına düşer ve bildirim üzerinden ayrıntısı açılabilir.</Text></View></View>

    <SectionHeading title="Yeni destek kaydı" subtitle="Sorunu kısa ama anlaşılır şekilde anlat" color={palette.cyan}/>
    <View style={s.form}><Text style={s.label}>KONU</Text><TextInput value={dkdSubject} onChangeText={setDkdSubject} maxLength={120} placeholder="Örn. Etiket aktivasyonu" placeholderTextColor={palette.muted2} style={s.input}/><Text style={s.label}>AÇIKLAMA</Text><TextInput value={dkdBody} onChangeText={setDkdBody} maxLength={2000} multiline placeholder="Sorunu, gördüğün hatayı ve denediğin adımları anlat…" placeholderTextColor={palette.muted2} style={[s.input,s.area]}/><Pressable disabled={dkdBusy} onPress={dkdSend} style={[s.send,dkdBusy&&{opacity:.6}]}>{dkdBusy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="send-check-outline" size={24} color={palette.ink}/><Text style={s.sendText}>DESTEK KAYDI OLUŞTUR</Text><MaterialCommunityIcons name="arrow-right" size={21} color={palette.ink}/></>}</Pressable></View>

    <View style={s.secure}><MaterialCommunityIcons name="shield-lock-outline" size={24} color={palette.green}/><Text style={s.secureText}>Destek içeriği QR/NFC ziyaretçilerine açık değildir. Gerçek acil durumlarda DraBornPark desteğini beklemek yerine resmi acil hizmetleri kullan.</Text></View>

    <SectionHeading title="Destek kayıtlarım" subtitle="Son taleplerinin güncel durumu" badge={dkdRows.length?`${dkdRows.length} KAYIT`:undefined} color={palette.purple}/>
    {dkdLoading?<View style={s.loading}><ActivityIndicator color={palette.purple}/><Text style={s.loadingText}>Destek geçmişin yükleniyor…</Text></View>:dkdRows.length?<View style={s.list}>{dkdRows.map(dkdRow=><DkdTicket key={dkdRow.id} row={dkdRow}/>)}</View>:<View style={s.empty}><MaterialCommunityIcons name="message-text-clock-outline" size={38} color={palette.muted}/><Text style={s.emptyTitle}>Henüz destek kaydın yok</Text><Text style={s.emptyBody}>İlk talebini oluşturduğunda durumunu burada takip edebilirsin.</Text></View>}
  </ScrollView></SafeAreaView>;
}

function DkdTicket({row}:{row:DkdSupportRow}){
  const dkdMeta=dkdStatusMeta[row.status]??dkdStatusMeta.open;
  return <View style={[s.ticket,{borderColor:`${dkdMeta.color}48`}]}><View style={[s.ticketIcon,{backgroundColor:`${dkdMeta.color}18`}]}><MaterialCommunityIcons name={dkdMeta.icon} size={25} color={dkdMeta.color}/></View><View style={{flex:1,minWidth:0}}><View style={s.ticketTop}><Text numberOfLines={1} style={s.ticketTitle}>{row.subject}</Text><View style={[s.status,{borderColor:`${dkdMeta.color}55`,backgroundColor:`${dkdMeta.color}12`}]}><Text style={[s.statusText,{color:dkdMeta.color}]}>{dkdMeta.label}</Text></View></View><Text numberOfLines={2} style={s.ticketBody}>{row.body}</Text><Text style={s.ticketDate}>{new Date(row.created_at).toLocaleString('tr-TR')}</Text></View></View>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:70},hero:{minHeight:168,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.blue}55`,backgroundColor:`${palette.blue}0E`,padding:19,flexDirection:'row',alignItems:'center',gap:15},heroIcon:{width:72,height:72,borderRadius:24,backgroundColor:`${palette.blue}20`,alignItems:'center',justifyContent:'center'},heroKicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},heroTitle:{color:palette.text,fontSize:24,fontWeight:'900',lineHeight:29,marginTop:4},heroBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:6},form:{borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.cyan}42`,backgroundColor:palette.panel,padding:17},label:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:.8,marginTop:8,marginBottom:7},input:{minHeight:56,borderRadius:17,borderWidth:1,borderColor:palette.line,backgroundColor:palette.bg2,color:palette.text,paddingHorizontal:14,fontSize:type.body},area:{height:150,textAlignVertical:'top',paddingTop:14},send:{minHeight:64,borderRadius:20,backgroundColor:palette.aqua,marginTop:17,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},sendText:{flex:1,color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900',textAlign:'center'},secure:{marginTop:13,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}3A`,backgroundColor:`${palette.green}0B`,padding:15,flexDirection:'row',gap:11},secureText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19},loading:{minHeight:120,borderRadius:radius.md,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,alignItems:'center',justifyContent:'center',gap:10},loadingText:{color:palette.muted,fontSize:type.caption},list:{gap:10},ticket:{minHeight:112,borderRadius:radius.md,borderWidth:1,backgroundColor:palette.glass,padding:14,flexDirection:'row',alignItems:'flex-start',gap:12},ticketIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center'},ticketTop:{flexDirection:'row',alignItems:'center',gap:8},ticketTitle:{flex:1,color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},status:{borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:5},statusText:{fontSize:9,fontWeight:'900'},ticketBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:5},ticketDate:{color:palette.muted2,fontSize:type.micro,marginTop:7},empty:{minHeight:150,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:24,alignItems:'center',justifyContent:'center'},emptyTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:10},emptyBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,textAlign:'center',marginTop:5}
});
