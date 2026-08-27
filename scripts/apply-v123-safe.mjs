import fs from 'node:fs';

const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(dkd_file,dkd_text);
const dkd_replace_required=(dkd_text,dkd_from,dkd_to,dkd_label)=>{
  if(dkd_text.includes(dkd_to))return dkd_text;
  if(!dkd_text.includes(dkd_from))throw new Error(`v1.0.23 dönüşümü için desen bulunamadı: ${dkd_label}`);
  return dkd_text.replace(dkd_from,dkd_to);
};

// Version all user-visible app surfaces first.
for(const dkd_file of ['app/index.tsx','app/hub.tsx','app/legal.tsx','app/factory.tsx','app/admin.tsx','src/components/MandatoryUpdateGate.tsx']){
  if(!fs.existsSync(dkd_file))continue;
  let dkd_text=dkd_read(dkd_file);
  dkd_text=dkd_text.replaceAll('v1.0.22','v1.0.23').replaceAll('1.0.22','1.0.23');
  dkd_write(dkd_file,dkd_text);
}

// Edge function fallbacks/audit version.
const dkd_google_file='supabase/functions/dkd-drabornpark-google-play/index.ts';
let dkd_google=dkd_read(dkd_google_file);
dkd_google=dkd_replace_required(dkd_google,'const VERSION="1.0.22";','const VERSION="1.0.23";','Google Play Edge Function version');
dkd_write(dkd_google_file,dkd_google);

const dkd_version_file='supabase/functions/dkd-drabornpark-app-version/index.ts';
let dkd_version=dkd_read(dkd_version_file);
dkd_version=dkd_replace_required(dkd_version,'const FALLBACK_VERSION="1.0.22";','const FALLBACK_VERSION="1.0.23";','app-version fallback');
dkd_version=dkd_replace_required(dkd_version,'const FALLBACK_VERSION_CODE=22;','const FALLBACK_VERSION_CODE=23;','app-version fallback code');
dkd_write(dkd_version_file,dkd_version);

// Factory: canonical physical link is always /tag/NNNN-NNNN, personal URL comes from owner username.
const dkd_factory_file='app/factory.tsx';
let dkd_factory=dkd_read(dkd_factory_file);
dkd_factory=dkd_replace_required(
  dkd_factory,
  "setDkdTags((dkd_rows||[]).map((dkd_row:any)=>({...dkd_row,owner_username:dkd_row.owner_user_id?dkd_usernames[dkd_row.owner_user_id]||'':''})));",
  "setDkdTags((dkd_rows||[]).map((dkd_row:any)=>({...dkd_row,nfc_url:dkd_row.public_alias?dkd_physical_url(String(dkd_row.public_alias)):dkd_row.nfc_url,owner_username:dkd_row.owner_user_id?dkd_usernames[dkd_row.owner_user_id]||'':''})));",
  'factory canonical queue URL'
);
dkd_factory=dkd_factory.replaceAll("supabase.rpc('dkd_drabornpark_factory_update_tag_v104'","supabase.rpc('dkd_drabornpark_factory_update_tag_v123'");
dkd_factory=dkd_factory.replaceAll('editable={Boolean(dkd_tag.owner_user_id)}','editable={!dkd_busy&&Boolean(dkd_tag.owner_user_id)}');
dkd_factory=dkd_factory.replaceAll("'NFC/QR kısa bağlantısı kaydedildi. Kullanıcı URL’si varsa ayrıca kişisel paylaşım bağlantısı da aynı aktif etiketi çözer.'","'Fiziksel NFC/QR bağlantısı /tag/1234-5678 biçiminde kaydedildi. Hesapta kullanıcı adı varsa /tag/kullaniciadi kişisel bağlantısı da aynı etiketi açar.'");
dkd_write(dkd_factory_file,dkd_factory);

// Admin: remove Display Name editing, expose remaining premium time and allow adding premium days.
const dkd_admin_file='app/admin.tsx';
let dkd_admin=dkd_read(dkd_admin_file);
dkd_admin=dkd_admin.replace('const DKD_FALLBACK_LATEST_VERSION_CODE=20;','const DKD_FALLBACK_LATEST_VERSION_CODE=23;');

