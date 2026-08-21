import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { isCurrentUserAdmin, loadAdminSupportInbox } from '@/src/lib/v060';
import { palette, radius, type } from '@/src/theme';

const dkdStatus:Record<string,{label:string;color:string}>={open:{label:'AÇIK',color:palette.orange},in_progress:{label:'İŞLEMDE',color:palette.cyan},resolved:{label:'ÇÖZÜLDÜ',color:palette.green}};

export default function DkdAdminSupportInbox(){
  const [dkdRows,setDkdRows]=useState<any[]>([]);const [dkdLoading,setDkdLoading]=useState(true);const [dkdRefreshing,setDkdRefreshing]=useState(false);
  const dkdLoad=useCallback(async()=>{
    try{
      if(!await isCurrentUserAdmin()){Alert.alert('Yönetici erişimi gerekli','Bu ekran yalnızca DraBornPark yöneticisine açıktır.',[{text:'Tamam',onPress:()=>router.replace('/')}]);return;}
      setDkdRows(await loadAdminSupportInbox(100));
    }catch(dkdError:any){Alert.alert('Destek kayıtları açılamadı',dkdError?.message||'Lütfen tekrar dene.');}
    finally{setDkdLoading(false);setDkdRefreshing(false)}
  },[]);
  useEffect(()=>{void dkdLoad()},[dkdLoad]);
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.blue} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={dkdRefreshing} onRefresh={()=>{setDkdRefreshing(true);void dkdLoad()}} tintColor={palette.blue}/>}>
    <ScreenHeader title="Destek Yönetimi" eyebrow="YÖNETİCİ MERKEZİ" accent={palette.blue} subtitle="Kullanıcı destek kayıtlarını durumlarıyla birlikte incele."/>
    <View style={s.hero}><View style={s.heroIcon}><MaterialCommunityIcons name="account-supervisor-circle-outline" size={40} color={palette.blue}/></View><View style={{flex:1}}><Text style={s.heroKicker}>DRABORNPARK ADMIN</Text><Text style={s.heroTitle}>Destek kuyruğu</Text><Text style={s.heroBody}>Yeni kayıt bildirimine dokunduğunda doğrudan ayrıntıya gidersin. Bu ekran tüm son talepleri tek yerde toplar.</Text></View></View>
    <SectionHeading title="Destek kayıtları" subtitle="En yeni kayıt üstte" badge={dkdRows.length?`${dkdRows.length} KAYIT`:undefined} color={palette.purple}/>
    {dkdLoading?<View style={s.loading}><ActivityIndicator color={palette.blue}/><Text style={s.loadingText}>Destek kuyruğu yükleniyor…</Text></View>:dkdRows.length?<View style={s.list}>{dkdRows.map(dkdRow=><DkdRow key={dkdRow.id} row={dkdRow}/>)}</View>:<View style={s.empty}><MaterialCommunityIcons name="check-all" size={39} color={palette.green}/><Text style={s.emptyTitle}>Destek kuyruğu boş</Text><Text style={s.emptyBody}>Yeni bir kullanıcı destek kaydı oluşturduğunda burada görünecek.</Text></View>}
  </ScrollView></SafeAreaView>;
}

function DkdRow({row}:{row:any}){const dkdMeta=dkdStatus[String(row.status)]??dkdStatus.open;return <Pressable onPress={()=>router.push(`/admin/support/${row.id}` as any)} style={[s.row,{borderColor:`${dkdMeta.color}45`}]}><View style={[s.rowIcon,{backgroundColor:`${dkdMeta.color}18`}]}><MaterialCommunityIcons name="lifebuoy" size={25} color={dkdMeta.color}/></View><View style={{flex:1,minWidth:0}}><View style={s.rowTop}><Text numberOfLines={1} style={s.rowTitle}>{row.subject}</Text><View style={[s.status,{borderColor:`${dkdMeta.color}55`,backgroundColor:`${dkdMeta.color}12`}]}><Text style={[s.statusText,{color:dkdMeta.color}]}>{dkdMeta.label}</Text></View></View><Text numberOfLines={1} style={s.user}>{row.username||'DraBornPark kullanıcısı'}</Text><Text style={s.date}>{row.created_at?new Date(row.created_at).toLocaleString('tr-TR'):''}</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color={dkdMeta.color}/></Pressable>}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:70},hero:{minHeight:166,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.blue}50`,backgroundColor:`${palette.blue}0D`,padding:19,flexDirection:'row',alignItems:'center',gap:15},heroIcon:{width:72,height:72,borderRadius:24,backgroundColor:`${palette.blue}1C`,alignItems:'center',justifyContent:'center'},heroKicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',marginTop:4},heroBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:6},loading:{minHeight:150,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,alignItems:'center',justifyContent:'center',gap:10},loadingText:{color:palette.muted,fontSize:type.caption},list:{gap:10},row:{minHeight:104,borderRadius:radius.md,borderWidth:1,backgroundColor:palette.glass,padding:14,flexDirection:'row',alignItems:'center',gap:12},rowIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center'},rowTop:{flexDirection:'row',alignItems:'center',gap:8},rowTitle:{flex:1,color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},status:{borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:5},statusText:{fontSize:9,fontWeight:'900'},user:{color:palette.muted,fontSize:type.caption,fontWeight:'700',marginTop:5},date:{color:palette.muted2,fontSize:type.micro,marginTop:5},empty:{minHeight:170,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.green}3C`,backgroundColor:`${palette.green}0A`,alignItems:'center',justifyContent:'center',padding:24},emptyTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:10},emptyBody:{color:palette.muted,fontSize:type.caption,textAlign:'center',lineHeight:19,marginTop:5}});
