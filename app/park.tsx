import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, BottomDock, ScreenHeader } from '@/src/components/AppChrome';
import { loadLiveDashboard, savePark } from '@/src/lib/drabornpark';
import { uploadPrivateImage } from '@/src/lib/storage';
import { palette } from '@/src/theme';

const REMINDERS=[{label:'Kapalı',min:0},{label:'30 dk',min:30},{label:'1 saat',min:60},{label:'2 saat',min:120},{label:'3 saat',min:180}];

function ParkScreen(){
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
  const [busy,setBusy]=useState(false);
  const [locating,setLocating]=useState(false);
  const [coords,setCoords]=useState<{lat:number;lon:number;accuracy:number|null}|null>(null);
  const enter=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    let mounted=true;
    loadLiveDashboard().then(d=>{if(!mounted)return;setVehicles(d.vehicles);if(d.vehicles[0])setVehicleId(d.vehicles[0].id)}).catch(()=>router.replace('/auth'));
    Animated.timing(enter,{toValue:1,duration:430,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
    return()=>{mounted=false};
  },[enter]);

  async function locate(){
    setLocating(true);
    try{
      const permission=await Location.requestForegroundPermissionsAsync();
      if(permission.status!=='granted'){Alert.alert('Konum izni gerekli','Park konumunu kaydetmek için uygulama açıkken konum izni ver.');return;}
      const current=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      setCoords({lat:current.coords.latitude,lon:current.coords.longitude,accuracy:current.coords.accuracy});
      Haptics.selectionAsync();
    }catch(e:any){Alert.alert('Konum alınamadı',e?.message||'Konum servisini kontrol et.');}
    finally{setLocating(false)}
  }

  async function pickPhoto(){
    try{
      const permission=await ImagePicker.requestCameraPermissionsAsync();
      if(!permission.granted){Alert.alert('Kamera izni gerekli','Park yerinin fotoğrafını çekmek için kamera izni ver.');return;}
      const result=await ImagePicker.launchCameraAsync({quality:.78,allowsEditing:false});
      if(!result.canceled)setPhoto(result.assets[0].uri);
    }catch(e:any){Alert.alert('Kamera açılamadı',e?.message||'Kamera erişimini kontrol et.')}
  }

  async function scheduleReminder(parkId?:string){
    if(reminder<=0)return;
    try{
      const Notifications=await import('expo-notifications');
      const permission=await Notifications.requestPermissionsAsync();
      if(!permission.granted)return;
      await Notifications.scheduleNotificationAsync({
        content:{title:'DraBornPark • Park süresi',body:'Park sürenizin bitmesine 15 dakika kaldı.',data:{parkId}},
        trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:Math.max(5,(reminder-15)*60)},
      });
    }catch{
      // Expo Go/device notification support can vary; park record must still succeed.
    }
  }

  async function store(){
    if(!vehicleId){Alert.alert('Araç gerekli','Önce bir araç ekle.');return;}
    setBusy(true);
    try{
      let photoPath:string|null=null;
      if(photo)photoPath=await uploadPrivateImage(photo,'parks');
      const saved:any=await savePark({vehicleId,placeName:place,latitude:coords?.lat,longitude:coords?.lon,accuracyMeters:coords?.accuracy,floorCode:floor,zoneColor:zone,rowCode:row,bayCode:bay,note,photoPath,reminderMinutes:reminder,source:coords?'gps_manual':'manual'});
      await scheduleReminder(saved?.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Park hafızaya alındı','Konum, otopark detayı ve Timeline güncellendi.',[{text:'Ana Sayfa',onPress:()=>router.replace('/')}]);
    }catch(e:any){Alert.alert('Park kaydedilemedi',e?.message||'İşlem başarısız.');}
    finally{setBusy(false)}
  }

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange}/><Animated.View style={{flex:1,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[14,0]})}]}}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Park Hafızası" eyebrow="KONUM • FOTOĞRAF • HATIRLATICI" accent={palette.orange}/>
    <View style={s.hero}><View style={s.heroPin}><MaterialCommunityIcons name="map-marker-radius" size={35} color={palette.orange}/></View><View style={{flex:1}}><Text style={s.heroOver}>YENİ PARK KAYDI</Text><Text style={s.heroTitle}>Aracımı burada bıraktım.</Text><Text style={s.heroSub}>GPS’i kaydet; kapalı otoparktaysan kat, renk, sıra ve park numarasını da ekle.</Text></View></View>

    <Label>ARAÇ SEÇ</Label>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.vehicleRail}>{vehicles.map(v=><Pressable key={v.id} onPress={()=>setVehicleId(v.id)} style={[s.vehicleChip,vehicleId===v.id&&s.vehicleChipActive]}><MaterialCommunityIcons name={v.vehicle_type==='motorcycle'?'motorbike':'car-sports'} size={20} color={vehicleId===v.id?palette.cyan:palette.muted}/><View><Text style={[s.vehicleName,vehicleId===v.id&&{color:palette.text}]}>{v.vehicle_name}</Text><Text style={s.vehiclePlate}>{v.plate||'Plaka yok'}</Text></View>{vehicleId===v.id?<MaterialCommunityIcons name="check-circle" size={17} color={palette.green}/>:null}</Pressable>)}</ScrollView>

    <Pressable onPress={locate} style={[s.locationCard,coords&&{borderColor:'#2B6C62',backgroundColor:'#0E2A2A'}]}>{locating?<ActivityIndicator color={palette.cyan}/>:<View style={s.locationIcon}><MaterialCommunityIcons name={coords?'check':'crosshairs-gps'} size={24} color={coords?palette.green:palette.cyan}/></View>}<View style={{flex:1}}><Text style={s.locationTitle}>{coords?'Konum hazır':'Mevcut konumu al'}</Text><Text style={s.locationSub}>{coords?`${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)} • ±${Math.round(coords.accuracy||0)} m`:'Konum yalnızca bu park kaydı için alınır.'}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color={palette.muted}/></Pressable>

    <View style={s.form}><SectionTitle icon="parking" color={palette.cyan} title="Otopark detayı" subtitle="Açık veya kapalı otopark bilgilerini ekle"/><Field label="MEKAN / OTOPARK" value={place} set={setPlace} placeholder="Metromall AVM"/><View style={s.double}><View style={{flex:1}}><Field label="KAT" value={floor} set={setFloor} placeholder="P2"/></View><View style={{flex:1}}><Field label="BÖLGE / RENK" value={zone} set={setZone} placeholder="Mavi"/></View></View><View style={s.double}><View style={{flex:1}}><Field label="SIRA" value={row} set={setRow} placeholder="C"/></View><View style={{flex:1}}><Field label="PARK NO" value={bay} set={setBay} placeholder="128"/></View></View><Field label="KISA NOT" value={note} set={setNote} placeholder="Asansör karşısı, kolon yanı..."/></View>

    <View style={s.form}><SectionTitle icon="clock-outline" color={palette.yellow} title="Hatırlatıcı" subtitle="Park süresinin bitmesine 15 dakika kala uyar"/><View style={s.reminders}>{REMINDERS.map(x=><Pressable key={x.min} onPress={()=>setReminder(x.min)} style={[s.reminder,reminder===x.min&&s.reminderActive]}><Text style={[s.reminderText,reminder===x.min&&{color:palette.yellow}]}>{x.label}</Text></Pressable>)}</View></View>

    <View style={s.form}><SectionTitle icon="camera-outline" color={palette.purple} title="Park fotoğrafı" subtitle="Direk, tabela veya park numarasını sakla"/><Pressable onPress={pickPhoto} style={s.photo}>{photo?<Image source={{uri:photo}} style={s.photoImage}/>:<View style={s.photoEmpty}><View style={s.camera}><MaterialCommunityIcons name="camera-plus-outline" size={26} color={palette.purple}/></View><Text style={s.photoTitle}>PARK YERİNİ FOTOĞRAFLA</Text><Text style={s.photoSub}>Fotoğraf özel Storage alanında saklanır.</Text></View>}</Pressable></View>

    <Pressable disabled={busy} onPress={store} style={[s.save,busy&&{opacity:.55}]}>{busy?<ActivityIndicator color={palette.bg}/>:<><View style={s.saveIcon}><MaterialCommunityIcons name="map-marker-check" size={23} color={palette.bg}/></View><View style={{flex:1}}><Text style={s.saveOver}>DRABORNPARK HAFIZASI</Text><Text style={s.saveTitle}>PARKI KAYDET</Text></View><MaterialCommunityIcons name="arrow-right" size={22} color={palette.bg}/></>}</Pressable>
    <View style={s.privacy}><MaterialCommunityIcons name="shield-lock-outline" size={20} color={palette.green}/><Text style={s.privacyText}>Park geçmişin kamusal değildir. Sürekli konum takibi yapılmaz; kayıt yalnızca sen Park Ettim dediğinde oluşur.</Text></View>
    <BottomDock active="park"/>
  </ScrollView></Animated.View></SafeAreaView>;
}

