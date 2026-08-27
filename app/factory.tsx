import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import {router} from 'expo-router';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AuroraBackground,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';
import {supabase} from '@/src/lib/supabase';
import {palette,radius,type} from '@/src/theme';

const dkd_states=['NFC_PENDING','NFC_VERIFIED','QR_VERIFIED','PACKED','READY_FOR_SALE','SOLD','ACTIVATED','DISABLED'];
const dkd_state_labels:Record<string,string>={NFC_PENDING:'NFC bekliyor',NFC_VERIFIED:'NFC doğrulandı',QR_VERIFIED:'QR doğrulandı',PACKED:'Paketlendi',READY_FOR_SALE:'Satışa hazır',SOLD:'Satıldı',ACTIVATED:'Aktif',DISABLED:'Devre dışı'};
const dkd_state_info=[
  ['1 • Etiketi üret','Sistem etikete özel NFC bağlantı kodunu ve kalıcı fiziksel NFC/QR URL’sini otomatik oluşturur.'],
  ['2 • QR’ı bas','Ekrandaki QR tam olarak fiziksel NFC/QR bağlantısını içerir. Her fiziksel etiket kendine özel NFC bağlantı kodu taşır.'],
  ['3 • NTAG213’e yaz','Aynı URL’yi NDEF URL/URI kaydı olarak NTAG213’e yaz. Kişi, telefon veya plaka çipe yazılmaz.'],
  ['4 • Test et','Telefonla NFC’yi, kamerayla QR’ı okut. İkisi de aynı etikete gitmelidir.'],
  ['5 • Aktivasyon','Müşteri PIN ile etiketi hesabına ve aracına bağlar. Fiziksel URL değişmeden backend eşleşmesi güncellenir.'],
];

type DkdEdit={tagCode:string;serial:string;shortCode:string;username:string;pin:string;notes:string};
const dkd_empty_edit:DkdEdit={tagCode:'',serial:'',shortCode:'',username:'',pin:'',notes:''};
const dkd_base='https://www.draborneagle.com/DraBornPark/tag/';
function dkd_short_from_url(dkd_url:string){return String(dkd_url||'').split('/').filter(Boolean).pop()||''}
function dkd_physical_url(dkd_short:string){return `${dkd_base}${dkd_short.trim().toLowerCase()}`}
function dkd_friendly_url(dkd_username:string){return dkd_username.trim()?`${dkd_base}${dkd_username.trim().toLowerCase()}`:''}

