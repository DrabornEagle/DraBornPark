import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {router} from 'expo-router';
import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AuroraBackground,ScreenHeader,SectionHeading} from '@/src/components/AppChrome';
import {supabase} from '@/src/lib/supabase';
import {palette,radius,type} from '@/src/theme';

const dkd_states=['NFC_PENDING','NFC_VERIFIED','QR_VERIFIED','PACKED','READY_FOR_SALE','SOLD','ACTIVATED','DISABLED'];
const dkd_state_labels:Record<string,string>={NFC_PENDING:'NFC bekliyor',NFC_VERIFIED:'NFC doğrulandı',QR_VERIFIED:'QR doğrulandı',PACKED:'Paketlendi',READY_FOR_SALE:'Satışa hazır',SOLD:'Satıldı',ACTIVATED:'Aktif',DISABLED:'Devre dışı'};
const dkd_state_info=[
  ['NFC bekliyor','Etiket üretildi. Aynı NFC/QR bağlantısını NTAG213 çipine yaz ve fiziksel okuma testi yap.'],
  ['NFC doğrulandı','NTAG213 içindeki bağlantı telefonla test edildi.'],
  ['QR doğrulandı','Basılı QR kod, NFC ile birebir aynı bağlantıya açılıyor.'],
  ['Paketlendi','NFC ve QR kontrolleri tamamlandı ve etiket paketlendi.'],
  ['Satışa hazır','Paket müşteriye teslim veya satış için hazır.'],
  ['Satıldı','Etiket müşteriye verildi; aktivasyon bekliyor olabilir.'],
  ['Aktif','Etiket bir hesaba ve araca bağlandı.'],
];

