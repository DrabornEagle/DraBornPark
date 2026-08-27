import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AuroraBackground,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';
import {SafeIcon} from '@/src/components/Primitives';
import {supabase} from '@/src/lib/supabase';
import {palette,radius,type} from '@/src/theme';

const DKD_FALLBACK_LATEST_VERSION='1.0.24';
const DKD_FALLBACK_LATEST_VERSION_CODE=23;

type DkdPolicy={force_update_enabled?:boolean;minimum_version_code?:number;latest_version?:string;latest_version_code?:number};
type DkdUser={
  dkd_user_id:string;
  dkd_email:string|null;
  dkd_username:string|null;
  dkd_subscription_status:string|null;
  dkd_plus_trial_until:string|null;
  dkd_admin_plus_until:string|null;
  dkd_unlimited_plus:boolean;
  dkd_premium_until:string|null;
  dkd_premium_days_left:number|string;
  dkd_tag_count:number|string;
  dkd_active_tag_count:number|string;
  dkd_created_at:string;
}

export default function AdminPanel(){
  const [dkdLoading,setDkdLoading]=useState(true);
  const [dkdSaving,setDkdSaving]=useState(false);
  const [dkdAllowed,setDkdAllowed]=useState(false);
  const [dkdEnabled,setDkdEnabled]=useState(false);
  const [dkdMinimum,setDkdMinimum]=useState(19);
  const [dkdLatestVersion,setDkdLatestVersion]=useState(DKD_FALLBACK_LATEST_VERSION);
  const [dkdLatestCode,setDkdLatestCode]=useState(DKD_FALLBACK_LATEST_VERSION_CODE);
  const [dkdMessage,setDkdMessage]=useState('');
  const [dkdQuery,setDkdQuery]=useState('');
  const [dkdUsers,setDkdUsers]=useState<DkdUser[]>([]);
  const [dkdUsersLoading,setDkdUsersLoading]=useState(false);
  const [dkdUserBusy,setDkdUserBusy]=useState<string|null>(null);

  const dkdSearchUsers=async(dkdSearch=dkdQuery)=>{
    if(!dkdAllowed&& !dkdLoading)return;
    const dkdTerm=dkdSearch.trim();
    if(dkdTerm.length<2){setDkdUsers([]);setDkdMessage('Kullanıcı aramak için en az 2 karakter yaz.');return;}
    setDkdUsersLoading(true);
    try{
      const {data:dkdRows,error:dkdError}=await supabase.rpc('dkd_drabornpark_admin_search_users_v123',{dkd_query:dkdTerm});
      if(dkdError)throw dkdError;
      setDkdUsers((dkdRows??[]) as DkdUser[]);
    }catch(dkdError:any){setDkdMessage(dkdError?.message||'Kullanıcılar yüklenemedi.');}
    finally{setDkdUsersLoading(false);}
  };

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
      setDkdLatestVersion(String(dkdValue.latest_version||DKD_FALLBACK_LATEST_VERSION));
      setDkdLatestCode(Number(dkdValue.latest_version_code||DKD_FALLBACK_LATEST_VERSION_CODE));
      setDkdMinimum(Number(dkdValue.minimum_version_code||Math.max(1,Number(dkdValue.latest_version_code||DKD_FALLBACK_LATEST_VERSION_CODE)-1)));
      setDkdUsers([]);
    }catch(dkdError:any){setDkdMessage(dkdError?.message||'Admin ayarları yüklenemedi.');}
    finally{setDkdLoading(false);}
  };

  useEffect(()=>{void dkdLoad();},[]);

  const dkdSetForceUpdate=async(dkdNext:boolean)=>{
    if(!dkdAllowed||dkdSaving)return;
    setDkdSaving(true);setDkdMessage('');
    try{
      const {data:dkdPolicy,error:dkdError}=await supabase.rpc('dkd_drabornpark_set_force_update',{dkd_enabled:dkdNext,dkd_latest_version_code:dkdLatestCode});
      if(dkdError)throw dkdError;
      const dkdValue=(dkdPolicy??{}) as DkdPolicy;
      setDkdEnabled(Boolean(dkdValue.force_update_enabled));
      setDkdLatestVersion(String(dkdValue.latest_version||DKD_FALLBACK_LATEST_VERSION));
      setDkdLatestCode(Number(dkdValue.latest_version_code||DKD_FALLBACK_LATEST_VERSION_CODE));
      setDkdMinimum(Number(dkdValue.minimum_version_code||Math.max(1,Number(dkdValue.latest_version_code||DKD_FALLBACK_LATEST_VERSION_CODE)-1)));
      setDkdMessage(dkdNext?'Zorunlu güncelleme AKTİF. Eski sürümler Google Play güncellemesine yönlendirilecek.':'Zorunlu güncelleme PASİF. Kullanıcılar uygulamayı güncellemeden açabilir.');
    }catch(dkdError:any){setDkdMessage(dkdError?.message||'Zorunlu güncelleme ayarı değiştirilemedi.');}
    finally{setDkdSaving(false);}
  };

  const dkdUpdateUser=async(dkdUser:DkdUser,dkdUsername:string|null,dkdUnlimitedPlus:boolean,dkdPremiumDaysAdd:number)=>{
    if(dkdUserBusy)return;
    setDkdUserBusy(dkdUser.dkd_user_id);setDkdMessage('');
    try{
      const {error:dkdError}=await supabase.rpc('dkd_drabornpark_admin_update_user_v123',{
        dkd_target_user_id:dkdUser.dkd_user_id,
        dkd_username:dkdUsername,
        dkd_unlimited_plus:dkdUnlimitedPlus,
        dkd_premium_days_add:dkdPremiumDaysAdd,
      });
      if(dkdError)throw dkdError;
      if(dkdPremiumDaysAdd>0)setDkdMessage(`Kullanıcıya ${dkdPremiumDaysAdd} gün DraBornPark+ eklendi. Mevcut premium süresinin sonuna eklenir.`);
      else setDkdMessage(dkdUnlimitedPlus?'Kullanıcı için Sınırsız DraBornPark+ AKTİF. Bağlı etiketi otomatik olarak yeniden açıldı.':'Kullanıcı ayarları güncellendi.');
      await dkdSearchUsers();
    }catch(dkdError:any){
      const dkdRaw=String(dkdError?.message||'Kullanıcı güncellenemedi.');
      setDkdMessage(dkdRaw.includes('username_taken')?'Bu kullanıcı adı başka bir hesapta veya etiket kodunda kullanılıyor.':dkdRaw.includes('invalid_username')?'Kullanıcı adı 3–24 karakter olmalı; küçük harf, rakam, nokta, alt çizgi ve tire kullanılabilir.':dkdRaw.includes('premium_days_invalid')?'Premium gün değeri 0–3650 arasında olmalıdır.':dkdRaw);
    }finally{setDkdUserBusy(null);}
  };

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.orange} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="Admin Paneli" eyebrow="YÖNETİCİ KONTROL MERKEZİ" subtitle="Yayın politikasını ve DraBornPark kullanıcılarını tek merkezden güvenli şekilde yönet." accent={palette.orange}/>
    {dkdLoading?<View style={s.loading}><ActivityIndicator size="large" color={palette.orange}/><Text style={s.loadingText}>Admin yetkisi, yayın politikası ve kullanıcılar kontrol ediliyor…</Text></View>:!dkdAllowed?<View style={s.denied}><SafeIcon name="shield-lock-outline" size={38} color={palette.red}/><Text style={s.deniedTitle}>Yetki gerekli</Text><Text style={s.deniedText}>{dkdMessage||'Bu ekran yalnızca admin kullanıcılarına açıktır.'}</Text></View>:<>
      <View style={s.hero}><View style={s.heroIcon}><SafeIcon name="shield-crown-outline" size={34} color={palette.orange}/></View><View style={{flex:1}}><Text style={s.kicker}>CANLI YAYIN POLİTİKASI</Text><Text style={s.heroTitle}>Zorunlu Güncelleme</Text><Text style={s.heroText}>Tek anahtarla eski Android sürümlerinin uygulamaya girişini yönet.</Text></View></View>
      <View style={[s.control,{borderColor:dkdEnabled?palette.green+'88':palette.muted2+'66'}]}><View style={[s.statusIcon,{backgroundColor:(dkdEnabled?palette.green:palette.muted2)+'1C'}]}><SafeIcon name={dkdEnabled?'update':'update-off'} size={30} color={dkdEnabled?palette.green:palette.muted2}/></View><View style={{flex:1,minWidth:0}}><Text style={s.controlLabel}>ZORUNLU GÜNCELLEME</Text><Text style={[s.controlState,{color:dkdEnabled?palette.green:palette.muted2}]}>{dkdEnabled?'AKTİF':'PASİF'}</Text><Text style={s.controlMeta}>{dkdEnabled?`Google Play'deki v${dkdLatestVersion} yüklü değilse güncelleme zorunlu olur.`:'Eski sürümler güncelleme yapılmadan açılabilir.'}</Text></View><Switch value={dkdEnabled} disabled={dkdSaving} onValueChange={dkdSetForceUpdate}/></View>
      <View style={s.infoGrid}><View style={s.infoCard}><Text style={s.infoLabel}>GÜNCEL SÜRÜM</Text><Text style={s.infoValue}>v{dkdLatestVersion}</Text><Text style={s.infoSmall}>versionCode {dkdLatestCode} • Google Play son sürüm</Text></View><View style={s.infoCard}><Text style={s.infoLabel}>MİNİMUM KOD</Text><Text style={s.infoValue}>{dkdMinimum}</Text><Text style={s.infoSmall}>Bir önceki Google Play versionCode</Text></View></View>

      <SectionHeading title="Kullanıcı Yönetimi" subtitle="E-posta veya kullanıcı adıyla ara; kullanıcı adını, kalan Premium süresini ve Plus erişimini yönet"/>
      <View style={s.searchBox}><SafeIcon name="account-search-outline" size={24} color={palette.cyan}/><TextInput value={dkdQuery} onChangeText={dkdValue=>{setDkdQuery(dkdValue);setDkdUsers([]);setDkdMessage('');}} onSubmitEditing={()=>void dkdSearchUsers()} placeholder="E-posta veya kullanıcı adı ara" placeholderTextColor={palette.muted2} autoCapitalize="none" autoCorrect={false} style={s.searchInput}/><Pressable disabled={dkdUsersLoading} onPress={()=>void dkdSearchUsers()} style={s.searchButton}>{dkdUsersLoading?<ActivityIndicator color={palette.ink}/>:<SafeIcon name="magnify" size={24} color={palette.ink}/>}</Pressable></View>
      <View style={s.userSummary}><View><Text style={s.userSummaryLabel}>GÖSTERİLEN KULLANICI</Text><Text style={s.userSummaryValue}>{dkdUsers.length}</Text></View><View style={s.userSummaryRight}><Text style={s.userSummaryLabel}>SINIRSIZ PLUS</Text><Text style={[s.userSummaryValue,{color:palette.yellow}]}>{dkdUsers.filter(dkdUser=>dkdUser.dkd_unlimited_plus).length}</Text></View></View>
      {dkdQuery.trim().length>=2&&dkdUsers.length===0&&!dkdUsersLoading?<View style={s.empty}><SafeIcon name="account-search" size={31} color={palette.muted2}/><Text style={s.emptyTitle}>Kullanıcı bulunamadı</Text><Text style={s.emptyBody}>E-posta veya kullanıcı adıyla farklı bir arama yap.</Text></View>:null}
      {dkdUsers.map(dkdUser=><DkdUserEditor key={dkdUser.dkd_user_id} dkdUser={dkdUser} dkdBusy={dkdUserBusy===dkdUser.dkd_user_id} dkdOnSave={dkdUpdateUser}/>) }

      {dkdSaving?<View style={s.message}><ActivityIndicator color={palette.cyan}/><Text style={s.messageText}>Ayar Supabase üzerinde güvenli şekilde güncelleniyor…</Text></View>:dkdMessage?<View style={s.message}><SafeIcon name="information-outline" size={21} color={palette.cyan}/><Text style={s.messageText}>{dkdMessage}</Text></View>:null}
      <View style={s.warning}><SafeIcon name="shield-check-outline" size={25} color={palette.yellow}/><View style={{flex:1}}><Text style={s.warningTitle}>Sınırsız Plus admin ayrıcalığı</Text><Text style={s.warningText}>Premium gün ekleme mevcut deneme, Google Play veya admin Premium bitişinin sonuna eklenir. Sınırsız DraBornPark+ açılırsa süre sınırı uygulanmaz ve bağlı etiket otomatik aktif tutulur.</Text></View></View>
      <Pressable style={s.refresh} onPress={()=>void dkdLoad()}><SafeIcon name="refresh" size={20} color={palette.cyan}/><Text style={s.refreshText}>TÜM DURUMU YENİLE</Text></Pressable>
    </>}
  </ScrollView></SafeAreaView>;
}

