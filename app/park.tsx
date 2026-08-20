import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, BottomDock, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { useDemo } from '@/src/demo/DemoContext';
import { attachParkTicket } from '@/src/lib/extras';
import { loadLiveDashboard, savePark } from '@/src/lib/drabornpark';
import { uploadPrivateImage } from '@/src/lib/storage';
import { palette, radius, type } from '@/src/theme';

const REMINDERS=[{label:'Kapalı',min:0},{label:'30 dk',min:30},{label:'1 saat',min:60},{label:'2 saat',min:120},{label:'3 saat',min:180}];

export default function ParkScreen(){
  const demo=useDemo();
  const [vehicles,setVehicles]=useState<any[]>([]);
  const [vehicleId,setVehicleId]=useState('');
  const [place,setPlace]=useState('');
  const [floor,setFloor]=useState('');
  const [zone,setZone]=useState('');
  const [row,setRow]=useState('');
  const [bay,setBay]=useState('');
  const [note,setNote]=useState('');
  const [reminder,setReminder]=useState(0);
  const [photo,setPhoto]=useState<string|null>(null);
  const [ticket,setTicket]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [locating,setLocating]=useState(false);
  const [coords,setCoords]=useState<{lat:number;lon:number;accuracy:number|null}|null>(null);
  const enter=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    if(demo.active){setVehicles(demo.state.vehicles.map((v:any)=>({id:v.id,vehicle_name:v.name,plate:v.plate,vehicle_type:v.type})));if(demo.state.vehicles[0])setVehicleId(demo.state.vehicles[0].id);}
    else {let mounted=true;loadLiveDashboard().then(d=>{if(!mounted)return;setVehicles(d.vehicles);if(d.vehicles[0])setVehicleId(d.vehicles[0].id)}).catch(()=>router.replace('/auth'));return()=>{mounted=false};}
  },[demo.active]);
  useEffect(()=>{Animated.timing(enter,{toValue:1,duration:460,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();},[enter]);

  async function locate(){setLocating(true);try{const permission=await Location.requestForegroundPermissionsAsync();if(permission.status!=='granted'){Alert.alert('Konum izni gerekli','Park konumunu kaydetmek için uygulama açıkken konum izni ver.');return;}const current=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});setCoords({lat:current.coords.latitude,lon:current.coords.longitude,accuracy:current.coords.accuracy});Haptics.selectionAsync();}catch(e:any){Alert.alert('Konum alınamadı',e?.message||'Konum servisini kontrol et.');}finally{setLocating(false)}}
  async function capture(kind:'park'|'ticket'){try{const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted){Alert.alert('Kamera izni gerekli','Fotoğraf çekmek için kamera izni ver.');return;}const result=await ImagePicker.launchCameraAsync({quality:.78,allowsEditing:false});if(!result.canceled){if(kind==='park')setPhoto(result.assets[0].uri);else setTicket(result.assets[0].uri);}}catch(e:any){Alert.alert('Kamera açılamadı',e?.message||'Kamera erişimini kontrol et.')}}
  async function scheduleReminder(parkId?:string){if(reminder<=0)return;try{const Notifications=await import('expo-notifications');const permission=await Notifications.requestPermissionsAsync();if(!permission.granted)return;await Notifications.scheduleNotificationAsync({content:{title:'DraBornPark • Park süresi',body:'Park sürenizin bitmesine 15 dakika kaldı.',data:{parkId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:Math.max(5,(reminder-15)*60)}});}catch{}}

  async function store(){
    if(!vehicleId){Alert.alert('Araç gerekli','Önce bir araç seç.');return;}
    if(demo.active){
      const now=new Date().toISOString();
      demo.patch(st=>({...st,parks:[{id:`demo-${Date.now()}`,vehicleId,placeName:place||'Yeni Demo Parkı',floor:floor||'P2',zoneColor:zone||'Mavi',row:row||'A',bay:bay||'01',latitude:coords?.lat,longitude:coords?.lon,parkedAt:now,endedAt:null,note:note||'Demo park kaydı',reminder:REMINDERS.find(x=>x.min===reminder)?.label,ticketPath:ticket?'demo-ticket':null},...st.parks.map((p:any)=>p.endedAt? p:{...p,endedAt:now})],stats:{...st.stats,parksThisMonth:st.stats.parksThisMonth+1},timeline:[{id:`park-${Date.now()}`,type:'PARKED',icon:'map-marker-check',color:palette.cyan,title:'Yeni park kaydedildi',detail:`${place||'Demo Park'} • ${floor||'P2'} • ${zone||'Mavi'} • ${(row||'A')+(bay||'01')}`,time:'Şimdi'},...st.timeline]}));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);Alert.alert('Demo park kaydedildi','Park Hafızası, Timeline ve aylık özet güncellendi.');return;
    }
    setBusy(true);try{
      let photoPath:string|null=null;let ticketPath:string|null=null;
      if(photo)photoPath=await uploadPrivateImage(photo,'parks');
      if(ticket)ticketPath=await uploadPrivateImage(ticket,'park-tickets');
      const saved:any=await savePark({vehicleId,placeName:place,latitude:coords?.lat,longitude:coords?.lon,accuracyMeters:coords?.accuracy,floorCode:floor,zoneColor:zone,rowCode:row,bayCode:bay,note,photoPath,reminderMinutes:reminder,source:coords?'gps_manual':'manual'});
      if(ticketPath&&saved?.id)await attachParkTicket(saved.id,ticketPath);
      await scheduleReminder(saved?.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);Alert.alert('Park hafızaya alındı','Konum, fotoğraf, bilet ve Timeline bilgileri güncellendi.',[{text:'Ana Sayfa',onPress:()=>router.replace('/')}]);
    }catch(e:any){Alert.alert('Park kaydedilemedi',e?.message||'İşlem başarısız.');}finally{setBusy(false)}
  }

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange} secondary={palette.cyan}/><Animated.View style={{flex:1,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[16,0]})}]}}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Park Hafızası" eyebrow="PARK ETTİM" accent={palette.orange} subtitle="Konum, kapalı otopark detayı, fotoğraf ve bilet tek kayıtta"/>
    <View style={s.hero}><View style={s.heroPin}><MaterialCommunityIcons name="map-marker-radius" size={37} color={palette.orange}/></View><View style={{flex:1}}><Text style={s.heroOver}>{demo.active?'ETKİLEŞİMLİ DEMO':'YENİ PARK KAYDI'}</Text><Text style={s.heroTitle}>Aracımı burada bıraktım</Text><Text style={s.heroSub}>Açık alanda GPS'i, kapalı otoparkta kat ve bölüm bilgisini kullan. İstersen biletini de sakla.</Text></View></View>

    <SectionHeading title="Araç seç" subtitle="Park kaydının bağlı olacağı araç"/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.vehicleRail}>{vehicles.map(v=><Pressable key={v.id} onPress={()=>setVehicleId(v.id)} style={[s.vehicleChip,vehicleId===v.id&&s.vehicleChipActive]}><MaterialCommunityIcons name={v.vehicle_type==='motorcycle'?'motorbike':'car-sports'} size={23} color={vehicleId===v.id?palette.cyan:palette.muted}/><View style={{flex:1}}><Text style={[s.vehicleName,vehicleId===v.id&&{color:palette.text}]}>{v.vehicle_name}</Text><Text style={s.vehiclePlate}>{v.plate||'Plaka yok'}</Text></View>{vehicleId===v.id?<MaterialCommunityIcons name="check-circle" size={19} color={palette.green}/>:null}</Pressable>)}</ScrollView>

    <Pressable onPress={locate} style={[s.locationCard,coords&&{borderColor:`${palette.green}55`,backgroundColor:`${palette.green}10`}]}>{locating?<ActivityIndicator color={palette.cyan}/>:<View style={[s.locationIcon,{backgroundColor:coords?`${palette.green}20`:`${palette.cyan}20`}]}><MaterialCommunityIcons name={coords?'check':'crosshairs-gps'} size={25} color={coords?palette.green:palette.cyan}/></View>}<View style={{flex:1}}><Text style={s.locationTitle}>{coords?'Konum hazır':'Mevcut konumu al'}</Text><Text style={s.locationSub}>{coords?`${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)} • yaklaşık ±${Math.round(coords.accuracy||0)} m`:'Konum yalnızca bu park kaydı için alınır; sürekli takip edilmez.'}</Text></View><MaterialCommunityIcons name="chevron-right" size={23} color={palette.muted}/></Pressable>

    <SectionHeading title="Otopark bilgisi" subtitle="Kapalı otoparkta aracı bulmayı kolaylaştır"/>
    <View style={s.form}><Field label="MEKAN / OTOPARK" value={place} set={setPlace} placeholder="Örn. Metromall AVM"/><View style={s.double}><View style={{flex:1}}><Field label="KAT" value={floor} set={setFloor} placeholder="P2"/></View><View style={{flex:1}}><Field label="BÖLGE / RENK" value={zone} set={setZone} placeholder="Mavi"/></View></View><View style={s.double}><View style={{flex:1}}><Field label="SIRA" value={row} set={setRow} placeholder="C"/></View><View style={{flex:1}}><Field label="PARK NO" value={bay} set={setBay} placeholder="128"/></View></View><Field label="KISA NOT" value={note} set={setNote} placeholder="Asansör karşısı, kolon yanı…"/></View>

    <SectionHeading title="Park süresi" subtitle="Süre dolmadan önce yerel hatırlatma al" badge={REMINDERS.find(x=>x.min===reminder)?.label} color={palette.yellow}/>
    <View style={s.reminders}>{REMINDERS.map(x=><Pressable key={x.min} onPress={()=>setReminder(x.min)} style={[s.reminder,reminder===x.min&&s.reminderActive]}><Text style={[s.reminderText,reminder===x.min&&{color:palette.yellow}]}>{x.label}</Text></Pressable>)}</View>

    <SectionHeading title="Görsel hafıza" subtitle="Park yeri ve otopark biletini hesabında sakla"/>
    <View style={s.mediaGrid}><MediaCard title="Park fotoğrafı" subtitle="Direk, tabela veya park no" icon="camera-plus-outline" color={palette.purple} uri={photo} onPress={()=>capture('park')}/><MediaCard title="Otopark bileti" subtitle="Fiş, bilet veya giriş kartı" icon="ticket-confirmation-outline" color={palette.orange} uri={ticket} onPress={()=>capture('ticket')}/></View>

    <Pressable disabled={busy} onPress={store} style={[s.save,busy&&{opacity:.55}]}>{busy?<ActivityIndicator color={palette.ink}/>:<><View style={s.saveIcon}><MaterialCommunityIcons name="map-marker-check" size={24} color={palette.ink}/></View><View style={{flex:1}}><Text style={s.saveOver}>DRABORNPARK HAFIZASI</Text><Text style={s.saveTitle}>{demo.active?'DEMO PARKI KAYDET':'PARKI KAYDET'}</Text></View><MaterialCommunityIcons name="arrow-right" size={24} color={palette.ink}/></>}</Pressable>
    <View style={s.privacy}><MaterialCommunityIcons name="shield-lock-outline" size={23} color={palette.green}/><Text style={s.privacyText}>Park geçmişin kamusal değildir. DraBornPark konumunu arka planda sürekli izlemez; kayıt yalnızca sen Park Ettim dediğinde oluşur.</Text></View>
    <BottomDock active="park"/>
  </ScrollView></Animated.View></SafeAreaView>;
}

