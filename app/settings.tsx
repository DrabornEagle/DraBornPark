import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { useDemo } from '@/src/demo/DemoContext';
import { defaultNotificationSettings, NotificationSettings, updateNotificationSettings } from '@/src/lib/extras';
import { loadLiveDashboard } from '@/src/lib/drabornpark';
import { palette, radius, type } from '@/src/theme';

export default function SettingsScreen(){
  const demo=useDemo();
  const [settings,setSettings]=useState<NotificationSettings>(defaultNotificationSettings);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(!demo.active);
  useEffect(()=>{
    if(demo.active){setLoading(false);return;}
    loadLiveDashboard().then(data=>setSettings({...defaultNotificationSettings,...(data.profile?.notification_settings||{})})).catch(()=>router.replace('/auth')).finally(()=>setLoading(false));
  },[demo.active]);
  const toggle=(key:keyof NotificationSettings,value:boolean|string)=>setSettings(current=>({...current,[key]:value}));
  async function save(){
    if(demo.active){Alert.alert('Demo ayarları','Bu ekran Demo modunda gerçek hesabı değiştirmez.');return;}
    setBusy(true);try{await updateNotificationSettings(settings);Alert.alert('Ayarlar kaydedildi','Bildirim tercihlerin güncellendi.');}catch(e:any){Alert.alert('Kaydedilemedi',e?.message||'İşlem başarısız.');}finally{setBusy(false)}
  }
  if(loading)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.purple}/><View style={s.loading}><ActivityIndicator color={palette.cyan}/></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.purple} secondary={palette.cyan}/><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="Ayarlar" eyebrow="KİŞİSEL KONTROL" accent={palette.purple} subtitle="Bildirim, sessiz saatler ve uygulama tercihleri"/>
    <SectionHeading title="Araç bildirimleri" subtitle="Hangi olaylarda uyarılmak istediğini seç"/>
    <View style={s.panel}>
      <ToggleRow icon="car-alert" color={palette.orange} title="Araç bildirimleri" detail="Far, cam, kapı, engelleme ve diğer normal bildirimler" value={settings.vehicleReports} onValue={v=>toggle('vehicleReports',v)}/>
      <ToggleRow icon="shield-alert-outline" color={palette.red} title="Acil durumlar" detail="Çocuk, hayvan, yangın ve yüksek öncelikli olaylar" value={settings.emergencyReports} onValue={v=>toggle('emergencyReports',v)}/>
      <ToggleRow icon="timer-outline" color={palette.cyan} title="Park hatırlatıcıları" detail="Park süresi ve kayıt hatırlatmaları" value={settings.parkReminders} onValue={v=>toggle('parkReminders',v)}/>
      <ToggleRow icon="account-group-outline" color={palette.purple} title="Family hareketleri" detail="Aile ağı izin ve paylaşım değişiklikleri" value={settings.familyUpdates} onValue={v=>toggle('familyUpdates',v)}/>
      <ToggleRow icon="wrench-outline" color={palette.blue} title="Servis / Vale güncellemeleri" detail="Araç hazır, ek işlem ve geçici mod olayları" value={settings.serviceUpdates} onValue={v=>toggle('serviceUpdates',v)} last/>
    </View>
    <SectionHeading title="Sessiz saatler" subtitle="Acil durumlar bu ayardan etkilenmez" badge={settings.quietHoursEnabled?'AKTİF':'KAPALI'} color={palette.yellow}/>
    <View style={s.panel}>
      <ToggleRow icon="weather-night" color={palette.yellow} title="Sessiz saatleri kullan" detail="Normal bildirimleri belirlediğin zaman aralığında sessize al" value={settings.quietHoursEnabled} onValue={v=>toggle('quietHoursEnabled',v)} last/>
      {settings.quietHoursEnabled?<View style={s.timeRow}><TimeInput label="BAŞLANGIÇ" value={settings.quietHoursStart} onChange={v=>toggle('quietHoursStart',v)}/><View style={s.timeArrow}><MaterialCommunityIcons name="arrow-right" size={22} color={palette.muted2}/></View><TimeInput label="BİTİŞ" value={settings.quietHoursEnd} onChange={v=>toggle('quietHoursEnd',v)}/></View>:null}
    </View>
    <SectionHeading title="Hızlı erişim" subtitle="Sık kullanılan güvenlik merkezleri"/>
    <View style={s.quick}>
      <Quick icon="shield-lock-outline" color={palette.green} title="Gizlilik" onPress={()=>router.push('/feature/privacy')}/>
      <Quick icon="crown-outline" color={palette.yellow} title="DraBornPark+" onPress={()=>router.push('/feature/plus')}/>
      <Quick icon="lifebuoy" color={palette.blue} title="Destek" onPress={()=>router.push('/feature/support')}/>
    </View>
    <Pressable disabled={busy} onPress={save} style={[s.save,busy&&{opacity:.6}]}>{busy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="content-save-check-outline" size={23} color={palette.ink}/><Text style={s.saveText}>{demo.active?'DEMO AYARLARINI TEST ET':'AYARLARI KAYDET'}</Text></>}</Pressable>
    <View style={s.note}><MaterialCommunityIcons name="information-outline" size={22} color={palette.cyan}/><Text style={s.noteText}>Expo Go'da yerel park hatırlatmaları test edilebilir. Uygulama kapalıyken gerçek uzak push teslimi development build aşamasındadır.</Text></View>
  </ScrollView></SafeAreaView>;
}

