import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccentCard, AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { Pill, SafeIcon } from '@/src/components/Primitives';
import { DemoSection, useDemo } from '@/src/demo/DemoContext';
import { palette, radius, shadows, type } from '@/src/theme';

type MenuItem={title:string;subtitle:string;icon:string;color:string;route?:string;demo?:DemoSection;badge?:string;keywords:string};
type Group={title:string;caption:string;color:string;icon:string;items:MenuItem[]};
const groups:Group[]=[
  {title:'Araç & Park',caption:'Günlük kullanımın başladığı yer',color:palette.cyan,icon:'car-connected',items:[
    {title:'Araçlarım',subtitle:'Araba ve motosiklet profilleri',icon:'car-multiple',color:palette.blue,route:'/vehicle',demo:'vehicles',keywords:'araç araba motor motosiklet'},
    {title:'Park Hafızası',subtitle:'GPS, kat, bölüm, fotoğraf ve bilet',icon:'map-marker-radius',color:palette.cyan,route:'/park',demo:'park',keywords:'park konum otopark fotoğraf bilet'},
    {title:'Etiketlerim',subtitle:'NFC + QR, aktivasyon ve devir',icon:'nfc',color:palette.aqua,route:'/tags',demo:'tags',keywords:'nfc qr etiket aktivasyon devir'},
    {title:'Timeline',subtitle:'Aracının olay geçmişi',icon:'history',color:palette.purple,route:'/timeline',demo:'timeline',keywords:'timeline geçmiş olay'},
    {title:'DraBorn Insights',subtitle:'Aylık park ve güvenlik özeti',icon:'chart-donut',color:palette.green,route:'/insights',keywords:'özet istatistik aylık'},
  ]},
  {title:'İletişim & Güvenlik',caption:'Numaranı göstermeden haber al',color:palette.orange,icon:'shield-check-outline',items:[
    {title:'Bildirim Merkezi',subtitle:'Araç bildirimleri ve hızlı cevaplar',icon:'bell-badge-outline',color:palette.orange,route:'/notifications',demo:'notifications',keywords:'bildirim cevap mesaj'},
    {title:'DraBornPark Family',subtitle:'Aile park paylaşımı ve izinler',icon:'account-group-outline',color:palette.purple,route:'/family',demo:'family',keywords:'family aile paylaşım'},
    {title:'Geçici Sürücü',subtitle:'Süreli bildirim yönlendirmesi',icon:'account-clock-outline',color:palette.green,route:'/guest',demo:'guest',keywords:'geçici sürücü yönlendirme'},
    {title:'Acil Durum Zinciri',subtitle:'Öncelikli kişiler ve yüksek öncelik',icon:'shield-alert-outline',color:palette.red,route:'/emergency',demo:'emergency',keywords:'acil zincir kişi'},
    {title:'Gizlilik & Veri',subtitle:'Paylaşımlar, izinler ve verilerin',icon:'shield-lock-outline',color:palette.green,route:'/legal',demo:'privacy',keywords:'gizlilik privacy veri güvenlik'},
  ]},
  {title:'Akıllı Modlar',caption:'DraBornPark+ otomasyonları',color:palette.purple,icon:'auto-fix',items:[
    {title:'Vale / Servis',subtitle:'Araç teslimi ve servis durumları',icon:'car-key',color:palette.sky,route:'/modes',demo:'modes',badge:'PLUS',keywords:'vale servis'},
    {title:'Zaman Kuralları',subtitle:'Gün ve saate göre yönlendir',icon:'calendar-clock-outline',color:palette.pink,route:'/routing',demo:'routing',badge:'PLUS',keywords:'zaman kural saat'},
    {title:'DraBornPark+',subtitle:'Premium özellikler ve üyelik',icon:'crown-outline',color:palette.yellow,route:'/feature/plus',demo:'plus',badge:'PLUS',keywords:'plus premium üyelik abonelik'},
    {title:'Bildirim Ayarları',subtitle:'Sessiz saatler ve tercihler',icon:'tune-variant',color:palette.aqua,route:'/settings',keywords:'ayar bildirim sessiz'},
  ]},
  {title:'Hesap & Destek',caption:'Yasal, hesap ve üretim araçları',color:palette.blue,icon:'account-cog-outline',items:[
    {title:'Hesabım',subtitle:'Hesap, veri ve hesap silme',icon:'account-circle-outline',color:palette.blue,route:'/account',keywords:'hesap silme kullanıcı'},
    {title:'Yasal & Gizlilik',subtitle:'Gizlilik, koşullar ve veri güvenliği',icon:'file-shield-outline',color:palette.green,route:'/legal',keywords:'yasal gizlilik koşullar veri güvenliği'},
    {title:'Dış NFC / QR Demo',subtitle:'Etiketi okutan kişinin gerçek web akışı',icon:'qrcode-scan',color:palette.cyan,route:'/public-demo',keywords:'qr nfc dış web ziyaretçi demo'},
    {title:'DraBornPark Care',subtitle:'Destek merkezi ve talepler',icon:'lifebuoy',color:palette.blue,route:'/feature/support',demo:'support',keywords:'destek yardım care'},
    {title:'Factory Panel',subtitle:'Etiket üretim ve doğrulama',icon:'factory',color:palette.orange,route:'/factory',demo:'factory',keywords:'factory üretim etiket'},
  ]},
];

