import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccentCard, AuroraBackground, BottomDock, ScreenHeader } from '@/src/components/AppChrome';
import { IconName } from '@/src/components/Primitives';
import { DemoSection, useDemo } from '@/src/demo/DemoContext';
import { palette } from '@/src/theme';

type MenuItem={title:string;subtitle:string;icon:IconName;color:string;route?:string;demo?:DemoSection;badge?:string};
const groups:Array<{title:string;caption:string;items:MenuItem[]}>= [
  {title:'Araç & Park',caption:'Günlük kullanım',items:[
    {title:'Araçlarım',subtitle:'Araç ve motosiklet profillerini yönet',icon:'car-multiple',color:palette.blue,route:'/vehicle',demo:'vehicles'},
    {title:'Park Hafızası',subtitle:'Park konumu, kapalı otopark ve geçmiş',icon:'map-marker-radius',color:palette.cyan,route:'/park',demo:'park'},
    {title:'Etiketlerim',subtitle:'NFC + QR, aktivasyon, devir ve güvenlik',icon:'nfc',color:palette.aqua,route:'/tags',demo:'tags'},
    {title:'Timeline',subtitle:'Aracının olay geçmişini tek akışta gör',icon:'history',color:palette.purple,route:'/timeline',demo:'timeline'},
  ]},
  {title:'İletişim & Güvenlik',caption:'DraBorn ağın',items:[
    {title:'Bildirimler',subtitle:'Anonim araç bildirimleri ve hızlı cevaplar',icon:'bell-outline',color:palette.orange,route:'/notifications',demo:'notifications'},
    {title:'Family',subtitle:'Aile ağı, park paylaşımı ve izinler',icon:'account-group-outline',color:palette.purple,route:'/family',demo:'family'},
    {title:'Geçici Sürücü',subtitle:'Süreli bildirim yönlendirmesi',icon:'account-clock-outline',color:palette.green,route:'/guest',demo:'guest'},
    {title:'Acil Durum Zinciri',subtitle:'Öncelikli acil kişiler ve eskalasyon',icon:'alert-circle-outline',color:palette.red,route:'/emergency',demo:'emergency'},
  ]},
  {title:'Akıllı Modlar',caption:'DraBornPark+',items:[
    {title:'Vale / Servis',subtitle:'Araç teslim ve servis durumlarını yönet',icon:'car-key',color:palette.sky,route:'/modes',demo:'modes',badge:'PLUS'},
    {title:'Zaman Kuralları',subtitle:'Bildirimleri gün ve saate göre yönlendir',icon:'clock-outline',color:palette.pink,route:'/routing',demo:'routing',badge:'PLUS'},
    {title:'Gizlilik Merkezi',subtitle:'Kamusal alanları ve görünürlüğü kontrol et',icon:'shield-lock-outline',color:palette.green,route:'/feature/privacy',demo:'privacy'},
    {title:'DraBornPark+',subtitle:'Deneme, plan ve premium özellikler',icon:'crown-outline',color:palette.yellow,route:'/feature/plus',demo:'plus',badge:'PLUS'},
  ]},
  {title:'Sistem',caption:'Yardım & test',items:[
    {title:'Dış QR / NFC Ekranı',subtitle:'Araç dışındaki kişinin deneyimini test et',icon:'qrcode-scan',color:palette.cyan,demo:'public'},
    {title:'Destek Merkezi',subtitle:'DraBornPark Care ve destek kayıtları',icon:'lifebuoy',color:palette.blue,route:'/feature/support',demo:'support'},
    {title:'Factory Panel',subtitle:'Etiket üretim ve doğrulama akışı',icon:'factory',color:palette.orange,route:'/factory',demo:'factory'},
  ]},
];

