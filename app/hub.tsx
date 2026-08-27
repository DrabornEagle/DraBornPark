import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import {ColorPopup} from '@/src/components/ColorPopup';
import { Pill, SafeIcon } from '@/src/components/Primitives';
import {hasPlusEntitlement,loadLiveDashboard} from '@/src/lib/drabornpark';
import { supabase } from '@/src/lib/supabase';
import { palette, radius, type } from '@/src/theme';

type MenuItem={title:string;subtitle:string;icon:string;color:string;route:string;badge?:string;keywords:string;adminOnly?:boolean;requiresPlus?:boolean};
type Group={title:string;caption:string;color:string;icon:string;items:MenuItem[]};
const groups:Group[]=[
  {title:'Araç & Park',caption:'Günlük kullanımın başladığı yer',color:palette.cyan,icon:'car-connected',items:[
    {title:'Araçlarım',subtitle:'Araba ve motosiklet profilleri',icon:'car-multiple',color:palette.blue,route:'/vehicle',keywords:'araç araba motor motosiklet'},
    {title:'Park Hafızası',subtitle:'GPS, kat, bölüm, fotoğraf ve bilet',icon:'map-marker-radius',color:palette.orange,route:'/park',keywords:'park konum otopark fotoğraf bilet'},
    {title:'Etiketlerim',subtitle:'NFC + QR, aktivasyon ve devir',icon:'nfc',color:palette.cyan,route:'/tags',keywords:'nfc qr etiket aktivasyon devir'},
    {title:'Araç Geçmişi',subtitle:'Aracının olay ve hareket geçmişi',icon:'history',color:palette.purple,route:'/timeline',keywords:'geçmiş olay zaman çizelgesi',requiresPlus:true},
    {title:'İstatistiklerim',subtitle:'Aylık park ve güvenlik özeti',icon:'chart-donut',color:palette.green,route:'/insights',keywords:'özet istatistik aylık',requiresPlus:true},
  ]},
  {title:'İletişim & Güvenlik',caption:'Numaranı göstermeden haber al',color:palette.orange,icon:'shield-check-outline',items:[
    {title:'Bildirim Merkezi',subtitle:'Araç bildirimleri ve hızlı cevaplar',icon:'bell-ring-outline',color:palette.orange,route:'/notifications',keywords:'bildirim cevap mesaj'},
    {title:'DraBornPark Aile',subtitle:'Aile park paylaşımı ve izinler',icon:'account-group-outline',color:palette.purple,route:'/family',keywords:'aile paylaşım',requiresPlus:true},
    {title:'Geçici Sürücü',subtitle:'Süreli bildirim yönlendirmesi',icon:'account-clock-outline',color:palette.green,route:'/guest',keywords:'geçici sürücü yönlendirme',requiresPlus:true},
    {title:'Acil Durum Zinciri',subtitle:'Öncelikli kişiler ve yüksek öncelik',icon:'shield-alert-outline',color:palette.red,route:'/emergency',keywords:'acil zincir kişi',requiresPlus:true},
    {title:'Gizlilik & Veri',subtitle:'Google Play uyumlu veri ve hesap kontrolleri',icon:'shield-lock-outline',color:palette.aqua,route:'/legal',keywords:'gizlilik veri güvenlik google play silme'},
  ]},
  {title:'Akıllı Modlar',caption:'DraBornPark+ otomasyonları',color:palette.purple,icon:'auto-fix',items:[
    {title:'Vale / Servis',subtitle:'Araç teslimi ve servis durumları',icon:'car-key',color:palette.sky,route:'/modes',badge:'PLUS',keywords:'vale servis',requiresPlus:true},
    {title:'Zaman Kuralları',subtitle:'Gün ve saate göre yönlendir',icon:'calendar-clock-outline',color:palette.pink,route:'/routing',badge:'PLUS',keywords:'zaman kural saat',requiresPlus:true},
    {title:'DraBornPark+',subtitle:'Gelişmiş özellikler ve üyelik',icon:'crown-outline',color:palette.yellow,route:'/feature/plus',badge:'PLUS',keywords:'plus üyelik abonelik'},
    {title:'Bildirim Ayarları',subtitle:'Sessiz saatler ve tercihler',icon:'tune-variant',color:palette.aqua,route:'/settings',keywords:'ayar bildirim sessiz'},
  ]},
  {title:'Hesap & Destek',caption:'Hesap, destek ve yönetim araçları',color:palette.blue,icon:'account-cog-outline',items:[
    {title:'Hesabım',subtitle:'Hesap, veri ve hesap silme',icon:'account-circle-outline',color:palette.blue,route:'/account',keywords:'hesap silme kullanıcı'},
    {title:'Destek Merkezi',subtitle:'Yardım, destek ve talepler',icon:'lifebuoy',color:palette.purple,route:'/feature/support',keywords:'destek yardım'},
    {title:'Üretim Paneli',subtitle:'Etiket üretim ve doğrulama',icon:'factory',color:palette.orange,route:'/factory',keywords:'üretim etiket doğrulama admin',adminOnly:true},
    {title:'Admin Paneli',subtitle:'Zorunlu güncelleme ve yayın kontrolleri',icon:'shield-crown-outline',color:palette.green,route:'/admin',keywords:'admin zorunlu güncelleme yayın politika',adminOnly:true},
  ]},
];