export default function HubScreen(){
  const demo=useDemo();const [query,setQuery]=useState('');const enter=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(enter,{toValue:1,duration:520,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()},[enter]);
  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('tr-TR');if(!q)return groups;return groups.map(g=>({...g,items:g.items.filter(i=>`${i.title} ${i.subtitle} ${i.keywords}`.toLocaleLowerCase('tr-TR').includes(q))})).filter(g=>g.items.length)},[query]);
  const open=(item:MenuItem)=>{if(demo.active&&item.demo){router.push({pathname:'/demo/[section]',params:{section:item.demo}} as any);return;}if(item.route)router.push(item.route as any)};
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.purple} secondary={palette.cyan}/><Animated.View style={{flex:1,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <ScreenHeader back={false} title="DraBorn Merkezi" eyebrow="NOVA SPECTRUM" accent={palette.purple} subtitle="Araç, park, güvenlik ve hesabın tek anlaşılır merkezde" right={<Pill label="v0.4.0" color={palette.purple}/>}/>
    <View style={s.hero}><View style={s.heroBadge}><SafeIcon name="shield-car" size={34} color={palette.text}/></View><View style={{flex:1}}><Text style={s.heroKicker}>{demo.active?'ETKİLEŞİMLİ DEMO':'KİŞİSEL ARAÇ AĞIN'}</Text><Text style={s.heroTitle}>Ne yapmak istiyorsun?</Text><Text style={s.heroText}>Aradığın özelliği ara veya dört anlaşılır kategori içinden seç.</Text></View></View>
    <View style={s.search}><SafeIcon name="magnify" size={24} color={palette.cyan}/><TextInput value={query} onChangeText={setQuery} placeholder="Örn. park, Family, etiket, hesap silme…" placeholderTextColor={palette.muted2} style={s.searchInput}/>{query?<Pressable onPress={()=>setQuery('')} style={s.clear}><SafeIcon name="close" size={19} color={palette.muted}/></Pressable>:null}</View>
    {!query?<View style={s.categoryRail}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10,paddingRight:10}}>{groups.map(g=><View key={g.title} style={[s.category,{borderColor:`${g.color}50`,backgroundColor:`${g.color}10`}]}><SafeIcon name={g.icon} size={22} color={g.color}/><Text style={s.categoryTitle}>{g.title}</Text><Text style={s.categoryCount}>{g.items.length} özellik</Text></View>)}</ScrollView></View>:null}
    {filtered.length?filtered.map(group=><View key={group.title}><SectionHeading title={group.title} subtitle={group.caption} badge={`${group.items.length} ÖZELLİK`} color={group.color}/><View style={s.items}>{group.items.map(item=><AccentCard key={item.title} icon={item.icon} title={item.title} subtitle={item.subtitle} color={item.color} badge={item.badge} onPress={()=>open(item)}/>)}</View></View>):<View style={s.empty}><SafeIcon name="magnify-close" size={38} color={palette.muted}/><Text style={s.emptyTitle}>Sonuç bulunamadı</Text><Text style={s.emptyText}>Daha kısa bir kelimeyle tekrar ara.</Text></View>}
    {demo.active?<Pressable onPress={demo.reset} style={s.reset}><SafeIcon name="refresh" size={25} color={palette.yellow}/><View style={{flex:1}}><Text style={s.resetTitle}>Demo verilerini sıfırla</Text><Text style={s.resetText}>Tüm Demo değişikliklerini başlangıç senaryosuna döndür.</Text></View><SafeIcon name="chevron-right" size={23} color={palette.yellow}/></Pressable>:null}
    <BottomDock active="hub"/>
  </ScrollView></Animated.View></SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:22},
  hero:{minHeight:174,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.purple}55`,backgroundColor:`${palette.purple}10`,padding:20,flexDirection:'row',alignItems:'center',gap:16,...shadows.soft},heroBadge:{width:76,height:76,borderRadius:26,backgroundColor:palette.purple,alignItems:'center',justifyContent:'center'},heroKicker:{color:palette.purple,fontSize:type.micro,fontWeight:'900',letterSpacing:1.2},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',letterSpacing:-.65,marginTop:5},heroText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:7},
  search:{height:62,borderRadius:22,borderWidth:1,borderColor:`${palette.cyan}42`,backgroundColor:palette.glassStrong,marginTop:14,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:10,...shadows.soft},searchInput:{flex:1,color:palette.text,fontSize:type.body,paddingVertical:0},clear:{width:36,height:36,borderRadius:12,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},
  categoryRail:{marginTop:13},category:{width:146,minHeight:90,borderRadius:22,borderWidth:1,padding:13,justifyContent:'space-between'},categoryTitle:{color:palette.text,fontSize:type.caption,fontWeight:'900',marginTop:7},categoryCount:{color:palette.muted2,fontSize:type.micro,marginTop:3},items:{gap:11},
  empty:{minHeight:210,borderRadius:radius.lg,borderWidth:1,borderStyle:'dashed',borderColor:palette.line,alignItems:'center',justifyContent:'center',padding:24,marginTop:28},emptyTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:12},emptyText:{color:palette.muted,fontSize:type.body,marginTop:5},
  reset:{minHeight:96,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.yellow}48`,backgroundColor:`${palette.yellow}0D`,padding:16,flexDirection:'row',alignItems:'center',gap:13,marginTop:28},resetTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},resetText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},
});
