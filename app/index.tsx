import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionCard, Pill, SectionHeader } from '@/src/components/Primitives';
import { fallbackDemo, loadDemo } from '@/src/data';
import { bootstrapProfile, LiveDashboard, loadLiveDashboard } from '@/src/lib/drabornpark';
import { supabase } from '@/src/lib/supabase';
import { palette, radius } from '@/src/theme';

export default function HomeScreen() {
  const [session, setSession] = useState<any>(null);
  const [live, setLive] = useState<LiveDashboard | null>(null);
  const [demo, setDemo] = useState<any>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intro = useRef(new Animated.Value(0)).current;

  const loadAccount = useCallback(async (currentSession: any, silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!currentSession) { setLive(null); return; }
      const name = currentSession.user?.user_metadata?.display_name || currentSession.user?.email?.split('@')[0] || undefined;
      await bootstrapProfile(name);
      setLive(await loadLiveDashboard());
    } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadAccount(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) loadAccount(nextSession); else { setLive(null); setLoading(false); }
    });
    Animated.timing(intro, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [intro, loadAccount]);

  async function openDemo() {
    setLoading(true);
    setDemoMode(true);
    setDemo(await loadDemo());
    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      if (session) await loadAccount(session, true);
      else if (demoMode) setDemo(await loadDemo());
    } finally { setRefreshing(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null); setLive(null); setDemoMode(false); setDemo(null);
  }

  const activeVehicle = live?.vehicles?.[0] ?? null;
  const liveTag = activeVehicle ? live?.tags.find((tag) => tag.vehicle_id === activeVehicle.id) : live?.tags?.[0];
  const activePark = live?.parks?.find((park) => !park.ended_at) ?? live?.parks?.[0];
  const unread = live?.reports?.filter((item) => !item.seen_at).length ?? 0;

  function goToPark() {
    if (!activePark?.latitude || !activePark?.longitude) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${activePark.latitude},${activePark.longitude}&travelmode=walking`);
  }

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.loader}><View style={styles.logo}><MaterialCommunityIcons name="shield-car" size={42} color={palette.cyan} /></View><ActivityIndicator color={palette.cyan} /><Text style={styles.loaderText}>DraBornPark hazırlanıyor</Text></View></SafeAreaView>;

  if (!session && !demoMode) {
    return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.welcome}>
      <View style={styles.logoLarge}><MaterialCommunityIcons name="shield-car" size={52} color={palette.cyan} /></View>
      <Text style={styles.eyebrow}>NFC + QR • PRIVACY FIRST</Text>
      <Text style={styles.welcomeTitle}>Aracına numaranı değil, DraBornPark’ı bırak.</Text>
      <Text style={styles.welcomeBody}>Araç iletişimi, park hafızası, güvenlik olayları ve anonim ulaşım tek premium platformda.</Text>
      <View style={styles.benefits}>{[
        ['phone-lock','Telefonun görünmez',palette.green],['nfc','NFC + QR tek bağlantı',palette.cyan],['map-marker-check-outline','Park yerini unutmaz',palette.orange],['timeline-clock-outline','Araç Timeline',palette.purple]
      ].map(([icon,title,color]) => <View key={title as string} style={styles.benefit}><MaterialCommunityIcons name={icon as any} size={23} color={color as string}/><Text style={styles.benefitText}>{title}</Text></View>)}</View>
      <Pressable onPress={() => router.push('/auth')} style={styles.primary}><MaterialCommunityIcons name="account-shield" size={21} color={palette.bg}/><Text style={styles.primaryText}>GİRİŞ YAP / HESAP OLUŞTUR</Text></Pressable>
      <Pressable onPress={openDemo} style={styles.secondary}><MaterialCommunityIcons name="flask-outline" size={20} color={palette.cyan}/><Text style={styles.secondaryText}>DEMO MODUNU AÇ</Text></Pressable>
      <Text style={styles.note}>Expo Go v57 test akışı • Basic etiket fonksiyonları abonelik olmasa da devam eder.</Text>
    </ScrollView></SafeAreaView>;
  }

  if (demoMode && !session) {
    const d = demo ?? fallbackDemo;
    return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.cyan}/> }>
      <Header name="Demo Kullanıcı" badge="DEMO" onExit={() => { setDemoMode(false); setDemo(null); }} />
      <View style={styles.demoBanner}><MaterialCommunityIcons name="flask-outline" size={19} color={palette.yellow}/><Text style={styles.demoText}>Bu ekran canlı veriyi değiştirmez. Gerçek park, araç ve bildirim işlemleri için hesapla giriş yap.</Text></View>
      <VehicleCard name={d.vehicle.name} plate={d.vehicle.plate} meta={`${d.vehicle.brand} ${d.vehicle.model} • ${d.vehicle.color}`} tagCode={d.vehicle.tagCode}/>
      <View style={styles.heroActions}><Pressable onPress={() => router.push('/auth')} style={[styles.heroButton,{backgroundColor:palette.cyan}]}><MaterialCommunityIcons name="map-marker-plus" size={25} color={palette.bg}/><Text style={styles.heroDark}>PARK ETTİM</Text></Pressable><Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${d.lastPark.latitude},${d.lastPark.longitude}&travelmode=walking`)} style={[styles.heroButton,{backgroundColor:palette.orange}]}><MaterialCommunityIcons name="walk" size={25} color={palette.bg}/><Text style={styles.heroDark}>ARACIMA GİT</Text></Pressable></View>
      <ParkCard place={d.lastPark.placeName} detail={`${d.lastPark.floor} • ${d.lastPark.zoneColor} • ${d.lastPark.row}${d.lastPark.bay}`} />
      <SectionHeader title="Demo bildirim" action="Canlı örnek"/><View style={styles.notice}><MaterialCommunityIcons name="car-light-high" size={24} color={palette.orange}/><View style={{flex:1}}><Text style={styles.noticeTitle}>{d.notifications[0]?.title}</Text><Text style={styles.noticeBody}>{d.notifications[0]?.body}</Text></View></View>
    </ScrollView></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}><Animated.View style={{flex:1,opacity:intro,transform:[{translateY:intro.interpolate({inputRange:[0,1],outputRange:[12,0]})}]}}><ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.cyan}/> }>
    <Header name={live?.profile?.display_name || session?.user?.email?.split('@')[0] || 'DraBornPark'} badge={live?.profile?.subscription_status || 'BASIC'} onExit={signOut}/>
    {activeVehicle ? <VehicleCard name={activeVehicle.vehicle_name} plate={activeVehicle.plate || 'Plaka gizli'} meta={[activeVehicle.brand,activeVehicle.model,activeVehicle.color].filter(Boolean).join(' • ')} tagCode={liveTag?.tag_code || 'Etiket bağlanmadı'}/> : <View style={styles.empty}><MaterialCommunityIcons name="car-plus" size={32} color={palette.cyan}/><Text style={styles.emptyTitle}>İlk aracını ekle</Text><Text style={styles.emptyBody}>Araba veya motosiklet profilini oluştur; ardından DraBornPark etiketini aktive et.</Text><Pressable onPress={() => router.push('/vehicle')} style={styles.mini}><Text style={styles.miniText}>ARAÇ EKLE</Text></Pressable></View>}

    <View style={styles.heroActions}><Pressable disabled={!activeVehicle} onPress={() => { Haptics.selectionAsync(); router.push('/park'); }} style={[styles.heroButton,{backgroundColor:activeVehicle?palette.cyan:'#27303C'}]}><MaterialCommunityIcons name="map-marker-plus" size={25} color={activeVehicle?palette.bg:palette.muted}/><Text style={[styles.heroDark,!activeVehicle&&{color:palette.muted}]}>PARK ETTİM</Text></Pressable><Pressable disabled={!activePark?.latitude} onPress={goToPark} style={[styles.heroButton,{backgroundColor:activePark?.latitude?palette.orange:'#27303C'}]}><MaterialCommunityIcons name="walk" size={25} color={activePark?.latitude?palette.bg:palette.muted}/><Text style={[styles.heroDark,!activePark?.latitude&&{color:palette.muted}]}>ARACIMA GİT</Text></Pressable></View>

    {activePark ? <ParkCard place={activePark.place_name || 'Kaydedilen konum'} detail={[activePark.floor_code,activePark.zone_color,`${activePark.row_code||''}${activePark.bay_code||''}`].filter(Boolean).join(' • ') || 'GPS park konumu'}/> : null}

    <SectionHeader title="Hızlı merkez" action={`v0.2.0 • ${unread} yeni bildirim`}/>
    <View style={styles.grid}>
      <ActionCard icon="car-plus" color={palette.blue} title="Araçlarım" detail="Araba veya motosiklet ekle ve profilini yönet." onPress={() => router.push('/vehicle')}/>
      <ActionCard icon="bell-badge-outline" color={palette.orange} title="Bildirimler" detail={`${unread} okunmamış araç bildirimi ve hızlı cevaplar.`} onPress={() => router.push('/notifications')}/>
      <ActionCard icon="nfc" color={palette.cyan} title="Etiketlerim" detail="Aktivasyon, devir, sıfırlama ve güvenlik." onPress={() => router.push('/feature/tags')}/>
      <ActionCard icon="account-group-outline" color={palette.purple} title="Family" detail="Park paylaşımı ve aile bildirim izinleri." onPress={() => router.push('/feature/family')}/>
      <ActionCard icon="shield-lock-outline" color={palette.green} title="Gizlilik" detail="Kamusal araç alanlarını ve paylaşımı yönet." onPress={() => router.push('/feature/privacy')}/>
      <ActionCard icon="crown-outline" color={palette.yellow} title="DraBornPark+" detail="14 günlük deneme ve premium modüller." onPress={() => router.push('/feature/plus')}/>
    </View>

    <SectionHeader title="Son araç olayı" action="Timeline"/>
    {live?.timeline?.[0] ? <View style={styles.timeline}><View style={styles.timelineDot}/><View style={{flex:1}}><Text style={styles.timelineTitle}>{live.timeline[0].title}</Text><Text style={styles.timelineBody}>{live.timeline[0].description || live.timeline[0].event_type}</Text></View></View> : <Text style={styles.muted}>Henüz Timeline olayı yok.</Text>}
    <Pressable onPress={() => router.push('/factory')} style={styles.factory}><MaterialCommunityIcons name="factory" size={20} color={palette.muted}/><Text style={styles.factoryText}>Factory Panel • yalnızca yönetici</Text><MaterialCommunityIcons name="chevron-right" size={20} color={palette.muted}/></Pressable>
  </ScrollView></Animated.View></SafeAreaView>;
}

