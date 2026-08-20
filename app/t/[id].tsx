import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PUBLIC_CONTACT_URL } from '@/src/data';
import { palette, radius } from '@/src/theme';

type Category = { key: string; title: string; body: string; priority: 'normal' | 'high' | 'emergency'; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] };
const demoCategories: Category[] = [
  { key: 'blocked_exit', title: 'Çıkışımı engelliyor', body: 'Aracınız başka bir aracın çıkışını engelliyor olabilir.', priority: 'high', icon: 'car-brake-alert' },
  { key: 'move_vehicle', title: 'Aracı hareket ettirin', body: 'Aracınızı hareket ettirebilir misiniz?', priority: 'normal', icon: 'car-arrow-right' },
  { key: 'lights_on', title: 'Farlar açık', body: 'Aracınızın farları açık olabilir.', priority: 'normal', icon: 'car-light-alert' },
  { key: 'window_open', title: 'Cam açık', body: 'Aracınızın camı açık olabilir.', priority: 'normal', icon: 'car-door-lock' },
  { key: 'door_open', title: 'Kapı açık olabilir', body: 'Aracınızın kapılarından biri açık olabilir.', priority: 'high', icon: 'car-door' },
  { key: 'trunk_open', title: 'Bagaj açık olabilir', body: 'Aracınızın bagajı açık olabilir.', priority: 'high', icon: 'car-back' },
  { key: 'damage', title: 'Hasar fark ettim', body: 'Aracınızda olası bir hasar fark edildi.', priority: 'high', icon: 'car-wrench' },
  { key: 'suspicious', title: 'Şüpheli durum', body: 'Aracınızın çevresinde şüpheli bir durum olabilir.', priority: 'high', icon: 'shield-alert-outline' },
  { key: 'towing', title: 'Araç çekiliyor', body: 'Aracınız çekiliyor olabilir.', priority: 'emergency', icon: 'tow-truck' },
  { key: 'animal', title: 'Araçta hayvan var', body: 'Araçta bir hayvan bulunduğu bildirildi.', priority: 'emergency', icon: 'paw' },
  { key: 'child', title: 'Araçta çocuk var', body: 'Araçta bir çocuk bulunduğu bildirildi.', priority: 'emergency', icon: 'baby-face-outline' },
  { key: 'fire', title: 'Duman / yangın', body: 'Araçta duman veya yangın şüphesi var.', priority: 'emergency', icon: 'fire-alert' },
  { key: 'forgotten_item', title: 'Eşya unutulmuş', body: 'Araçta eşya veya anahtar unutulmuş olabilir.', priority: 'normal', icon: 'bag-personal-outline' },
  { key: 'witness', title: 'Bir olaya şahit oldum', body: 'Araçla ilgili bir olaya şahit oldum.', priority: 'high', icon: 'eye-outline' },
  { key: 'emergency', title: 'Acil durum', body: 'Araçla ilgili acil müdahale gerektiren bir durum var.', priority: 'emergency', icon: 'alert-octagon-outline' },
  { key: 'other', title: 'Başka bir mesaj', body: 'Araçla ilgili başka bir bildirim göndermek istiyorum.', priority: 'normal', icon: 'message-text-outline' }
];

type Snapshot = { tagCode: string; status: string; vehicle?: { type?: string; name?: string | null; plate?: string | null; brand?: string | null; model?: string | null; color?: string | null } };