type DkdEdit={tagCode:string;serial:string;url:string;pin:string;notes:string};
const dkd_empty_edit:DkdEdit={tagCode:'',serial:'',url:'',pin:'',notes:''};

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
      if(dkd_is_admin){
        const {data,error}=await supabase.from('drabornpark_tags').select('id,tag_code,serial_number,public_alias,nfc_url,status,owner_user_id,vehicle_id,manufactured_at,sold_at,activated_at,last_verified_at,factory_notes').order('created_at',{ascending:false}).limit(100);
        if(error)throw error;
        setDkdTags(data||[]);
      }
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
      Alert.alert('Yeni etiket üretildi','QR kod ve NTAG213 için kullanılacak bağlantı birebir aynıdır. Aktivasyon PIN’i yalnızca bu üretim adımında düz metin olarak gösterilir.');
    }catch(dkd_problem:any){Alert.alert('Üretim başarısız',dkd_problem?.message||'Yönetici yetkisi gerekli.')}finally{setDkdBusy(false)}
  }

  async function dkd_change_status(dkd_tag:any,dkd_status:string){
    setDkdBusy(true);
    try{const {error}=await supabase.rpc('drabornpark_factory_set_status',{drabornpark_tag_id:dkd_tag.id,drabornpark_status:dkd_status,drabornpark_note:null});if(error)throw error;await Haptics.selectionAsync();await dkd_refresh();}
    catch(dkd_problem:any){Alert.alert('Durum güncellenemedi',dkd_problem?.message||'')}
    finally{setDkdBusy(false)}
  }

  function dkd_begin_edit(dkd_tag:any){
    setDkdEditingId(dkd_tag.id);
    setDkdEdit({tagCode:dkd_tag.tag_code||'',serial:dkd_tag.serial_number||'',url:dkd_tag.nfc_url||'',pin:'',notes:dkd_tag.factory_notes||''});
  }

  async function dkd_save_edit(dkd_tag:any){
    const dkd_tag_code=dkd_edit.tagCode.trim().toUpperCase();
    const dkd_url=dkd_edit.url.trim();
    const dkd_pin=dkd_edit.pin.trim();
    if(!/^DP-[A-Z0-9]{4,32}$/.test(dkd_tag_code))return Alert.alert('Etiket ID geçersiz','Örnek: DP-A1B2C3D4');
    if(!dkd_url.startsWith('https://www.draborneagle.com/DraBornPark/t/'))return Alert.alert('Bağlantı geçersiz','NFC ve QR bağlantısı resmi DraBornPark /t/ adresi altında olmalıdır.');
    if(dkd_pin&&!/^\d{8}$/.test(dkd_pin))return Alert.alert('PIN geçersiz','Yeni aktivasyon PIN’i tam 8 rakam olmalıdır. Boş bırakırsan mevcut PIN değişmez.');
    setDkdBusy(true);
    try{
      const {error}=await supabase.rpc('dkd_drabornpark_factory_update_tag_v103',{dkd_tag_id:dkd_tag.id,dkd_tag_code,dkd_serial_number:dkd_edit.serial.trim()||null,dkd_nfc_url:dkd_url,dkd_activation_pin:dkd_pin||null,dkd_factory_notes:dkd_edit.notes.trim()||null});
      if(error)throw error;
      setDkdEditingId(null);setDkdEdit(dkd_empty_edit);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);await dkd_refresh();
      Alert.alert('Etiket güncellendi',dkd_pin?'Etiket bilgileri ve yeni aktivasyon PIN’i kaydedildi. NFC ve basılı QR’ın yeni bağlantıyla yeniden hazırlanması gerekir.':'Etiket bilgileri güncellendi. NFC ve QR her zaman aynı bağlantıyı kullanmalıdır.');
    }catch(dkd_problem:any){const dkd_message=String(dkd_problem?.message||'');Alert.alert('Etiket düzenlenemedi',dkd_message.includes('unique')?'Etiket ID, seri numarası veya bağlantı başka bir etikette kullanılıyor.':dkd_message||'Lütfen tekrar dene.')}finally{setDkdBusy(false)}
  }

  function dkd_remove(dkd_tag:any){
    Alert.alert('Etiketi kalıcı olarak sil',`${dkd_tag.tag_code} etiketi ve bağlı üretim kayıtları kalıcı olarak silinecek.`,[{text:'Vazgeç',style:'cancel'},{text:'KALICI SİL',style:'destructive',onPress:async()=>{setDkdBusy(true);try{const {error}=await supabase.rpc('drabornpark_factory_delete_tag',{drabornpark_tag_id:dkd_tag.id});if(error)throw error;if(dkd_editing_id===dkd_tag.id)setDkdEditingId(null);await dkd_refresh()}catch(dkd_problem:any){Alert.alert('Etiket silinemedi',dkd_problem?.message||'')}finally{setDkdBusy(false)}}}]);
  }

  if(dkd_loading)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan}/><View style={s.loading}><ActivityIndicator color={palette.cyan}/><Text style={s.loadingText}>Üretim yetkisi doğrulanıyor…</Text></View></SafeAreaView>;
  if(!dkd_admin)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.red}/><View style={s.denied}><MaterialCommunityIcons name="shield-lock-outline" size={48} color={palette.red}/><Text style={s.deniedTitle}>Üretim Paneli korumalı</Text><Text style={s.muted}>Etiket üretim bilgileri yalnızca yönetici hesaplarına açıktır.</Text><Pressable onPress={()=>router.replace('/')} style={s.primary}><Text style={s.primaryText}>ANA SAYFAYA DÖN</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan} secondary={palette.orange}/><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <ScreenHeader title="Üretim Paneli" eyebrow="NFC + QR ETİKET MERKEZİ" accent={palette.cyan} subtitle="Her etikette NFC ve QR tek bir güvenli bağlantıyı paylaşır."/>
    <View style={s.stats}><DkdStat icon="nfc" value={dkd_tags.length} label="Toplam" color={palette.cyan}/><DkdStat icon="qrcode" value={dkd_tags.filter(dkd_tag=>dkd_tag.status==='QR_VERIFIED').length} label="QR testli" color={palette.purple}/><DkdStat icon="shield-check" value={dkd_tags.filter(dkd_tag=>dkd_tag.status==='ACTIVATED').length} label="Aktif" color={palette.green}/></View>

    <SectionHeading title="Üretim akışı" subtitle="Fiziksel aşama tamamlandıkça durumu ilerlet" color={palette.purple}/>
    <View style={s.guide}>{dkd_state_info.map(([dkd_title,dkd_body],dkd_index)=><View key={dkd_title} style={s.guideRow}><View style={s.guideNo}><Text style={s.guideNoText}>{dkd_index+1}</Text></View><View style={{flex:1}}><Text style={s.guideTitle}>{dkd_title}</Text><Text style={s.guideBody}>{dkd_body}</Text></View></View>)}</View>

    <SectionHeading title="Yeni etiket üret" subtitle="Seri numarası boşsa sistem otomatik üretir"/>
    <View style={s.panel}><Text style={s.label}>SERİ NUMARASI (OPSİYONEL)</Text><TextInput value={dkd_serial} onChangeText={setDkdSerial} autoCapitalize="characters" placeholder="DPS-20260824-0001" placeholderTextColor={palette.muted2} style={s.input}/><Pressable disabled={dkd_busy} onPress={()=>void dkd_create()} style={[s.primary,dkd_busy&&s.disabled]}>{dkd_busy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="plus-circle" size={24} color={palette.ink}/><Text style={s.primaryText}>YENİ ETİKET ÜRET</Text></>}</Pressable></View>

    {dkd_last_secret?<View style={s.secret}><View style={s.secretHead}><MaterialCommunityIcons name="key-variant" size={30} color={palette.yellow}/><View style={{flex:1}}><Text style={s.secretTitle}>Tek seferlik üretim paketi</Text><Text style={s.muted}>PIN’i paketleme kartına aktar. QR ve NFC aşağıdaki aynı URL’yi kullanır.</Text></View></View>
      <DkdCopyLine label="Etiket ID" value={dkd_last_secret.tag_code} onCopy={()=>void dkd_copy(String(dkd_last_secret.tag_code),'Etiket ID')}/>
      <DkdCopyLine label="Seri" value={dkd_last_secret.serial_number} onCopy={()=>void dkd_copy(String(dkd_last_secret.serial_number),'Seri numarası')}/>
      <DkdQr url={String(dkd_last_secret.nfc_url||'')} onCopy={()=>void dkd_copy(String(dkd_last_secret.nfc_url||''),'NFC/QR bağlantısı')}/>
      <DkdCopyLine label="Aktivasyon PIN" value={dkd_last_secret.activation_pin} accent={palette.yellow} onCopy={()=>void dkd_copy(String(dkd_last_secret.activation_pin),'Aktivasyon PIN')}/>
      <Text style={s.warning}>PIN veritabanında yalnızca hash olarak saklanır. Sonradan görüntülenmez; gerekiyorsa düzenleme alanından yeni PIN belirlenir.</Text>
    </View>:null}

    <SectionHeading title="Üretim kuyruğu" subtitle="QR üret, NFC/QR bağlantısını kopyala veya güvenli şekilde düzenle" badge={`${dkd_tags.length} ETİKET`} color={palette.orange}/>
    <View style={s.list}>{dkd_tags.map(dkd_tag=>{const dkd_editing=dkd_editing_id===dkd_tag.id;return <View key={dkd_tag.id} style={s.tag}>
      <View style={s.tagHead}><View style={s.nfc}><MaterialCommunityIcons name="nfc" size={29} color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text style={s.tagCode}>{dkd_tag.tag_code}</Text><Text style={s.tagMeta}>{dkd_tag.serial_number}</Text><Text numberOfLines={2} selectable style={s.tagUrl}>{dkd_tag.nfc_url}</Text></View><View style={s.badge}><Text style={s.badgeText}>{dkd_state_labels[dkd_tag.status]||dkd_tag.status}</Text></View></View>
      <View style={s.quickActions}><Pressable onPress={()=>void dkd_copy(String(dkd_tag.nfc_url||''),'NFC/QR bağlantısı')} style={s.secondary}><MaterialCommunityIcons name="content-copy" size={18} color={palette.cyan}/><Text style={s.secondaryText}>NFC/QR KOPYALA</Text></Pressable><Pressable onPress={()=>dkd_editing?setDkdEditingId(null):dkd_begin_edit(dkd_tag)} style={s.secondary}><MaterialCommunityIcons name={dkd_editing?'close':'pencil-outline'} size={18} color={palette.purple}/><Text style={s.secondaryText}>{dkd_editing?'KAPAT':'DÜZENLE'}</Text></Pressable><Pressable disabled={dkd_busy} onPress={()=>dkd_remove(dkd_tag)} style={[s.secondary,{borderColor:`${palette.red}66`}]}><MaterialCommunityIcons name="trash-can-outline" size={18} color={palette.red}/></Pressable></View>
      {dkd_editing?<View style={s.editor}><Text style={s.editorTitle}>Etiket üretim bilgilerini düzenle</Text><Text style={s.label}>ETİKET ID</Text><TextInput style={s.input} value={dkd_edit.tagCode} autoCapitalize="characters" onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,tagCode:dkd_value.toUpperCase().replace(/[^A-Z0-9-]/g,'')}))}/><Text style={s.label}>SERİ NUMARASI</Text><TextInput style={s.input} value={dkd_edit.serial} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,serial:dkd_value}))}/><Text style={s.label}>NFC / QR BAĞLANTISI</Text><TextInput style={[s.input,s.urlInput]} autoCapitalize="none" autoCorrect={false} value={dkd_edit.url} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,url:dkd_value}))}/><DkdQr url={dkd_edit.url} onCopy={()=>void dkd_copy(dkd_edit.url,'NFC/QR bağlantısı')}/><Text style={s.label}>YENİ AKTİVASYON PIN (OPSİYONEL)</Text><TextInput style={s.input} keyboardType="number-pad" maxLength={8} value={dkd_edit.pin} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,pin:dkd_value.replace(/\D/g,'')}))} placeholder="Boş = mevcut PIN değişmez" placeholderTextColor={palette.muted2}/><Text style={s.pinNote}>Güvenlik nedeniyle eski PIN gösterilemez. Buraya 8 rakam girersen mevcut PIN iptal edilip yenisi hash olarak kaydedilir.</Text><Text style={s.label}>ÜRETİM NOTU</Text><TextInput style={[s.input,s.notes]} multiline value={dkd_edit.notes} onChangeText={dkd_value=>setDkdEdit(dkd_current=>({...dkd_current,notes:dkd_value}))} placeholder="İsteğe bağlı üretim notu" placeholderTextColor={palette.muted2}/><Pressable disabled={dkd_busy} onPress={()=>void dkd_save_edit(dkd_tag)} style={[s.primary,dkd_busy&&s.disabled]}><MaterialCommunityIcons name="content-save-check-outline" size={20} color={palette.ink}/><Text style={s.primaryText}>DEĞİŞİKLİKLERİ KAYDET</Text></Pressable></View>:null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stateRail}>{dkd_states.map(dkd_state=><Pressable disabled={dkd_busy||dkd_tag.status===dkd_state} key={dkd_state} onPress={()=>void dkd_change_status(dkd_tag,dkd_state)} style={[s.state,dkd_tag.status===dkd_state&&s.stateOn]}><Text style={[s.stateText,dkd_tag.status===dkd_state&&{color:palette.green}]}>{dkd_state_labels[dkd_state]}</Text></Pressable>)}</ScrollView>
    </View>})}</View>
  </ScrollView></SafeAreaView>;
}

