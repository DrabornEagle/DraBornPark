import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, BottomDock, NotificationBell, SectionHeading } from '@/src/components/AppChrome';
import { MetricChip, Pill, SafeIcon } from '@/src/components/Primitives';
import { DemoSection, useDemo } from '@/src/demo/DemoContext';
import { calculateMonthlyInsights } from '@/src/lib/extras';
import { bootstrapProfile, hasPlusEntitlement, LiveDashboard, loadLiveDashboard, uploadProfileAvatar } from '@/src/lib/drabornpark';
import { supabase } from '@/src/lib/supabase';
import { palette, type } from '@/src/theme';

type Quick = { icon:string; color:string; title:string; detail:string; route?:string; demo?:DemoSection };
const liveQuick: Quick[] = [
  { icon:'car-multiple', color:palette.blue, title:'Araçlarım', detail:'Araç profilleri', route:'/vehicle' },
  { icon:'nfc', color:palette.cyan, title:'Etiketler', detail:'NFC + QR', route:'/tags' },
  { icon:'account-group-outline', color:palette.purple, title:'Aile', detail:'Paylaşım ağı', route:'/family' },
  { icon:'history', color:palette.green, title:'Araç Geçmişi', detail:'Son olaylar', route:'/timeline' },
  { icon:'car-key', color:palette.orange, title:'Vale / Servis', detail:'Akıllı modlar', route:'/modes' },
];
const demoQuick: Quick[] = [
  { icon:'car-multiple', color:palette.blue, title:'Araçlarım', detail:'3 demo araç', demo:'vehicles' },
  { icon:'nfc', color:palette.cyan, title:'Etiketler', detail:'NFC + QR', demo:'tags' },
  { icon:'account-group-outline', color:palette.purple, title:'Aile', detail:'İzinler', demo:'family' },
  { icon:'history', color:palette.green, title:'Araç Geçmişi', detail:'Olaylar', demo:'timeline' },
  { icon:'car-key', color:palette.orange, title:'Vale / Servis', detail:'Durumlar', demo:'modes' },
];

export default function HomeScreen(){
  const demo=useDemo();
  const [session,setSession]=useState<any>(null);
  const [live,setLive]=useState<LiveDashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const enter=useRef(new Animated.Value(0)).current;

  const load=useCallback(async(current:any,silent=false)=>{
    if(!silent)setLoading(true);
    try{
      if(!current){setLive(null);return;}
      const username=current.user?.user_metadata?.username||current.user?.user_metadata?.display_name||current.user?.email?.split('@')[0]||undefined;
      await bootstrapProfile(username,username);
      setLive(await loadLiveDashboard());
    }finally{if(!silent)setLoading(false)}
  },[]);

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(async({data})=>{if(!mounted)return;setSession(data.session);await load(data.session)});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(next)load(next);else{setLive(null);setLoading(false)}});
    Animated.timing(enter,{toValue:1,duration:520,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
    return()=>{mounted=false;listener.subscription.unsubscribe()};
  },[enter,load]);

  async function refresh(){setRefreshing(true);try{if(session)await load(session,true)}finally{setRefreshing(false)}}
  async function signOut(){await supabase.auth.signOut();setSession(null);setLive(null)}

  if(loading)return <Loading/>;
  if(!session&&!demo.active)return <Welcome onDemo={()=>{demo.start();Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}}/>;
  if(!session&&demo.active)return <DemoHome enter={enter}/>;
  return <LiveHome live={live} session={session} refresh={refresh} refreshing={refreshing} signOut={signOut} enter={enter}/>;
}

function Loading(){
  const spin=useRef(new Animated.Value(0)).current;
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const a=Animated.loop(Animated.timing(spin,{toValue:1,duration:2500,easing:Easing.linear,useNativeDriver:true}));
    const b=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:900,useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:900,useNativeDriver:true})]));
    a.start();b.start();return()=>{a.stop();b.stop()};
  },[pulse,spin]);
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan} secondary={palette.purple}/><View style={s.loading}>
    <View style={s.loadingStage}>
      <Animated.View style={[s.loadingOrbit,{transform:[{rotate:spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}]}/>
      <Animated.View style={[s.loadingCore,{transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[.96,1.045]})}]}]}><SafeIcon name="car-connected" size={45} color={palette.cyan}/></Animated.View>
    </View>
    <Text style={s.loadingTitle}>DraBornPark</Text><Text style={s.loadingText}>Kişisel araç ağın hazırlanıyor…</Text>
  </View></SafeAreaView>;
}