function ToggleRow({icon,color,title,detail,value,onValue,last}:{icon:any;color:string;title:string;detail:string;value:boolean;onValue:(v:boolean)=>void;last?:boolean}){return <View style={[s.toggle,!last&&s.divider]}><View style={[s.icon,{backgroundColor:`${color}1B`}]}><MaterialCommunityIcons name={icon} size={24} color={color}/></View><View style={{flex:1}}><Text style={s.toggleTitle}>{title}</Text><Text style={s.toggleDetail}>{detail}</Text></View><Switch value={value} onValueChange={onValue} trackColor={{false:'#315064',true:`${color}88`}} thumbColor={value?color:'#AABBC6'}/></View>}
function TimeInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <View style={{flex:1}}><Text style={s.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder="23:00" placeholderTextColor={palette.muted2} style={s.input}/></View>}
function Quick({icon,color,title,onPress}:{icon:any;color:string;title:string;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.quickCard,{borderColor:`${color}45`,backgroundColor:`${color}10`}]}><MaterialCommunityIcons name={icon} size={26} color={color}/><Text style={s.quickText}>{title}</Text><MaterialCommunityIcons name="arrow-top-right" size={18} color={color}/></Pressable>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:48},loading:{flex:1,alignItems:'center',justifyContent:'center'},panel:{borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,paddingHorizontal:16},toggle:{minHeight:88,flexDirection:'row',alignItems:'center',gap:13,paddingVertical:14},divider:{borderBottomWidth:1,borderBottomColor:palette.lineSoft},icon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center'},toggleTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},toggleDetail:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:4},timeRow:{flexDirection:'row',alignItems:'flex-end',gap:10,paddingBottom:17},timeArrow:{height:52,alignItems:'center',justifyContent:'center'},inputLabel:{color:palette.yellow,fontSize:type.micro,fontWeight:'900',marginBottom:7},input:{height:52,borderRadius:16,borderWidth:1,borderColor:palette.line,backgroundColor:palette.bg2,color:palette.text,fontSize:type.bodyStrong,fontWeight:'800',textAlign:'center'},quick:{flexDirection:'row',gap:10},quickCard:{flex:1,minHeight:118,borderRadius:radius.md,borderWidth:1,padding:14,justifyContent:'space-between'},quickText:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},save:{height:64,borderRadius:21,backgroundColor:palette.aqua,marginTop:22,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},saveText:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},note:{marginTop:14,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.cyan}35`,backgroundColor:`${palette.cyan}0C`,padding:15,flexDirection:'row',gap:11},noteText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19}});
