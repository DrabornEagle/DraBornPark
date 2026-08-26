import {router} from 'expo-router';
import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AuroraBackground,ScreenHeader} from '@/src/components/AppChrome';
import {SafeIcon} from '@/src/components/Primitives';
import {supabase} from '@/src/lib/supabase';
import {palette,radius,type} from '@/src/theme';

const DKD_LATEST_VERSION='1.0.13';
const DKD_LATEST_VERSION_CODE=13;

type DkdPolicy={force_update_enabled?:boolean;minimum_version_code?:number};

export default function AdminPanel(){
  const [dkdLoading,setDkdLoading]=useState(true);
  const [dkdSaving,setDkdSaving]=useState(false);
  const [dkdAllowed,setDkdAllowed]=useState(false);
  const [dkdEnabled,setDkdEnabled]=useState(false);
  const [dkdMinimum,setDkdMinimum]=useState(0);
  const [dkdMessage,setDkdMessage]=useState('');

  const dkdLoad=async()=>{
    setDkdLoading(true);setDkdMessage('');
    try{
      const {data:dkdAdmin,error:dkdAdminError}=await supabase.rpc('drabornpark_is_admin');
      if(dkdAdminError)throw dkdAdminError;
      if(!dkdAdmin){setDkdAllowed(false);setDkdMessage('Bu alan yalnızca DraBornPark yöneticilerine açıktır.');return;}
      setDkdAllowed(true);
      const {data:dkdPolicy,error:dkdPolicyError}=await supabase.rpc('dkd_drabornpark_get_update_policy');
      if(dkdPolicyError)throw dkdPolicyError;
      const dkdValue=(dkdPolicy??{}) as DkdPolicy;
      setDkdEnabled(Boolean(dkdValue.force_update_enabled));
      setDkdMinimum(Number(dkdValue.minimum_version_code||0));
    }catch(dkdError:any){setDkdMessage(dkdError?.message||'Admin ayarları yüklenemedi.');}
    finally{setDkdLoading(false);}
  };

  useEffect(()=>{void dkdLoad();},[]);

  const dkdSetForceUpdate=async(dkdNext:boolean)=>{
    if(!dkdAllowed||dkdSaving)return;
    setDkdSaving(true);setDkdMessage('');
    try{
      const {data:dkdPolicy,error:dkdError}=await supabase.rpc('dkd_drabornpark_set_force_update',{dkd_enabled:dkdNext,dkd_latest_version_code:DKD_LATEST_VERSION_CODE});
      if(dkdError)throw dkdError;
      const dkdValue=(dkdPolicy??{}) as DkdPolicy;
      setDkdEnabled(Boolean(dkdValue.force_update_enabled));
      setDkdMinimum(Number(dkdValue.minimum_version_code||0));
      setDkdMessage(dkdNext?'Zorunlu güncelleme AKTİF. Eski sürümler Google Play güncellemesine yönlendirilecek.':'Zorunlu güncelleme PASİF. Kullanıcılar uygulamayı güncellemeden açabilir.');
    }catch(dkdError:any){setDkdMessage(dkdError?.message||'Zorunlu güncelleme ayarı değiştirilemedi.');}
    finally{setDkdSaving(false);}
  };

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Admin Paneli" eyebrow="YÖNETİCİ KONTROL MERKEZİ" subtitle="DraBornPark yayın ve uygulama politikalarını güvenli şekilde yönet." onBack={()=>router.back()} accent={palette.orange}/>
    {dkdLoading?<View style={s.loading}><ActivityIndicator size="large" color={palette.orange}/><Text style={s.loadingText}>Admin yetkisi ve yayın politikası kontrol ediliyor…</Text></View>:!dkdAllowed?<View style={s.denied}><SafeIcon name="shield-lock-outline" size={38} color={palette.red}/><Text style={s.deniedTitle}>Yetki gerekli</Text><Text style={s.deniedText}>{dkdMessage||'Bu ekran yalnızca admin kullanıcılarına açıktır.'}</Text></View>:<>
      <View style={s.hero}><View style={s.heroIcon}><SafeIcon name="shield-crown-outline" size={34} color={palette.orange}/></View><View style={{flex:1}}><Text style={s.kicker}>CANLI YAYIN POLİTİKASI</Text><Text style={s.heroTitle}>Zorunlu Güncelleme</Text><Text style={s.heroText}>Tek anahtarla eski Android sürümlerinin uygulamaya girişini yönet.</Text></View></View>
      <View style={[s.control,{borderColor:dkdEnabled?palette.green+'88':palette.muted2+'66'}]}><View style={[s.statusIcon,{backgroundColor:(dkdEnabled?palette.green:palette.muted2)+'1C'}]}><SafeIcon name={dkdEnabled?'update':'update-off'} size={30} color={dkdEnabled?palette.green:palette.muted2}/></View><View style={{flex:1,minWidth:0}}><Text style={s.controlLabel}>ZORUNLU GÜNCELLEME</Text><Text style={[s.controlState,{color:dkdEnabled?palette.green:palette.muted2}]}>{dkdEnabled?'AKTİF':'PASİF'}</Text><Text style={s.controlMeta}>{dkdEnabled?`v${DKD_LATEST_VERSION} altındaki sürümler güncellemeye zorlanır.`:'Eski sürümler güncelleme yapılmadan açılabilir.'}</Text></View><Switch value={dkdEnabled} disabled={dkdSaving} onValueChange={dkdSetForceUpdate}/></View>
      <View style={s.infoGrid}><View style={s.infoCard}><Text style={s.infoLabel}>GÜNCEL SÜRÜM</Text><Text style={s.infoValue}>v{DKD_LATEST_VERSION}</Text><Text style={s.infoSmall}>versionCode {DKD_LATEST_VERSION_CODE}</Text></View><View style={s.infoCard}><Text style={s.infoLabel}>MİNİMUM KOD</Text><Text style={s.infoValue}>{dkdEnabled?dkdMinimum:'—'}</Text><Text style={s.infoSmall}>{dkdEnabled?'Daha düşük kodlar engellenir':'Politika devre dışı'}</Text></View></View>
      {dkdSaving?<View style={s.message}><ActivityIndicator color={palette.cyan}/><Text style={s.messageText}>Ayar Supabase üzerinde güvenli şekilde güncelleniyor…</Text></View>:dkdMessage?<View style={s.message}><SafeIcon name="information-outline" size={21} color={palette.cyan}/><Text style={s.messageText}>{dkdMessage}</Text></View>:null}
      <View style={s.warning}><SafeIcon name="google-play" size={25} color={palette.yellow}/><View style={{flex:1}}><Text style={s.warningTitle}>Yayın sırası önemli</Text><Text style={s.warningText}>Yeni AAB Google Play üzerinde kullanılabilir olmadan zorunlu güncellemeyi AKTİF yapma. Aktif edildiğinde eski sürümler doğrudan Google Play DraBornPark sayfasına yönlendirilir.</Text></View></View>
      <Pressable style={s.refresh} onPress={()=>void dkdLoad()}><SafeIcon name="refresh" size={20} color={palette.cyan}/><Text style={s.refreshText}>DURUMU YENİLE</Text></Pressable>
    </>}
  </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:80},loading:{minHeight:260,alignItems:'center',justifyContent:'center',gap:14},loadingText:{color:palette.muted,fontSize:type.caption,textAlign:'center'},denied:{marginTop:24,borderRadius:radius.xl,borderWidth:1,borderColor:palette.red+'66',backgroundColor:palette.red+'10',padding:28,alignItems:'center'},deniedTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginTop:12},deniedText:{color:palette.muted,fontSize:type.caption,lineHeight:20,textAlign:'center',marginTop:7},hero:{marginTop:8,minHeight:150,borderRadius:radius.xl,borderWidth:1,borderColor:palette.orange+'72',backgroundColor:palette.orange+'12',padding:18,flexDirection:'row',alignItems:'center',gap:14},heroIcon:{width:70,height:70,borderRadius:23,borderWidth:1,borderColor:palette.orange+'72',backgroundColor:palette.orange+'20',alignItems:'center',justifyContent:'center'},kicker:{color:palette.orange,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',marginTop:4},heroText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:5},control:{marginTop:14,minHeight:144,borderRadius:radius.xl,borderWidth:1,backgroundColor:palette.panel,padding:16,flexDirection:'row',alignItems:'center',gap:13},statusIcon:{width:58,height:58,borderRadius:19,alignItems:'center',justifyContent:'center'},controlLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900',letterSpacing:1},controlState:{fontSize:25,fontWeight:'900',marginTop:3},controlMeta:{color:palette.muted,fontSize:11,lineHeight:16,marginTop:4},infoGrid:{flexDirection:'row',gap:10,marginTop:10},infoCard:{flex:1,minHeight:112,borderRadius:22,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glassStrong,padding:14},infoLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900'},infoValue:{color:palette.text,fontSize:23,fontWeight:'900',marginTop:7},infoSmall:{color:palette.muted,fontSize:10,lineHeight:14,marginTop:3},message:{marginTop:10,borderRadius:18,borderWidth:1,borderColor:palette.cyan+'50',backgroundColor:palette.cyan+'0D',padding:13,flexDirection:'row',alignItems:'center',gap:9},messageText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:18},warning:{marginTop:14,borderRadius:22,borderWidth:1,borderColor:palette.yellow+'55',backgroundColor:palette.yellow+'0D',padding:15,flexDirection:'row',gap:11},warningTitle:{color:palette.yellow,fontSize:type.bodyStrong,fontWeight:'900'},warningText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},refresh:{height:54,borderRadius:18,borderWidth:1,borderColor:palette.cyan+'55',backgroundColor:palette.cyan+'0D',marginTop:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},refreshText:{color:palette.cyan,fontSize:type.caption,fontWeight:'900'}});