function Label({children}:{children:React.ReactNode}){return <Text style={s.labelTop}>{children}</Text>}
function Field({label,value,set,placeholder}:{label:string;value:string;set:(v:string)=>void;placeholder:string}){return <View><Text style={s.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={palette.muted2} style={s.input}/></View>}
function SectionTitle({icon,color,title,subtitle}:{icon:any;color:string;title:string;subtitle:string}){return <View style={s.sectionTitle}><View style={[s.sectionIcon,{backgroundColor:`${color}16`}]}><MaterialCommunityIcons name={icon} size={20} color={color}/></View><View style={{flex:1}}><Text style={s.sectionMain}>{title}</Text><Text style={s.sectionSub}>{subtitle}</Text></View></View>}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:18,paddingBottom:20},hero:{minHeight:150,borderRadius:30,borderWidth:1,borderColor:'#664A2C',backgroundColor:'#201912',padding:17,flexDirection:'row',alignItems:'center',gap:14},heroPin:{width:66,height:66,borderRadius:23,backgroundColor:'#372515',alignItems:'center',justifyContent:'center'},heroOver:{color:palette.orange,fontSize:7.5,fontWeight:'900',letterSpacing:1.5},heroTitle:{color:palette.text,fontSize:22,fontWeight:'900',letterSpacing:-.6,marginTop:4},heroSub:{color:'#BDA588',fontSize:9.5,lineHeight:14,marginTop:5},labelTop:{color:palette.muted2,fontSize:7.5,fontWeight:'900',letterSpacing:1.3,marginTop:18,marginBottom:8},vehicleRail:{gap:8,paddingRight:10},vehicleChip:{minWidth:150,height:66,borderRadius:20,borderWidth:1,borderColor:palette.lineSoft,backgroundColor:'#0D1A2A',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9},vehicleChipActive:{borderColor:'#2A6076',backgroundColor:'#0D2635'},vehicleName:{color:palette.muted,fontSize:10,fontWeight:'900'},vehiclePlate:{color:palette.muted2,fontSize:7.5,marginTop:2},locationCard:{marginTop:12,minHeight:80,borderRadius:23,borderWidth:1,borderColor:'#28546A',backgroundColor:'#0D2232',padding:13,flexDirection:'row',alignItems:'center',gap:11},locationIcon:{width:46,height:46,borderRadius:16,backgroundColor:'#12334A',alignItems:'center',justifyContent:'center'},locationTitle:{color:palette.text,fontSize:12,fontWeight:'900'},locationSub:{color:palette.muted,fontSize:8.5,lineHeight:12.5,marginTop:3},form:{marginTop:12,borderRadius:27,borderWidth:1,borderColor:palette.lineSoft,backgroundColor:'#0D1B2D',padding:15},sectionTitle:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:7},sectionIcon:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center'},sectionMain:{color:palette.text,fontSize:14,fontWeight:'900'},sectionSub:{color:palette.muted,fontSize:8.5,marginTop:2},fieldLabel:{color:palette.muted2,fontSize:7.5,fontWeight:'900',letterSpacing:1,marginTop:11,marginBottom:6},input:{height:50,borderRadius:16,borderWidth:1,borderColor:'#28405D',backgroundColor:'#0A1524',color:palette.text,paddingHorizontal:13,fontSize:12},double:{flexDirection:'row',gap:9},reminders:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8},reminder:{paddingHorizontal:11,paddingVertical:9,borderRadius:13,borderWidth:1,borderColor:palette.lineSoft,backgroundColor:'#0A1524'},reminderActive:{borderColor:'#67592B',backgroundColor:'#242016'},reminderText:{color:palette.muted,fontSize:8.5,fontWeight:'900'},photo:{marginTop:8,minHeight:150,borderRadius:21,borderWidth:1,borderStyle:'dashed',borderColor:'#57426F',backgroundColor:'#151427',overflow:'hidden'},photoEmpty:{flex:1,minHeight:150,alignItems:'center',justifyContent:'center'},camera:{width:48,height:48,borderRadius:17,backgroundColor:'#2B203A',alignItems:'center',justifyContent:'center'},photoTitle:{color:palette.purple,fontSize:9,fontWeight:'900',marginTop:9},photoSub:{color:palette.muted,fontSize:8.5,marginTop:3},photoImage:{width:'100%',height:190},save:{height:72,borderRadius:24,backgroundColor:palette.cyan,marginTop:14,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:11},saveIcon:{width:45,height:45,borderRadius:16,backgroundColor:'#FFFFFF55',alignItems:'center',justifyContent:'center'},saveOver:{color:'#1C4858',fontSize:6.5,fontWeight:'900',letterSpacing:1},saveTitle:{color:palette.bg,fontSize:15,fontWeight:'900',marginTop:2},privacy:{marginTop:10,borderRadius:20,borderWidth:1,borderColor:'#295043',backgroundColor:'#0D211C',padding:12,flexDirection:'row',gap:9},privacyText:{color:'#91BCAA',fontSize:8.5,lineHeight:12.5,flex:1},
});

export default ParkScreen;