export default function FactoryScreen(){
  const [dkd_tags,setDkdTags]=useState<any[]>([]);
  const [dkd_loading,setDkdLoading]=useState(true);
  const [dkd_busy,setDkdBusy]=useState(false);
  const [dkd_serial,setDkdSerial]=useState('');
  const [dkd_admin,setDkdAdmin]=useState<boolean|null>(null);
  const [dkd_last_secret,setDkdLastSecret]=useState<any>(null);
  const [dkd_editing_id,setDkdEditingId]=useState<string|null>(null);
  const [dkd_edit,setDkdEdit]=useState<DkdEdit>(dkd_empty_edit);

  async function dkd_copy(dkd_value:string,dkd_label='Bağlantı'){
    if(!dkd_value)return;
    await Clipboard.setStringAsync(dkd_value);
    await Haptics.selectionAsync().catch(()=>undefined);
    Alert.alert('Kopyalandı',`${dkd_label} panoya kopyalandı.`);
  }

  async function dkd_refresh(){
    setDkdLoading(true);
    try{
      const {data:dkd_is_admin,error:dkd_admin_error}=await supabase.rpc('drabornpark_is_admin');
      if(dkd_admin_error)throw dkd_admin_error;
      setDkdAdmin(Boolean(dkd_is_admin));
      if(!dkd_is_admin)return;
      const {data:dkd_rows,error}=await supabase.from('drabornpark_tags').select('id,tag_code,serial_number,public_alias,nfc_url,status,owner_user_id,vehicle_id,manufactured_at,sold_at,activated_at,last_verified_at,factory_notes').order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      const dkd_owner_ids=[...new Set((dkd_rows||[]).map((dkd_row:any)=>dkd_row.owner_user_id).filter(Boolean))];
      let dkd_usernames:Record<string,string>={};
      if(dkd_owner_ids.length){
        const {data:dkd_profiles,error:dkd_profiles_error}=await supabase.from('drabornpark_profiles').select('user_id,username').in('user_id',dkd_owner_ids);
        if(dkd_profiles_error)throw dkd_profiles_error;
        dkd_usernames=Object.fromEntries((dkd_profiles||[]).map((dkd_profile:any)=>[dkd_profile.user_id,String(dkd_profile.username||'')]));
      }
      setDkdTags((dkd_rows||[]).map((dkd_row:any)=>({...dkd_row,owner_username:dkd_row.owner_user_id?dkd_usernames[dkd_row.owner_user_id]||'':''})));
    }catch(dkd_problem){console.warn(dkd_problem);setDkdAdmin(false)}finally{setDkdLoading(false)}
  }
  useEffect(()=>{void dkd_refresh()},[]);

  async function dkd_create(){
    setDkdBusy(true);
    try{
      const {data,error}=await supabase.rpc('drabornpark_factory_create_tag',{drabornpark_serial_number:dkd_serial.trim()||null});
      if(error)throw error;
      const dkd_row=Array.isArray(data)?data[0]:data;
      setDkdLastSecret(dkd_row);setDkdSerial('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await dkd_refresh();
      Alert.alert('Yeni etiket üretildi','Bu fiziksel etikete özel kısa URL oluşturuldu. QR aynı URL’yi içerir; NTAG213’e de bu URL yazılacaktır.');
    }catch(dkd_problem:any){Alert.alert('Üretim başarısız',dkd_problem?.message||'Yönetici yetkisi gerekli.')}finally{setDkdBusy(false)}
  }

  async function dkd_change_status(dkd_tag:any,dkd_status:string){
    if(dkd_tag.activated_at&&!['ACTIVATED','DISABLED'].includes(dkd_status))return Alert.alert('Aktif etiket korunuyor','Aktive edilmiş etiket üretim akışında geriye alınamaz. Etiket bilgilerini Düzenle bölümünden değiştirebilirsin.');
    setDkdBusy(true);
    try{const {error}=await supabase.rpc('drabornpark_factory_set_status',{drabornpark_tag_id:dkd_tag.id,drabornpark_status:dkd_status,drabornpark_note:null});if(error)throw error;await Haptics.selectionAsync();await dkd_refresh();}
    catch(dkd_problem:any){const dkd_message=String(dkd_problem?.message||'');Alert.alert('Durum güncellenemedi',dkd_message.includes('activated_tag_status_locked')?'Aktive edilmiş etikette yalnızca Aktif veya Devre dışı durumu kullanılabilir.':dkd_message)}
    finally{setDkdBusy(false)}
  }

  function dkd_begin_edit(dkd_tag:any){
    setDkdEditingId(dkd_tag.id);
    setDkdEdit({tagCode:dkd_tag.tag_code||'',serial:dkd_tag.serial_number||'',shortCode:dkd_tag.public_alias||dkd_short_from_url(dkd_tag.nfc_url),username:dkd_tag.owner_username||'',pin:'',notes:dkd_tag.factory_notes||''});
  }

  async function dkd_save_edit(dkd_tag:any){
    const dkd_tag_code=dkd_edit.tagCode.trim().toUpperCase();
    const dkd_short=dkd_edit.shortCode.trim().toLowerCase();
    const dkd_username=dkd_edit.username.trim().toLowerCase();
    const dkd_pin=dkd_edit.pin.trim();
    if(!/^DP-[A-Z0-9]{4,32}$/.test(dkd_tag_code))return Alert.alert('Etiket ID geçersiz','Örnek: DP-A1B2C3D4');
    if(!/^\d{4}-\d{4}$/.test(dkd_short))return Alert.alert('NFC bağlantı kodu geçersiz','NFC bağlantı kodu 1234-4321 biçiminde olmalıdır.');
    if(dkd_username&&(!/^[a-z0-9._-]{3,24}$/.test(dkd_username)||/^\d{4}-\d{4}$/.test(dkd_username)))return Alert.alert('Kullanıcı adı geçersiz','3–24 karakter kullan. 1234-4321 biçimi fiziksel etiket kodlarına ayrılmıştır.');
    if(dkd_username&&!dkd_tag.owner_user_id)return Alert.alert('Etiket henüz sahipsiz','Kullanıcı adı ancak etiket bir hesaba aktive edildikten sonra kullanıcı profiline atanabilir.');
    if(dkd_pin&&!/^\d{8}$/.test(dkd_pin))return Alert.alert('PIN geçersiz','Yeni aktivasyon PIN’i tam 8 rakam olmalıdır. Boş bırakırsan mevcut PIN değişmez.');
    setDkdBusy(true);
    try{
      const {error}=await supabase.rpc('dkd_drabornpark_factory_update_tag_v104',{dkd_tag_id:dkd_tag.id,dkd_tag_code,dkd_serial_number:dkd_edit.serial.trim()||null,dkd_short_code:dkd_short,dkd_activation_pin:dkd_pin||null,dkd_factory_notes:dkd_edit.notes.trim()||null,dkd_username:dkd_username||null});
      if(error)throw error;
      setDkdEditingId(null);setDkdEdit(dkd_empty_edit);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);await dkd_refresh();
      Alert.alert('Etiket güncellendi','NFC/QR kısa bağlantısı kaydedildi. Kullanıcı URL’si varsa ayrıca kişisel paylaşım bağlantısı da aynı aktif etiketi çözer.');
    }catch(dkd_problem:any){const dkd_message=String(dkd_problem?.message||'');Alert.alert('Etiket düzenlenemedi',dkd_message.includes('username_taken')?'Bu kullanıcı adı kullanımda.':dkd_message.includes('unique')||dkd_message.includes('reserved')?'Etiket ID, seri, NFC bağlantı kodu veya kullanıcı adı başka bir kayıtta kullanılıyor.':dkd_message||'Lütfen tekrar dene.')}finally{setDkdBusy(false)}
  }

  function dkd_remove(dkd_tag:any){
    Alert.alert('Etiketi kalıcı olarak sil',`${dkd_tag.tag_code} etiketi ve bağlı üretim kayıtları kalıcı olarak silinecek.`,[{text:'Vazgeç',style:'cancel'},{text:'KALICI SİL',style:'destructive',onPress:async()=>{setDkdBusy(true);try{const {error}=await supabase.rpc('drabornpark_factory_delete_tag',{drabornpark_tag_id:dkd_tag.id});if(error)throw error;if(dkd_editing_id===dkd_tag.id)setDkdEditingId(null);await dkd_refresh()}catch(dkd_problem:any){Alert.alert('Etiket silinemedi',dkd_problem?.message||'')}finally{setDkdBusy(false)}}}]);
  }

  const dkd_active_count=useMemo(()=>dkd_tags.filter(dkd_tag=>dkd_tag.status==='ACTIVATED').length,[dkd_tags]);
  if(dkd_loading)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan}/><View style={s.loading}><ActivityIndicator color={palette.cyan}/><Text style={s.loadingText}>Üretim yetkisi doğrulanıyor…</Text></View></SafeAreaView>;
  if(!dkd_admin)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.red}/><View style={s.denied}><MaterialCommunityIcons name="shield-lock-outline" size={48} color={palette.red}/><Text style={s.deniedTitle}>Üretim Paneli korumalı</Text><Text style={s.muted}>Etiket üretim bilgileri yalnızca yönetici hesaplarına açıktır.</Text><Pressable onPress={()=>router.replace('/')} style={s.primary}><Text style={s.primaryText}>ANA SAYFAYA DÖN</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan} secondary={palette.orange}/><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Üretim Paneli" eyebrow="NFC + QR ETİKET MERKEZİ • v1.0.17" accent={palette.cyan} subtitle="NFC bağlantı kodu kalıcıdır; sahip ve araç eşleşmesi Supabase üzerinden dinamik değişir."/>
    <View style={s.stats}><DkdStat icon="nfc" value={dkd_tags.length} label="Toplam" color={palette.cyan}/><DkdStat icon="qrcode" value={dkd_tags.filter(dkd_tag=>dkd_tag.public_alias).length} label="NFC URL" color={palette.purple}/><DkdStat icon="shield-check" value={dkd_active_count} label="Aktif" color={palette.green}/></View>

    <SectionHeading title="Doğru fiziksel akış" subtitle="Her fiziksel etiket benzersiz, sahip eşleşmesi dinamik" color={palette.purple}/>
    <View style={s.guide}>{dkd_state_info.map(([dkd_title,dkd_body])=><View key={dkd_title} style={s.guideRow}><MaterialCommunityIcons name="check-circle-outline" size={22} color={palette.purple}/><View style={{flex:1}}><Text style={s.guideTitle}>{dkd_title}</Text><Text style={s.guideBody}>{dkd_body}</Text></View></View>)}</View>

    <SectionHeading title="Yeni etiket üret" subtitle="Sistem otomatik benzersiz 1234-4321 NFC bağlantı kodu üretir"/>
    <View style={s.panel}><Text style={s.label}>SERİ NUMARASI (OPSİYONEL)</Text><TextInput value={dkd_serial} onChangeText={setDkdSerial} autoCapitalize="characters" placeholder="DPS-20260824-0001" placeholderTextColor={palette.muted2} style={s.input}/><Pressable disabled={dkd_busy} onPress={()=>void dkd_create()} style={[s.primary,dkd_busy&&s.disabled]}>{dkd_busy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="plus-circle" size={24} color={palette.ink}/><Text style={s.primaryText}>YENİ ETİKET ÜRET</Text></>}</Pressable></View>

    {dkd_last_secret?<View style={s.secret}><View style={s.secretHead}><MaterialCommunityIcons name="key-variant" size={30} color={palette.yellow}/><View style={{flex:1}}><Text style={s.secretTitle}>Tek seferlik üretim paketi</Text><Text style={s.muted}>Bu QR ve NTAG213’e yazacağın URL birebir aynıdır.</Text></View></View>
      <DkdCopyLine label="Etiket ID" value={dkd_last_secret.tag_code} onCopy={()=>void dkd_copy(String(dkd_last_secret.tag_code),'Etiket ID')}/>
      <DkdCopyLine label="Seri" value={dkd_last_secret.serial_number} onCopy={()=>void dkd_copy(String(dkd_last_secret.serial_number),'Seri numarası')}/>
      <DkdQr url={String(dkd_last_secret.nfc_url||'')} onCopy={()=>void dkd_copy(String(dkd_last_secret.nfc_url||''),'Fiziksel NFC/QR bağlantısı')}/>
      <DkdCopyLine label="Aktivasyon PIN" value={dkd_last_secret.activation_pin} accent={palette.yellow} onCopy={()=>void dkd_copy(String(dkd_last_secret.activation_pin),'Aktivasyon PIN')}/>
      <Text style={s.warning}>PIN yalnızca üretim anında düz metin görünür. Fiziksel QR/NFC içine PIN, telefon, plaka veya kullanıcı kimliği yazılmaz.</Text>
    </View>:null}

    <SectionHeading title="Üretim kuyruğu" subtitle="NFC bağlantı kodunu, kullanıcı URL’sini ve fiziksel NFC/QR eşleşmesini yönet" badge={`${dkd_tags.length} ETİKET`} color={palette.orange}/>
    <View style={s.list}>{dkd_tags.map(dkd_tag=>{const dkd_editing=dkd_editing_id===dkd_tag.id;const dkd_friend=dkd_friendly_url(dkd_tag.owner_username||'');return <View key={dkd_tag.id} style={s.tag}>
      <View style={s.tagHead}><View style={s.nfc}><MaterialCommunityIcons name="nfc" size={29} color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text style={s.tagCode}>{dkd_tag.tag_code}</Text><Text style={s.tagMeta}>{dkd_tag.serial_number} • {dkd_tag.public_alias||'Kısa kod yok'}</Text><Text numberOfLines={2} selectable style={s.tagUrl}>{dkd_tag.nfc_url}</Text>{dkd_friend?<Text numberOfLines={2} selectable style={s.friendUrl}>Kişisel: {dkd_friend}</Text>:null}</View><View style={s.badge}><Text style={s.badgeText}>{dkd_state_labels[dkd_tag.status]||dkd_tag.status}</Text></View></View>
      <View style={s.quickActions}><Pressable onPress={()=>void dkd_copy(String(dkd_tag.nfc_url||''),'Fiziksel NFC/QR bağlantısı')} style={s.secondary}><MaterialCommunityIcons name="content-copy" size={18} color={palette.cyan}/><Text style={s.secondaryText}>NFC/QR KOPYALA</Text></Pressable>{dkd_friend?<Pressable onPress={()=>void dkd_copy(dkd_friend,'Kişisel bağlantı')} style={s.secondary}><MaterialCommunityIcons name="link-variant" size={18} color={palette.green}/><Text style={s.secondaryText}>KİŞİSEL URL</Text></Pressable>:null}<Pressable onPress={()=>dkd_editing?setDkdEditingId(null):dkd_begin_edit(dkd_tag)} style={s.secondary}><MaterialCommunityIcons name={dkd_editing?'close':'pencil-outline'} size={18} color={palette.purple}/><Text style={s.secondaryText}>{dkd_editing?'KAPAT':'DÜZENLE'}</Text></Pressable><Pressable disabled={dkd_busy} onPress={()=>dkd_remove(dkd_tag)} style={[s.secondary,{borderColor:`${palette.red}66`}]}><MaterialCommunityIcons name="trash-can-outline" size={18} color={palette.red}/></Pressable></View>
      {dkd_editing?<View style={s.editor}><Text style={s.editorTitle}>Etiket üretim bilgilerini düzenle</Text>
        <Text style={s.label}>ETİKET ID</Text><TextInput style={s.input} value={dkd_edit.tagCode} autoCapitalize="characters" onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,tagCode:dkd_value.toUpperCase().replace(/[^A-Z0-9-]/g,'')}))}/>
        <Text style={s.label}>SERİ NUMARASI</Text><TextInput style={s.input} value={dkd_edit.serial} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,serial:dkd_value}))}/>
        <Text style={s.label}>NFC BAĞLANTI KODU • FİZİKSEL NFC/QR</Text><TextInput style={s.input} keyboardType="number-pad" maxLength={9} value={dkd_edit.shortCode} onChangeText={dkd_value=>{const dkd_digits=dkd_value.replace(/\D/g,'').slice(0,8);setDkdEdit(dkd_current=>({...dkd_current,shortCode:dkd_digits.length>4?`${dkd_digits.slice(0,4)}-${dkd_digits.slice(4)}`:dkd_digits}))}} placeholder="1234-4321" placeholderTextColor={palette.muted2}/>
        <Text style={s.derived}>{dkd_physical_url(dkd_edit.shortCode)}</Text><DkdQr url={dkd_physical_url(dkd_edit.shortCode)} onCopy={()=>void dkd_copy(dkd_physical_url(dkd_edit.shortCode),'Fiziksel NFC/QR bağlantısı')}/>
        <Text style={s.label}>KULLANICI ADI / KİŞİSEL BAĞLANTI (OPSİYONEL)</Text><TextInput editable={Boolean(dkd_tag.owner_user_id)} style={[s.input,!dkd_tag.owner_user_id&&s.disabled]} autoCapitalize="none" autoCorrect={false} value={dkd_edit.username} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,username:dkd_value.toLowerCase().replace(/[^a-z0-9._-]/g,'')}))} placeholder={dkd_tag.owner_user_id?'draborneagle':'Önce etiket aktive edilmeli'} placeholderTextColor={palette.muted2}/>
        {dkd_edit.username?<Text style={s.derived}>{dkd_friendly_url(dkd_edit.username)}</Text>:<Text style={s.pinNote}>Kullanıcı adı yoksa kişisel URL oluşturulmaz. Fiziksel kısa URL çalışmaya devam eder.</Text>}
        <Text style={s.label}>YENİ AKTİVASYON PIN (OPSİYONEL)</Text><TextInput style={s.input} keyboardType="number-pad" maxLength={8} value={dkd_edit.pin} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,pin:dkd_value.replace(/\D/g,'')}))} placeholder="Boş = mevcut PIN değişmez" placeholderTextColor={palette.muted2}/><Text style={s.pinNote}>Eski PIN güvenlik nedeniyle okunamaz. Yeni 8 rakam girersen hash olarak yenilenir.</Text>
        <Text style={s.label}>ÜRETİM NOTU</Text><TextInput style={[s.input,s.notes]} multiline value={dkd_edit.notes} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,notes:dkd_value}))} placeholder="İsteğe bağlı üretim notu" placeholderTextColor={palette.muted2}/>
        <Pressable disabled={dkd_busy} onPress={()=>void dkd_save_edit(dkd_tag)} style={[s.primary,dkd_busy&&s.disabled]}><MaterialCommunityIcons name="content-save-check-outline" size={20} color={palette.ink}/><Text style={s.primaryText}>DEĞİŞİKLİKLERİ KAYDET</Text></Pressable>
      </View>:null}
      {dkd_tag.activated_at?<Text style={s.lockInfo}>Aktive edilmiş etikette üretim durumu geriye alınmaz. Düzenleme alanı güvenle kullanılabilir.</Text>:null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stateRail}>{dkd_states.map(dkd_state=>{const dkd_locked=Boolean(dkd_tag.activated_at)&&!['ACTIVATED','DISABLED'].includes(dkd_state);const dkd_disabled=dkd_busy||dkd_tag.status===dkd_state||dkd_locked;return <Pressable disabled={dkd_disabled} key={dkd_state} onPress={()=>void dkd_change_status(dkd_tag,dkd_state)} style={[s.state,dkd_tag.status===dkd_state&&s.stateOn,dkd_locked&&s.stateLocked]}><Text style={[s.stateText,dkd_tag.status===dkd_state&&{color:palette.green}]}>{dkd_state_labels[dkd_state]}</Text></Pressable>})}</ScrollView>
    </View>})}</View>
  </ScrollView></SafeAreaView>;
}