const dkd_type_start=dkd_admin.indexOf('type DkdUser={');
const dkd_type_end=dkd_admin.indexOf('\n};',dkd_type_start);
if(dkd_type_start<0||dkd_type_end<0)throw new Error('v1.0.23 admin DkdUser type bulunamadı');
const dkd_user_type=`type DkdUser={
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
}`;
dkd_admin=dkd_admin.slice(0,dkd_type_start)+dkd_user_type+dkd_admin.slice(dkd_type_end+3);
dkd_admin=dkd_admin.replaceAll("supabase.rpc('dkd_drabornpark_admin_search_users'","supabase.rpc('dkd_drabornpark_admin_search_users_v123'");

const dkd_update_start=dkd_admin.indexOf('  const dkdUpdateUser=async');
const dkd_update_end=dkd_admin.indexOf('\n\n  return <SafeAreaView',dkd_update_start);
if(dkd_update_start<0||dkd_update_end<0)throw new Error('v1.0.23 admin update handler bulunamadı');
const dkd_update_handler=`  const dkdUpdateUser=async(dkdUser:DkdUser,dkdUsername:string|null,dkdUnlimitedPlus:boolean,dkdPremiumDaysAdd:number)=>{
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
      if(dkdPremiumDaysAdd>0)setDkdMessage(\`Kullanıcıya \${dkdPremiumDaysAdd} gün DraBornPark+ eklendi. Mevcut premium süresinin sonuna eklenir.\`);
      else setDkdMessage(dkdUnlimitedPlus?'Kullanıcı için Sınırsız DraBornPark+ AKTİF. Bağlı etiketi otomatik olarak yeniden açıldı.':'Kullanıcı ayarları güncellendi.');
      await dkdSearchUsers();
    }catch(dkdError:any){
      const dkdRaw=String(dkdError?.message||'Kullanıcı güncellenemedi.');
      setDkdMessage(dkdRaw.includes('username_taken')?'Bu kullanıcı adı başka bir hesapta veya etiket kodunda kullanılıyor.':dkdRaw.includes('invalid_username')?'Kullanıcı adı 3–24 karakter olmalı; küçük harf, rakam, nokta, alt çizgi ve tire kullanılabilir.':dkdRaw.includes('premium_days_invalid')?'Premium gün değeri 0–3650 arasında olmalıdır.':dkdRaw);
    }finally{setDkdUserBusy(null);}
  };`;
dkd_admin=dkd_admin.slice(0,dkd_update_start)+dkd_update_handler+dkd_admin.slice(dkd_update_end);

dkd_admin=dkd_admin.replace('E-posta veya kullanıcı adıyla ara; hesap ve Sınırsız DraBornPark+ erişimini düzenle','E-posta veya kullanıcı adıyla ara; kullanıcı adını, kalan Premium süresini ve Plus erişimini yönet');
dkd_admin=dkd_admin.replace('Sınırsız DraBornPark+ yalnız admin tarafından yönetilir. Aktif edildiğinde kullanıcının Plus hakkı süre sınırı olmadan açılır ve abonelik nedeniyle kapanmış etiketi otomatik olarak yeniden aktif olur.','Premium gün ekleme mevcut deneme, Google Play veya admin Premium bitişinin sonuna eklenir. Sınırsız DraBornPark+ açılırsa süre sınırı uygulanmaz ve bağlı etiket otomatik aktif tutulur.');

