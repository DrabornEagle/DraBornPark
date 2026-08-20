import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBubble, IconName, Pill } from '@/src/components/Primitives';
import { palette, radius } from '@/src/theme';

type ModuleConfig = {
  title: string;
  overline: string;
  icon: IconName;
  color: string;
  description: string;
  plus?: boolean;
  actions: Array<{ icon: IconName; title: string; body: string }>;
};

const modules: Record<string, ModuleConfig> = {
  family: {
    title: 'DraBornPark Family', overline: 'AİLE ARAÇ AĞI', icon: 'account-group-outline', color: palette.purple, plus: true,
    description: 'Birden fazla aracı tek aile ağı altında yönet; izin verdiğin üyeler son park konumunu ve araç bildirimlerini görebilsin.',
    actions: [
      { icon: 'car-multiple', title: '5 araca kadar', body: 'Benim aracım, eşimin aracı, aile aracı ve motosiklet aynı hesap ailesinde.' },
      { icon: 'map-marker-account-outline', title: 'Park paylaşımı', body: 'Aile konumu varsayılan olarak kapalıdır; sadece araç sahibi izin verdiğinde görünür.' },
      { icon: 'bell-ring-outline', title: 'Bildirim paylaşımı', body: 'Araç bildirimlerini seçtiğin aile üyelerine yönlendir.' }
    ]
  },
  guest: {
    title: 'Geçici Sürücü', overline: 'SÜRELİ YÖNLENDİRME', icon: 'account-switch-outline', color: palette.green, plus: true,
    description: 'Aracı başka birine verdiğinde bildirimleri geçici sürücüye yönlendir; süre bitince kontrol otomatik sana dönsün.',
    actions: [
      { icon: 'timer-sand', title: '1 / 3 / 6 saat', body: 'Hazır sürelerden birini seç veya özel bitiş zamanı tanımla.' },
      { icon: 'bell-forward-outline', title: 'Bildirim yönlendirme', body: 'Far, hareket ettirme, hasar ve acil durum bildirimlerini geçici sürücüye ilet.' },
      { icon: 'shield-account-outline', title: 'Süreli erişim', body: 'Geçici sürücü aracın geçmiş parklarını veya özel hesap bilgilerini göremez.' }
    ]
  },
  valet: {
    title: 'Vale Modu', overline: 'GEÇİCİ ARAÇ TESLİMİ', icon: 'car-key', color: palette.orange, plus: true,
    description: 'Aracı valeye bıraktığın süre boyunca araç iletişimini güvenli bir geçici oturuma bağla.',
    actions: [
      { icon: 'timer-outline', title: 'Otomatik kapanış', body: 'Vale modu belirlediğin sürede kendiliğinden kapanır.' },
      { icon: 'message-lock-outline', title: 'Numara gizli', body: 'Vale veya dış kullanıcı kişisel telefon numaranı görmez.' },
      { icon: 'car-clock', title: 'Teslim zamanı', body: 'Aracın valeye verildiği ve geri alındığı zaman Timeline’a eklenir.' }
    ]
  },
  service: {
    title: 'Servis Modu', overline: 'SERVİS İLETİŞİMİ', icon: 'wrench-outline', color: palette.blue, plus: true,
    description: 'Araç servisteyken “Araç hazır”, “Ek işlem gerekiyor” ve “Teslim alabilirsiniz” gibi güvenli durumları tek yerde takip et.',
    actions: [
      { icon: 'car-wrench', title: 'Serviste', body: 'Araç için servis modu başlatıldığında normal bildirim akışı servis durumuyla etiketlenir.' },
      { icon: 'clipboard-text-clock-outline', title: 'Durum geçmişi', body: 'Servis olayları aracın Timeline kaydına eklenir.' },
      { icon: 'message-badge-outline', title: 'Hazır mesajlar', body: 'Servis tarafı standart durum mesajları iletebilir.' }
    ]
  },
  routing: {
    title: 'Zaman Kuralları', overline: 'AKILLI YÖNLENDİRME', icon: 'account-clock-outline', color: palette.pink, plus: true,
    description: 'Bildirimlerin gün ve saate göre sana, eşine veya geçici sürücüye gitmesini planla.',
    actions: [
      { icon: 'calendar-week', title: 'Hafta içi / hafta sonu', body: 'Gün bazlı kurallar tanımla.' },
      { icon: 'clock-outline', title: 'Saat aralığı', body: 'Örneğin 08:00–18:00 sen, 18:00 sonrası eşin.' },
      { icon: 'source-branch', title: 'Öncelik sırası', body: 'Birden fazla kural çakıştığında en özel zaman kuralı uygulanır.' }
    ]
  },
  emergency: {
    title: 'Acil Durum Zinciri', overline: 'KADEMELİ ULAŞIM', icon: 'alert-decagram-outline', color: palette.red, plus: true,
    description: 'Yüksek öncelikli bildirimde araç sahibine ulaşılamazsa aile ve acil durum kişilerine sırayla bildirim gönder.',
    actions: [
      { icon: 'numeric-1-circle-outline', title: 'Önce araç sahibi', body: 'İlk yüksek öncelikli bildirim her zaman araç sahibine gider.' },
      { icon: 'numeric-2-circle-outline', title: 'Aile üyesi', body: 'Yanıt yoksa izin verilmiş aile üyesine geçilir.' },
      { icon: 'numeric-3-circle-outline', title: 'Acil kişi', body: 'Son adımda tanımlı ikinci acil kişiye bildirim yönlendirilir.' }
    ]
  },
  privacy: {
    title: 'Güvenlik ve Gizlilik', overline: 'PRIVACY FIRST', icon: 'shield-lock-outline', color: palette.cyan,
    description: 'DraBornPark’ın varsayılanı minimum veri paylaşımıdır. Telefon, e-posta, tam ad ve park geçmişi kamusal değildir.',
    actions: [
      { icon: 'phone-lock', title: 'Telefon görünmez', body: 'QR/NFC üzerinden araç sahibinin telefon numarası asla yayınlanmaz.' },
      { icon: 'email-lock-outline', title: 'E-posta görünmez', body: 'Dış kullanıcı e-posta veya hesap kimliğini göremez.' },
      { icon: 'map-marker-off-outline', title: 'Park geçmişi özel', body: 'Park kayıtları yalnızca hesap sahibine ve açıkça izin verilen aile üyelerine görünür.' }
    ]
  },
  tags: {
    title: 'Etiketlerim', overline: 'NFC + QR', icon: 'nfc', color: palette.yellow,
    description: 'DraBornPark etiketi araçla değil benzersiz Tag ID ile yaşar; aracını değiştirsen bile NFC içindeki URL değişmez.',
    actions: [
      { icon: 'check-decagram-outline', title: 'DP-K7M4X2P9', body: 'Demo etiket • Aktif • NFC ve QR aynı güvenli bağlantıyı açar.' },
      { icon: 'swap-horizontal', title: 'Etiketi Devret', body: 'Araç satıldığında güvenli devir kodu ile yeni kullanıcıya aktar.' },
      { icon: 'restart-alert', title: 'Sıfırla / Devre dışı', body: 'Eski araç bağını kaldır, yeni araca bağla veya kayıp etiketi devre dışı bırak.' }
    ]
  },
  vehicle: {
    title: 'Aracım', overline: 'ARAÇ PROFİLİ', icon: 'car-info', color: palette.cyan,
    description: 'Araç adı, plaka, marka, model, model yılı, renk, tip ve profil görselini tek karttan yönet.',
    actions: [
      { icon: 'eye-settings-outline', title: 'Görünür alanlar', body: 'Plaka, marka/model ve renk alanlarını QR/NFC ekranında ayrı ayrı gizleyebilirsin.' },
      { icon: 'motorbike', title: 'DraBornPark Moto', body: 'Aynı altyapıda motosiklet seçerek motor odaklı bildirimleri kullan.' },
      { icon: 'timeline-clock-outline', title: 'Araç Timeline', body: 'Park, bildirim, hasar, servis ve etiket olayları tek geçmişte birleşir.' }
    ]
  },
  support: {
    title: 'Destek', overline: 'DRABORNPARK CARE', icon: 'lifebuoy', color: palette.green,
    description: 'Etiket, aktivasyon, bildirim veya park özellikleriyle ilgili destek kaydı oluştur.',
    actions: [
      { icon: 'ticket-confirmation-outline', title: 'Destek kaydı', body: 'Konu ve açıklama ile güvenli bir destek talebi oluştur.' },
      { icon: 'book-open-page-variant-outline', title: 'Kurulum rehberi', body: 'Cam temizliği, etiket uygulama, QR ve NFC test adımlarını görüntüle.' },
      { icon: 'shield-alert-outline', title: 'Kötüye kullanım', body: 'Spam, tehdit veya uygunsuz içerik bildirimlerini raporla.' }
    ]
  }
};

