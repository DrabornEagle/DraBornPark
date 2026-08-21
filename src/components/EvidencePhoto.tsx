import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { getEvidenceSignedUrl } from '@/src/lib/contactThreads';
import { palette, radius, type } from '@/src/theme';

export function EvidencePhoto({path,capturedAt}:{path:string;capturedAt?:string|null}){
  const [url,setUrl]=useState<string|null>(null);
  const [failed,setFailed]=useState(false);
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    setUrl(null);setFailed(false);
    void getEvidenceSignedUrl(path).then(value=>{if(active)setUrl(value);}).catch(()=>{if(active)setFailed(true);});
    return()=>{active=false;};
  },[path]);

  const label=capturedAt?new Date(capturedAt).toLocaleString('tr-TR'):'Çekim zamanı fotoğraf üzerinde';

  if(failed)return <View style={s.error}><MaterialCommunityIcons name="image-off-outline" size={20} color={palette.red}/><Text style={s.errorText}>Kanıt fotoğrafı açılamadı.</Text></View>;
  if(!url)return <View style={s.loading}><ActivityIndicator size="small" color={palette.cyan}/><Text style={s.loadingText}>Kanıt fotoğrafı hazırlanıyor…</Text></View>;

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Kanıt fotoğrafını tam ekran aç" onPress={()=>setOpen(true)} style={s.card}>
      <Image source={{uri:url}} style={s.thumb} resizeMode="cover"/>
      <View style={s.meta}><MaterialCommunityIcons name="camera-lock-outline" size={18} color={palette.green}/><View style={{flex:1}}><Text style={s.title}>ANLIK KANIT FOTOĞRAFI</Text><Text style={s.time}>{label}</Text></View><MaterialCommunityIcons name="arrow-expand-all" size={20} color={palette.cyan}/></View>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={()=>setOpen(false)}>
      <View style={s.modal}>
        <View style={s.modalTop}><View style={{flex:1}}><Text style={s.modalTitle}>Kanıt fotoğrafı</Text><Text style={s.modalTime}>{label}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fotoğrafı kapat" onPress={()=>setOpen(false)} style={s.close}><MaterialCommunityIcons name="close" size={28} color={palette.text}/></Pressable></View>
        <Image source={{uri:url}} style={s.full} resizeMode="contain"/>
        <Text style={s.note}>Fotoğraf yalnızca güvenli bildirim sahibi tarafından görüntülenir.</Text>
      </View>
    </Modal>
  </>;
}

const s=StyleSheet.create({
  card:{marginTop:9,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.cyan}45`,backgroundColor:palette.bg2,overflow:'hidden'},
  thumb:{width:'100%',height:190,backgroundColor:palette.bg},
  meta:{minHeight:58,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:9},
  title:{color:palette.green,fontSize:type.micro,fontWeight:'900',letterSpacing:.6},
  time:{color:palette.muted,fontSize:type.micro,marginTop:3},
  loading:{marginTop:9,minHeight:62,borderRadius:radius.md,borderWidth:1,borderColor:palette.line,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:13},
  loadingText:{color:palette.muted,fontSize:type.caption},
  error:{marginTop:9,minHeight:54,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.red}40`,backgroundColor:`${palette.red}0C`,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12},
  errorText:{color:palette.red,fontSize:type.caption,fontWeight:'800'},
  modal:{flex:1,backgroundColor:'#02030A',paddingTop:44,paddingHorizontal:14,paddingBottom:24},
  modalTop:{flexDirection:'row',alignItems:'center',gap:12,paddingBottom:10},
  modalTitle:{color:palette.text,fontSize:type.section,fontWeight:'900'},
  modalTime:{color:palette.muted,fontSize:type.caption,marginTop:3},
  close:{width:46,height:46,borderRadius:16,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,alignItems:'center',justifyContent:'center'},
  full:{flex:1,width:'100%'},
  note:{color:palette.muted2,fontSize:type.micro,textAlign:'center',marginTop:10},
});
