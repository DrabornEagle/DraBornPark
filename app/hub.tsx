import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { Pill, SafeIcon } from '@/src/components/Primitives';
import { DemoSection, useDemo } from '@/src/demo/DemoContext';
import { palette, radius, shadows, type } from '@/src/theme';

type MenuItem={title:string;subtitle:string;icon:string;color:string;route?:string;demo?:DemoSection;badge?:string;keywords:string};
type Group={title:string;caption:string;color:string;icon:string;items:MenuItem[]};
const groups:Group[]=[
  {title:'Araç & Park',caption:'Günlük kullanımın başladığı yer',color:palette.cyan,icon:'car-connected',items:[
    {title:'Araçlarım',subtitle:'Araba ve motosiklet profilleri',icon:'car-multiple',color:palette.blue,route:'/vehicle',demo:'vehicles',keywords:'araç araba motor motosiklet'},
    {title:'Park Hafızası',subtitle:'GPS, kat, bölüm, fotoğraf ve bilet',icon:'map-marker-radius',color:palette.orange,route:'/park',demo:'park',keywords:'park konum otopark fotoğraf bilet'},
    {title:'Etiketlerim',subtitle:'NFC + QR, aktivasyon ve devir',icon:'nfc',color:palette.cyan,route:'/tags',demo:'tags',keywords:'nfc qr etiket aktivasyon devir'},
    {title:'Araç Geçmişi',subtitle:'Aracının olay ve hareket geçmişi',icon:'history',color:palette.purple,route:'/timeline',demo:'timeline',keywords:'geçmiş olay timeline'},
    {title:'DraBorn İstatistikleri',subtitle:'Aylık park ve güvenlik özeti',icon:'chart-donut',color:palette.green,route:'/insights',keywords:'özet istatistik aylık'},
  ]},
  {title:'İletişim & Güvenlik',caption:'Numaranı göstermeden haber al',color:palette.orange,icon:'shield-check-outline',items:[
    {title:'Bildirim Merkezi',subtitle:'Araç bildirimleri ve hızlı cevaplar',icon:'bell-ring-outline',color:palette.orange,route:'/notifications',demo:'notifications',keywords:'bildirim cevap mesaj'},
    {title:'DraBornPark Aile',subtitle:'Aile park paylaşımı ve izinler',icon:'account-group-outline',color:palette.purple,route:'/family',demo:'family',keywords:'family aile paylaşım'},
    {title:'Geçici Sürücü',subtitle:'Süreli bildirim yönlendirmesi',icon:'account-clock-outline',color:palette.green,route:'/guest',demo:'guest',keywords:'geçici sürücü yönlendirme'},
    {title:'Acil Durum Zinciri',subtitle:'Öncelikli kişiler ve yüksek öncelik',icon:'shield-alert-outline',color:palette.red,route:'/emergency',demo:'emergency',keywords:'acil zincir kişi'},
    {title:'Gizlilik & Veri',subtitle:'Paylaşımlar, izinler ve veri kontrolü',icon:'shield-lock-outline',color:palette.aqua,route:'/legal',demo:'privacy',keywords:'gizlilik privacy veri güvenlik'},
  ]},
  {title:'Akıllı Modlar',caption:'DraBornPark+ otomasyonları',color:palette.purple,icon:'auto-fix',items:[
    {title:'Vale / Servis',subtitle:'Araç teslimi ve servis durumları',icon:'car-key',color:palette.sky,route:'/modes',demo:'modes',badge:'PLUS',keywords:'vale servis'},
    {title:'Zaman Kuralları',subtitle:'Gün ve saate göre yönlendir',icon:'calendar-clock-outline',color:palette.pink,route:'/routing',demo:'routing',badge:'PLUS',keywords:'zaman kural saat'},
    {title:'DraBornPark+',subtitle:'Gelişmiş özellikler ve üyelik',icon:'crown-outline',color:palette.yellow,route:'/feature/plus',demo:'plus',badge:'PLUS',keywords:'plus üyelik abonelik'},
    {title:'Bildirim Ayarları',subtitle:'Sessiz saatler ve tercihler',icon:'tune-variant',color:palette.aqua,route:'/settings',keywords:'ayar bildirim sessiz'},
  ]},
  {title:'Hesap & Destek',caption:'Hesap, yasal alan ve üretim araçları',color:palette.blue,icon:'account-cog-outline',items:[
    {title:'Hesabım',subtitle:'Hesap, veri ve hesap silme',icon:'account-circle-outline',color:palette.blue,route:'/account',keywords:'hesap silme kullanıcı'},
    {title:'Yasal & Gizlilik',subtitle:'Gizlilik, koşullar ve veri güvenliği',icon:'file-shield-outline',color:palette.green,route:'/legal',keywords:'yasal gizlilik koşullar veri güvenliği'},
    {title:'Dış NFC / QR Demo',subtitle:'Etiketi okutan kişinin gerçek web akışı',icon:'qrcode-scan',color:palette.cyan,route:'/public-demo',keywords:'qr nfc dış web ziyaretçi demo'},
    {title:'Destek Merkezi',subtitle:'Yardım, destek ve talepler',icon:'lifebuoy',color:palette.purple,route:'/feature/support',demo:'support',keywords:'destek yardım care'},
    {title:'Üretim Paneli',subtitle:'Etiket üretim ve doğrulama',icon:'factory',color:palette.orange,route:'/factory',demo:'factory',keywords:'factory üretim etiket'},
  ]},
];

