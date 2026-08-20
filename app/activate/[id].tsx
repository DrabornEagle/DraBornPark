import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBubble, Pill } from '@/src/components/Primitives';
import { palette, radius } from '@/src/theme';

export default function ActivationScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = String(params.id ?? 'K7M4X2P9').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tagCode = rawId.startsWith('DP') ? `DP-${rawId.slice(2)}` : `DP-${rawId}`;
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState('');
  const [vehicleType, setVehicleType] = useState<'car' | 'motorcycle'>('car');
  const [vehicle, setVehicle] = useState({ name: 'Volkswagen Tiguan', plate: '06 DBP 2026', brand: 'Volkswagen', model: 'Tiguan', year: '2025', color: 'Gece Mavisi' });
  const progress = useMemo(() => `${step}/4`, [step]);

  function next() {
    if (step === 1 && pin.replace(/\D/g, '').length < 4) {
      Alert.alert('Aktivasyon PIN gerekli', 'Kutudaki gizli PIN kodunu gir. Demo için herhangi bir 4–8 haneli PIN kullanabilirsin.');
      return;
    }
    if (step === 2 && (!vehicle.name.trim() || !vehicle.plate.trim())) {
      Alert.alert('Araç bilgileri eksik', 'Araç adı ve plaka alanlarını doldur.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((current) => Math.min(4, current + 1));
  }

  function activate() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('DraBornPark aktive edildi', `${tagCode} demo etiketi ${vehicle.name} aracına bağlandı. Gerçek hesapta Tag ID + PIN doğrulaması drabornpark_activate_tag RPC üzerinden sunucuda yapılır.`, [{ text: 'Ana Sayfaya Dön', onPress: () => router.replace('/') }]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={25} color={palette.text} /></Pressable><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Etiket Aktivasyonu</Text><Text style={styles.headerSub}>{tagCode}</Text></View><Pill label={progress} color={palette.cyan} /></View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}><IconBubble icon="shield-key-outline" color={palette.cyan} size={66} /><Text style={styles.heroOverline}>GÜVENLİ AKTİVASYON</Text><Text style={styles.heroTitle}>{step === 1 ? 'Etiketi doğrula' : step === 2 ? 'Aracını tanımla' : step === 3 ? 'Gizlilik ayarları' : 'Hazır'}</Text><Text style={styles.heroBody}>{step === 1 ? 'İlk okutan kişi etiketi sahiplenemez. Kutudaki gizli aktivasyon PIN’i zorunludur.' : step === 2 ? 'Etiketi araba veya motosiklet profiline bağla. NFC URL’si araç değişse bile aynı kalır.' : step === 3 ? 'Dışarıdan hangi araç alanlarının gösterileceğini sen seçersin.' : 'Etiket, araç ve bildirim tercihleri aktivasyona hazır.'}</Text></View>

        <View style={styles.steps}>{[1,2,3,4].map((value) => <View key={value} style={[styles.stepDot, value <= step && styles.stepActive]} />)}</View>

        {step === 1 ? <View style={styles.card}><Text style={styles.label}>ETİKET ID</Text><View style={styles.readOnly}><MaterialCommunityIcons name="nfc" size={20} color={palette.yellow} /><Text style={styles.readOnlyText}>{tagCode}</Text><MaterialCommunityIcons name="check-decagram" size={18} color={palette.green} /></View><Text style={styles.label}>AKTİVASYON PIN</Text><TextInput value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={9} placeholder="4738-9261" placeholderTextColor="#5F6C83" style={styles.input} secureTextEntry /><Text style={styles.help}>PIN kutu içindeki gizli kartta bulunur. Gerçek sistem yalnızca bcrypt hash saklar; açık PIN veritabanına yazılmaz.</Text></View> : null}

        {step === 2 ? <View style={styles.card}><Text style={styles.label}>ARAÇ TİPİ</Text><View style={styles.typeRow}><Pressable onPress={() => setVehicleType('car')} style={[styles.type, vehicleType === 'car' && styles.typeActive]}><MaterialCommunityIcons name="car-sports" size={28} color={vehicleType === 'car' ? palette.bg : palette.cyan} /><Text style={[styles.typeText, vehicleType === 'car' && styles.typeTextActive]}>Araba</Text></Pressable><Pressable onPress={() => setVehicleType('motorcycle')} style={[styles.type, vehicleType === 'motorcycle' && styles.typeActive]}><MaterialCommunityIcons name="motorbike" size={28} color={vehicleType === 'motorcycle' ? palette.bg : palette.cyan} /><Text style={[styles.typeText, vehicleType === 'motorcycle' && styles.typeTextActive]}>Motosiklet</Text></Pressable></View>{Object.entries(vehicle).map(([key, value]) => <View key={key}><Text style={styles.label}>{({ name:'ARAÇ ADI', plate:'PLAKA', brand:'MARKA', model:'MODEL', year:'MODEL YILI', color:'RENK' } as Record<string,string>)[key]}</Text><TextInput value={value} onChangeText={(nextValue) => setVehicle((current) => ({ ...current, [key]: nextValue }))} style={styles.input} /></View>)}</View> : null}

        {step === 3 ? <View style={styles.card}><Text style={styles.cardTitle}>Dışarıdan görünenler</Text>{[['Plaka','06 DBP 2026'],['Marka / Model','Volkswagen Tiguan'],['Renk','Gece Mavisi']].map(([title, detail]) => <View key={title} style={styles.privacyRow}><View><Text style={styles.privacyTitle}>{title}</Text><Text style={styles.privacyDetail}>{detail}</Text></View><MaterialCommunityIcons name="eye-check-outline" size={21} color={palette.green} /></View>)}<View style={styles.locked}><MaterialCommunityIcons name="lock" size={18} color={palette.green} /><Text style={styles.lockedText}>Telefon, e-posta, tam ad ve park geçmişi her zaman gizlidir.</Text></View></View> : null}

        {step === 4 ? <View style={styles.card}><View style={styles.summaryHead}><IconBubble icon={vehicleType === 'motorcycle' ? 'motorbike' : 'car-sports'} color={palette.cyan} /><View style={{ flex: 1 }}><Text style={styles.summaryTitle}>{vehicle.name}</Text><Text style={styles.summarySub}>{vehicle.plate} • {vehicle.color}</Text></View><MaterialCommunityIcons name="shield-check" size={28} color={palette.green} /></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Etiket</Text><Text style={styles.summaryValue}>{tagCode}</Text></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Plan</Text><Text style={styles.summaryValue}>Basic + 14 Gün Plus</Text></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>NFC / QR</Text><Text style={[styles.summaryValue, { color: palette.green }]}>Hazır</Text></View><View style={styles.trial}><MaterialCommunityIcons name="crown" size={22} color={palette.yellow} /><View style={{ flex: 1 }}><Text style={styles.trialTitle}>14 Gün DraBornPark+ Hediye</Text><Text style={styles.trialBody}>Ödeme yöntemi gerekmeden sunucu taraflı trial durumu tanımlanabilir.</Text></View></View></View> : null}

        {step < 4 ? <Pressable onPress={next} style={styles.cta}><Text style={styles.ctaText}>DEVAM ET</Text><MaterialCommunityIcons name="arrow-right" size={18} color={palette.bg} /></Pressable> : <Pressable onPress={activate} style={[styles.cta, { backgroundColor: palette.green }]}><MaterialCommunityIcons name="check-decagram" size={19} color={palette.bg} /><Text style={styles.ctaText}>DRABORNPARK’I AKTİVE ET</Text></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:palette.bg},header:{minHeight:68,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:'#182135'},back:{width:43,height:43,borderRadius:15,backgroundColor:palette.panel,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},headerTitle:{color:palette.text,fontSize:16,fontWeight:'900'},headerSub:{color:palette.muted,fontSize:9,marginTop:2},scroll:{padding:14,paddingBottom:40},hero:{borderRadius:radius.xl,borderWidth:1,borderColor:'#1C5061',backgroundColor:'#0C222C',padding:18},heroOverline:{color:palette.cyan,fontWeight:'900',fontSize:9,letterSpacing:1.3,marginTop:14},heroTitle:{color:palette.text,fontSize:24,fontWeight:'900',marginTop:4},heroBody:{color:'#9DB6C0',fontSize:10.8,lineHeight:15.5,marginTop:6},steps:{flexDirection:'row',gap:7,marginVertical:14},stepDot:{height:5,flex:1,borderRadius:3,backgroundColor:'#202A3C'},stepActive:{backgroundColor:palette.cyan},card:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.line,borderRadius:radius.lg,padding:15},label:{color:palette.muted,fontSize:8.7,fontWeight:'900',letterSpacing:1,marginTop:12,marginBottom:5},readOnly:{minHeight:49,borderRadius:14,borderWidth:1,borderColor:'#4D4929',backgroundColor:'#252314',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},readOnlyText:{color:palette.yellow,fontWeight:'900',flex:1},input:{minHeight:49,borderRadius:14,borderWidth:1,borderColor:palette.line,backgroundColor:'#090E18',color:palette.text,paddingHorizontal:12,fontWeight:'700'},help:{color:'#718099',fontSize:9.2,lineHeight:13.5,marginTop:8},typeRow:{flexDirection:'row',gap:9},type:{flex:1,minHeight:82,borderRadius:17,borderWidth:1,borderColor:palette.line,backgroundColor:'#101725',alignItems:'center',justifyContent:'center',gap:5},typeActive:{backgroundColor:palette.cyan,borderColor:palette.cyan},typeText:{color:palette.text,fontWeight:'900',fontSize:10},typeTextActive:{color:palette.bg},cardTitle:{color:palette.text,fontSize:15,fontWeight:'900',marginBottom:6},privacyRow:{minHeight:61,borderBottomWidth:1,borderBottomColor:'#20283A',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},privacyTitle:{color:palette.text,fontSize:11.5,fontWeight:'800'},privacyDetail:{color:palette.muted,fontSize:9.5,marginTop:3},locked:{marginTop:13,borderRadius:14,backgroundColor:'#10271F',borderWidth:1,borderColor:'#28543F',padding:12,flexDirection:'row',gap:8,alignItems:'center'},lockedText:{color:'#9CC9B5',fontSize:9.5,flex:1,lineHeight:13.5},summaryHead:{flexDirection:'row',alignItems:'center',gap:11,marginBottom:12},summaryTitle:{color:palette.text,fontWeight:'900',fontSize:15},summarySub:{color:palette.muted,fontSize:9.5,marginTop:3},summaryRow:{minHeight:44,borderBottomWidth:1,borderBottomColor:'#20283A',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},summaryLabel:{color:palette.muted,fontSize:10},summaryValue:{color:palette.text,fontSize:10.5,fontWeight:'900'},trial:{marginTop:13,borderRadius:15,backgroundColor:'#292315',borderWidth:1,borderColor:'#51472A',padding:12,flexDirection:'row',gap:9},trialTitle:{color:palette.yellow,fontSize:11,fontWeight:'900'},trialBody:{color:'#BFB38B',fontSize:9.2,lineHeight:13,marginTop:3},cta:{minHeight:53,marginTop:14,borderRadius:17,backgroundColor:palette.cyan,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},ctaText:{color:palette.bg,fontWeight:'900',fontSize:10.5} });
