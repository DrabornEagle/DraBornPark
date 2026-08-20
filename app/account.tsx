import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { Pill, SafeIcon } from '@/src/components/Primitives';
import { ACCOUNT_DELETION_URL, DATA_SAFETY_URL, PRIVACY_URL, SUPPORT_URL, TERMS_URL, deleteDraBornParkAccount } from '@/src/lib/account';
import { supabase } from '@/src/lib/supabase';
import { palette, radius, type } from '@/src/theme';

export default function AccountScreen(){
  const [email,setEmail]=useState('');const [loading,setLoading]=useState(true);const [deleting,setDeleting]=useState(false);
  useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(!data.user){router.replace('/auth');return;}setEmail(data.user.email||'DraBornPark hesabı');}).finally(()=>setLoading(false))},[]);
  async function signOut(){await supabase.auth.signOut();router.replace('/')}
  function confirmDelete(){Alert.alert('Hesabını ve verilerini kalıcı olarak sil?','DraBornPark profilin, Auth hesabın ve hesaba bağlı araç, park, bildirim/mesaj, Aile/Geçici Sürücü, özel dosya, yönlendirme, acil kişi ve cihaz kayıtların kalıcı silme işlemine alınır. İşlem geri alınamaz.',[
    {text:'Vazgeç',style:'cancel'},
    {text:'Devam Et',style:'destructive',onPress:()=>Alert.alert('Son onay','DraBornPark hesabının ve hesaba bağlı kullanıcı verilerinin kalıcı olarak silinmesini onaylıyor musun?',[
      {text:'Hayır',style:'cancel'},
      {text:'EVET, KALICI SİL',style:'destructive',onPress:performDelete},
    ])},
  ])}
  async function performDelete(){setDeleting(true);try{await deleteDraBornParkAccount();Alert.alert('Hesap ve veriler silindi','DraBornPark hesabın ve hesaba bağlı kullanıcı verilerin kalıcı olarak silindi.',[{text:'Tamam',onPress:()=>router.replace('/')}]);}catch(e:any){Alert.alert('Silme tamamlanamadı',e?.message||'Lütfen tekrar dene. Web hesap silme sayfasını da kullanabilirsin.');}finally{setDeleting(false)}}
  if(loading)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.blue}/><View style={s.loading}><ActivityIndicator color={palette.cyan}/><Text style={s.loadingText}>Hesabın hazırlanıyor…</Text></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.blue} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Hesabım" eyebrow="HESAP & VERİ" accent={palette.blue} subtitle="Oturumunu, yasal bağlantıları ve verilerini tek yerden yönet."/>
    <View style={s.profile}><View style={s.avatar}><SafeIcon name="account-circle-outline" size={42} color={palette.blue}/><View style={s.online}/></View><View style={{flex:1}}><Text style={s.profileLabel}>DRABORNPARK HESABI</Text><Text style={s.email}>{email}</Text><Text style={s.profileSub}>Kişisel araç ağı • güvenli oturum</Text></View><Pill label="AKTİF" color={palette.green}/></View>

    <SectionHeading title="Hesap işlemleri" subtitle="Güvenli ve anlaşılır kontroller"/>
    <View style={s.list}>
      <Row icon="shield-lock-outline" color={palette.green} title="Gizlilik & Veri Merkezi" body="Erişilen veriler, kullanım amaçları, hizmet sağlayıcılar ve saklama yaklaşımı" onPress={()=>router.push('/legal')}/>
      <Row icon="web" color={palette.cyan} title="Web üzerinden hesap silme" body="Uygulama olmadan doğrulayıp sil veya hesaba erişemiyorsan silme talebi oluştur" onPress={()=>Linking.openURL(ACCOUNT_DELETION_URL)}/>
      <Row icon="lifebuoy" color={palette.blue} title="DraBornPark Destek" body="Destek, veri ve gizlilik talepleri" onPress={()=>Linking.openURL(SUPPORT_URL)}/>
      <Row icon="logout" color={palette.muted} title="Oturumu kapat" body="Bu cihazdaki DraBornPark oturumunu kapat" onPress={signOut}/>
    </View>

    <SectionHeading title="Yasal bağlantılar" subtitle="Google Play ve kullanıcı şeffaflığı için herkese açık"/>
    <View style={s.legalGrid}><Mini icon="file-lock-outline" color={palette.green} title="Gizlilik" onPress={()=>Linking.openURL(PRIVACY_URL)}/><Mini icon="file-document-check-outline" color={palette.purple} title="Koşullar" onPress={()=>Linking.openURL(TERMS_URL)}/><Mini icon="shield-check-outline" color={palette.cyan} title="Veri Güvenliği" onPress={()=>Linking.openURL(DATA_SAFETY_URL)}/><Mini icon="account-remove-outline" color={palette.red} title="Silme Sayfası" onPress={()=>Linking.openURL(ACCOUNT_DELETION_URL)}/></View>

    <SectionHeading title="Tehlikeli bölge" subtitle="Bu işlem geri alınamaz" color={palette.red}/>
    <View style={s.danger}><View style={s.dangerIcon}><SafeIcon name="account-remove-outline" size={30} color={palette.red}/></View><View style={{flex:1}}><Text style={s.dangerTitle}>Hesabımı ve kullanıcı verilerimi kalıcı olarak sil</Text><Text style={s.dangerBody}>Hesabın dondurulmaz; kullanıcı hesabı ve ilişkili kullanıcı verileri kalıcı silme işlemine alınır. Fiziksel NFC/QR etiketinin seri/Tag ID/üretim kaydı kullanıcı ve araçtan ayrıştırılmış teknik ürün kimliği olarak korunabilir; yeniden aktivasyon/devir gerekebilir.</Text></View></View>
    <Pressable disabled={deleting} onPress={confirmDelete} style={[s.deleteButton,deleting&&{opacity:.55}]}>{deleting?<ActivityIndicator color={palette.white}/>:<><SafeIcon name="delete-forever-outline" size={24} color={palette.white}/><Text style={s.deleteText}>HESABIMI VE VERİLERİMİ KALICI SİL</Text></>}</Pressable>
    <Text style={s.note}>Yasal veya güvenlik nedeniyle belirli bir kayıt tutulmak zorundaysa yalnızca gerekli kapsam ve süre uygulanır. Ayrıntılar herkese açık Gizlilik Politikası'nda açıklanır.</Text>
  </ScrollView></SafeAreaView>;
}