export default function HubScreen(){
  const demo=useDemo();const [query,setQuery]=useState('');const enter=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(enter,{toValue:1,duration:500,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()},[enter]);
  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('tr-TR');if(!q)return groups;return groups.map(g=>({...g,items:g.items.filter(i=>`${i.title} ${i.subtitle} ${i.keywords}`.toLocaleLowerCase('tr-TR').includes(q))})).filter(g=>g.items.length)},[query]);
  const open=(item:MenuItem)=>{if(demo.active&&item.demo){router.push({pathname:'/demo/[section]',params:{section:item.demo}} as any);return;}if(item.route)router.push(item.route as any)};
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.purple} secondary={palette.cyan}/><Animated.View style={{flex:1,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[14,0]})}]}}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <ScreenHeader back={false} title="DraBorn Merkezi" eyebrow="NOVA RENK SİSTEMİ" accent={palette.purple} subtitle="Araç, park, güvenlik ve hesabın tek anlaşılır merkezde" right={<Pill label="v0.4.3" color={palette.purple}/>}/>
    <View style={s.hero}>
      <View pointerEvents="none" style={[s.heroOrb,s.heroOrbCyan]}/><View pointerEvents="none" style={[s.heroOrb,s.heroOrbPink]}/>
      <View style={s.heroBadge}><SafeIcon name="view-dashboard-outline" size={36} color={palette.text}/><View style={s.heroDot}/></View>
      <View style={{flex:1}}><Text style={s.heroKicker}>{demo.active?'ETKİLEŞİMLİ DEMO':'KİŞİSEL ARAÇ AĞIN'}</Text><Text style={s.heroTitle}>Ne yapmak istiyorsun?</Text><Text style={s.heroText}>Renklerle ayrılmış kartlardan seç veya özelliği arat.</Text><View style={s.heroSpectrum}><View style={[s.spectrum,{backgroundColor:palette.cyan}]}/><View style={[s.spectrum,{backgroundColor:palette.purple}]}/><View style={[s.spectrum,{backgroundColor:palette.pink}]}/><View style={[s.spectrum,{backgroundColor:palette.orange}]}/><View style={[s.spectrum,{backgroundColor:palette.green}]}/></View></View>
    </View>
    <View style={s.search}><View style={s.searchIcon}><SafeIcon name="magnify" size={23} color={palette.cyan}/></View><TextInput value={query} onChangeText={setQuery} placeholder="Park, etiket, aile, hesap…" placeholderTextColor={palette.muted2} style={s.searchInput}/>{query?<Pressable onPress={()=>setQuery('')} style={s.clear}><SafeIcon name="close" size={19} color={palette.muted}/></Pressable>:null}</View>
    {!query?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRail}>{groups.map((g,index)=><View key={g.title} style={[s.category,{borderColor:`${g.color}70`,backgroundColor:`${g.color}16`}]}><View style={[s.categoryIcon,{backgroundColor:`${g.color}24`,borderColor:`${g.color}55`}]}><SafeIcon name={g.icon} size={25} color={g.color}/></View><Text style={s.categoryTitle}>{g.title}</Text><View style={s.categoryBottom}><Text style={s.categoryCount}>{g.items.length} özellik</Text><Text style={[s.categoryNo,{color:g.color}]}>0{index+1}</Text></View><View style={[s.categoryLine,{backgroundColor:g.color}]}/></View>)}</ScrollView>:null}
    {filtered.length?filtered.map((group,groupIndex)=><View key={group.title}><SectionHeading title={group.title} subtitle={group.caption} badge={`${group.items.length} ÖZELLİK`} color={group.color}/><View style={s.grid}>{group.items.map((item,itemIndex)=><MenuTile key={item.title} item={item} index={groupIndex*6+itemIndex} onPress={()=>open(item)}/>)}</View></View>):<View style={s.empty}><SafeIcon name="magnify-close" size={38} color={palette.muted}/><Text style={s.emptyTitle}>Sonuç bulunamadı</Text><Text style={s.emptyText}>Daha kısa bir kelimeyle tekrar ara.</Text></View>}
    {demo.active?<Pressable onPress={demo.reset} style={s.reset}><View style={s.resetIcon}><SafeIcon name="refresh" size={25} color={palette.yellow}/></View><View style={{flex:1}}><Text style={s.resetTitle}>Demo verilerini sıfırla</Text><Text style={s.resetText}>Tüm Demo değişikliklerini başlangıç senaryosuna döndür.</Text></View><SafeIcon name="chevron-right" size={23} color={palette.yellow}/></Pressable>:null}
    <BottomDock active="hub"/>
  </ScrollView></Animated.View></SafeAreaView>;
}