function DkdStat({icon,value,label,color}:{icon:any;value:number;label:string;color:string}){return <View style={[s.stat,{borderColor:`${color}45`,backgroundColor:`${color}0E`}]}><MaterialCommunityIcons name={icon} size={23} color={color}/><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}
function DkdCopyLine({label,value,onCopy,accent}:{label:string;value:any;onCopy:()=>void;accent?:string}){return <View style={s.line}><View style={{flex:1,minWidth:0}}><Text style={s.lineLabel}>{label}</Text><Text selectable style={[s.lineValue,accent?{color:accent}:null]}>{String(value||'-')}</Text></View><Pressable onPress={onCopy} style={s.copy}><MaterialCommunityIcons name="content-copy" size={18} color={palette.cyan}/></Pressable></View>}
function DkdQr({url,onCopy}:{url:string;onCopy:()=>void}){const dkd_valid=/^https:\/\/www\.draborneagle\.com\/DraBornPark\/tag\/[a-z0-9._-]{3,24}$/i.test(url);const dkd_qr_ref=useRef<any>(null);const [dkd_downloading,setDkdDownloading]=useState(false);const dkd_download=async()=>{if(!dkd_valid||!dkd_qr_ref.current||dkd_downloading)return;setDkdDownloading(true);try{const dkd_base64=await new Promise<string>((dkd_resolve,dkd_reject)=>{try{dkd_qr_ref.current.toDataURL((dkd_value:string)=>dkd_resolve(dkd_value));}catch(dkd_problem){dkd_reject(dkd_problem);}});const dkd_slug=String(url).split('/').filter(Boolean).pop()||'etiket';const dkd_name=`DraBornPark-QR-${dkd_slug}-1024.png`;if(Platform.OS==='android'){const dkd_access=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();if(!dkd_access.granted)return;const dkd_uri=await FileSystem.StorageAccessFramework.createFileAsync(dkd_access.directoryUri,dkd_name,'image/png');await FileSystem.writeAsStringAsync(dkd_uri,dkd_base64,{encoding:FileSystem.EncodingType.Base64});}else{if(!FileSystem.documentDirectory)throw new Error('Dosya klasörü kullanılamıyor.');const dkd_uri=FileSystem.documentDirectory+dkd_name;await FileSystem.writeAsStringAsync(dkd_uri,dkd_base64,{encoding:FileSystem.EncodingType.Base64});}await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>undefined);Alert.alert('QR indirildi','Baskıya uygun 1024 × 1024 PNG QR dosyası seçtiğin klasöre kaydedildi.');}catch(dkd_problem:any){Alert.alert('QR indirilemedi',dkd_problem?.message||'Lütfen tekrar dene.');}finally{setDkdDownloading(false)}};return <View style={s.qrCard}><View pointerEvents="none" style={s.qrExport}>{dkd_valid?<QRCode getRef={dkd_ref=>{dkd_qr_ref.current=dkd_ref}} value={url} size={1024} backgroundColor="#FFFFFF" color="#050816"/>:null}</View><View style={s.qrBox}>{dkd_valid?<QRCode value={url} size={154} backgroundColor="#FFFFFF" color="#050816"/>:<MaterialCommunityIcons name="qrcode-remove" size={62} color={palette.muted}/>}</View><View style={{flex:1,minWidth:0}}><Text style={s.qrTitle}>NFC + QR • AYNI BAĞLANTI</Text><Text selectable style={s.qrUrl}>{url||'Geçerli bağlantı yok.'}</Text><Pressable disabled={!dkd_valid} onPress={onCopy} style={[s.copyWide,!dkd_valid&&s.disabled]}><MaterialCommunityIcons name="content-copy" size={18} color={palette.ink}/><Text style={s.copyWideText}>BAĞLANTIYI KOPYALA</Text></Pressable><Pressable disabled={!dkd_valid||dkd_downloading} onPress={()=>void dkd_download()} style={[s.downloadWide,(!dkd_valid||dkd_downloading)&&s.disabled]}>{dkd_downloading?<ActivityIndicator color={palette.text}/>:<MaterialCommunityIcons name="download" size={19} color={palette.text}/>}<Text style={s.downloadWideText}>{dkd_downloading?'HAZIRLANIYOR':'YÜKSEK KALİTE QR İNDİR'}</Text></Pressable></View></View>}


