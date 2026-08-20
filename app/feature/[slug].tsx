import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createSupportRequest, hasPlusEntitlement, loadLiveDashboard, updatePrivacySettings } from '@/src/lib/drabornpark';
import { palette, radius } from '@/src/theme';

const redirects: Record<string, string> = {
  tags: '/tags',
  family: '/family',
  guest: '/guest',
  valet: '/modes',
  service: '/modes',
  routing: '/routing',
  emergency: '/emergency',
  timeline: '/timeline',
};

export default function FeatureScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const key = String(slug || 'privacy');
  const redirect = redirects[key];
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [privacy, setPrivacy] = useState({ showPlate: true, showBrandModel: true, showColor: true });

  useEffect(() => {
    if (redirect) {
      router.replace(redirect as any);
      return;
    }
    loadLiveDashboard().then(next => {
      setData(next);
      const current = next.profile?.privacy_settings || {};
      setPrivacy({
        showPlate: current.showPlate !== false,
        showBrandModel: current.showBrandModel !== false,
        showColor: current.showColor !== false,
      });
    }).catch(() => router.replace('/auth'));
  }, [redirect]);

  const plus = useMemo(() => data ? hasPlusEntitlement(data.profile, data.subscription) : false, [data]);

  async function savePrivacy() {
    setBusy(true);
    try {
      await updatePrivacySettings(privacy);
      Alert.alert('Gizlilik güncellendi', 'QR/NFC ekranında gösterilecek araç alanları kaydedildi.');
    } catch (error: any) {
      Alert.alert('Kaydedilemedi', String(error?.message || 'İşlem başarısız.'));
    } finally { setBusy(false); }
  }

  async function sendSupport() {
    if (!subject.trim() || !body.trim()) return Alert.alert('Eksik bilgi', 'Konu ve açıklama gerekli.');
    setBusy(true);
    try {
      await createSupportRequest(subject, body);
      setSubject(''); setBody('');
      Alert.alert('Destek kaydı oluşturuldu', 'Talebin DraBornPark Care sistemine kaydedildi.');
    } catch (error: any) {
      Alert.alert('Gönderilemedi', String(error?.message || 'İşlem başarısız.'));
    } finally { setBusy(false); }
  }

  if (redirect || !data) return <SafeAreaView style={styles.safe}><View style={styles.loader}><ActivityIndicator color={palette.cyan} /></View></SafeAreaView>;

  const isSupport = key === 'support';
  const isPlus = key === 'plus';
  const title = isSupport ? 'DraBornPark Destek' : isPlus ? 'DraBornPark+' : 'Güvenlik ve Gizlilik';
  const color = isSupport ? palette.blue : isPlus ? palette.yellow : palette.green;
  const icon = isSupport ? 'lifebuoy' : isPlus ? 'crown-outline' : 'shield-lock-outline';

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <Header title={title} />
    <View style={[styles.hero, { borderColor: `${color}55`, backgroundColor: `${color}10` }]}><View style={[styles.heroIcon,{backgroundColor:`${color}18`}]}><MaterialCommunityIcons name={icon} size={31} color={color} /></View><Text style={[styles.over,{color}]}>{isSupport ? 'DRABORNPARK CARE' : isPlus ? 'PREMIUM' : 'PRIVACY FIRST'}</Text><Text style={styles.title}>{title}</Text><Text style={styles.desc}>{isSupport ? 'Etiket, aktivasyon, park veya bildirim sorunları için güvenli destek kaydı oluştur.' : isPlus ? 'Gelişmiş araç iletişimi, aile ağı ve otomasyon özelliklerini tek üyelikte yönet.' : 'Telefon, e-posta, tam ad ve park geçmişi kamusal değildir. Araç alanlarının görünürlüğünü sen belirlersin.'}</Text></View>

    {!isSupport && !isPlus ? <View style={styles.form}><Text style={styles.formTitle}>Kamusal araç alanları</Text><Toggle label="Plaka QR/NFC ekranında görünsün" value={privacy.showPlate} set={value=>setPrivacy(current=>({...current,showPlate:value}))}/><Toggle label="Marka / model görünsün" value={privacy.showBrandModel} set={value=>setPrivacy(current=>({...current,showBrandModel:value}))}/><Toggle label="Renk görünsün" value={privacy.showColor} set={value=>setPrivacy(current=>({...current,showColor:value}))}/><View style={styles.locked}><MaterialCommunityIcons name="lock" size={18} color={palette.green}/><Text style={styles.lockedText}>Telefon, e-posta, tam ad ve park geçmişi bu ayarlardan bağımsız olarak her zaman gizlidir.</Text></View><Button color={palette.green} busy={busy} label="GİZLİLİĞİ KAYDET" onPress={savePrivacy}/></View> : null}

    {isSupport ? <View style={styles.form}><Text style={styles.formTitle}>Yeni destek kaydı</Text><Text style={styles.label}>KONU</Text><TextInput value={subject} onChangeText={setSubject} placeholder="Etiket aktivasyonu" placeholderTextColor="#627087" style={styles.input}/><Text style={styles.label}>AÇIKLAMA</Text><TextInput value={body} onChangeText={setBody} multiline placeholder="Sorunu kısaca anlat..." placeholderTextColor="#627087" style={[styles.input,styles.area]}/><Button color={palette.blue} busy={busy} label="DESTEK KAYDI OLUŞTUR" onPress={sendSupport}/><View style={styles.info}><MaterialCommunityIcons name="shield-lock-outline" size={19} color={palette.green}/><Text style={styles.infoText}>Destek kaydı yalnızca oturum açmış kullanıcı hesabına bağlı olarak kaydedilir.</Text></View></View> : null}

    {isPlus ? <View style={styles.form}><View style={styles.plusTop}><MaterialCommunityIcons name="crown" size={34} color={palette.yellow}/><View style={{flex:1}}><Text style={styles.plusStatus}>{plus ? 'PLUS AKTİF' : 'BASIC'}</Text><Text style={styles.plusDetail}>{data.profile?.plus_trial_until ? `Deneme bitişi: ${new Date(data.profile.plus_trial_until).toLocaleString('tr-TR')}` : 'Basic etiket özellikleri üyelikten bağımsızdır.'}</Text></View></View>{[
      ['account-group-outline','Family','Aile üyeleri ve izin bazlı park/bildirim paylaşımı'],
      ['account-clock-outline','Geçici Sürücü','Süreli iletişim yönlendirmesi'],
      ['wrench','Vale / Servis','Araç teslimi ve servis durum Timeline’ı'],
      ['clock-outline','Zaman Kuralları','Gün ve saate göre akıllı yönlendirme'],
      ['alert-circle-outline','Acil Durum Zinciri','Öncelikli acil kişi sıralaması'],
      ['history','Gelişmiş Timeline','Araç olaylarını filtreli geçmişte inceleme'],
    ].map(([featureIcon,featureTitle,detail])=><View key={featureTitle} style={styles.feature}><MaterialCommunityIcons name={featureIcon as any} size={20} color={palette.yellow}/><View style={{flex:1}}><Text style={styles.featureTitle}>{featureTitle}</Text><Text style={styles.featureDetail}>{detail}</Text></View><MaterialCommunityIcons name={plus?'check-circle':'lock-outline'} size={18} color={plus?palette.green:palette.muted}/></View>)}<View style={styles.billing}><MaterialCommunityIcons name="google-play" size={20} color={palette.cyan}/><Text style={styles.billingText}>Google Play Billing satın alma testi Expo Go içinde çalışmaz. Abonelik backend’i hazır; gerçek satın alma/yenileme doğrulaması development build aşamasında bağlanacaktır.</Text></View></View> : null}
  </ScrollView></SafeAreaView>;
}