function Field({label,value,set,placeholder}:{label:string;value:string;set:(v:string)=>void;placeholder:string}){return <View><Text style={s.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={palette.muted2} style={s.input}/></View>}
function MediaCard({title,subtitle,icon,color,uri,onPress}:{title:string;subtitle:string;icon:any;color:string;uri:string|null;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.media,{borderColor:`${color}45`,backgroundColor:`${color}0E`}]}>{uri?<Image source={{uri}} style={s.mediaImage}/>:<><View style={[s.mediaIcon,{backgroundColor:`${color}20`}]}><MaterialCommunityIcons name={icon} size={27} color={color}/></View><Text style={s.mediaTitle}>{title}</Text><Text style={s.mediaSub}>{subtitle}</Text><View style={[s.mediaAction,{borderColor:`${color}40`}]}><Text style={[s.mediaActionText,{color}]}>FOTOĞRAF ÇEK</Text></View></>}</Pressable>}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:22},hero:{minHeight:170,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.orange}50`,backgroundColor:`${palette.orange}12`,padding:20,flexDirection:'row',alignItems:'center',gap:16},heroPin:{width:72,height:72,borderRadius:24,backgroundColor:`${palette.orange}20`,alignItems:'center',justifyContent:'center'},heroOver:{color:palette.orange,fontSize:type.micro,fontWeight:'900',letterSpacing:1.15},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',letterSpacing:-.65,marginTop:5},heroSub:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:6},
  vehicleRail:{gap:10,paddingRight:12},vehicleChip:{minWidth:190,minHeight:78,borderRadius:radius.md,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:11},vehicleChipActive:{borderColor:`${palette.cyan}60`,backgroundColor:`${palette.cyan}10`},vehicleName:{color:palette.muted,fontSize:type.bodyStrong,fontWeight:'900'},vehiclePlate:{color:palette.muted2,fontSize:type.caption,marginTop:3},
  locationCard:{minHeight:94,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.cyan}48`,backgroundColor:`${palette.cyan}0D`,padding:16,flexDirection:'row',alignItems:'center',gap:13,marginTop:14},locationIcon:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center'},locationTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},locationSub:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},
  form:{borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:17},fieldLabel:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:.8,marginTop:12,marginBottom:7},input:{height:56,borderRadius:17,borderWidth:1,borderColor:palette.line,backgroundColor:palette.bg2,color:palette.text,paddingHorizontal:14,fontSize:type.body},double:{flexDirection:'row',gap:10},
  reminders:{flexDirection:'row',flexWrap:'wrap',gap:9},reminder:{paddingHorizontal:15,paddingVertical:12,borderRadius:15,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel},reminderActive:{borderColor:`${palette.yellow}55`,backgroundColor:`${palette.yellow}14`},reminderText:{color:palette.muted,fontSize:type.caption,fontWeight:'900'},
  mediaGrid:{flexDirection:'row',gap:11},media:{flex:1,minHeight:184,borderRadius:radius.md,borderWidth:1,padding:14,overflow:'hidden'},mediaImage:{width:'100%',height:154,borderRadius:16},mediaIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center'},mediaTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:13},mediaSub:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:4},mediaAction:{marginTop:12,borderRadius:12,borderWidth:1,paddingVertical:8,alignItems:'center'},mediaActionText:{fontSize:type.micro,fontWeight:'900'},
  save:{height:72,borderRadius:23,backgroundColor:palette.aqua,marginTop:22,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:12},saveIcon:{width:47,height:47,borderRadius:16,backgroundColor:'#FFFFFF66',alignItems:'center',justifyContent:'center'},saveOver:{color:'#1B5B55',fontSize:type.micro,fontWeight:'900',letterSpacing:.7},saveTitle:{color:palette.ink,fontSize:type.cardTitle,fontWeight:'900',marginTop:1},privacy:{marginTop:13,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}3D`,backgroundColor:`${palette.green}0D`,padding:15,flexDirection:'row',gap:11},privacyText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19},
});