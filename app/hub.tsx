import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccentCard, AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { IconName } from '@/src/components/Primitives';
import { DemoSection, useDemo } from '@/src/demo/DemoContext';
import { palette, radius, type } from '@/src/theme';

type MenuItem={title:string;subtitle:string;icon:IconName;color:string;route?:string;demo?:DemoSection;badge?:string};
const groups:Array<{title:string;caption:string;color:string;items:MenuItem[]}>= [
  {title:'Araç ve Park',caption:'Günlük kullanım',color:palette.cyan,items:[
    {title:'Araçlarım',subtitle:'Araç ve motosiklet profillerini yönet',icon:'car-multiple',color:palette.blue,route:'/vehicle',demo:'vehicles'},
    {title:'Park Hafızası',subtitle:'Konum, kapalı otopark, fotoğraf ve bilet',icon:'map-marker-radius',color:palette.cyan,route:'/park',demo:'park'},
    {title:'Etiketlerim',subtitle:'NFC + QR, aktivasyon, devir ve güvenlik',icon:'nfc',color:palette.aqua,route:'/tags',demo:'tags'},
    {title:'Timeline',subtitle:'Aracının olay geçmişini tek akışta gör',icon:'history',color:palette.purple,route:'/timeline',demo:'timeline'},
    {title:'Aylık Özet',subtitle:'Park, bildirim ve kullanım istatistikleri',icon:'chart-donut',color:palette.green,route:'/insights'},
  ]},
  {title:'İletişim ve Güvenlik',caption:'Sana ulaşma ağı',color:palette.orange,items:[
    {title:'Bildirimler',subtitle:'Anonim araç bildirimleri ve hızlı cevaplar',icon:'bell-outline',color:palette.orange,route:'/notifications',demo:'notifications'},
    {title:'Family',subtitle:'Aile ağı, park paylaşımı ve izinler',icon:'account-group-outline',color:palette.purple,route:'/family',demo:'family'},
    {title:'Geçici Sürücü',subtitle:'Süreli bildirim yönlendirmesi',icon:'account-clock-outline',color:palette.green,route:'/guest',demo:'guest'},
    {title:'Acil Durum Zinciri',subtitle:'Öncelikli acil kişiler ve eskalasyon',icon:'alert-circle-outline',color:palette.red,route:'/emergency',demo:'emergency'},
    {title:'Gizlilik Merkezi',subtitle:'Kamusal araç alanlarını kontrol et',icon:'shield-lock-outline',color:palette.green,route:'/feature/privacy',demo:'privacy'},
  ]},
  {title:'Akıllı Araç Modları',caption:'DraBornPark+',color:palette.purple,items:[
    {title:'Vale / Servis',subtitle:'Araç teslimi ve servis durumlarını yönet',icon:'car-key',color:palette.sky,route:'/modes',demo:'modes',badge:'PLUS'},
    {title:'Zaman Kuralları',subtitle:'Bildirimleri gün ve saate göre yönlendir',icon:'clock-outline',color:palette.pink,route:'/routing',demo:'routing',badge:'PLUS'},
    {title:'DraBornPark+',subtitle:'Deneme, üyelik ve premium kapsam',icon:'crown-outline',color:palette.yellow,route:'/feature/plus',demo:'plus',badge:'PLUS'},
    {title:'Bildirim Ayarları',subtitle:'Sessiz saatler ve kişisel tercihlerin',icon:'tune-variant',color:palette.aqua,route:'/settings'},
  ]},
  {title:'Destek ve Test',caption:'Sistem araçları',color:palette.blue,items:[
    {title:'Dış QR / NFC Ekranı',subtitle:'Araç dışındaki kişinin deneyimini test et',icon:'qrcode-scan',color:palette.cyan,demo:'public'},
    {title:'Destek Merkezi',subtitle:'DraBornPark Care ve destek kayıtları',icon:'lifebuoy',color:palette.blue,route:'/feature/support',demo:'support'},
    {title:'Factory Panel',subtitle:'Etiket üretim ve doğrulama akışı',icon:'factory',color:palette.orange,route:'/factory',demo:'factory'},
  ]},
];

export default function HubScreen(){
  const demo=useDemo();
  const enter=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(enter,{toValue:1,duration:450,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()},[enter]);
  const open=(item:MenuItem)=>{if(demo.active&&item.demo){router.push({pathname:'/demo/[section]',params:{section:item.demo}} as any);return;}if(item.route)router.push(item.route as any)};
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.purple} secondary={palette.aqua}/><Animated.View style={{flex:1,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[16,0]})}]}}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <ScreenHeader back={false} title="DraBorn Merkezi" eyebrow="KEŞFET • YÖNET • KORU" accent={palette.purple} subtitle="Bütün DraBornPark özellikleri kategori kategori" right={<View style={s.version}><Text style={s.versionText}>v0.3.3</Text></View>}/>
    <View style={s.hero}><View style={s.heroIcon}><MaterialCommunityIcons name="view-grid-outline" size={35} color={palette.text}/></View><View style={{flex:1}}><Text style={s.heroOver}>{demo.active?'TAM DEMO ÇALIŞMA ALANI':'KİŞİSEL ARAÇ MERKEZİ'}</Text><Text style={s.heroTitle}>Aradığın özellik kaybolmasın.</Text><Text style={s.heroBody}>{demo.active?'Demo modülleri ve yeni özet/ayar ekranları tek menüde.':'Araç, park, iletişim, güvenlik ve premium modlara anlaşılır gruplarla eriş.'}</Text></View></View>
    {groups.map(group=><View key={group.title} style={s.group}><SectionHeading title={group.title} subtitle={group.caption} badge={`${group.items.length} ÖZELLİK`} color={group.color}/><View style={s.items}>{group.items.map(item=><AccentCard key={item.title} icon={item.icon} title={item.title} subtitle={item.subtitle} color={item.color} badge={item.badge} onPress={()=>open(item)}/>)}</View></View>)}
    {demo.active?<Pressable onPress={demo.reset} style={s.reset}><View style={s.resetIcon}><MaterialCommunityIcons name="refresh" size={23} color={palette.yellow}/></View><View style={{flex:1}}><Text style={s.resetTitle}>Demo verilerini sıfırla</Text><Text style={s.resetBody}>Bu oturumdaki park, bildirim ve diğer Demo değişikliklerini başlangıca döndür.</Text></View></Pressable>:null}
    <BottomDock active="hub"/>
  </ScrollView></Animated.View></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:22},version:{borderWidth:1,borderColor:`${palette.purple}50`,backgroundColor:`${palette.purple}16`,paddingHorizontal:11,paddingVertical:8,borderRadius:999},versionText:{color:palette.purple,fontSize:type.micro,fontWeight:'900'},hero:{minHeight:174,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.purple}48`,backgroundColor:`${palette.purple}10`,padding:20,flexDirection:'row',alignItems:'center',gap:16},heroIcon:{width:72,height:72,borderRadius:24,backgroundColor:palette.purple,alignItems:'center',justifyContent:'center'},heroOver:{color:palette.purple,fontSize:type.micro,fontWeight:'900',letterSpacing:1.15},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',letterSpacing:-.65,marginTop:5},heroBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:6},group:{marginTop:2},items:{gap:11},reset:{minHeight:102,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.yellow}45`,backgroundColor:`${palette.yellow}0D`,padding:16,flexDirection:'row',alignItems:'center',gap:13,marginTop:26},resetIcon:{width:52,height:52,borderRadius:18,backgroundColor:`${palette.yellow}20`,alignItems:'center',justifyContent:'center'},resetTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},resetBody:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:4}});