function DkdStat({icon,value,label,color}:{icon:any;value:number;label:string;color:string}){return <View style={[s.stat,{borderColor:`${color}45`,backgroundColor:`${color}0E`}]}><MaterialCommunityIcons name={icon} size={23} color={color}/><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}
function DkdCopyLine({label,value,onCopy,accent}:{label:string;value:any;onCopy:()=>void;accent?:string}){return <View style={s.line}><View style={{flex:1,minWidth:0}}><Text style={s.lineLabel}>{label}</Text><Text selectable style={[s.lineValue,accent?{color:accent}:null]}>{String(value||'-')}</Text></View><Pressable onPress={onCopy} style={s.copy}><MaterialCommunityIcons name="content-copy" size={18} color={palette.cyan}/></Pressable></View>}
function DkdQr({url,onCopy}:{url:string;onCopy:()=>void}){const dkd_valid=url.startsWith('https://www.draborneagle.com/DraBornPark/t/');return <View style={s.qrCard}><View style={s.qrBox}>{dkd_valid?<QRCode value={url} size={154} backgroundColor="#FFFFFF" color="#050816"/>:<MaterialCommunityIcons name="qrcode-remove" size={62} color={palette.muted}/>}</View><View style={{flex:1,minWidth:0}}><Text style={s.qrTitle}>NFC + QR • AYNI BAĞLANTI</Text><Text selectable style={s.qrUrl}>{url||'Geçerli bağlantı girilmedi.'}</Text><Pressable disabled={!dkd_valid} onPress={onCopy} style={[s.copyWide,!dkd_valid&&s.disabled]}><MaterialCommunityIcons name="content-copy" size={18} color={palette.ink}/><Text style={s.copyWideText}>BAĞLANTIYI KOPYALA</Text></Pressable></View></View>}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:80},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},loadingText:{color:palette.muted,fontSize:type.body},denied:{flex:1,alignItems:'center',justifyContent:'center',padding:32,gap:12},deniedTitle:{color:palette.text,fontSize:type.title,fontWeight:'900',textAlign:'center'},muted:{color:palette.muted,fontSize:type.caption,lineHeight:20},stats:{flexDirection:'row',gap:9},stat:{flex:1,minHeight:116,borderRadius:radius.md,borderWidth:1,padding:13},statValue:{color:palette.text,fontSize:25,fontWeight:'900',marginTop:12},statLabel:{color:palette.muted,fontSize:type.micro,fontWeight:'800',marginTop:3},guide:{borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.purple}44`,backgroundColor:`${palette.purple}0B`,padding:14,gap:11},guideRow:{flexDirection:'row',gap:11},guideNo:{width:34,height:34,borderRadius:12,backgroundColor:`${palette.purple}22`,alignItems:'center',justifyContent:'center'},guideNoText:{color:palette.purple,fontWeight:'900'},guideTitle:{color:palette.text,fontSize:type.caption,fontWeight:'900'},guideBody:{color:palette.muted,fontSize:type.micro,lineHeight:17,marginTop:3},panel:{borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.cyan}50`,backgroundColor:palette.panel,padding:16,gap:10},label:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:.8,marginTop:8},input:{minHeight:58,borderRadius:18,borderWidth:1,borderColor:`${palette.blue}66`,backgroundColor:'#071127',color:palette.text,paddingHorizontal:15,fontSize:type.body},urlInput:{minHeight:82,textAlignVertical:'top',paddingTop:15},primary:{minHeight:58,borderRadius:19,backgroundColor:palette.aqua,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,paddingHorizontal:16},primaryText:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},disabled:{opacity:.45},secret:{marginTop:18,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.yellow}45`,backgroundColor:'#15150F',padding:17},secretHead:{flexDirection:'row',gap:12,alignItems:'center',marginBottom:7},secretTitle:{color:palette.text,fontSize:type.section,fontWeight:'900'},line:{minHeight:76,borderBottomWidth:1,borderBottomColor:palette.line,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:9},lineLabel:{color:palette.muted2,fontSize:type.micro,fontWeight:'900'},lineValue:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'800',marginTop:5},copy:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:`${palette.cyan}55`,alignItems:'center',justifyContent:'center'},warning:{color:palette.yellow,fontSize:type.micro,lineHeight:18,marginTop:13},qrCard:{marginTop:14,borderRadius:22,borderWidth:1,borderColor:`${palette.cyan}50`,backgroundColor:'#071127',padding:13,flexDirection:'row',gap:13,alignItems:'center'},qrBox:{width:174,height:174,borderRadius:17,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},qrTitle:{color:palette.cyan,fontSize:type.micro,fontWeight:'900'},qrUrl:{color:palette.text,fontSize:11,lineHeight:16,marginTop:7},copyWide:{minHeight:44,borderRadius:14,backgroundColor:palette.aqua,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:10,marginTop:10},copyWideText:{color:palette.ink,fontSize:10,fontWeight:'900'},list:{gap:13},tag:{borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.cyan}3D`,backgroundColor:palette.panel,padding:16},tagHead:{flexDirection:'row',alignItems:'center',gap:11},nfc:{width:58,height:58,borderRadius:20,backgroundColor:`${palette.cyan}18`,alignItems:'center',justifyContent:'center'},tagCode:{color:palette.text,fontSize:20,fontWeight:'900'},tagMeta:{color:palette.muted,fontSize:type.caption,marginTop:3},tagUrl:{color:palette.cyan,fontSize:type.micro,lineHeight:16,marginTop:4},badge:{borderRadius:999,borderWidth:1,borderColor:`${palette.green}44`,paddingHorizontal:10,paddingVertical:6},badgeText:{color:palette.green,fontSize:9,fontWeight:'900'},quickActions:{flexDirection:'row',gap:7,marginTop:14},secondary:{minHeight:47,borderRadius:15,borderWidth:1,borderColor:`${palette.cyan}55`,paddingHorizontal:11,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,flexShrink:1},secondaryText:{color:palette.text,fontSize:9,fontWeight:'900'},editor:{marginTop:14,borderRadius:20,borderWidth:1,borderColor:`${palette.purple}55`,backgroundColor:`${palette.purple}0B`,padding:14,gap:7},editorTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginBottom:4},pinNote:{color:palette.muted2,fontSize:type.micro,lineHeight:17},notes:{minHeight:96,textAlignVertical:'top',paddingTop:14},stateRail:{gap:7,paddingTop:14,paddingBottom:3},state:{minHeight:40,borderRadius:999,borderWidth:1,borderColor:palette.line,paddingHorizontal:13,alignItems:'center',justifyContent:'center'},stateOn:{borderColor:`${palette.green}66`,backgroundColor:`${palette.green}12`},stateText:{color:palette.muted,fontSize:9,fontWeight:'900'}});