const dkd_editor_start=dkd_admin.indexOf('function DkdUserEditor(');
const dkd_editor_end=dkd_admin.indexOf('\nconst s=StyleSheet.create({',dkd_editor_start);
if(dkd_editor_start<0||dkd_editor_end<0)throw new Error('v1.0.23 admin kullanıcı editörü bulunamadı');
const dkd_editor=`function DkdUserEditor({dkdUser,dkdBusy,dkdOnSave}:{dkdUser:DkdUser;dkdBusy:boolean;dkdOnSave:(dkdUser:DkdUser,dkdUsername:string|null,dkdUnlimitedPlus:boolean,dkdPremiumDaysAdd:number)=>Promise<void>}){
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
    <View style={s.userHead}><View style={s.userAvatar}><SafeIcon name="account" size={25} color={palette.cyan}/></View><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={s.userName}>{dkdUser.dkd_username?\`@\${dkdUser.dkd_username}\`:'Kullanıcı adı yok'}</Text><Text numberOfLines={1} style={s.userEmail}>{dkdUser.dkd_email||'E-posta yok'}</Text></View><View style={[s.statusBadge,{borderColor:dkdStatusColor+'70',backgroundColor:dkdStatusColor+'14'}]}><Text style={[s.statusBadgeText,{color:dkdStatusColor}]}>{dkdStatus}</Text></View></View>
    <View style={s.userStats}><View style={s.userStat}><Text style={s.userStatLabel}>ETİKET</Text><Text style={s.userStatValue}>{Number(dkdUser.dkd_tag_count||0)}</Text></View><View style={s.userStat}><Text style={s.userStatLabel}>AKTİF</Text><Text style={[s.userStatValue,{color:palette.green}]}>{Number(dkdUser.dkd_active_tag_count||0)}</Text></View><View style={[s.userStat,{flex:2}]}><Text style={s.userStatLabel}>PREMİUM KALAN</Text><Text style={[s.userStatValue,{color:dkdUser.dkd_unlimited_plus?palette.yellow:dkdPremiumActive?palette.green:palette.muted2}]}>{dkdUser.dkd_unlimited_plus?'∞':\`\${dkdPremiumDaysLeft} gün\`}</Text></View></View>
    <View style={s.editGrid}><View style={[s.editField,{flex:1}]}><Text style={s.editLabel}>KULLANICI ADI</Text><TextInput value={dkdUsername} onChangeText={dkdValue=>setDkdUsername(dkdValue.toLowerCase().replace(/[^a-z0-9._-]/g,''))} autoCapitalize="none" autoCorrect={false} placeholder="kullaniciadi" placeholderTextColor={palette.muted2} style={s.editInput}/></View></View>
    <View style={s.editGrid}><View style={[s.editField,{flex:1.15}]}><Text style={s.editLabel}>PREMİUM ABONELİK SÜRESİ EKLE (GÜN)</Text><TextInput value={dkdPremiumDays} onChangeText={dkdValue=>setDkdPremiumDays(dkdValue.replace(/\\D/g,'').slice(0,4))} keyboardType="number-pad" maxLength={4} placeholder="Örn. 30" placeholderTextColor={palette.muted2} style={s.editInput}/></View><View style={[s.editField,{flex:.85}]}><Text style={s.editLabel}>PREMİUM BİTİŞ</Text><Text style={[s.editInput,{paddingTop:15,color:dkdPremiumActive||dkdUser.dkd_unlimited_plus?palette.green:palette.muted2}]}>{dkdPremiumUntilText}</Text></View></View>
    <View style={[s.unlimited,{borderColor:dkdUser.dkd_unlimited_plus?palette.yellow+'78':palette.line}]}><View style={[s.unlimitedIcon,{backgroundColor:(dkdUser.dkd_unlimited_plus?palette.yellow:palette.muted2)+'18'}]}><SafeIcon name="crown" size={25} color={dkdUser.dkd_unlimited_plus?palette.yellow:palette.muted2}/></View><View style={{flex:1}}><Text style={s.unlimitedTitle}>Sınırsız DraBornPark+</Text><Text style={s.unlimitedBody}>{dkdUser.dkd_unlimited_plus?'Süre sınırı yok • Etiket otomatik aktif':\`Kalan \${dkdPremiumDaysLeft} gün • Bitiş \${dkdPremiumUntilText}\`}</Text></View><Switch value={Boolean(dkdUser.dkd_unlimited_plus)} disabled={dkdBusy} onValueChange={dkdNext=>void dkdOnSave(dkdUser,null,dkdNext,0)}/></View>
    <Pressable disabled={dkdBusy} onPress={async()=>{await dkdOnSave(dkdUser,dkdUsername.trim()||null,Boolean(dkdUser.dkd_unlimited_plus),dkdParsedDays);setDkdPremiumDays('');}} style={[s.saveUser,dkdBusy&&{opacity:.55}]}>{dkdBusy?<ActivityIndicator color={palette.ink}/>:<><SafeIcon name="content-save-check-outline" size={21} color={palette.ink}/><Text style={s.saveUserText}>KULLANICIYI GÜNCELLE</Text></>}</Pressable>
  </View>;
}
`;
dkd_admin=dkd_admin.slice(0,dkd_editor_start)+dkd_editor+dkd_admin.slice(dkd_editor_end);
dkd_write(dkd_admin_file,dkd_admin);

console.log('DraBornPark v1.0.23 factory URL, username editing and admin premium-day transforms applied.');