export default function FeatureModuleScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = String(params.slug ?? 'privacy');
  const config = modules[slug] ?? modules.privacy;
  const [enabled, setEnabled] = useState(slug === 'privacy' || slug === 'tags');
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const accent = config.color;
  const buttonLabel = useMemo(() => slug === 'tags' ? 'ETİKET AKTİVASYONUNU AÇ' : slug === 'support' ? 'DEMO DESTEK KAYDI OLUŞTUR' : enabled ? 'MODÜLÜ GÜNCELLE' : 'DEMO MODÜLÜNÜ ETKİNLEŞTİR', [enabled, slug]);

  function performAction() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (slug === 'tags') {
      router.push('/activate/K7M4X2P9');
      return;
    }
    if (slug === 'support') {
      Alert.alert('Destek demosu oluşturuldu', 'Gerçek hesap akışında bu kayıt drabornpark_support_requests tablosuna kullanıcı RLS politikasıyla yazılır.');
      setName(''); setDetail('');
      return;
    }
    setEnabled(true);
    Alert.alert(`${config.title} hazır`, 'Bu ekran Expo Go demo durumunu gösteriyor. Auth ile giriş yapılan sürümde ayar Supabase kullanıcı kaydına yazılacak.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={25} color={palette.text} /></Pressable><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{config.title}</Text><Text style={styles.headerSub}>{config.overline}</Text></View>{config.plus ? <Pill label="PLUS" color={palette.yellow} icon="crown" /> : null}</View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { borderColor: `${accent}55`, backgroundColor: `${accent}10` }]}><IconBubble icon={config.icon} color={accent} size={64} /><Text style={[styles.overline, { color: accent }]}>{config.overline}</Text><Text style={styles.title}>{config.title}</Text><Text style={styles.description}>{config.description}</Text></View>

        {config.actions.map((item, index) => <View key={item.title} style={styles.action}><View style={[styles.actionNumber, { borderColor: `${accent}55`, backgroundColor: `${accent}12` }]}><MaterialCommunityIcons name={item.icon} size={23} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{item.title}</Text><Text style={styles.actionBody}>{item.body}</Text></View>{index === 0 && (slug === 'family' || slug === 'guest' || slug === 'valet' || slug === 'service' || slug === 'routing' || slug === 'emergency') ? <Switch value={enabled} onValueChange={(value) => { setEnabled(value); Haptics.selectionAsync(); }} trackColor={{ true: `${accent}88` }} thumbColor={enabled ? accent : '#8893A6'} /> : null}</View>)}

        {slug === 'support' ? <View style={styles.form}><Text style={styles.formTitle}>Yeni destek kaydı</Text><TextInput value={name} onChangeText={setName} placeholder="Konu" placeholderTextColor="#647189" style={styles.input} /><TextInput value={detail} onChangeText={setDetail} placeholder="Sorunu kısaca anlatın" placeholderTextColor="#647189" style={[styles.input, styles.textArea]} multiline /></View> : null}

        {slug === 'privacy' ? <View style={styles.form}><Text style={styles.formTitle}>Varsayılan gizlilik</Text>{['Telefon numaram görünmesin', 'E-posta adresim görünmesin', 'Tam adım görünmesin', 'Park geçmişim kamusal olmasın', 'Family konumu varsayılan kapalı'].map((label) => <View key={label} style={styles.setting}><Text style={styles.settingText}>{label}</Text><MaterialCommunityIcons name="check-circle" size={19} color={palette.green} /></View>)}</View> : null}

        <Pressable onPress={performAction} style={({ pressed }) => [styles.cta, { backgroundColor: accent }, pressed && { opacity: 0.72 }]}><MaterialCommunityIcons name={slug === 'tags' ? 'nfc-variant' : 'check-decagram-outline'} size={19} color={palette.bg} /><Text style={styles.ctaText}>{buttonLabel}</Text></Pressable>

        {config.plus ? <View style={styles.plusNote}><MaterialCommunityIcons name="crown-outline" size={20} color={palette.yellow} /><Text style={styles.plusNoteText}>Bu modül DraBornPark+ kapsamındadır. Abonelik sona erdiğinde NFC, QR, hazır bildirim, telefon gizleme, Park Ettim, Son Park ve Aracıma Git gibi Basic işlevler çalışmaya devam eder.</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg }, header: { minHeight: 68, paddingHorizontal: 13, flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#182135' }, back: { width: 43, height: 43, borderRadius: 15, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: palette.text, fontSize: 16, fontWeight: '900' }, headerSub: { color: palette.muted, fontSize: 8.5, fontWeight: '800', letterSpacing: 1, marginTop: 2 }, scroll: { padding: 14, paddingBottom: 42 }, hero: { borderRadius: radius.xl, borderWidth: 1, padding: 18 }, overline: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 16 }, title: { color: palette.text, fontSize: 25, fontWeight: '900', marginTop: 4 }, description: { color: palette.muted, fontSize: 11.2, lineHeight: 16.5, marginTop: 7 }, action: { minHeight: 84, marginTop: 9, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 13, flexDirection: 'row', gap: 11, alignItems: 'center' }, actionNumber: { width: 47, height: 47, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, actionTitle: { color: palette.text, fontSize: 12.5, fontWeight: '900' }, actionBody: { color: palette.muted, fontSize: 10.2, lineHeight: 14.3, marginTop: 3 }, form: { marginTop: 12, backgroundColor: '#101625', borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 14 }, formTitle: { color: palette.text, fontSize: 13.5, fontWeight: '900', marginBottom: 10 }, input: { minHeight: 48, backgroundColor: '#090E18', borderWidth: 1, borderColor: palette.line, borderRadius: 14, color: palette.text, paddingHorizontal: 12, marginTop: 8 }, textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }, setting: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1E2739' }, settingText: { color: '#D7DEEB', fontSize: 10.8, fontWeight: '700' }, cta: { minHeight: 52, marginTop: 14, borderRadius: 16, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, ctaText: { color: palette.bg, fontWeight: '900', fontSize: 10.2 }, plusNote: { marginTop: 12, borderRadius: radius.md, borderWidth: 1, borderColor: '#4A4028', backgroundColor: '#211D13', padding: 13, flexDirection: 'row', gap: 9 }, plusNoteText: { flex: 1, color: '#C9BE91', fontSize: 9.5, lineHeight: 13.5 }
});