function Row({icon,color,title,body,onPress}:{icon:string;color:string;title:string;body:string;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.row,{borderColor:`${color}3F`}]}><View style={[s.rowIcon,{backgroundColor:`${color}18`}]}><SafeIcon name={icon} size={25} color={color}/></View><View style={{flex:1}}><Text style={s.rowTitle}>{title}</Text><Text style={s.rowBody}>{body}</Text></View><SafeIcon name="chevron-right" size={23} color={color}/></Pressable>}
function Mini({icon,color,title,onPress}:{icon:string;color:string;title:string;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.mini,{borderColor:`${color}45`,backgroundColor:`${color}0D`}]}><SafeIcon name={icon} size={27} color={color}/><Text style={s.miniTitle}>{title}</Text><SafeIcon name="open-in-new" size={17} color={color}/></Pressable>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:52},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:13},loadingText:{color:palette.muted,fontSize:type.body},profile:{minHeight:116,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.blue}50`,backgroundColor:palette.glassStrong,padding:18,flexDirection:'row',alignItems:'center',gap:14},avatar:{width:68,height:68,borderRadius:23,backgroundColor:`${palette.blue}18`,borderWidth:1,borderColor:`${palette.blue}45`,alignItems:'center',justifyContent:'center'},online:{position:'absolute',right:5,bottom:5,width:10,height:10,borderRadius:5,backgroundColor:palette.green,borderWidth:2,borderColor:palette.panel},profileLabel:{color:palette.blue,fontSize:type.micro,fontWeight:'900',letterSpacing:.8},email:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:4},profileSub:{color:palette.muted,fontSize:type.caption,marginTop:4},list:{gap:10},row:{minHeight:94,borderRadius:radius.md,borderWidth:1,backgroundColor:palette.glass,padding:14,flexDirection:'row',alignItems:'center',gap:12},rowIcon:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center'},rowTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},rowBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:4},legalGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},mini:{width:'48.4%',minHeight:128,borderRadius:radius.md,borderWidth:1,padding:15,justifyContent:'space-between'},miniTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},danger:{borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.red}45`,backgroundColor:`${palette.red}0D`,padding:17,flexDirection:'row',gap:13},dangerIcon:{width:58,height:58,borderRadius:19,backgroundColor:`${palette.red}18`,alignItems:'center',justifyContent:'center'},dangerTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},dangerBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:5},deleteButton:{minHeight:64,borderRadius:20,backgroundColor:'#C93850',marginTop:13,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},deleteText:{color:palette.white,fontSize:type.bodyStrong,fontWeight:'900',textAlign:'center'},note:{color:palette.muted2,fontSize:type.caption,lineHeight:20,textAlign:'center',marginTop:13}});