function Welcome({onDemo}:{onDemo:()=>void}){
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.purple} secondary={palette.cyan}/><ScrollView contentContainerStyle={s.welcome} showsVerticalScrollIndicator={false}>
    <View style={s.welcomeTop}><View style={s.brandOrb}><SafeIcon name="shield-car" size={30} color={palette.cyan}/></View><View style={{flex:1}}><Text style={s.brand}>DraBornPark</Text><Text style={s.brandSub}>KİŞİSEL ARAÇ AĞI</Text></View><Pill label="v0.5.0" color={palette.purple}/></View>
    <View style={s.welcomeHero}><Spectrum/><Text style={s.welcomeEyebrow}>ARACININ DİJİTAL KOKPİTİ</Text><Text style={s.welcomeTitle}>Park, güvenlik ve iletişim tek yerde.</Text><Text style={s.welcomeBody}>Telefon numaranı araçta bırakmadan ulaşılabilir ol. Park yerini hatırla, NFC + QR bildirimlerini yönet ve kişisel araç ağını güvenle kullan.</Text><View style={s.welcomePills}><StatusPill icon="phone-lock" text="NUMARA GİZLİ" color={palette.green}/><StatusPill icon="nfc" text="NFC + QR" color={palette.cyan}/></View></View>
    <View style={s.promiseGrid}><Promise icon="map-marker-radius" color={palette.orange} title="Park hafızası" body="GPS, kat, sıra ve park no."/><Promise icon="bell-badge-outline" color={palette.pink} title="Güvenli bildirim" body="Aracın için anonim haber al."/><Promise icon="account-group-outline" color={palette.purple} title="Aile paylaşımı" body="İzin verdiğin kişilerle paylaş."/><Promise icon="history" color={palette.green} title="Araç geçmişi" body="Park ve olayları tek yerde gör."/></View>
    <WelcomeAuthButton/>
    <Pressable onPress={onDemo} style={({pressed})=>[s.demoButton,pressed&&s.pressed]}><SafeIcon name="flask-outline" size={28} color={palette.yellow}/><View style={{flex:1}}><Text style={s.demoTitle}>TAM DEMOYU AÇ</Text><Text style={s.demoBody}>v0.5.0 içeriklerini gerçek hesabını değiştirmeden dene.</Text></View><SafeIcon name="chevron-right" size={23} color={palette.yellow}/></Pressable>
  </ScrollView></SafeAreaView>;
}

function WelcomeAuthButton(){
  const pulse=useRef(new Animated.Value(0)).current;
  const sweep=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const p=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:820,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:820,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.delay(450)]));
    const q=Animated.loop(Animated.timing(sweep,{toValue:1,duration:2400,easing:Easing.linear,useNativeDriver:true}));
    p.start();q.start();return()=>{p.stop();q.stop()};
  },[pulse,sweep]);
  return <Animated.View style={{transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.012]})}]}}><Pressable onPress={()=>router.push('/auth')} style={({pressed})=>[s.primary,pressed&&s.pressed]}>
    <Animated.View pointerEvents="none" style={[s.primarySweep,{transform:[{translateX:sweep.interpolate({inputRange:[0,1],outputRange:[-130,430]})},{rotate:'13deg'}]}]}/>
    <View style={s.primaryIcon}><SafeIcon name="account-arrow-right-outline" size={28} color={palette.cyan}/><View style={s.primaryIconDot}/></View><View style={{flex:1,minWidth:0}}><Text style={s.primaryKicker}>GÜVENLİ HESAP</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={s.primaryTitle}>GİRİŞ YAP / KAYIT OL</Text><Text style={s.primarySub}>Canlı hesabını aç</Text></View><Animated.View style={{transform:[{translateX:pulse.interpolate({inputRange:[0,1],outputRange:[0,5]})}]}}><SafeIcon name="arrow-right" size={27} color={palette.cyan}/></Animated.View>
    <View style={s.primarySpectrum}><View style={[s.primaryBar,{backgroundColor:palette.cyan}]}/><View style={[s.primaryBar,{backgroundColor:palette.purple}]}/><View style={[s.primaryBar,{backgroundColor:palette.pink}]}/><View style={[s.primaryBar,{backgroundColor:palette.orange}]}/><View style={[s.primaryBar,{backgroundColor:palette.green}]}/></View>
  </Pressable></Animated.View>;
}

