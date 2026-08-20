import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addGuestDriver, endGuestDriver, hasPlusEntitlement, loadLiveDashboard } from '@/src/lib/drabornpark';
import { palette, radius } from '@/src/theme';

export default function GuestScreen() {
  const [data, setData] = useState<any>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState(3);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const next = await loadLiveDashboard();
      setData(next);
      if (!vehicleId && next.vehicles[0]) setVehicleId(next.vehicles[0].id);
    } catch { router.replace('/auth'); }
  }
  useEffect(() => { refresh(); }, []);

  const plus = data ? hasPlusEntitlement(data.profile, data.subscription) : false;
  const active = useMemo(() => data?.guestDrivers?.filter((item: any) => item.status === 'active' && new Date(item.ends_at).getTime() > Date.now()) ?? [], [data]);

  async function create() {
    if (!plus) return Alert.alert('DraBornPark+ gerekli', 'Geçici Sürücü Plus kapsamındadır.');
    if (!vehicleId) return Alert.alert('Araç seç');
    if (!label.trim()) return Alert.alert('Sürücü etiketi gerekli', 'Örn. Eşim veya Arkadaşım.');
    setBusy(true);
    try {
      await addGuestDriver({ vehicleId, label, endsAt: new Date(Date.now() + hours * 3600000).toISOString() });
      setLabel('');
      Alert.alert('Geçici sürücü aktif', `${hours} saatlik bildirim yönlendirmesi oluşturuldu.`);
      await refresh();
    } catch (error: any) { Alert.alert('Başlatılamadı', String(error?.message || 'İşlem başarısız.')); }
    finally { setBusy(false); }
  }

  async function end(id: string) {
    try { await endGuestDriver(id); await refresh(); }
    catch (error: any) { Alert.alert('Kapatılamadı', String(error?.message || 'İşlem başarısız.')); }
  }

  if (!data) return <SafeAreaView style={styles.safe}><View style={styles.loader}><ActivityIndicator color={palette.green} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <Header />
    <Text style={styles.over}>DRABORNPARK+ • SÜRELİ YÖNLENDİRME</Text><Text style={styles.title}>Geçici Sürücü</Text><Text style={styles.sub}>Aracını başka birine verdiğinde belirli süre boyunca araç iletişimini o kullanım oturumuna bağla; süre dolunca kontrol otomatik sana döner.</Text>
    {!plus ? <View style={styles.locked}><MaterialCommunityIcons name="lock-outline" size={20} color={palette.yellow} /><Text style={styles.lockedText}>Yeni geçici sürücü oluşturmak için aktif Plus gerekir.</Text></View> : null}

    <View style={styles.form}><Text style={styles.formTitle}>Yeni sürücü oturumu</Text><Text style={styles.label}>ARAÇ</Text><View style={styles.chips}>{data.vehicles.map((vehicle:any)=><Pressable key={vehicle.id} onPress={()=>setVehicleId(vehicle.id)} style={[styles.chip,vehicleId===vehicle.id&&styles.chipActive]}><Text style={[styles.chipText,vehicleId===vehicle.id&&{color:palette.green}]}>{vehicle.vehicle_name}</Text></Pressable>)}</View><Text style={styles.label}>SÜRÜCÜ ETİKETİ</Text><TextInput value={label} onChangeText={setLabel} placeholder="Eşim / Arkadaşım" placeholderTextColor="#627087" style={styles.input}/><Text style={styles.label}>SÜRE</Text><View style={styles.chips}>{[1,3,6,12,24].map(item=><Pressable key={item} onPress={()=>setHours(item)} style={[styles.chip,hours===item&&styles.chipActive]}><Text style={[styles.chipText,hours===item&&{color:palette.green}]}>{item} saat</Text></Pressable>)}</View><Pressable disabled={busy||!plus} onPress={create} style={[styles.cta,(busy||!plus)&&{opacity:.5}]}>{busy?<ActivityIndicator color={palette.bg}/>:<><MaterialCommunityIcons name="account-clock-outline" size={20} color={palette.bg}/><Text style={styles.ctaText}>GEÇİCİ SÜRÜCÜYÜ BAŞLAT</Text></>}</Pressable></View>

    <Text style={styles.section}>AKTİF OTURUMLAR</Text>{active.length===0?<Text style={styles.empty}>Aktif geçici sürücü yok.</Text>:active.map((item:any)=><View key={item.id} style={styles.driver}><MaterialCommunityIcons name="account" size={22} color={palette.green}/><View style={{flex:1}}><Text style={styles.driverTitle}>{item.guest_label}</Text><Text style={styles.driverSub}>{new Date(item.ends_at).toLocaleString('tr-TR')} tarihinde sona erer</Text></View><Pressable onPress={()=>Alert.alert('Oturumu kapat',item.guest_label,[{text:'Vazgeç',style:'cancel'},{text:'Kapat',style:'destructive',onPress:()=>end(item.id)}])} style={styles.end}><Text style={styles.endText}>BİTİR</Text></Pressable></View>)}
    <Text style={styles.section}>GEÇMİŞ</Text>{data.guestDrivers.filter((item:any)=>!active.some((x:any)=>x.id===item.id)).slice(0,8).map((item:any)=><View key={item.id} style={styles.history}><Text style={styles.historyTitle}>{item.guest_label}</Text><Text style={styles.historySub}>{item.status.toUpperCase()} • {new Date(item.starts_at).toLocaleString('tr-TR')}</Text></View>)}
  </ScrollView></SafeAreaView>;
}