export default function PublicTagPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tagCode = id.startsWith('DP') ? `DP-${id.slice(2)}` : `DP-${id}`;
  const isDemo = tagCode === 'DP-K7M4X2P9';
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionKey = useMemo(() => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    let mounted = true;
    async function lookup() {
      try {
        const response = await fetch(PUBLIC_CONTACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lookup', tagCode }) });
        const data = await response.json();
        if (!mounted) return;
        if (response.ok && data.snapshot) setSnapshot(data.snapshot);
        else if (isDemo) setSnapshot({ tagCode, status: 'ACTIVATED', vehicle: { type: 'car', name: 'Volkswagen Tiguan', plate: '06 DBP 2026', brand: 'Volkswagen', model: 'Tiguan', color: 'Gece Mavisi' } });
        else setError('Bu DraBornPark etiketi aktif değil veya bulunamadı.');
      } catch {
        if (mounted && isDemo) setSnapshot({ tagCode, status: 'ACTIVATED', vehicle: { type: 'car', name: 'Volkswagen Tiguan', plate: '06 DBP 2026', brand: 'Volkswagen', model: 'Tiguan', color: 'Gece Mavisi' } });
        else if (mounted) setError('DraBornPark sunucusuna şu anda ulaşılamıyor.');
      } finally { if (mounted) setLoading(false); }
    }
    lookup();
    return () => { mounted = false; };
  }, [isDemo, tagCode]);

  async function notify() {
    if (!selected) return;
    setSending(true); setError(null);
    if (isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 550));
      setSending(false); setSent(true); return;
    }
    try {
      const response = await fetch(PUBLIC_CONTACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'notify', tagCode, category: selected.key, message: message.trim() || undefined, sessionKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'request_failed');
      setSent(true);
    } catch (requestError) {
      const reason = requestError instanceof Error ? requestError.message : '';
      setError(reason === 'rate_limited' ? 'Çok fazla istek gönderildi. Kısa bir süre sonra tekrar deneyin.' : 'Bildirim gönderilemedi. Lütfen tekrar deneyin.');
    } finally { setSending(false); }
  }

  if (loading) return <SafeAreaView style={styles.center}><View style={styles.logo}><MaterialCommunityIcons name="car-connected" size={34} color={palette.cyan} /></View><Text style={styles.brand}>DraBornPark</Text><ActivityIndicator color={palette.cyan} style={{ marginTop: 18 }} /></SafeAreaView>;

  if (sent) return <SafeAreaView style={styles.center}><View style={styles.success}><MaterialCommunityIcons name="check" size={42} color={palette.bg} /></View><Text style={styles.successTitle}>Araç sahibine iletildi</Text><Text style={styles.successBody}>Bildiriminiz güvenli şekilde gönderildi. Araç sahibinin telefon numarası, e-postası veya gerçek adı sizinle paylaşılmadı.</Text><View style={styles.ownerStatus}><View style={styles.statusDot} /><Text style={styles.ownerStatusText}>Araç sahibi bildirimi uygulamasında görecek</Text></View><Pressable onPress={() => { setSent(false); setSelected(null); setMessage(''); }} style={styles.secondary}><Text style={styles.secondaryText}>Başka bildirim gönder</Text></Pressable></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View style={styles.logoSmall}><MaterialCommunityIcons name="car-connected" size={24} color={palette.cyan} /></View><View><Text style={styles.brandSmall}>DraBornPark</Text><Text style={styles.tagline}>Güvenli araç iletişimi</Text></View><View style={styles.tag}><MaterialCommunityIcons name="nfc" size={14} color={palette.yellow} /><Text style={styles.tagText}>{tagCode}</Text></View></View>

        {error && !snapshot ? <View style={styles.errorCard}><MaterialCommunityIcons name="alert-circle-outline" size={30} color={palette.red} /><Text style={styles.errorTitle}>Etiket kullanılamıyor</Text><Text style={styles.errorBody}>{error}</Text></View> : null}

        {snapshot ? <>
          <View style={styles.vehicleCard}><View style={styles.vehicleIcon}><MaterialCommunityIcons name={snapshot.vehicle?.type === 'motorcycle' ? 'motorbike' : 'car-sports'} size={34} color={palette.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.vehicleOverline}>DraBornPark KORUMALI ARAÇ</Text><Text style={styles.vehicleName}>{snapshot.vehicle?.name || [snapshot.vehicle?.brand, snapshot.vehicle?.model].filter(Boolean).join(' ') || 'Araç'}</Text><Text style={styles.vehicleMeta}>{[snapshot.vehicle?.plate, snapshot.vehicle?.color].filter(Boolean).join(' • ')}</Text></View><MaterialCommunityIcons name="shield-check" size={27} color={palette.green} /></View>

          <View style={styles.privacy}><MaterialCommunityIcons name="shield-lock-outline" size={22} color={palette.green} /><View style={{ flex: 1 }}><Text style={styles.privacyTitle}>Telefon numarası gizlidir</Text><Text style={styles.privacyBody}>Araç sahibinin telefon, e-posta ve açık kimlik bilgileri gösterilmez. Mesajınız DraBornPark üzerinden iletilir.</Text></View></View>

          <Text style={styles.question}>Bu araçla ilgili ne bildirmek istiyorsunuz?</Text><Text style={styles.questionSub}>En uygun seçeneğe dokunun. Acil durumlar yüksek öncelikle iletilir.</Text>
          <View style={styles.grid}>{demoCategories.map((item) => { const active = selected?.key === item.key; const color = item.priority === 'emergency' ? palette.red : item.priority === 'high' ? palette.orange : palette.cyan; return <Pressable key={item.key} onPress={() => setSelected(item)} style={({ pressed }) => [styles.category, active && { borderColor: color, backgroundColor: `${color}14` }, pressed && { opacity: 0.8 }]}><MaterialCommunityIcons name={item.icon} size={23} color={color} /><Text style={styles.categoryTitle}>{item.title}</Text>{item.priority === 'emergency' ? <Text style={styles.emergencyLabel}>ACİL</Text> : null}</Pressable>; })}</View>

          {selected ? <View style={styles.compose}><View style={styles.composeHead}><View><Text style={styles.composeOverline}>SEÇİLEN BİLDİRİM</Text><Text style={styles.composeTitle}>{selected.title}</Text></View><MaterialCommunityIcons name={selected.icon} size={27} color={selected.priority === 'emergency' ? palette.red : palette.cyan} /></View><Text style={styles.composeBody}>{selected.body}</Text><TextInput value={message} onChangeText={setMessage} multiline maxLength={700} placeholder="İsterseniz kısa bir açıklama ekleyin..." placeholderTextColor="#68768D" style={styles.input} /><Text style={styles.filter}>Serbest mesaj; küfür, tehdit, spam ve telefon/e-posta paylaşımına karşı filtrelenir.</Text>{error ? <Text style={styles.inlineError}>{error}</Text> : null}<Pressable disabled={sending} onPress={notify} style={({ pressed }) => [styles.send, (pressed || sending) && { opacity: 0.65 }]}>{sending ? <ActivityIndicator color={palette.bg} /> : <><MaterialCommunityIcons name="shield-send-outline" size={19} color={palette.bg} /><Text style={styles.sendText}>ARAÇ SAHİBİNE GÜVENLİ GÖNDER</Text></>}</Pressable></View> : null}
        </> : null}

        <Text style={styles.footer}>DraBornPark • Kişisel bilgileri göstermeden sahibine ulaş.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg }, center: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }, scroll: { padding: 15, paddingBottom: 42 },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 }, logo: { width: 72, height: 72, borderRadius: 25, backgroundColor: '#102A33', borderWidth: 1, borderColor: '#235E70', alignItems: 'center', justifyContent: 'center' }, logoSmall: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#102A33', borderWidth: 1, borderColor: '#235E70', alignItems: 'center', justifyContent: 'center' },
  brand: { color: palette.text, fontSize: 27, fontWeight: '900', marginTop: 13 }, brandSmall: { color: palette.text, fontWeight: '900', fontSize: 17.5 }, tagline: { color: palette.muted, fontSize: 9, marginTop: 2 }, tag: { marginLeft: 'auto', borderRadius: 999, borderWidth: 1, borderColor: '#665A2A', backgroundColor: '#2B2719', paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', gap: 5, alignItems: 'center' }, tagText: { color: palette.yellow, fontWeight: '900', fontSize: 8.8 },
  vehicleCard: { minHeight: 105, backgroundColor: '#0C2130', borderWidth: 1, borderColor: '#1E5167', borderRadius: radius.xl, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }, vehicleIcon: { width: 59, height: 59, borderRadius: 20, backgroundColor: '#123444', alignItems: 'center', justifyContent: 'center' }, vehicleOverline: { color: palette.cyan, fontSize: 8.5, fontWeight: '900', letterSpacing: 1 }, vehicleName: { color: palette.text, fontSize: 18, fontWeight: '900', marginTop: 4 }, vehicleMeta: { color: palette.muted, fontSize: 10.5, fontWeight: '700', marginTop: 4 },
  privacy: { backgroundColor: '#10271F', borderWidth: 1, borderColor: '#28563F', borderRadius: radius.lg, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11 }, privacyTitle: { color: palette.green, fontWeight: '900', fontSize: 12.5 }, privacyBody: { color: '#9CC9B7', fontSize: 9.8, lineHeight: 13.5, marginTop: 3 }, question: { color: palette.text, fontSize: 20, lineHeight: 24, fontWeight: '900', marginTop: 23 }, questionSub: { color: palette.muted, fontSize: 10.5, lineHeight: 15, marginTop: 5, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, category: { width: '48.8%', minHeight: 96, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.md, padding: 12, justifyContent: 'space-between' }, categoryTitle: { color: palette.text, fontSize: 10.8, fontWeight: '800', lineHeight: 14.5, marginTop: 8 }, emergencyLabel: { position: 'absolute', top: 9, right: 9, color: palette.red, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  compose: { marginTop: 13, backgroundColor: '#11182A', borderWidth: 1, borderColor: '#2A3959', borderRadius: radius.lg, padding: 15 }, composeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, composeOverline: { color: palette.cyan, fontSize: 8.2, fontWeight: '900', letterSpacing: 1.2 }, composeTitle: { color: palette.text, fontSize: 15, fontWeight: '900', marginTop: 3 }, composeBody: { color: palette.muted, fontSize: 10.3, lineHeight: 14.5, marginTop: 7 }, input: { minHeight: 92, marginTop: 11, borderWidth: 1, borderColor: palette.line, borderRadius: 14, backgroundColor: '#090E18', padding: 12, color: palette.text, textAlignVertical: 'top', fontSize: 11.5 }, filter: { color: '#78879F', fontSize: 8.9, lineHeight: 12.5, marginTop: 7 }, inlineError: { color: palette.red, fontSize: 10, fontWeight: '700', marginTop: 8 }, send: { minHeight: 51, marginTop: 12, borderRadius: 16, backgroundColor: palette.cyan, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, sendText: { color: palette.bg, fontSize: 10, fontWeight: '900' },
  success: { width: 78, height: 78, borderRadius: 28, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' }, successTitle: { color: palette.text, fontSize: 24, fontWeight: '900', marginTop: 17, textAlign: 'center' }, successBody: { color: palette.muted, fontSize: 11, lineHeight: 16.5, textAlign: 'center', marginTop: 8, maxWidth: 360 }, ownerStatus: { marginTop: 17, flexDirection: 'row', gap: 7, alignItems: 'center', borderRadius: 999, backgroundColor: '#10271F', paddingHorizontal: 12, paddingVertical: 8 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.green }, ownerStatusText: { color: palette.green, fontSize: 9.8, fontWeight: '800' }, secondary: { marginTop: 15, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: palette.line }, secondaryText: { color: palette.text, fontSize: 10.5, fontWeight: '800' },
  errorCard: { marginTop: 60, borderWidth: 1, borderColor: '#63323A', backgroundColor: '#281519', borderRadius: radius.lg, padding: 20, alignItems: 'center' }, errorTitle: { color: palette.text, fontSize: 17, fontWeight: '900', marginTop: 9 }, errorBody: { color: '#D9A3AA', textAlign: 'center', fontSize: 10.5, lineHeight: 15, marginTop: 5 }, footer: { color: '#59657A', fontSize: 8.8, textAlign: 'center', marginTop: 25 }
});