function Header({name,badge,onExit}:{name:string;badge:string;onExit:()=>void}){return <View style={styles.header}><View><Text style={styles.brand}>DraBornPark</Text><Text style={styles.hello}>Merhaba, {name}</Text></View><View style={styles.headerRight}><Pill label={badge} color={badge==='DEMO'?palette.yellow:palette.cyan} icon={badge==='DEMO'?'flask-outline':'shield-check'}/><Pressable onPress={onExit} style={styles.exit}><MaterialCommunityIcons name="logout" size={19} color={palette.muted}/></Pressable></View></View>}
function VehicleCard({name,plate,meta,tagCode}:{name:string;plate:string;meta:string;tagCode:string}){return <View style={styles.vehicle}><View style={styles.vehicleTop}><View style={styles.vehicleIcon}><MaterialCommunityIcons name="car-sports" size={30} color={palette.cyan}/></View><View style={{flex:1}}><Text style={styles.vehicleName}>{name}</Text><Text style={styles.plate}>{plate}</Text><Text style={styles.vehicleMeta}>{meta}</Text></View><MaterialCommunityIcons name="shield-check" size={25} color={palette.green}/></View><View style={styles.tagRow}><MaterialCommunityIcons name="nfc" size={17} color={palette.cyan}/><Text style={styles.tagText}>{tagCode}</Text><Text style={styles.tagState}>GÜVENLİ BAĞLANTI</Text></View></View>}
function ParkCard({place,detail}:{place:string;detail:string}){return <View style={styles.parkCard}><View style={styles.parkIcon}><MaterialCommunityIcons name="map-marker-radius" size={26} color={palette.orange}/></View><View style={{flex:1}}><Text style={styles.parkOver}>SON PARK</Text><Text style={styles.parkPlace}>{place}</Text><Text style={styles.parkDetail}>{detail}</Text></View></View>}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:18,paddingBottom:55},loader:{flex:1,alignItems:'center',justifyContent:'center',gap:14},logo:{width:76,height:76,borderRadius:26,backgroundColor:'#0C2730',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#1E5160'},loaderText:{color:palette.muted,fontSize:11,fontWeight:'800'},welcome:{padding:25,paddingTop:54,paddingBottom:55},logoLarge:{width:92,height:92,borderRadius:31,backgroundColor:'#0B2832',borderWidth:1,borderColor:'#205462',alignItems:'center',justifyContent:'center'},eyebrow:{color:palette.cyan,fontWeight:'900',fontSize:10,letterSpacing:1.8,marginTop:25},welcomeTitle:{color:palette.text,fontWeight:'900',fontSize:36,lineHeight:40,letterSpacing:-1.6,marginTop:9},welcomeBody:{color:palette.muted,fontSize:14,lineHeight:21,marginTop:13},benefits:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:26},benefit:{width:'48%',minHeight:86,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:13,justifyContent:'space-between'},benefitText:{color:palette.text,fontSize:11,fontWeight:'800'},primary:{height:58,borderRadius:18,backgroundColor:palette.cyan,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,marginTop:24},primaryText:{color:palette.bg,fontWeight:'900',fontSize:11},secondary:{height:55,borderRadius:18,borderWidth:1,borderColor:'#235465',backgroundColor:'#0C2029',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:10},secondaryText:{color:palette.cyan,fontWeight:'900',fontSize:10.5},note:{color:'#5F6C82',fontSize:9.5,lineHeight:14,textAlign:'center',marginTop:15},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:17},brand:{color:palette.cyan,fontSize:10,fontWeight:'900',letterSpacing:1.7},hello:{color:palette.text,fontSize:21,fontWeight:'900',marginTop:3},headerRight:{flexDirection:'row',alignItems:'center',gap:8},exit:{width:38,height:38,borderRadius:13,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},demoBanner:{borderRadius:18,borderWidth:1,borderColor:'#514A25',backgroundColor:'#211F14',padding:13,flexDirection:'row',gap:9,marginBottom:13},demoText:{color:'#CFC79A',fontSize:10,flex:1,lineHeight:14},vehicle:{backgroundColor:'#0E1723',borderWidth:1,borderColor:'#244052',borderRadius:radius.xl,padding:16},vehicleTop:{flexDirection:'row',alignItems:'center',gap:12},vehicleIcon:{width:55,height:55,borderRadius:19,backgroundColor:'#0E2C36',alignItems:'center',justifyContent:'center'},vehicleName:{color:palette.text,fontSize:18,fontWeight:'900'},plate:{color:palette.cyan,fontSize:12,fontWeight:'900',marginTop:2},vehicleMeta:{color:palette.muted,fontSize:10,marginTop:4},tagRow:{marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:'#1C3441',flexDirection:'row',alignItems:'center',gap:7},tagText:{color:palette.text,fontSize:10,fontWeight:'800',flex:1},tagState:{color:palette.green,fontSize:7.5,fontWeight:'900'},heroActions:{flexDirection:'row',gap:10,marginTop:12},heroButton:{flex:1,minHeight:84,borderRadius:22,alignItems:'center',justifyContent:'center',gap:7},heroDark:{color:palette.bg,fontSize:11,fontWeight:'900'},parkCard:{marginTop:12,borderRadius:radius.lg,borderWidth:1,borderColor:'#4E3A26',backgroundColor:'#1B1510',padding:15,flexDirection:'row',alignItems:'center',gap:12},parkIcon:{width:52,height:52,borderRadius:18,backgroundColor:'#332415',alignItems:'center',justifyContent:'center'},parkOver:{color:palette.orange,fontSize:8.5,fontWeight:'900',letterSpacing:1.2},parkPlace:{color:palette.text,fontSize:15,fontWeight:'900',marginTop:3},parkDetail:{color:'#B59C84',fontSize:10.5,marginTop:3},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},empty:{borderRadius:radius.xl,borderWidth:1,borderColor:'#244152',backgroundColor:'#0D1721',padding:22,alignItems:'flex-start'},emptyTitle:{color:palette.text,fontSize:20,fontWeight:'900',marginTop:13},emptyBody:{color:palette.muted,fontSize:11,lineHeight:16,marginTop:5},mini:{backgroundColor:palette.cyan,borderRadius:13,paddingHorizontal:15,paddingVertical:10,marginTop:14},miniText:{color:palette.bg,fontWeight:'900',fontSize:9},notice:{borderRadius:radius.lg,borderWidth:1,borderColor:'#473522',backgroundColor:'#1B1410',padding:15,flexDirection:'row',gap:11},noticeTitle:{color:palette.text,fontSize:13,fontWeight:'900'},noticeBody:{color:palette.muted,fontSize:10,marginTop:4},timeline:{borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:15,flexDirection:'row',gap:12},timelineDot:{width:10,height:10,borderRadius:5,backgroundColor:palette.purple,marginTop:4},timelineTitle:{color:palette.text,fontWeight:'900',fontSize:13},timelineBody:{color:palette.muted,fontSize:10.5,lineHeight:15,marginTop:4},muted:{color:palette.muted,fontSize:11},factory:{marginTop:20,borderRadius:17,borderWidth:1,borderColor:palette.line,padding:14,flexDirection:'row',alignItems:'center',gap:9},factoryText:{color:palette.muted,fontSize:10.5,fontWeight:'800',flex:1}});