function Header(){return <View style={styles.header}><Pressable onPress={()=>router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={27} color={palette.text}/></Pressable><Text style={styles.headerTitle}>Geçici Sürücü</Text><View style={{width:42}}/></View>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:19,paddingBottom:55},loader:{flex:1,alignItems:'center',justifyContent:'center'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},headerTitle:{color:palette.text,fontSize:14,fontWeight:'900'},over:{color:palette.green,fontSize:8.5,fontWeight:'900',letterSpacing:1.4,marginTop:25},title:{color:palette.text,fontSize:30,fontWeight:'900',letterSpacing:-1,marginTop:5},sub:{color:palette.muted,fontSize:11.5,lineHeight:17,marginTop:7},locked:{marginTop:14,borderRadius:17,borderWidth:1,borderColor:'#514A25',backgroundColor:'#211F14',padding:13,flexDirection:'row',gap:9},lockedText:{color:'#B9B286',fontSize:10,flex:1},form:{marginTop:15,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:15},formTitle:{color:palette.text,fontSize:15,fontWeight:'900'},label:{color:'#7E8A9F',fontSize:8.5,fontWeight:'900',letterSpacing:1.1,marginTop:13,marginBottom:6},chips:{flexDirection:'row',flexWrap:'wrap',gap:7},chip:{borderRadius:12,borderWidth:1,borderColor:palette.line,paddingHorizontal:10,paddingVertical:9},chipActive:{borderColor:'#29523F',backgroundColor:'#10251C'},chipText:{color:palette.muted,fontSize:8.5,fontWeight:'800'},input:{height:48,borderRadius:14,borderWidth:1,borderColor:'#27324A',backgroundColor:'#090E18',color:palette.text,paddingHorizontal:13,fontSize:12},cta:{height:54,borderRadius:16,backgroundColor:palette.green,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:18},ctaText:{color:palette.bg,fontSize:9.5,fontWeight:'900'},section:{color:palette.text,fontSize:14,fontWeight:'900',marginTop:23,marginBottom:8},empty:{color:palette.muted,fontSize:10.5},driver:{borderRadius:16,borderWidth:1,borderColor:'#234638',backgroundColor:'#0D1D17',padding:12,flexDirection:'row',alignItems:'center',gap:9,marginBottom:7},driverTitle:{color:palette.text,fontSize:11.5,fontWeight:'900'},driverSub:{color:palette.muted,fontSize:9,marginTop:2},end:{borderRadius:10,borderWidth:1,borderColor:'#4C2930',paddingHorizontal:10,paddingVertical:8},endText:{color:palette.red,fontSize:8,fontWeight:'900'},history:{borderBottomWidth:1,borderBottomColor:'#171F31',paddingVertical:10},historyTitle:{color:palette.text,fontSize:10.8,fontWeight:'900'},historySub:{color:palette.muted,fontSize:8.8,marginTop:2}});