function DkdUserEditor({dkdUser,dkdBusy,dkdOnSave}:{dkdUser:DkdUser;dkdBusy:boolean;dkdOnSave:(dkdUser:DkdUser,dkdUsername:string|null,dkdUnlimitedPlus:boolean,dkdPremiumDaysAdd:number)=>Promise<void>}){
  const [dkdUsername,setDkdUsername]=useState(dkdUser.dkd_username??'');
  const [dkdPremiumDays,setDkdPremiumDays]=useState('');
  useEffect(()=>{setDkdUsername(dkdUser.dkd_username??'');},[dkdUser.dkd_username]);
  const dkdPremiumUntil=dkdUser.dkd_premium_until?new Date(dkdUser.dkd_premium_until):null;
  const dkdPremiumActive=Boolean(dkdPremiumUntil&&!Number.isNaN(dkdPremiumUntil.getTime())&&dkdPremiumUntil.getTime()>Date.now());
  const dkdPremiumDaysLeft=Math.max(0,Number(dkdUser.dkd_premium_days_left||0));
  const dkdTrialActive=Boolean(dkdUser.dkd_plus_trial_until&&new Date(dkdUser.dkd_plus_trial_until).getTime()>Date.now());
  const dkdStatus=dkdUser.dkd_unlimited_plus?'SINIRSIZ PLUS':dkdPremiumActive?(dkdTrialActive?'PLUS DENEME':'PLUS AKTİF'):String(dkdUser.dkd_subscription_status||'BASIC').replace(/^PLUS_/,'PLUS ');
  const dkdStatusColor=dkdUser.dkd_unlimited_plus?palette.yellow:dkdPremiumActive?palette.green:palette.muted2;
  const dkdPremiumUntilText=dkdUser.dkd_unlimited_plus?'Sınırsız':dkdPremiumUntil&&!Number.isNaN(dkdPremiumUntil.getTime())?dkdPremiumUntil.toLocaleDateString('tr-TR'):'Premium yok';
  const dkdParsedDays=Math.min(3650,Math.max(0,Number.parseInt(dkdPremiumDays||'0',10)||0));
  return <View style={s.userCard}>
    <View style={s.userHead}><View style={s.userAvatar}><SafeIcon name="account" size={25} color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={s.userName}>{dkdUser.dkd_username?`@${dkdUser.dkd_username}`:'Kullanıcı adı yok'}</Text><Text numberOfLines={1} style={s.userEmail}>{dkdUser.dkd_email||'E-posta yok'}</Text></View><View style={[s.statusBadge,{borderColor:dkdStatusColor+'70',backgroundColor:dkdStatusColor+'14'}]}><Text style={[s.statusBadgeText,{color:dkdStatusColor}]}>{dkdStatus}</Text></View></View>
    <View style={s.userStats}><View style={s.userStat}><Text style={s.userStatLabel}>ETİKET</Text><Text style={s.userStatValue}>{Number(dkdUser.dkd_tag_count||0)}</Text></View><View style={s.userStat}><Text style={s.userStatLabel}>AKTİF</Text><Text style={[s.userStatValue,{color:palette.green}]}>{Number(dkdUser.dkd_active_tag_count||0)}</Text></View><View style={[s.userStat,{flex:2}]}><Text style={s.userStatLabel}>PREMİUM KALAN</Text><Text style={[s.userStatValue,{color:dkdUser.dkd_unlimited_plus?palette.yellow:dkdPremiumActive?palette.green:palette.muted2}]}>{dkdUser.dkd_unlimited_plus?'∞':`${dkdPremiumDaysLeft} gün`}</Text></View></View>
    <View style={s.editGrid}><View style={[s.editField,{flex:1}]}><Text style={s.editLabel}>KULLANICI ADI</Text><TextInput value={dkdUsername} onChangeText={dkdValue=>setDkdUsername(dkdValue.toLowerCase().replace(/[^a-z0-9._-]/g,''))} autoCapitalize="none" autoCorrect={false} placeholder="kullaniciadi" placeholderTextColor={palette.muted2} style={s.editInput}/></View></View>
    <View style={s.editGrid}><View style={[s.editField,{flex:1.15}]}><Text style={s.editLabel}>PREMİUM ABONELİK SÜRESİ EKLE (GÜN)</Text><TextInput value={dkdPremiumDays} onChangeText={dkdValue=>setDkdPremiumDays(dkdValue.replace(/\D/g,'').slice(0,4))} keyboardType="number-pad" maxLength={4} placeholder="Örn. 30" placeholderTextColor={palette.muted2} style={s.editInput}/></View><View style={[s.editField,{flex:.85}]}><Text style={s.editLabel}>PREMİUM BİTİŞ</Text><Text style={[s.editInput,{paddingTop:15,color:dkdPremiumActive||dkdUser.dkd_unlimited_plus?palette.green:palette.muted2}]}>{dkdPremiumUntilText}</Text></View></View>
    <View style={[s.unlimited,{borderColor:dkdUser.dkd_unlimited_plus?palette.yellow+'78':palette.line}]}><View style={[s.unlimitedIcon,{backgroundColor:(dkdUser.dkd_unlimited_plus?palette.yellow:palette.muted2)+'18'}]}><SafeIcon name="crown" size={25} color={dkdUser.dkd_unlimited_plus?palette.yellow:palette.muted2}/></View><View style={{flex:1}}><Text style={s.unlimitedTitle}>Sınırsız DraBornPark+</Text><Text style={s.unlimitedBody}>{dkdUser.dkd_unlimited_plus?'Süre sınırı yok • Etiket otomatik aktif':`Kalan ${dkdPremiumDaysLeft} gün • Bitiş ${dkdPremiumUntilText}`}</Text></View><Switch value={Boolean(dkdUser.dkd_unlimited_plus)} disabled={dkdBusy} onValueChange={dkdNext=>void dkdOnSave(dkdUser,null,dkdNext,0)}/></View>
    <Pressable disabled={dkdBusy} onPress={async()=>{await dkdOnSave(dkdUser,dkdUsername.trim()||null,Boolean(dkdUser.dkd_unlimited_plus),dkdParsedDays);setDkdPremiumDays('');}} style={[s.saveUser,dkdBusy&&{opacity:.55}]}>{dkdBusy?<ActivityIndicator color={palette.ink}/>:<><SafeIcon name="content-save-check-outline" size={21} color={palette.ink}/><Text style={s.saveUserText}>KULLANICIYI GÜNCELLE</Text></>}</Pressable>
  </View>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:80},loading:{minHeight:260,alignItems:'center',justifyContent:'center',gap:14},loadingText:{color:palette.muted,fontSize:type.caption,textAlign:'center'},denied:{marginTop:24,borderRadius:radius.xl,borderWidth:1,borderColor:palette.red+'66',backgroundColor:palette.red+'10',padding:28,alignItems:'center'},deniedTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginTop:12},deniedText:{color:palette.muted,fontSize:type.caption,lineHeight:20,textAlign:'center',marginTop:7},
  hero:{marginTop:8,minHeight:150,borderRadius:radius.xl,borderWidth:1,borderColor:palette.orange+'72',backgroundColor:palette.orange+'12',padding:18,flexDirection:'row',alignItems:'center',gap:14},heroIcon:{width:70,height:70,borderRadius:23,borderWidth:1,borderColor:palette.orange+'72',backgroundColor:palette.orange+'20',alignItems:'center',justifyContent:'center'},kicker:{color:palette.orange,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',marginTop:4},heroText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:5},
  control:{marginTop:14,minHeight:144,borderRadius:radius.xl,borderWidth:1,backgroundColor:palette.panel,padding:16,flexDirection:'row',alignItems:'center',gap:13},statusIcon:{width:58,height:58,borderRadius:19,alignItems:'center',justifyContent:'center'},controlLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900',letterSpacing:1},controlState:{fontSize:25,fontWeight:'900',marginTop:3},controlMeta:{color:palette.muted,fontSize:11,lineHeight:16,marginTop:4},infoGrid:{flexDirection:'row',gap:10,marginTop:10},infoCard:{flex:1,minHeight:112,borderRadius:22,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glassStrong,padding:14},infoLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900'},infoValue:{color:palette.text,fontSize:23,fontWeight:'900',marginTop:7},infoSmall:{color:palette.muted,fontSize:10,lineHeight:14,marginTop:3},
  searchBox:{minHeight:62,borderRadius:20,borderWidth:1,borderColor:palette.cyan+'55',backgroundColor:palette.panel,flexDirection:'row',alignItems:'center',paddingLeft:14,gap:9},searchInput:{flex:1,color:palette.text,fontSize:type.bodyStrong,paddingVertical:12},searchButton:{width:52,height:52,borderRadius:17,backgroundColor:palette.cyan,alignItems:'center',justifyContent:'center',marginRight:5},userSummary:{marginTop:10,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glassStrong,padding:13,flexDirection:'row',justifyContent:'space-between'},userSummaryRight:{alignItems:'flex-end'},userSummaryLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900',letterSpacing:.7},userSummaryValue:{color:palette.text,fontSize:23,fontWeight:'900',marginTop:2},
  empty:{marginTop:12,borderRadius:22,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:22,alignItems:'center'},emptyTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900',marginTop:8},emptyBody:{color:palette.muted,fontSize:type.caption,marginTop:4},
  userCard:{marginTop:12,borderRadius:radius.xl,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:15},userHead:{flexDirection:'row',alignItems:'center',gap:10},userAvatar:{width:48,height:48,borderRadius:16,backgroundColor:palette.cyan+'18',alignItems:'center',justifyContent:'center'},userName:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},userEmail:{color:palette.muted,fontSize:11,marginTop:3},statusBadge:{maxWidth:112,borderRadius:999,borderWidth:1,paddingHorizontal:9,paddingVertical:6},statusBadgeText:{fontSize:8,fontWeight:'900',textAlign:'center'},userStats:{flexDirection:'row',gap:8,marginTop:12},userStat:{flex:1,borderRadius:15,borderWidth:1,borderColor:palette.lineSoft,backgroundColor:palette.glassStrong,padding:9},userStatLabel:{color:palette.muted2,fontSize:8,fontWeight:'900'},userStatValue:{color:palette.text,fontSize:18,fontWeight:'900',marginTop:2},userStatSmall:{color:palette.text,fontSize:11,fontWeight:'800',marginTop:4},
  editGrid:{gap:8,marginTop:11},editField:{borderRadius:16,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glassStrong,paddingHorizontal:12,paddingTop:8},editLabel:{color:palette.muted2,fontSize:8,fontWeight:'900',letterSpacing:.7},editInput:{color:palette.text,fontSize:type.caption,fontWeight:'800',paddingVertical:9},unlimited:{marginTop:10,minHeight:74,borderRadius:18,borderWidth:1,backgroundColor:palette.glassStrong,padding:10,flexDirection:'row',alignItems:'center',gap:9},unlimitedIcon:{width:46,height:46,borderRadius:15,alignItems:'center',justifyContent:'center'},unlimitedTitle:{color:palette.text,fontSize:type.caption,fontWeight:'900'},unlimitedBody:{color:palette.muted,fontSize:10,lineHeight:14,marginTop:3},saveUser:{height:51,borderRadius:17,backgroundColor:palette.cyan,marginTop:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},saveUserText:{color:palette.ink,fontSize:type.caption,fontWeight:'900'},
  message:{marginTop:12,borderRadius:18,borderWidth:1,borderColor:palette.cyan+'50',backgroundColor:palette.cyan+'0D',padding:13,flexDirection:'row',alignItems:'center',gap:9},messageText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:18},warning:{marginTop:14,borderRadius:22,borderWidth:1,borderColor:palette.yellow+'55',backgroundColor:palette.yellow+'0D',padding:15,flexDirection:'row',gap:11},warningTitle:{color:palette.yellow,fontSize:type.bodyStrong,fontWeight:'900'},warningText:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},refresh:{height:54,borderRadius:18,borderWidth:1,borderColor:palette.cyan+'55',backgroundColor:palette.cyan+'0D',marginTop:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},refreshText:{color:palette.cyan,fontSize:type.caption,fontWeight:'900'}
});