export default function HubScreen(){
  const demo=useDemo();
  const enter=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(enter,{toValue:1,duration:420,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()},[enter]);
  const open=(item:MenuItem)=>{
    if(demo.active&&item.demo){router.push({pathname:'/demo/[section]',params:{section:item.demo}} as any);return;}
    if(item.route) router.push(item.route as any);
  };
  return <SafeAreaView style={s.safe}>
    <AuroraBackground accent={palette.purple}/>
    <Animated.View style={{flex:1,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[12,0]})}]}}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader back={false} title="DraBorn Merkezi" eyebrow="KEŞFET • YÖNET • KORU" accent={palette.purple} right={<View style={s.version}><Text style={s.versionText}>v0.3.2</Text></View>}/>
        <View style={s.hero}>
          <View style={s.heroOrb}><MaterialCommunityIcons name="apps" size={34} color={palette.text}/></View>
          <View style={{flex:1}}><Text style={s.heroOver}>{demo.active?'TAM DEMO ÇALIŞMA ALANI':'KİŞİSEL KONTROL MERKEZİ'}</Text><Text style={s.heroTitle}>Her şey tek yerde.</Text><Text style={s.heroSub}>{demo.active?'15 modülün tamamı izole Demo verisiyle açık.':'Araç, park, iletişim, gizlilik ve premium araç modlarına hızlı eriş.'}</Text></View>
        </View>
        {groups.map(group=><View key={group.title} style={s.group}><View style={s.groupHead}><View><Text style={s.groupCaption}>{group.caption.toUpperCase()}</Text><Text style={s.groupTitle}>{group.title}</Text></View><View style={s.count}><Text style={s.countText}>{String(group.items.length).padStart(2,'0')}</Text></View></View><View style={s.items}>{group.items.map(item=><AccentCard key={item.title} {...item} onPress={()=>open(item)}/>)}</View></View>)}
        {demo.active?<Pressable onPress={demo.reset} style={s.reset}><MaterialCommunityIcons name="refresh" size={20} color={palette.yellow}/><View style={{flex:1}}><Text style={s.resetTitle}>Demo verilerini sıfırla</Text><Text style={s.resetSub}>Bütün Demo değişikliklerini ilk duruma döndür</Text></View></Pressable>:null}
        <BottomDock active="hub"/>
      </ScrollView>
    </Animated.View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:18,paddingBottom:22},
  version:{borderWidth:1,borderColor:'#4E436E',backgroundColor:'#191B34',paddingHorizontal:9,paddingVertical:6,borderRadius:999},versionText:{color:palette.purple,fontSize:8,fontWeight:'900'},
  hero:{minHeight:150,borderRadius:30,borderWidth:1,borderColor:'#41506D',backgroundColor:'#10223A',padding:18,flexDirection:'row',alignItems:'center',gap:15,overflow:'hidden'},
  heroOrb:{width:70,height:70,borderRadius:24,backgroundColor:'#6A5BFF',alignItems:'center',justifyContent:'center'},heroOver:{color:palette.purple,fontSize:8,fontWeight:'900',letterSpacing:1.5},heroTitle:{color:palette.text,fontSize:26,fontWeight:'900',letterSpacing:-.8,marginTop:5},heroSub:{color:palette.muted,fontSize:10.5,lineHeight:15.5,marginTop:5},
  group:{marginTop:24},groupHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:10},groupCaption:{color:palette.muted2,fontSize:7,fontWeight:'900',letterSpacing:1.4},groupTitle:{color:palette.text,fontSize:20,fontWeight:'900',letterSpacing:-.45,marginTop:2},count:{width:30,height:30,borderRadius:11,backgroundColor:'#14263D',alignItems:'center',justifyContent:'center'},countText:{color:palette.muted,fontSize:9,fontWeight:'900'},items:{gap:9},
  reset:{marginTop:22,borderRadius:22,borderWidth:1,borderColor:'#5B4F27',backgroundColor:'#211F15',padding:14,flexDirection:'row',alignItems:'center',gap:11},resetTitle:{color:palette.text,fontSize:12,fontWeight:'900'},resetSub:{color:palette.muted,fontSize:9,marginTop:2},
});