function LiveHome({live,session,refresh,refreshing,signOut,enter}:{live:LiveDashboard|null;session:any;refresh:()=>void;refreshing:boolean;signOut:()=>void;enter:Animated.Value}){
  const [dockSolid,setDockSolid]=useState(false);
  const vehicle=live?.vehicles?.[0];
  const tag=vehicle?live?.tags.find((x:any)=>x.vehicle_id===vehicle.id):live?.tags?.[0];
  const park=live?.parks?.find((x:any)=>!x.ended_at)??live?.parks?.[0];
  const unread=live?.reports?.filter((x:any)=>!x.seen_at).length??0;
  const plus=hasPlusEntitlement(live?.profile??null,live?.subscription??null);
  const insights=useMemo(()=>calculateMonthlyInsights(live?.parks??[],live?.reports??[]),[live]);
  const name=live?.profile?.username||live?.profile?.display_name||session?.user?.user_metadata?.username||session?.user?.email?.split('@')[0]||'DraBornPark';
  const goToCar=()=>{if(park?.latitude&&park?.longitude)Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${park.latitude},${park.longitude}&travelmode=walking`)};

  async function editAvatar(){
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){Alert.alert('Fotoğraf izni gerekli','Profil resmini değiştirmek için fotoğraf arşivine erişim izni vermelisin.');return;}
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'] as ImagePicker.MediaType[],allowsEditing:true,aspect:[1,1],quality:.82});
      if(result.canceled||!result.assets?.[0])return;
      const asset:any=result.assets[0];
      await uploadProfileAvatar({uri:asset.uri,mimeType:asset.mimeType,fileName:asset.fileName});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    }catch(e:any){Alert.alert('Profil resmi değiştirilemedi',e?.message||'Lütfen tekrar dene.')}
  }

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan} secondary={palette.purple}/><Animated.View style={[s.flex,{opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[12,0]})}]}]}>
    <ScrollView contentContainerStyle={s.scrollWithDock} showsVerticalScrollIndicator={false} onScroll={e=>setDockSolid(e.nativeEvent.contentOffset.y>24)} scrollEventThrottle={16} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.cyan}/> }>
      <Greeting name={name} subtitle="Aracının bugünkü durumunu tek bakışta gör" avatarUrl={live?.profile?.avatar_url} onAvatarPress={editAvatar} onAccount={()=>router.push('/account')} unread={unread}/>
      <VehicleCore vehicle={vehicle} tag={tag?.tag_code} plus={plus}/>
      <SectionHeading title="Hızlı Erişim" subtitle="En sık kullandığın alanlar"/><QuickRail items={liveQuick} open={item=>item.route&&router.push(item.route as any)}/>
      <View style={s.primaryRow}><HeroAction icon="map-marker-plus-outline" color={palette.cyan} title="PARK ETTİM" detail="Konumu ve park detayını kaydet" onPress={()=>router.push('/park')}/><HeroAction icon="navigation-variant" color={palette.orange} title="ARACIMA GİT" detail={park?.place_name||'Aktif park yok'} onPress={goToCar} disabled={!park?.latitude}/></View>
      {park?<ParkPulse park={park}/>:null}
      <SectionHeading title="Bugünkü durum" subtitle="Önemli bilgilerin hızlı özeti" badge={unread?`${unread} YENİ`:'TEMİZ'} color={unread?palette.orange:palette.green}/>
      <View style={s.metricRow}><MetricChip icon="bell-outline" color={palette.orange} value={String(unread)} label="Yeni bildirim"/><MetricChip icon="parking" color={palette.cyan} value={String(insights.parks)} label="Bu ay park"/><MetricChip icon="nfc" color={tag?palette.green:palette.muted} value={tag?'AKTİF':'YOK'} label="Etiket"/></View>
      <View style={s.featurePair}><FeatureCard icon="chart-donut" color={palette.green} title="İstatistiklerim" body={`${insights.parks} park • ${insights.reports} bildirim`} onPress={()=>router.push('/insights')}/><FeatureCard icon="view-grid-outline" color={palette.purple} title="Merkezim" body="Tüm özelliklere tek yerden ulaş" onPress={()=>router.push('/hub')}/></View>
      <SectionHeading title="Son olay" subtitle="Araç geçmişindeki en yeni kayıt"/>
      <Pressable onPress={()=>router.push('/timeline')} style={({pressed})=>[s.event,pressed&&s.pressed]}><View style={s.eventIcon}><SafeIcon name="history" size={27} color={palette.pink}/></View><View style={{flex:1}}><Text style={s.eventTitle}>{live?.timeline?.[0]?.title||'Araç geçmişi henüz boş'}</Text><Text style={s.eventBody}>{live?.timeline?.[0]?.description||'İlk park veya araç bildiriminle geçmişin başlayacak.'}</Text></View><SafeIcon name="arrow-right" size={22} color={palette.pink}/></Pressable>
      <Pressable onPress={signOut} style={s.signOut}><SafeIcon name="logout" size={20} color={palette.muted2}/><Text style={s.signOutText}>Oturumu kapat</Text></Pressable>
    </ScrollView>
    <BottomDock active="home" onHub={()=>router.push('/hub')} transparent={!dockSolid} floating/>
  </Animated.View></SafeAreaView>;
}

function DemoHome({enter}:{enter:Animated.Value}){
  const demo=useDemo();
  const st=demo.state;
  const [dockSolid,setDockSolid]=useState(false);
  const vehicle=st.vehicles.find((v:any)=>v.active)||st.vehicles[0];
  const park=st.parks.find((p:any)=>!p.endedAt)||st.parks[0];
  const unread=st.notifications.filter((n:any)=>!n.seen).length;
  const open=(section:DemoSection)=>router.push({pathname:'/demo/[section]',params:{section}} as any);
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.yellow} secondary={palette.purple}/><Animated.View style={[s.flex,{opacity:enter}]}>
    <ScrollView contentContainerStyle={s.scrollWithDock} showsVerticalScrollIndicator={false} onScroll={e=>setDockSolid(e.nativeEvent.contentOffset.y>24)} scrollEventThrottle={16}>
      <Greeting name={st.profile.username||st.profile.displayName} subtitle="Demo alanı canlı hesabından tamamen ayrı" demo onAccount={demo.stop} unread={unread}/>
      <View style={s.demoNotice}><SafeIcon name="flask-outline" size={27} color={palette.yellow}/><View style={{flex:1}}><Text style={s.demoNoticeTitle}>Tam Demo Alanı</Text><Text style={s.demoNoticeBody}>v0.5.0 park, bildirim, etiket, aile ve mod verileri test için hazır.</Text></View><Pressable onPress={demo.reset} style={s.demoReset}><SafeIcon name="refresh" size={20} color={palette.yellow}/></Pressable></View>
      <VehicleCore vehicle={{vehicle_name:vehicle.name,plate:vehicle.plate,brand:vehicle.brand,model:vehicle.model,color:vehicle.color,vehicle_type:vehicle.type}} tag={vehicle.tagCode} plus/>
      <SectionHeading title="Hızlı Erişim" subtitle="Demo içeriklerinin tamamını test et"/><QuickRail items={demoQuick} open={item=>item.demo&&open(item.demo)}/>
      <View style={s.primaryRow}><HeroAction icon="map-marker-plus-outline" color={palette.cyan} title="PARK ETTİM" detail="Demo park oluştur" onPress={()=>router.push('/park')}/><HeroAction icon="qrcode-scan" color={palette.orange} title="DIŞ QR / NFC" detail="Web deneyimini test et" onPress={()=>open('public')}/></View>
      <ParkPulse park={{place_name:park.placeName,floor_code:park.floor,zone_color:park.zoneColor,row_code:park.row,bay_code:park.bay}}/>
      <SectionHeading title="Demo durumu" subtitle="Oturum içindeki canlı değerler" badge={`${unread} YENİ`} color={palette.yellow}/>
      <View style={s.metricRow}><MetricChip icon="bell-outline" color={palette.orange} value={String(unread)} label="Yeni bildirim"/><MetricChip icon="parking" color={palette.cyan} value={String(st.stats.parksThisMonth)} label="Bu ay park"/><MetricChip icon="shield-check-outline" color={palette.green} value={`${st.stats.privacyScore}%`} label="Gizlilik"/></View>
      <View style={s.featurePair}><FeatureCard icon="chart-donut" color={palette.green} title="İstatistiklerim" body="Demo istatistiklerini incele" onPress={()=>router.push('/insights')}/><FeatureCard icon="view-grid-outline" color={palette.purple} title="Merkezim" body="Bütün modülleri aç" onPress={()=>router.push('/hub')}/></View>
    </ScrollView>
    <BottomDock active="home" onHub={()=>router.push('/hub')} transparent={!dockSolid} floating/>
  </Animated.View></SafeAreaView>;
}

function Greeting({name,subtitle,onAccount,demo=false,avatarUrl,onAvatarPress,unread=0}:{name:string;subtitle:string;onAccount:()=>void;demo?:boolean;avatarUrl?:string|null;onAvatarPress?:()=>void;unread?:number}){
  const accent=demo?palette.yellow:palette.pink;
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(demo)return;
    const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:760,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:760,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.delay(700)]));
    loop.start();return()=>loop.stop();
  },[demo,pulse]);
  const avatar=<View style={[s.greetingAvatar,{borderColor:`${accent}90`,backgroundColor:`${accent}24`}]}>{avatarUrl?<Image source={{uri:avatarUrl}} style={s.avatarImage}/>:<SafeIcon name={demo?'flask-outline':'account-circle-outline'} size={39} color={accent}/>}<View style={[s.avatarDot,{backgroundColor:demo?palette.yellow:palette.green}]}/>{!demo?<View style={s.avatarEdit}><SafeIcon name="camera-plus-outline" size={14} color={palette.ink}/></View>:null}</View>;
  return <View style={[s.greeting,{borderColor:`${accent}82`}]}>
    <Spectrum/>
    <View style={s.greetingTopRow}>
      {demo?avatar:<Pressable accessibilityLabel="Profil resmini değiştir" onPress={onAvatarPress}>{avatar}</Pressable>}
      <View style={s.greetingText}><Text style={[s.greetingEyebrow,{color:accent}]}>{demo?'DEMO KOKPİTİ':'KİŞİSEL KOKPİT'}</Text><Text numberOfLines={2} style={s.greetingName}>Merhaba, {name}</Text><Text style={s.greetingSub}>{subtitle}</Text></View>
      <View style={s.greetingActions}><NotificationBell countOverride={unread}/><Animated.View style={{transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.1]})}],opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.72,1]})}}><Pressable onPress={onAccount} style={[s.accountButton,{borderColor:`${accent}88`,backgroundColor:`${accent}20`}]}><SafeIcon name={demo?'close':'account-cog-outline'} size={24} color={accent}/></Pressable></Animated.View></View>
    </View>
    <View style={s.greetingDivider}/>
    <View style={s.badgeRow}><StatusPill compact icon={demo?'flask-outline':'shield-check-outline'} text={demo?'DEMO MODU':'GÜVENLİ OTURUM'} color={demo?palette.yellow:palette.green}/><StatusPill compact icon="car-connected" text="ARAÇ AĞI" color={palette.cyan}/><StatusPill compact icon="lock-check-outline" text="ÖZEL" color={palette.purple}/></View>
  </View>;
}

function VehicleCore({vehicle,tag,plus}:{vehicle:any;tag?:string;plus:boolean}){
  const pulse=useRef(new Animated.Value(0)).current;
  const scan=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const p=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:1000,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:1000,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})]));
    const q=Animated.loop(Animated.timing(scan,{toValue:1,duration:3800,easing:Easing.linear,useNativeDriver:true}));
    p.start();q.start();return()=>{p.stop();q.stop()};
  },[pulse,scan]);
  if(!vehicle)return <Pressable onPress={()=>router.push('/vehicle')} style={s.emptyVehicle}><SafeIcon name="car-plus" size={40} color={palette.cyan}/><Text style={s.emptyTitle}>İlk aracını ekle</Text><Text style={s.emptyBody}>Araç profilini oluştur, ardından NFC + QR etiketini bağla.</Text><View style={s.emptyCta}><Text style={s.emptyCtaText}>ARAÇ EKLE</Text><SafeIcon name="arrow-right" size={19} color={palette.ink}/></View></Pressable>;
  const accent=vehicle.vehicle_type==='motorcycle'?palette.purple:palette.cyan;
  const tagColor=tag?palette.green:palette.orange;
  return <Animated.View style={[s.vehicleCore,{borderColor:`${accent}92`,transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.005]})}]}]}>
    <Animated.View pointerEvents="none" style={[s.vehicleSweep,{backgroundColor:`${palette.blue}12`,transform:[{translateX:scan.interpolate({inputRange:[0,1],outputRange:[-120,720]})},{rotate:'12deg'}]}]}/>
    <Spectrum/>
    <View style={s.vehicleHeader}><Animated.View style={[s.liveBadge,{transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.04]})}]}]}><Animated.View style={[s.liveDot,{opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.5,1]})}]}/><Text style={s.liveText}>CANLI ARAÇ</Text></Animated.View><Pill label={plus?'PLUS':'TEMEL'} color={plus?palette.yellow:palette.blue} icon={plus?'crown-outline':'shield-outline'}/></View>
    <View style={s.vehicleMain}><Animated.View style={[s.vehicleIconFrame,{borderColor:`${accent}92`,backgroundColor:`${accent}20`,transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.025]})}]}]}><View style={[s.vehicleIcon,{backgroundColor:`${accent}30`}]}><SafeIcon name={vehicle.vehicle_type==='motorcycle'?'motorbike':'car-connected'} size={43} color={accent}/></View><View style={s.onlineDot}/><View style={s.iconAccent}/></Animated.View><View style={{flex:1,minWidth:0}}><Text style={[s.coreEyebrow,{color:accent}]}>AKTİF ARAÇ</Text><Text numberOfLines={1} style={s.coreName}>{vehicle.vehicle_name}</Text><View style={s.plateRow}><SafeIcon name="card-text-outline" size={16} color={accent}/><Text numberOfLines={1} style={[s.corePlate,{color:accent}]}>{vehicle.plate||'Plaka gizli'}</Text></View><Text numberOfLines={1} style={s.coreMeta}>{[vehicle.brand,vehicle.model,vehicle.color].filter(Boolean).join(' • ')}</Text></View></View>
    <View style={s.statusGrid}><VehicleStatus icon={tag?'nfc-variant':'qrcode-scan'} label="ETİKET DURUMU" value={tag?'NFC + QR AKTİF':'ETİKET BEKLİYOR'} color={tagColor}/><VehicleStatus icon="shield-lock-outline" label="GİZLİLİK" value="KORUMALI" color={palette.green}/></View>
    <View style={s.vehicleBottomSpectrum}><View style={[s.bottomColor,{backgroundColor:accent,flex:2}]}/><View style={[s.bottomColor,{backgroundColor:palette.pink}]}/><View style={[s.bottomColor,{backgroundColor:palette.orange}]}/><View style={[s.bottomColor,{backgroundColor:palette.green}]}/></View>
  </Animated.View>;
}

function VehicleStatus({icon,label,value,color}:{icon:string;label:string;value:string;color:string}){return <View style={[s.vehicleStatus,{borderColor:`${color}6A`,backgroundColor:`${color}14`}]}><View style={[s.vehicleStatusIcon,{backgroundColor:`${color}28`}]}><SafeIcon name={icon} size={24} color={color}/></View><View style={{flex:1,minWidth:0}}><Text style={s.vehicleStatusLabel}>{label}</Text><Text numberOfLines={1} style={[s.vehicleStatusValue,{color}]}>{value}</Text></View></View>}
function Spectrum(){return <View style={s.spectrum}><View style={[s.spectrumBar,{backgroundColor:palette.cyan}]}/><View style={[s.spectrumBar,{backgroundColor:palette.blue}]}/><View style={[s.spectrumBar,{backgroundColor:palette.pink}]}/><View style={[s.spectrumBar,{backgroundColor:palette.orange}]}/><View style={[s.spectrumBar,{backgroundColor:palette.green}]}/></View>}
function StatusPill({icon,text,color,compact=false}:{icon:string;text:string;color:string;compact?:boolean}){return <View style={[s.statusPill,{borderColor:`${color}60`,backgroundColor:`${color}14`},compact&&s.statusPillCompact]}><SafeIcon name={icon} size={compact?13:16} color={color}/><Text numberOfLines={1} style={[s.statusPillText,{color},compact&&s.statusTextCompact]}>{text}</Text></View>}
function Promise({icon,color,title,body}:{icon:string;color:string;title:string;body:string}){return <View style={[s.promise,{borderColor:`${color}58`,backgroundColor:`${color}10`}]}><View style={[s.promiseIcon,{backgroundColor:`${color}22`}]}><SafeIcon name={icon} size={26} color={color}/></View><Text style={s.promiseTitle}>{title}</Text><Text style={s.promiseBody}>{body}</Text><View style={[s.cardLine,{backgroundColor:color}]}/></View>}
function QuickRail({items,open}:{items:Quick[];open:(item:Quick)=>void}){return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRail}>{items.map(item=><Pressable key={item.title} onPress={()=>open(item)} style={({pressed})=>[s.quickCard,{borderColor:`${item.color}68`,backgroundColor:`${item.color}12`},pressed&&s.pressed]}><View style={[s.quickIcon,{backgroundColor:`${item.color}26`,borderColor:`${item.color}60`}]}><SafeIcon name={item.icon} size={27} color={item.color}/></View><Text style={s.quickTitle}>{item.title}</Text><Text style={s.quickBody}>{item.detail}</Text><View style={s.quickFooter}><Text style={[s.quickOpen,{color:item.color}]}>AÇ</Text><SafeIcon name="arrow-right" size={18} color={item.color}/></View><View style={[s.cardLine,{backgroundColor:item.color}]}/></Pressable>)}</ScrollView>}
function HeroAction({icon,color,title,detail,onPress,disabled}:{icon:string;color:string;title:string;detail:string;onPress:()=>void;disabled?:boolean}){return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[s.heroAction,{borderColor:`${color}72`,backgroundColor:disabled?palette.panel:`${color}13`,opacity:disabled?.45:pressed?.72:1}]}><View style={[s.heroActionIcon,{backgroundColor:`${color}25`,borderColor:`${color}64`}]}><SafeIcon name={icon} size={31} color={color}/></View><Text style={s.heroActionTitle}>{title}</Text><Text numberOfLines={2} style={s.heroActionBody}>{detail}</Text><View style={[s.heroArrow,{borderColor:`${color}55`}]}><SafeIcon name="arrow-top-right" size={18} color={color}/></View><View style={[s.cardLine,{backgroundColor:color}]}/></Pressable>}
function FeatureCard({icon,color,title,body,onPress}:{icon:string;color:string;title:string;body:string;onPress:()=>void}){return <Pressable onPress={onPress} style={({pressed})=>[s.featureCard,{borderColor:`${color}68`,backgroundColor:`${color}12`},pressed&&s.pressed]}><View style={[s.featureIcon,{backgroundColor:`${color}26`}]}><SafeIcon name={icon} size={28} color={color}/></View><Text style={s.featureTitle}>{title}</Text><Text style={s.featureBody}>{body}</Text><SafeIcon name="arrow-top-right" size={19} color={color}/><View style={[s.cardLine,{backgroundColor:color}]}/></Pressable>}
function ParkPulse({park}:{park:any}){return <View style={s.parkPulse}><View style={s.parkPulseIcon}><SafeIcon name="map-marker-check" size={28} color={palette.orange}/></View><View style={{flex:1,minWidth:0}}><Text style={s.parkLabel}>SON PARK</Text><Text numberOfLines={1} style={s.parkTitle}>{park.place_name||'Kaydedilen konum'}</Text><Text numberOfLines={1} style={s.parkBody}>{[park.floor_code,park.zone_color,`${park.row_code||''}${park.bay_code||''}`].filter(Boolean).join(' • ')||'GPS park konumu'}</Text></View><SafeIcon name="chevron-right" size={24} color={palette.orange}/><View style={[s.cardLine,{backgroundColor:palette.orange}]}/></View>}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},flex:{flex:1},scrollWithDock:{padding:18,paddingBottom:132},pressed:{opacity:.75,transform:[{scale:.985}]},
  loading:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:24},loadingStage:{width:154,height:154,alignItems:'center',justifyContent:'center'},loadingOrbit:{position:'absolute',width:126,height:126,borderRadius:63,borderWidth:2,borderColor:`${palette.cyan}55`,borderTopColor:palette.purple,borderRightColor:palette.pink},loadingCore:{width:88,height:88,borderRadius:30,borderWidth:1,borderColor:`${palette.cyan}88`,backgroundColor:`${palette.cyan}1D`,alignItems:'center',justifyContent:'center'},loadingTitle:{color:palette.text,fontSize:30,fontWeight:'900',marginTop:14},loadingText:{color:palette.muted,fontSize:type.body,marginTop:8,textAlign:'center'},
  welcome:{padding:20,paddingBottom:50},welcomeTop:{flexDirection:'row',alignItems:'center',gap:12},brandOrb:{width:58,height:58,borderRadius:19,borderWidth:1,borderColor:`${palette.cyan}68`,backgroundColor:`${palette.cyan}18`,alignItems:'center',justifyContent:'center'},brand:{color:palette.text,fontSize:21,fontWeight:'900'},brandSub:{color:palette.muted2,fontSize:type.micro,fontWeight:'900',letterSpacing:1},welcomeHero:{marginTop:22,borderRadius:32,borderWidth:1,borderColor:`${palette.purple}6A`,backgroundColor:palette.glass,padding:19,overflow:'hidden'},welcomeEyebrow:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:1.2,marginTop:17},welcomeTitle:{color:palette.text,fontSize:33,fontWeight:'900',lineHeight:38,letterSpacing:-1,marginTop:5},welcomeBody:{color:palette.muted,fontSize:type.body,lineHeight:23,marginTop:12},welcomePills:{flexDirection:'row',gap:8,marginTop:17},promiseGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:18},promise:{width:'48.4%',minHeight:154,borderRadius:24,borderWidth:1,padding:14,overflow:'hidden'},promiseIcon:{width:47,height:47,borderRadius:15,alignItems:'center',justifyContent:'center'},promiseTitle:{color:palette.text,fontSize:16,fontWeight:'900',marginTop:12},promiseBody:{color:palette.muted,fontSize:12.5,lineHeight:18,marginTop:5},primary:{minHeight:92,borderRadius:26,backgroundColor:'#092C39',borderWidth:1,borderColor:`${palette.cyan}88`,marginTop:20,padding:14,flexDirection:'row',alignItems:'center',gap:12,overflow:'hidden'},primarySweep:{position:'absolute',top:-18,bottom:-18,width:76,backgroundColor:'#FFFFFF18'},primaryIcon:{width:54,height:54,borderRadius:18,borderWidth:1,borderColor:`${palette.aqua}90`,backgroundColor:`${palette.aqua}20`,alignItems:'center',justifyContent:'center'},primaryIconDot:{position:'absolute',width:9,height:9,borderRadius:5,right:5,top:5,backgroundColor:palette.pink},primaryKicker:{color:palette.aqua,fontSize:9.5,fontWeight:'900',letterSpacing:1.05,marginBottom:2},primaryTitle:{color:palette.text,fontSize:17,fontWeight:'900'},primarySub:{color:palette.muted,fontSize:type.caption,marginTop:2},primarySpectrum:{position:'absolute',left:14,right:14,bottom:0,height:5,flexDirection:'row',gap:3},primaryBar:{flex:1,borderRadius:99},demoButton:{minHeight:82,borderRadius:24,borderWidth:1,borderColor:`${palette.yellow}58`,backgroundColor:`${palette.yellow}10`,marginTop:11,padding:14,flexDirection:'row',alignItems:'center',gap:12},demoTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},demoBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:3},
  spectrum:{height:6,flexDirection:'row',gap:4},spectrumBar:{flex:1,borderRadius:99},statusPill:{borderWidth:1,borderRadius:999,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6},statusPillCompact:{paddingHorizontal:7,paddingVertical:6,gap:4,flexShrink:1},statusPillText:{fontSize:11,fontWeight:'900',letterSpacing:.42},statusTextCompact:{fontSize:9.2,letterSpacing:.16},
  greeting:{borderRadius:32,borderWidth:1,backgroundColor:'#191129',padding:15,overflow:'hidden',marginBottom:13},greetingTopRow:{flexDirection:'row',alignItems:'center',gap:11,marginTop:14},greetingText:{flex:1,minWidth:0},greetingAvatar:{width:67,height:67,borderRadius:23,borderWidth:1,alignItems:'center',justifyContent:'center'},avatarImage:{width:'100%',height:'100%',borderRadius:22},avatarDot:{position:'absolute',width:11,height:11,borderRadius:6,right:6,bottom:6,borderWidth:2,borderColor:'#191129'},avatarEdit:{position:'absolute',right:-5,top:-5,width:25,height:25,borderRadius:9,backgroundColor:palette.aqua,borderWidth:2,borderColor:'#191129',alignItems:'center',justifyContent:'center'},greetingEyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.45},greetingName:{color:palette.text,fontSize:27,fontWeight:'900',letterSpacing:-.7,marginTop:2},greetingSub:{color:'#C6C2DB',fontSize:type.caption,lineHeight:19,marginTop:4},greetingActions:{alignItems:'center',gap:7},accountButton:{width:44,height:44,borderRadius:15,borderWidth:1,alignItems:'center',justifyContent:'center'},greetingDivider:{height:1,backgroundColor:'#FFFFFF16',marginTop:14},badgeRow:{flexDirection:'row',gap:5,justifyContent:'space-between',marginTop:12},
  vehicleCore:{borderRadius:32,borderWidth:1,backgroundColor:'#062833',padding:15,overflow:'hidden'},vehicleSweep:{position:'absolute',top:-30,bottom:-30,width:94},vehicleHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:13,marginBottom:12},liveBadge:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:`${palette.green}5F`,backgroundColor:`${palette.green}13`,borderRadius:999,paddingHorizontal:10,paddingVertical:7},liveDot:{width:8,height:8,borderRadius:4,backgroundColor:palette.green},liveText:{color:palette.green,fontSize:11,fontWeight:'900',letterSpacing:.65},vehicleMain:{flexDirection:'row',alignItems:'center',gap:12},vehicleIconFrame:{width:82,height:82,borderRadius:28,borderWidth:1,alignItems:'center',justifyContent:'center'},vehicleIcon:{width:64,height:64,borderRadius:22,alignItems:'center',justifyContent:'center'},onlineDot:{position:'absolute',right:6,bottom:6,width:12,height:12,borderRadius:6,backgroundColor:palette.green,borderWidth:2,borderColor:'#062833'},iconAccent:{position:'absolute',left:-5,top:12,width:8,height:28,borderRadius:8,backgroundColor:palette.pink},coreEyebrow:{fontSize:type.micro,fontWeight:'900',letterSpacing:1},coreName:{color:palette.text,fontSize:25,fontWeight:'900',letterSpacing:-.55,marginTop:1},plateRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:3},corePlate:{fontSize:type.bodyStrong,fontWeight:'900'},coreMeta:{color:'#A9C6CF',fontSize:type.caption,marginTop:4},statusGrid:{flexDirection:'row',gap:8,marginTop:15},vehicleStatus:{flex:1,minHeight:74,borderRadius:19,borderWidth:1,padding:10,flexDirection:'row',alignItems:'center',gap:8},vehicleStatusIcon:{width:41,height:41,borderRadius:13,alignItems:'center',justifyContent:'center'},vehicleStatusLabel:{color:'#8AAAB4',fontSize:10.5,fontWeight:'900',letterSpacing:.4},vehicleStatusValue:{fontSize:11.5,fontWeight:'900',marginTop:2},vehicleBottomSpectrum:{position:'absolute',left:16,right:16,bottom:0,height:4,flexDirection:'row',gap:3},bottomColor:{flex:1,borderRadius:8},emptyVehicle:{minHeight:200,borderRadius:32,borderWidth:1,borderColor:`${palette.cyan}62`,backgroundColor:`${palette.cyan}10`,padding:24,alignItems:'center',justifyContent:'center'},emptyTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginTop:12},emptyBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,textAlign:'center',marginTop:5},emptyCta:{marginTop:15,borderRadius:16,backgroundColor:palette.aqua,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:7},emptyCtaText:{color:palette.ink,fontSize:type.caption,fontWeight:'900'},
  quickRail:{gap:10,paddingRight:10},quickCard:{width:148,minHeight:156,borderRadius:24,borderWidth:1,padding:13,overflow:'hidden'},quickIcon:{width:48,height:48,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center'},quickTitle:{color:palette.text,fontSize:15,fontWeight:'900',marginTop:11},quickBody:{color:palette.muted,fontSize:type.micro,marginTop:4},quickFooter:{marginTop:'auto',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},quickOpen:{fontSize:type.micro,fontWeight:'900'},
  primaryRow:{flexDirection:'row',gap:10,marginTop:20},heroAction:{flex:1,minHeight:190,borderRadius:27,borderWidth:1,padding:14,overflow:'hidden'},heroActionIcon:{width:62,height:62,borderRadius:21,borderWidth:1,alignItems:'center',justifyContent:'center'},heroActionTitle:{color:palette.text,fontSize:19,fontWeight:'900',marginTop:27},heroActionBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:6},heroArrow:{position:'absolute',right:13,top:13,width:38,height:38,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},parkPulse:{marginTop:12,minHeight:108,borderRadius:25,borderWidth:1,borderColor:`${palette.orange}60`,backgroundColor:`${palette.orange}10`,padding:15,flexDirection:'row',alignItems:'center',gap:12,overflow:'hidden'},parkPulseIcon:{width:52,height:52,borderRadius:17,backgroundColor:`${palette.orange}22`,alignItems:'center',justifyContent:'center'},parkLabel:{color:palette.orange,fontSize:type.micro,fontWeight:'900',letterSpacing:.8},parkTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900',marginTop:3},parkBody:{color:palette.muted,fontSize:type.caption,marginTop:3},metricRow:{flexDirection:'row',gap:8},featurePair:{flexDirection:'row',gap:10,marginTop:18},featureCard:{flex:1,minHeight:168,borderRadius:25,borderWidth:1,padding:14,overflow:'hidden'},featureIcon:{width:51,height:51,borderRadius:17,alignItems:'center',justifyContent:'center'},featureTitle:{color:palette.text,fontSize:17,fontWeight:'900',marginTop:12},featureBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:5,flex:1},event:{minHeight:95,borderRadius:24,borderWidth:1,borderColor:`${palette.pink}50`,backgroundColor:`${palette.pink}0D`,padding:14,flexDirection:'row',alignItems:'center',gap:12},eventIcon:{width:52,height:52,borderRadius:17,backgroundColor:`${palette.pink}20`,alignItems:'center',justifyContent:'center'},eventTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},eventBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},signOut:{marginTop:18,padding:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},signOutText:{color:palette.muted2,fontSize:type.caption,fontWeight:'900'},cardLine:{position:'absolute',left:12,right:12,bottom:0,height:4,borderRadius:99},
  demoNotice:{minHeight:84,borderRadius:23,borderWidth:1,borderColor:`${palette.yellow}55`,backgroundColor:`${palette.yellow}0F`,padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',gap:11},demoNoticeTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},demoNoticeBody:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:3},demoReset:{width:39,height:39,borderRadius:13,borderWidth:1,borderColor:`${palette.yellow}55`,alignItems:'center',justifyContent:'center'},
});