export default function HubScreen(){
  const [query,setQuery]=useState('');
  const [dockSolid,setDockSolid]=useState(false);
  const [isAdmin,setIsAdmin]=useState(false);
  const [dkdPlusActive,setDkdPlusActive]=useState(false);
  const [dkdPlusChecked,setDkdPlusChecked]=useState(false);
  const [dkdPlusPopup,setDkdPlusPopup]=useState(false);
  const [dkdHasTag,setDkdHasTag]=useState<boolean|null>(null);
  const [dkdNoTagPlusPopup,setDkdNoTagPlusPopup]=useState(false);
  const enter=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    Animated.timing(enter,{toValue:1,duration:480,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
    let dkd_mounted=true;
    const dkd_load_admin=async()=>{
      try{
        const {data,error}=await supabase.rpc('drabornpark_is_admin');
        if(error)throw error;
        if(dkd_mounted)setIsAdmin(Boolean(data));
      }catch{
        if(dkd_mounted)setIsAdmin(false);
      }
    };
    void dkd_load_admin();
    return()=>{dkd_mounted=false};
  },[enter]);

  useEffect(()=>{let dkd_alive=true;void loadLiveDashboard().then(dkd_dashboard=>{if(!dkd_alive)return;setDkdPlusActive(hasPlusEntitlement(dkd_dashboard.profile,dkd_dashboard.subscription));setDkdHasTag((dkd_dashboard.tags??[]).length>0);setDkdPlusChecked(true)}).catch(()=>{if(dkd_alive){setDkdPlusActive(false);setDkdHasTag(false);setDkdPlusChecked(true)}});return()=>{dkd_alive=false};},[]);

  const visibleGroups=useMemo(()=>groups.map(group=>({...group,items:group.items.filter(item=>!item.adminOnly||isAdmin)})).filter(group=>group.items.length),[isAdmin]);
  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('tr-TR');if(!q)return visibleGroups;return visibleGroups.map(g=>({...g,items:g.items.filter(i=>`${i.title} ${i.subtitle} ${i.keywords}`.toLocaleLowerCase('tr-TR').includes(q))})).filter(g=>g.items.length)},[query,visibleGroups]);
  const open=(item:MenuItem)=>{if(item.route==='/feature/plus'&&dkdHasTag===false){setDkdNoTagPlusPopup(true);return;}if(item.requiresPlus&&(!dkdPlusChecked||!dkdPlusActive)){setDkdPlusPopup(true);return;}router.push(item.route as any)};

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.purple} secondary={palette.cyan}/><Animated.View style={[s.flex,{opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[12,0]})}]}]}>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onScroll={e=>setDockSolid(e.nativeEvent.contentOffset.y>24)} scrollEventThrottle={16}>
      <ScreenHeader back={false} title="Merkezim" eyebrow="" accent={palette.purple} subtitle="Araç, park, güvenlik ve hesabın tek anlaşılır merkezde" right={<Pill label="v1.0.23" color={palette.purple}/>}/>
      <View style={s.hero}><View style={s.heroBadge}><SafeIcon name="view-dashboard-outline" size={36} color={palette.purple}/><View style={s.heroDot}/></View><View style={{flex:1}}><Text style={s.heroKicker}>KİŞİSEL ARAÇ AĞIN</Text><Text style={s.heroTitle}>Ne yapmak istiyorsun?</Text><Text style={s.heroText}>Ara, kategori seç veya doğrudan karta dokun.</Text><View style={s.spectrum}><View style={[s.bar,{backgroundColor:palette.cyan}]}/><View style={[s.bar,{backgroundColor:palette.purple}]}/><View style={[s.bar,{backgroundColor:palette.pink}]}/><View style={[s.bar,{backgroundColor:palette.orange}]}/><View style={[s.bar,{backgroundColor:palette.green}]}/></View></View></View>
      <View style={s.search}><View style={s.searchIcon}><SafeIcon name="magnify" size={23} color={palette.cyan}/></View><TextInput value={query} onChangeText={setQuery} placeholder="Park, etiket, aile, hesap…" placeholderTextColor={palette.muted2} style={s.searchInput}/>{query?<Pressable onPress={()=>setQuery('')} style={s.clear}><SafeIcon name="close" size={19} color={palette.muted}/></Pressable>:null}</View>
      {!query?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRail}>{visibleGroups.map((g,index)=><View key={g.title} style={[s.category,{borderColor:`${g.color}72`,backgroundColor:`${g.color}16`}]}><View style={[s.categoryIcon,{backgroundColor:`${g.color}2C`}]}><SafeIcon name={g.icon} size={25} color={g.color}/></View><Text style={s.categoryTitle}>{g.title}</Text><View style={s.categoryBottom}><Text style={s.categoryCount}>{g.items.length} özellik</Text><Text style={[s.categoryNo,{color:g.color}]}>0{index+1}</Text></View><View style={[s.categoryLine,{backgroundColor:g.color}]}/></View>)}</ScrollView>:null}
      {filtered.length?filtered.map((group,groupIndex)=><View key={group.title}><SectionHeading title={group.title} subtitle={group.caption} badge={`${group.items.length} ÖZELLİK`} color={group.color}/><View style={s.grid}>{group.items.map((item,itemIndex)=><MenuTile key={item.title} item={item} index={groupIndex*6+itemIndex} onPress={()=>open(item)}/>)}</View></View>):<View style={s.empty}><SafeIcon name="magnify-close" size={38} color={palette.muted}/><Text style={s.emptyTitle}>Sonuç bulunamadı</Text><Text style={s.emptyText}>Daha kısa bir kelimeyle tekrar ara.</Text></View>}
    </ScrollView>
    <ColorPopup visible={dkdNoTagPlusPopup} icon="nfc" eyebrow="ÖNCE ETİKETİNİ BAĞLA" title="Bağlı etiket bulunmuyor" body="DraBornPark+ sayfasını açabilirsin; ancak 14 günlük etiket ödülü, NFC/QR araç iletişimi ve otomatik etiket koruması için hesabına bir DraBornPark etiketi bağlaman gerekir." accent={palette.cyan} secondary={palette.yellow} primaryLabel="DRABORNPARK+ SAYFASINA GİT" onPrimary={()=>{setDkdNoTagPlusPopup(false);router.push('/feature/plus')}} secondaryLabel="ETİKET AKTİVE ET" onSecondary={()=>{setDkdNoTagPlusPopup(false);router.push('/activate/new')}} chips={['14 GÜN ETİKET ÖDÜLÜ','NFC + QR','PLUS']}/>
    <ColorPopup visible={dkdPlusPopup} icon="crown-outline" eyebrow="DRABORNPARK+ GEREKLİ" title="Premium üyelikle açılır" body="Bu özellik için aktif DraBornPark+ aboneliği gerekir. Aboneliğini Google Play üzerinden başlatabilir veya mevcut satın almanı doğrulayabilirsin." accent={palette.yellow} secondary={palette.purple} primaryLabel="DRABORNPARK+ SAYFASINA GİT" onPrimary={()=>{setDkdPlusPopup(false);router.push('/feature/plus')}} secondaryLabel="VAZGEÇ" onSecondary={()=>setDkdPlusPopup(false)} chips={['GOOGLE PLAY','PREMIUM ERİŞİM','GÜVENLİ DOĞRULAMA']}/>
    <BottomDock active="hub" transparent={!dockSolid} floating/>
  </Animated.View></SafeAreaView>;
}

