import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader } from '@/src/components/AppChrome';
import { bootstrapProfile, isUsernameAvailable, uploadProfileAvatar } from '@/src/lib/drabornpark';
import { pickProfileImage } from '@/src/lib/imagePicker';
import { normalizePhoneE164, saveProfilePhone } from '@/src/lib/v060';
import { supabase } from '@/src/lib/supabase';
import { palette, radius, type } from '@/src/theme';

type Mode='login'|'signup';
const PENDING_AVATAR_KEY='drabornpark_pending_avatar_v060';

export default function AuthScreen(){
  const [mode,setMode]=useState<Mode>('login');
  const [username,setUsername]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [avatarAsset,setAvatarAsset]=useState<any>(null);

  async function pickAvatar(){
    try{
      const result=await pickProfileImage();
      if(result.permissionDenied){Alert.alert('Fotoğraf izni gerekli','Profil resmi seçmek için fotoğraf arşivine erişim izni vermelisin.');return;}
      if(result.asset)setAvatarAsset(result.asset);
    }catch(error:any){Alert.alert('Profil resmi açılamadı',error?.message||'Fotoğraf seçiciyi tekrar dene.');}
  }

  async function uploadPendingAvatar(asset:any){
    if(!asset)return;
    try{
      await uploadProfileAvatar({uri:asset.uri,mimeType:asset.mimeType,fileName:asset.fileName});
      await AsyncStorage.removeItem(PENDING_AVATAR_KEY);
    }catch{
      await AsyncStorage.setItem(PENDING_AVATAR_KEY,JSON.stringify({uri:asset.uri,mimeType:asset.mimeType,fileName:asset.fileName}));
    }
  }

  async function submit(){
    if(!email.trim()||password.length<6){Alert.alert('Bilgileri kontrol et','Geçerli bir e-posta ve en az 6 karakterlik parola gir.');return;}
    setBusy(true);
    try{
      if(mode==='login'){
        const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
        if(error)throw error;
        await bootstrapProfile();
        const pendingRaw=await AsyncStorage.getItem(PENDING_AVATAR_KEY);
        if(pendingRaw){try{await uploadPendingAvatar(JSON.parse(pendingRaw));}catch{}}
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      }else{
        const normalized=username.trim().toLowerCase();
        if(!/^[a-z0-9._-]{3,24}$/.test(normalized)){
          Alert.alert('Kullanıcı adını kontrol et','Kullanıcı adı 3–24 karakter olmalı; yalnızca küçük harf, rakam, nokta, alt çizgi ve tire kullanabilirsin.');
          return;
        }
        if(!(await isUsernameAvailable(normalized))){Alert.alert('Kullanıcı adı kullanımda','Başka bir kullanıcı adı seç.');return;}
        const normalizedPhone=normalizePhoneE164(phone);
        if(avatarAsset)await AsyncStorage.setItem(PENDING_AVATAR_KEY,JSON.stringify({uri:avatarAsset.uri,mimeType:avatarAsset.mimeType,fileName:avatarAsset.fileName}));
        const {data,error}=await supabase.auth.signUp({
          email:email.trim().toLowerCase(),password,
          options:{data:{display_name:normalized,username:normalized,phone_e164:normalizedPhone}}
        });
        if(error)throw error;
        if(data.session){
          await bootstrapProfile(normalized,normalized);
          await saveProfilePhone(normalizedPhone);
          await uploadPendingAvatar(avatarAsset);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/');
        }else{
          Alert.alert('E-postanı doğrula','Hesap oluşturuldu. E-posta doğrulamasını tamamlayıp giriş yaptığında kullanıcı adın, telefon numaran ve seçtiğin profil resmi tamamlanır.');
          setMode('login');
        }
      }
    }catch(e:any){
      Alert.alert('İşlem tamamlanamadı',e?.message==='username_taken'?'Bu kullanıcı adı kullanımda.':e?.message||'Beklenmeyen bir hata oluştu.');
    }finally{setBusy(false)}
  }

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan} secondary={palette.purple}/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="always" keyboardDismissMode="none" removeClippedSubviews={false} showsVerticalScrollIndicator={false}>
    <ScreenHeader title={mode==='login'?'Tekrar hoş geldin':'DraBornPark’a katıl'} eyebrow="GÜVENLİ HESAP" accent={palette.cyan} subtitle="Telefon numaran araç üzerinde görünmeden iletişim ve park ağını yönet."/>
    <View style={s.hero}><View style={s.heroIcon}><MaterialCommunityIcons name="shield-car" size={38} color={palette.cyan}/></View><View style={{flex:1}}><Text style={s.heroKicker}>PRIVACY FIRST</Text><Text style={s.heroTitle}>{mode==='login'?'Araç ağın seni bekliyor.':'Aracın için güvenli bir dijital kimlik oluştur.'}</Text><Text style={s.heroBody}>NFC + QR, Park Hafızası, araç bildirimleri ve Aile tek hesapta.</Text></View></View>
    <View style={s.tabs}><Pressable onPress={()=>setMode('login')} style={[s.tab,mode==='login'&&s.tabActive]}><MaterialCommunityIcons name="login" size={20} color={mode==='login'?palette.cyan:palette.muted2}/><Text style={[s.tabText,mode==='login'&&{color:palette.text}]}>Giriş Yap</Text></Pressable><Pressable onPress={()=>setMode('signup')} style={[s.tab,mode==='signup'&&s.tabActive]}><MaterialCommunityIcons name="account-plus-outline" size={20} color={mode==='signup'?palette.purple:palette.muted2}/><Text style={[s.tabText,mode==='signup'&&{color:palette.text}]}>Hesap Oluştur</Text></Pressable></View>
    <View style={s.form}>
      {mode==='signup'?<>
        <Pressable onPress={pickAvatar} style={s.avatarPicker}><View style={s.avatarPreview}>{avatarAsset?<Image source={{uri:avatarAsset.uri}} style={s.avatarImage}/>:<MaterialCommunityIcons name="account-circle-outline" size={37} color={palette.purple}/>}<View style={s.avatarEdit}><MaterialCommunityIcons name="camera-plus-outline" size={14} color={palette.ink}/></View></View><View style={{flex:1}}><Text style={s.avatarTitle}>Profil resmi ekle</Text><Text style={s.avatarBody}>Opsiyonel • daha sonra değiştirebilirsin</Text></View><MaterialCommunityIcons name="image-edit-outline" size={23} color={palette.purple}/></Pressable>
        <Field label="KULLANICI ADI *" value={username} set={setUsername} placeholder="draborneagle" icon="account-outline"/>
        <Field label="TELEFON NUMARASI *" value={phone} set={setPhone} placeholder="+90 555 111 22 33" icon="phone-lock-outline" keyboard="phone-pad"/>
      </>:null}
      <Field label="E-POSTA" value={email} set={setEmail} placeholder="ornek@mail.com" icon="email-outline" keyboard="email-address"/>
      <Field label="PAROLA" value={password} set={setPassword} placeholder="En az 6 karakter" icon="lock-outline" secure/>
      <Pressable disabled={busy} onPress={submit} style={[s.cta,busy&&{opacity:.6}]}>{busy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="shield-check" size={24} color={palette.ink}/><View style={{flex:1}}><Text style={s.ctaTitle}>{mode==='login'?'GÜVENLİ GİRİŞ YAP':'HESABIMI OLUŞTUR'}</Text><Text style={s.ctaSub}>{mode==='login'?'Araç merkezine devam et':'DraBornPark profilini başlat'}</Text></View><MaterialCommunityIcons name="arrow-right" size={22} color={palette.ink}/></>}</Pressable>
    </View>
    {mode==='signup'?<View style={s.trial}><View style={s.trialIcon}><MaterialCommunityIcons name="crown" size={27} color={palette.yellow}/></View><View style={{flex:1}}><Text style={s.trialTitle}>Etiket Aktivasyonunda 14 Gün DraBornPark+</Text><Text style={s.trialBody}>Hesabın Basic olarak açılır. Yeni DraBornPark etiketini aktive ettiğinde 14 günlük Premium ödülün otomatik başlar.</Text></View></View>:null}
    <View style={s.privacy}><MaterialCommunityIcons name="shield-lock-outline" size={23} color={palette.green}/><Text style={s.privacyText}>Telefon, e-posta, tam ad ve park geçmişin QR/NFC ziyaretçisine gösterilmez.</Text></View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Field({label,value,set,placeholder,icon,keyboard,secure}:{label:string;value:string;set:(v:string)=>void;placeholder:string;icon:any;keyboard?:any;secure?:boolean}){return <View><Text style={s.label}>{label}</Text><View style={s.inputWrap}><MaterialCommunityIcons name={icon} size={22} color={palette.cyan}/><TextInput value={value} onChangeText={set} autoCapitalize="none" keyboardType={keyboard} secureTextEntry={secure} placeholder={placeholder} placeholderTextColor={palette.muted2} style={s.input} blurOnSubmit={false}/></View></View>}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:220},hero:{minHeight:180,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.cyan}48`,backgroundColor:`${palette.cyan}0E`,padding:20,flexDirection:'row',alignItems:'center',gap:16},heroIcon:{width:76,height:76,borderRadius:26,backgroundColor:`${palette.cyan}20`,alignItems:'center',justifyContent:'center'},heroKicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:1.2},heroTitle:{color:palette.text,fontSize:24,fontWeight:'900',lineHeight:29,letterSpacing:-.6,marginTop:5},heroBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:7},tabs:{flexDirection:'row',borderRadius:radius.md,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:6,marginTop:18,gap:6},tab:{flex:1,minHeight:58,borderRadius:17,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},tabActive:{backgroundColor:palette.panel3},tabText:{color:palette.muted,fontSize:type.body,fontWeight:'900'},form:{marginTop:14,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:17,gap:13},label:{color:palette.aqua,fontSize:type.micro,fontWeight:'900',letterSpacing:.9,marginBottom:7},inputWrap:{height:58,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:palette.bg2,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:10},input:{flex:1,color:palette.text,fontSize:type.body},avatarPicker:{minHeight:82,borderRadius:20,borderWidth:1,borderColor:`${palette.purple}55`,backgroundColor:`${palette.purple}12`,padding:12,flexDirection:'row',alignItems:'center',gap:12},avatarPreview:{width:58,height:58,borderRadius:20,borderWidth:1,borderColor:`${palette.purple}70`,backgroundColor:`${palette.purple}20`,alignItems:'center',justifyContent:'center'},avatarImage:{width:'100%',height:'100%',borderRadius:19},avatarEdit:{position:'absolute',right:-4,bottom:-4,width:23,height:23,borderRadius:8,backgroundColor:palette.aqua,borderWidth:2,borderColor:palette.panel,alignItems:'center',justifyContent:'center'},avatarTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},avatarBody:{color:palette.muted,fontSize:type.caption,marginTop:3},cta:{minHeight:68,borderRadius:21,backgroundColor:palette.aqua,marginTop:4,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:11},ctaTitle:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},ctaSub:{color:'#285D59',fontSize:type.caption,marginTop:2},trial:{marginTop:14,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.yellow}45`,backgroundColor:`${palette.yellow}0E`,padding:16,flexDirection:'row',gap:12},trialIcon:{width:52,height:52,borderRadius:18,backgroundColor:`${palette.yellow}20`,alignItems:'center',justifyContent:'center'},trialTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},trialBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},privacy:{marginTop:14,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}38`,backgroundColor:`${palette.green}0B`,padding:15,flexDirection:'row',alignItems:'center',gap:11},privacyText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19}
});