const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:100},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},loadingText:{color:palette.muted,fontSize:type.body},denied:{flex:1,alignItems:'center',justifyContent:'center',padding:32,gap:12},deniedTitle:{color:palette.text,fontSize:type.title,fontWeight:'900',textAlign:'center'},muted:{color:palette.muted,fontSize:type.caption,lineHeight:20},stats:{flexDirection:'row',gap:9},stat:{flex:1,minHeight:110,borderRadius:radius.md,borderWidth:1,padding:13},statValue:{color:palette.text,fontSize:25,fontWeight:'900',marginTop:12},statLabel:{color:palette.muted,fontSize:type.micro,fontWeight:'800',marginTop:3},guide:{borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.purple}44`,backgroundColor:`${palette.purple}0B`,padding:14,gap:13},guideRow:{flexDirection:'row',gap:11},guideTitle:{color:palette.text,fontSize:type.caption,fontWeight:'900'},guideBody:{color:palette.muted,fontSize:type.micro,lineHeight:17,marginTop:3},panel:{borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.cyan}50`,backgroundColor:palette.panel,padding:16,gap:10},label:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:.8,marginTop:8},input:{minHeight:58,borderRadius:18,borderWidth:1,borderColor:`${palette.blue}66`,backgroundColor:'#071127',color:palette.text,paddingHorizontal:15,fontSize:type.body},primary:{minHeight:58,borderRadius:19,backgroundColor:palette.aqua,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,paddingHorizontal:16},primaryText:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},disabled:{opacity:.42},secret:{marginTop:18,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.yellow}45`,backgroundColor:'#15150F',padding:17},secretHead:{flexDirection:'row',gap:12,alignItems:'center',marginBottom:7},secretTitle:{color:palette.text,fontSize:type.section,fontWeight:'900'},line:{minHeight:76,borderBottomWidth:1,borderBottomColor:palette.line,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:9},lineLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900'},lineValue:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'800',marginTop:5},copy:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:`${palette.cyan}55`,alignItems:'center',justifyContent:'center'},warning:{color:palette.yellow,fontSize:type.micro,lineHeight:18,marginTop:13},qrCard:{marginTop:14,borderRadius:22,borderWidth:1,borderColor:`${palette.cyan}50`,backgroundColor:'#071127',padding:13,flexDirection:'row',gap:13,alignItems:'center'},qrBox:{width:174,height:174,borderRadius:17,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},qrTitle:{color:palette.cyan,fontSize:type.micro,fontWeight:'900'},qrUrl:{color:palette.text,fontSize:11,lineHeight:16,marginTop:7},copyWide:{minHeight:44,borderRadius:14,backgroundColor:palette.aqua,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:10,marginTop:10},copyWideText:{color:palette.ink,fontSize:10,fontWeight:'900'},downloadWide:{minHeight:44,borderRadius:14,borderWidth:1,borderColor:`${palette.cyan}75`,backgroundColor:`${palette.cyan}12`,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:10,marginTop:8},downloadWideText:{color:palette.text,fontSize:9.5,fontWeight:'900'},qrExport:{position:'absolute',left:-1400,top:-1400,width:1024,height:1024,opacity:0},list:{gap:13},tag:{borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.cyan}45`,backgroundColor:palette.panel,padding:16},tagHead:{flexDirection:'row',alignItems:'center',gap:11},nfc:{width:55,height:55,borderRadius:19,backgroundColor:`${palette.cyan}18`,alignItems:'center',justifyContent:'center'},tagCode:{color:palette.text,fontSize:19,fontWeight:'900'},tagMeta:{color:palette.muted,fontSize:type.micro,marginTop:3},tagUrl:{color:palette.cyan,fontSize:10,lineHeight:15,marginTop:4},friendUrl:{color:palette.green,fontSize:9.5,lineHeight:14,marginTop:4},badge:{paddingHorizontal:10,paddingVertical:7,borderRadius:15,borderWidth:1,borderColor:`${palette.green}44`,backgroundColor:`${palette.green}0D`},badgeText:{color:palette.green,fontSize:9,fontWeight:'900'},quickActions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:13},secondary:{minHeight:48,borderRadius:15,borderWidth:1,borderColor:palette.line,paddingHorizontal:12,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7},secondaryText:{color:palette.text,fontSize:9,fontWeight:'900'},editor:{borderRadius:20,borderWidth:1,borderColor:`${palette.purple}55`,backgroundColor:`${palette.purple}0A`,padding:14,marginTop:14,gap:8},editorTitle:{color:palette.text,fontSize:23,fontWeight:'900',marginBottom:3},derived:{color:palette.green,fontSize:10,lineHeight:16,marginTop:-2},pinNote:{color:palette.muted2,fontSize:9.5,lineHeight:16},notes:{minHeight:108,textAlignVertical:'top',paddingTop:14},lockInfo:{color:palette.yellow,fontSize:9.5,lineHeight:15,marginTop:13},stateRail:{gap:8,paddingTop:13,paddingBottom:2},state:{minHeight:46,borderRadius:16,borderWidth:1,borderColor:palette.line,paddingHorizontal:13,alignItems:'center',justifyContent:'center'},stateOn:{borderColor:`${palette.green}55`,backgroundColor:`${palette.green}0D`},stateLocked:{opacity:.28},stateText:{color:palette.muted,fontSize:9,fontWeight:'900'}});