function Header({title}:{title:string}){return <View style={styles.header}><Pressable onPress={()=>router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={27} color={palette.text}/></Pressable><Text style={styles.headerTitle}>{title}</Text><View style={{width:42}}/></View>}
function Toggle({label,value,set}:{label:string;value:boolean;set:(value:boolean)=>void}){return <View style={styles.toggle}><Text style={styles.toggleText}>{label}</Text><Switch value={value} onValueChange={set} trackColor={{true:'#29523F'}} thumbColor={value?palette.green:'#7D8798'}/></View>}
function Button({color,busy,label,onPress}:{color:string;busy:boolean;label:string;onPress:()=>void}){return <Pressable disabled={busy} onPress={onPress} style={[styles.cta,{backgroundColor:color},busy&&{opacity:.6}]}>{busy?<ActivityIndicator color={palette.bg}/>:<Text style={styles.ctaText}>{label}</Text>}</Pressable>}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:19,paddingBottom:55},loader:{flex:1,alignItems:'center',justifyContent:'center'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},headerTitle:{color:palette.text,fontSize:14,fontWeight:'900'},hero:{marginTop:20,borderRadius:radius.xl,borderWidth:1,padding:20},heroIcon:{width:60,height:60,borderRadius:20,alignItems:'center',justifyContent:'center'},over:{fontSize:8.5,fontWeight:'900',letterSpacing:1.5,marginTop:15},title:{color:palette.text,fontSize:27,fontWeight:'900',letterSpacing:-.9,marginTop:5},desc:{color:palette.muted,fontSize:11,lineHeight:16,marginTop:7},form:{marginTop:13,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:15},formTitle:{color:palette.text,fontSize:15,fontWeight:'900'},label:{color:'#7D899F',fontSize:8.5,fontWeight:'900',letterSpacing:1.1,marginTop:13,marginBottom:6},input:{height:49,borderRadius:14,borderWidth:1,borderColor:'#27324A',backgroundColor:'#090E18',color:palette.text,paddingHorizontal:13,fontSize:12},area:{height:120,textAlignVertical:'top',paddingTop:12},toggle:{minHeight:51,borderBottomWidth:1,borderBottomColor:'#171F31',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},toggleText:{color:palette.text,fontSize:10.5,fontWeight:'800',flex:1},locked:{marginTop:12,borderRadius:14,borderWidth:1,borderColor:'#234336',backgroundColor:'#0C1C16',padding:12,flexDirection:'row',gap:9},lockedText:{color:'#8DBAA5',fontSize:9.5,lineHeight:14,flex:1},cta:{height:54,borderRadius:16,alignItems:'center',justifyContent:'center',marginTop:16},ctaText:{color:palette.bg,fontSize:9.5,fontWeight:'900'},info:{marginTop:12,borderRadius:14,borderWidth:1,borderColor:'#234336',padding:12,flexDirection:'row',gap:9},infoText:{color:palette.muted,fontSize:9.5,lineHeight:14,flex:1},plusTop:{flexDirection:'row',alignItems:'center',gap:12,paddingBottom:12,borderBottomWidth:1,borderBottomColor:palette.line},plusStatus:{color:palette.yellow,fontSize:15,fontWeight:'900'},plusDetail:{color:palette.muted,fontSize:9.5,lineHeight:14,marginTop:3},feature:{minHeight:58,borderBottomWidth:1,borderBottomColor:'#171F31',flexDirection:'row',alignItems:'center',gap:10},featureTitle:{color:palette.text,fontSize:10.5,fontWeight:'900'},featureDetail:{color:palette.muted,fontSize:8.8,lineHeight:13,marginTop:2},billing:{marginTop:13,borderRadius:15,borderWidth:1,borderColor:'#214152',backgroundColor:'#0D1A21',padding:12,flexDirection:'row',gap:9},billingText:{color:'#8EA7B4',fontSize:9.3,lineHeight:14,flex:1}});
