import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBubble, Pill } from '@/src/components/Primitives';
import { palette, radius } from '@/src/theme';

type FactoryTag = { id: string; serial: string; url: string; pin: string; status: string; created: string };
const statuses = ['Oluşturuldu','NFC yazılmayı bekliyor','NFC doğrulandı','QR doğrulandı','Paketlendi','Satışa hazır','Satıldı','Aktive edildi'];

function randomCode(length: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export default function FactoryPanel() {
  const [tags, setTags] = useState<FactoryTag[]>([
    { id: 'DP-48AK2M', serial: 'DPS-20260820-0001', url: 'https://p.draborn.com/t/48AK2M', pin: '572914', status: 'NFC yazılmayı bekliyor', created: '20 Ağu • 04:12' },
    { id: 'DP-K7M4X2P9', serial: 'DPS-20260820-0002', url: 'https://p.draborn.com/t/K7M4X2P9', pin: '47389261', status: 'Aktive edildi', created: '20 Ağu • 04:18' }
  ]);
  const readyCount = useMemo(() => tags.filter((tag) => tag.status === 'Satışa hazır').length, [tags]);

  function createTag() {
    const code = randomCode(8);
    const pin = String(Math.floor(10000000 + Math.random() * 90000000));
    const serial = `DPS-20260820-${String(tags.length + 1).padStart(4, '0')}`;
    const next: FactoryTag = { id: `DP-${code}`, serial, url: `https://p.draborn.com/t/${code}`, pin, status: 'NFC yazılmayı bekliyor', created: 'Şimdi' };
    setTags((current) => [next, ...current]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Yeni demo etiket üretildi', `Tag ID: ${next.id}\nPIN: ${pin}\n\nCanlı admin hesabında bu işlem drabornpark_factory_create_tag RPC ile yapılır ve açık PIN yalnızca bir kez döndürülür.`);
  }

  function advance(index: number) {
    setTags((current) => current.map((tag, tagIndex) => {
      if (tagIndex !== index) return tag;
      const position = statuses.indexOf(tag.status);
      const nextStatus = statuses[Math.min(statuses.length - 1, Math.max(0, position + 1))];
      return { ...tag, status: nextStatus };
    }));
    Haptics.selectionAsync();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={25} color={palette.text} /></Pressable><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Factory Panel</Text><Text style={styles.headerSub}>YÖNETİCİ • ÜRETİM DEMOSU</Text></View><Pill label="ADMIN" color={palette.orange} icon="shield-crown-outline" /></View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}><IconBubble icon="factory" color={palette.orange} size={66} /><Text style={styles.heroOverline}>DRABORNPARK FACTORY</Text><Text style={styles.heroTitle}>Etiketi üret, doğrula, paketle.</Text><Text style={styles.heroBody}>Her fiziksel ürün benzersiz Tag ID, NFC URL, QR, seri numarası ve gizli aktivasyon PIN’i ile takip edilir.</Text><Pressable onPress={createTag} style={styles.create}><MaterialCommunityIcons name="plus-circle" size={20} color={palette.bg} /><Text style={styles.createText}>YENİ ETİKET ÜRET</Text></Pressable></View>

        <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{tags.length}</Text><Text style={styles.statLabel}>Demo etiket</Text></View><View style={styles.stat}><Text style={[styles.statValue,{color:palette.green}]}>{readyCount}</Text><Text style={styles.statLabel}>Satışa hazır</Text></View><View style={styles.stat}><Text style={[styles.statValue,{color:palette.cyan}]}>{tags.filter((x)=>x.status==='Aktive edildi').length}</Text><Text style={styles.statLabel}>Aktif</Text></View></View>

        <Text style={styles.section}>Üretim Kuyruğu</Text>
        {tags.map((tag, index) => <View key={`${tag.id}-${tag.serial}`} style={styles.card}><View style={styles.cardHead}><View><Text style={styles.tagId}>{tag.id}</Text><Text style={styles.serial}>{tag.serial} • {tag.created}</Text></View><View style={styles.qr}><MaterialCommunityIcons name="qrcode" size={28} color={palette.text} /></View></View><View style={styles.info}><Text style={styles.infoLabel}>NFC URL</Text><Text style={styles.infoValue} numberOfLines={1}>{tag.url}</Text></View><View style={styles.info}><Text style={styles.infoLabel}>Aktivasyon PIN</Text><Text style={[styles.infoValue,{color:palette.yellow}]}>{tag.pin}</Text></View><View style={styles.statusRow}><View style={styles.statusDot}/><Text style={styles.statusText}>{tag.status}</Text><Pressable onPress={() => advance(index)} style={styles.advance}><Text style={styles.advanceText}>SONRAKİ DURUM</Text><MaterialCommunityIcons name="arrow-right" size={15} color={palette.cyan}/></Pressable></View></View>)}

        <View style={styles.native}><MaterialCommunityIcons name="nfc-tap" size={22} color={palette.yellow}/><View style={{flex:1}}><Text style={styles.nativeTitle}>Native NFC Writer sonraki katman</Text><Text style={styles.nativeBody}>Expo Go NFC etiket yazma donanım API’sini sağlamaz. Factory Panel UI, üretim durumları ve server-side tag generator hazır; fiziksel NTAG213 yazma/doğrulama development build + NFC native modülüyle bağlanacak.</Text></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},header:{minHeight:68,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:'#182135'},back:{width:43,height:43,borderRadius:15,backgroundColor:palette.panel,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},headerTitle:{color:palette.text,fontSize:16,fontWeight:'900'},headerSub:{color:palette.muted,fontSize:8.5,fontWeight:'800',letterSpacing:1,marginTop:2},scroll:{padding:14,paddingBottom:42},hero:{borderRadius:radius.xl,borderWidth:1,borderColor:'#543D2B',backgroundColor:'#211712',padding:18},heroOverline:{color:palette.orange,fontSize:9,fontWeight:'900',letterSpacing:1.4,marginTop:15},heroTitle:{color:palette.text,fontSize:23,fontWeight:'900',marginTop:4},heroBody:{color:'#C3AD9B',fontSize:10.8,lineHeight:15.5,marginTop:6},create:{minHeight:51,marginTop:15,borderRadius:16,backgroundColor:palette.orange,flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center'},createText:{color:palette.bg,fontSize:10.5,fontWeight:'900'},stats:{flexDirection:'row',gap:8,marginTop:12},stat:{flex:1,minHeight:76,borderRadius:radius.md,backgroundColor:palette.panel,borderWidth:1,borderColor:palette.line,padding:12},statValue:{color:palette.orange,fontSize:18,fontWeight:'900'},statLabel:{color:palette.muted,fontSize:9.2,marginTop:4},section:{color:palette.text,fontWeight:'900',fontSize:18,marginTop:22,marginBottom:10},card:{marginBottom:10,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:14},cardHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},tagId:{color:palette.text,fontSize:17,fontWeight:'900'},serial:{color:palette.muted,fontSize:8.8,marginTop:3},qr:{width:46,height:46,borderRadius:14,backgroundColor:'#202635',alignItems:'center',justifyContent:'center'},info:{minHeight:43,borderBottomWidth:1,borderBottomColor:'#222B3E',justifyContent:'center'},infoLabel:{color:'#69758B',fontSize:8,fontWeight:'900'},infoValue:{color:'#DDE4EF',fontSize:10.5,fontWeight:'700',marginTop:2},statusRow:{flexDirection:'row',alignItems:'center',marginTop:11},statusDot:{width:8,height:8,borderRadius:4,backgroundColor:palette.green,marginRight:7},statusText:{color:palette.green,fontSize:9.5,fontWeight:'900',flex:1},advance:{minHeight:34,paddingHorizontal:10,borderRadius:11,borderWidth:1,borderColor:'#275065',backgroundColor:'#10232E',flexDirection:'row',alignItems:'center',gap:5},advanceText:{color:palette.cyan,fontSize:8.2,fontWeight:'900'},native:{marginTop:6,borderRadius:radius.md,borderWidth:1,borderColor:'#4B4329',backgroundColor:'#211E14',padding:13,flexDirection:'row',gap:10},nativeTitle:{color:palette.yellow,fontWeight:'900',fontSize:11},nativeBody:{color:'#C1B78D',fontSize:9.4,lineHeight:13.5,marginTop:3}});