function MenuTile({item,index,onPress}:{item:MenuItem;index:number;onPress:()=>void}){
  const appear=useRef(new Animated.Value(0)).current;
  const scale=useRef(new Animated.Value(1)).current;
  useEffect(()=>{Animated.timing(appear,{toValue:1,duration:360,delay:Math.min(index,16)*24,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()},[appear,index]);
  const press=(v:number)=>Animated.spring(scale,{toValue:v,useNativeDriver:true,speed:36,bounciness:4}).start();
  return <Animated.View style={[s.tileWrap,{opacity:appear,transform:[{translateY:appear.interpolate({inputRange:[0,1],outputRange:[11,0]})},{scale}]}]}><Pressable onPress={onPress} onPressIn={()=>press(.97)} onPressOut={()=>press(1)} style={[s.tile,{borderColor:`${item.color}72`,backgroundColor:`${item.color}14`}]}><View style={s.tileTop}><View style={[s.tileIcon,{backgroundColor:`${item.color}2A`,borderColor:`${item.color}68`}]}><SafeIcon name={item.icon} size={31} color={item.color}/></View>{item.badge?<View style={[s.badge,{borderColor:`${item.color}60`}]}><Text style={[s.badgeText,{color:item.color}]}>{item.badge}</Text></View>:<SafeIcon name="arrow-top-right" size={20} color={item.color}/>}</View><Text numberOfLines={2} style={s.tileTitle}>{item.title}</Text><Text style={s.tileSub}>{item.subtitle}</Text><View style={[s.tileLine,{backgroundColor:item.color}]}/></Pressable></Animated.View>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},flex:{flex:1},scroll:{padding:20,paddingBottom:132},hero:{minHeight:180,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.purple}70`,backgroundColor:`${palette.purple}15`,padding:20,flexDirection:'row',alignItems:'center',gap:16},heroBadge:{width:76,height:76,borderRadius:25,borderWidth:1,borderColor:`${palette.purple}78`,backgroundColor:`${palette.purple}28`,alignItems:'center',justifyContent:'center'},heroDot:{position:'absolute',right:8,top:8,width:10,height:10,borderRadius:5,backgroundColor:palette.aqua},heroKicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:1.2},heroTitle:{color:palette.text,fontSize:28,fontWeight:'900',letterSpacing:-.8,marginTop:5},heroText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:7},spectrum:{height:4,flexDirection:'row',gap:3,marginTop:13},bar:{flex:1,borderRadius:99},search:{height:64,borderRadius:23,borderWidth:1,borderColor:`${palette.cyan}60`,backgroundColor:palette.glassStrong,marginTop:14,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10},searchIcon:{width:40,height:40,borderRadius:14,borderWidth:1,borderColor:`${palette.cyan}60`,backgroundColor:`${palette.cyan}20`,alignItems:'center',justifyContent:'center'},searchInput:{flex:1,color:palette.text,fontSize:type.body},clear:{width:36,height:36,borderRadius:12,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},categoryRail:{gap:10,paddingTop:13,paddingRight:10},category:{width:154,minHeight:112,borderRadius:24,borderWidth:1,padding:13,overflow:'hidden'},categoryIcon:{width:43,height:43,borderRadius:14,alignItems:'center',justifyContent:'center'},categoryTitle:{color:palette.text,fontSize:14,fontWeight:'900',marginTop:9},categoryBottom:{marginTop:'auto',flexDirection:'row',justifyContent:'space-between'},categoryCount:{color:palette.muted2,fontSize:type.micro},categoryNo:{fontSize:12,fontWeight:'900'},categoryLine:{position:'absolute',left:12,right:12,bottom:0,height:4,borderRadius:99},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tileWrap:{width:'48.4%'},tile:{minHeight:188,borderRadius:27,borderWidth:1,padding:14,overflow:'hidden'},tileTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},tileIcon:{width:58,height:58,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center'},tileTitle:{color:palette.text,fontSize:17,fontWeight:'900',marginTop:14},tileSub:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:5,flex:1},tileLine:{position:'absolute',left:13,right:13,bottom:0,height:4,borderRadius:99},badge:{borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:5},badgeText:{fontSize:10,fontWeight:'900'},empty:{padding:35,alignItems:'center'},emptyTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginTop:10},emptyText:{color:palette.muted,fontSize:type.caption,marginTop:5}});