function MenuTile({item,index,onPress}:{item:MenuItem;index:number;onPress:()=>void}){
  const appear=useRef(new Animated.Value(0)).current;const scale=useRef(new Animated.Value(1)).current;
  useEffect(()=>{Animated.timing(appear,{toValue:1,duration:430,delay:Math.min(index,16)*35,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()},[appear,index]);
  const press=(value:number)=>Animated.spring(scale,{toValue:value,useNativeDriver:true,speed:34,bounciness:5}).start();
  return <Animated.View style={[s.tileWrap,{opacity:appear,transform:[{translateY:appear.interpolate({inputRange:[0,1],outputRange:[16,0]})},{scale}]}]}><Pressable onPress={onPress} onPressIn={()=>press(.965)} onPressOut={()=>press(1)} style={[s.tile,{borderColor:`${item.color}72`,backgroundColor:`${item.color}16`}]}> 
    <View pointerEvents="none" style={[s.tileGlow,{backgroundColor:`${item.color}2A`}]}/><View pointerEvents="none" style={[s.tileRing,{borderColor:`${item.color}32`}]}/>
    <View style={s.tileTop}><View style={[s.tileIcon,{backgroundColor:`${item.color}28`,borderColor:`${item.color}78`}]}><SafeIcon name={item.icon} size={31} color={item.color}/><View style={[s.tileIconDot,{backgroundColor:item.color}]}/></View>{item.badge?<View style={[s.tileBadge,{backgroundColor:`${item.color}20`,borderColor:`${item.color}6A`}]}><Text style={[s.tileBadgeText,{color:item.color}]}>{item.badge}</Text></View>:<View style={[s.tileArrow,{backgroundColor:`${item.color}14`,borderColor:`${item.color}4A`}]}><SafeIcon name="arrow-top-right" size={18} color={item.color}/></View>}</View>
    <Text style={s.tileTitle}>{item.title}</Text><Text style={s.tileSub}>{item.subtitle}</Text>
    <View style={s.tileFooter}><Text style={[s.tileOpen,{color:item.color}]}>AÇ</Text><View style={[s.tileMiniLine,{backgroundColor:item.color}]}/><SafeIcon name="chevron-right" size={18} color={item.color}/></View><View style={[s.tileBottom,{backgroundColor:item.color}]}/>
  </Pressable></Animated.View>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:22},
  hero:{minHeight:184,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.purple}70`,backgroundColor:`${palette.purple}15`,padding:20,flexDirection:'row',alignItems:'center',gap:16,overflow:'hidden',...shadows.soft},heroOrb:{position:'absolute',width:190,height:190,borderRadius:95},heroOrbCyan:{backgroundColor:`${palette.cyan}16`,right:-70,top:-92},heroOrbPink:{backgroundColor:`${palette.pink}12`,left:-90,bottom:-115},heroBadge:{width:78,height:78,borderRadius:27,borderWidth:1,borderColor:`${palette.purple}90`,backgroundColor:`${palette.purple}32`,alignItems:'center',justifyContent:'center'},heroDot:{position:'absolute',width:10,height:10,borderRadius:5,right:8,top:8,backgroundColor:palette.aqua},heroKicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:1.25},heroTitle:{color:palette.text,fontSize:26,fontWeight:'900',letterSpacing:-.72,marginTop:5},heroText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:7},heroSpectrum:{height:4,marginTop:13,flexDirection:'row',gap:3},spectrum:{flex:1,borderRadius:99},
  search:{height:64,borderRadius:23,borderWidth:1,borderColor:`${palette.cyan}56`,backgroundColor:palette.glassStrong,marginTop:14,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10,...shadows.soft},searchIcon:{width:40,height:40,borderRadius:14,borderWidth:1,borderColor:`${palette.cyan}4A`,backgroundColor:`${palette.cyan}16`,alignItems:'center',justifyContent:'center'},searchInput:{flex:1,color:palette.text,fontSize:type.body,paddingVertical:0},clear:{width:36,height:36,borderRadius:12,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},
  categoryRail:{gap:10,paddingTop:13,paddingRight:10},category:{width:154,minHeight:112,borderRadius:24,borderWidth:1,padding:13,overflow:'hidden'},categoryIcon:{width:43,height:43,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},categoryTitle:{color:palette.text,fontSize:14,fontWeight:'900',marginTop:9},categoryBottom:{marginTop:'auto',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},categoryCount:{color:palette.muted2,fontSize:type.micro},categoryNo:{fontSize:12,fontWeight:'900'},categoryLine:{position:'absolute',height:4,left:12,right:12,bottom:0,borderRadius:3},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tileWrap:{width:'48.4%'},tile:{minHeight:194,borderRadius:27,borderWidth:1,padding:14,overflow:'hidden',...shadows.soft},tileGlow:{position:'absolute',width:150,height:150,borderRadius:75,right:-76,top:-82},tileRing:{position:'absolute',width:110,height:110,borderRadius:55,borderWidth:1,right:-56,bottom:-60},tileTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},tileIcon:{width:57,height:57,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center'},tileIconDot:{position:'absolute',width:7,height:7,borderRadius:4,right:7,top:7},tileBadge:{borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:6},tileBadgeText:{fontSize:11,fontWeight:'900',letterSpacing:.4},tileArrow:{width:34,height:34,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},tileTitle:{color:palette.text,fontSize:16.5,fontWeight:'900',lineHeight:21,marginTop:15},tileSub:{color:palette.muted,fontSize:12.5,lineHeight:18,marginTop:5,minHeight:36},tileFooter:{marginTop:'auto',paddingTop:12,flexDirection:'row',alignItems:'center',gap:6},tileOpen:{fontSize:11,fontWeight:'900',letterSpacing:.8},tileMiniLine:{flex:1,height:2,borderRadius:99,opacity:.55},tileBottom:{position:'absolute',height:4,left:14,right:14,bottom:0,borderRadius:3},
  empty:{minHeight:210,borderRadius:radius.lg,borderWidth:1,borderStyle:'dashed',borderColor:palette.line,alignItems:'center',justifyContent:'center',padding:24,marginTop:28},emptyTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:12},emptyText:{color:palette.muted,fontSize:type.body,marginTop:5},
  reset:{minHeight:100,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.yellow}58`,backgroundColor:`${palette.yellow}10`,padding:15,flexDirection:'row',alignItems:'center',gap:13,marginTop:28},resetIcon:{width:48,height:48,borderRadius:16,borderWidth:1,borderColor:`${palette.yellow}58`,backgroundColor:`${palette.yellow}18`,alignItems:'center',justifyContent:'center'},resetTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},resetText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},
});
