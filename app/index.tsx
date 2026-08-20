import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlowOrb } from '@/src/components/Primitives';
import { DemoPayload, fallbackDemo, loadDemo } from '@/src/data';
import { AlertsScreen } from '@/src/screens/AlertsScreen';
import { HomeDashboard } from '@/src/screens/HomeDashboard';
import { MoreScreen } from '@/src/screens/MoreScreen';
import { ParkScreen } from '@/src/screens/ParkScreen';
import { palette, radius } from '@/src/theme';

type TabKey = 'home' | 'park' | 'alerts' | 'more';
const nav: Array<{ key: TabKey; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string }> = [
  { key: 'home', icon: 'home-variant-outline', label: 'Ana Sayfa' },
  { key: 'park', icon: 'map-marker-radius-outline', label: 'Park' },
  { key: 'alerts', icon: 'bell-outline', label: 'Bildirimler' },
  { key: 'more', icon: 'view-grid-outline', label: 'Daha Fazla' }
];

export default function DraBornParkApp() {
  const [demo, setDemo] = useState<DemoPayload>(fallbackDemo);
  const [park, setPark] = useState(fallbackDemo.lastPark);
  const [loading, setLoading] = useState(true);
  const [savingPark, setSavingPark] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');
  const [parkPhoto, setParkPhoto] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [indoor, setIndoor] = useState({ floor: 'P2', zoneColor: 'Mavi', row: 'C', bay: '128' });
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDemo().then((value) => {
      setDemo(value);
      setPark(value.lastPark);
      setIndoor({ floor: value.lastPark.floor, zoneColor: value.lastPark.zoneColor, row: value.lastPark.row, bay: value.lastPark.bay });
      setLoading(false);
    });
    Animated.timing(entrance, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrance]);

  async function markPark() {
    setSavingPark(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Konum izni verilmedi', 'Kapalı otopark bilgilerini elle kaydedebilirsin.');
        setIndoorOpen(true);
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let placeName = 'Kaydedilen park konumu';
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: current.coords.latitude, longitude: current.coords.longitude });
        const first = places[0];
        placeName = [first?.name, first?.district, first?.city].filter(Boolean).slice(0, 2).join(' • ') || placeName;
      } catch {}
      setPark((previous) => ({ ...previous, placeName, latitude: current.coords.latitude, longitude: current.coords.longitude, parkedAt: new Date().toISOString() }));
      Alert.alert('Park kaydedildi', 'Konum hafızaya alındı. Kapalı otoparktaysan kat ve park kodunu da ekleyebilirsin.', [{ text: 'Tamam' }, { text: 'Detay ekle', onPress: () => setIndoorOpen(true) }]);
    } catch {
      Alert.alert('Konum alınamadı', 'Demo park kaydı korunuyor; kapalı otopark bilgilerini elle girebilirsin.');
    } finally {
      setSavingPark(false);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!result.canceled) {
      setParkPhoto(result.assets[0]?.uri ?? null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  function goToCar() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${park.latitude},${park.longitude}&travelmode=walking`;
    Linking.openURL(url).catch(() => Alert.alert('Harita açılamadı', 'Cihazda uygun bir harita uygulaması bulunamadı.'));
  }

  function saveIndoor() {
    setPark((previous) => ({ ...previous, floor: indoor.floor.trim() || previous.floor, zoneColor: indoor.zoneColor.trim() || previous.zoneColor, row: indoor.row.trim() || previous.row, bay: indoor.bay.trim() || previous.bay }));
    setIndoorOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function quickReply(value: string) {
    setReply(value);
    Haptics.selectionAsync();
  }

  function sendReply() {
    if (!reply.trim()) return;
    Alert.alert('Anonim yanıt gönderildi', `“${reply.trim()}” mesajı DraBornPark Live oturumunda telefon numaran paylaşılmadan gönderildi. Demo modunda ağ kaydı oluşturulmaz.`);
    setReply('');
  }

  function showReminder() {
    Alert.alert('Park süresi hatırlatıcısı', 'Demo için 1 saat seçildi. Gerçek kullanıcı sürümünde 30 dk, 1 saat, 2 saat, 3 saat ve özel süre seçenekleri bulunacak.');
  }

  if (loading) {
    return <SafeAreaView style={styles.loading}><View style={styles.logo}><MaterialCommunityIcons name="car-connected" size={34} color={palette.cyan} /></View><Text style={styles.loadingTitle}>DraBornPark</Text><Text style={styles.loadingSub}>Araç ağı hazırlanıyor</Text><ActivityIndicator color={palette.cyan} style={{ marginTop: 18 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <GlowOrb color={palette.purple} size={230} top={-95} right={-95} />
      <GlowOrb color={palette.cyan} size={175} top={245} left={-120} />
      <Animated.View style={[styles.shell, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <View style={styles.header}>
          <View style={styles.brandRow}><View style={styles.logoSmall}><MaterialCommunityIcons name="car-connected" size={23} color={palette.cyan} /></View><View><Text style={styles.brand}>DraBornPark</Text><Text style={styles.tagline}>Aracına numaranı değil, DraBornPark’ı bırak.</Text></View></View>
          <Pressable style={styles.avatar}><MaterialCommunityIcons name="account" size={23} color={palette.text} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {tab === 'home' ? <HomeDashboard demo={demo} park={park} savingPark={savingPark} onPark={markPark} onGoCar={goToCar} onOpenPark={() => setTab('park')} onOpenAlerts={() => setTab('alerts')} onOpenPlus={() => setPlusOpen(true)} /> : null}
          {tab === 'park' ? <ParkScreen park={park} hasPhoto={Boolean(parkPhoto)} onGoCar={goToCar} onIndoor={() => setIndoorOpen(true)} onPhoto={pickPhoto} onReminder={showReminder} /> : null}
          {tab === 'alerts' ? <AlertsScreen demo={demo} selectedId={selectedAlert} reply={reply} onSelect={setSelectedAlert} onReplyChange={setReply} onQuickReply={quickReply} onSendReply={sendReply} /> : null}
          {tab === 'more' ? <MoreScreen demo={demo} onOpenPlus={() => setPlusOpen(true)} onDemoTag={() => router.push('/t/K7M4X2P9')} /> : null}
        </ScrollView>

        <View style={styles.nav}>
          {nav.map((item) => {
            const active = tab === item.key;
            return <Pressable key={item.key} onPress={() => { setTab(item.key); Haptics.selectionAsync(); }} style={styles.navItem}><View style={[styles.navIcon, active && styles.navIconActive]}><MaterialCommunityIcons name={item.icon} size={21} color={active ? palette.bg : palette.muted} /></View><Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text></Pressable>;
          })}
        </View>
      </Animated.View>

      <Modal transparent visible={plusOpen} animationType="slide" onRequestClose={() => setPlusOpen(false)}>
        <View style={styles.modalShade}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.plusIcon}><MaterialCommunityIcons name="crown" size={32} color={palette.yellow} /></View><Text style={styles.modalTitle}>DraBornPark+</Text><Text style={styles.modalBody}>Park geçmişi, AI tabela okuma, otomatik park algılama, fotoğraflı bildirim, anonim canlı sohbet, Family, vale/servis modu ve acil durum zincirini tek pakette aç.</Text>
          {['14 gün yeni etiket hediyesi', 'Telefon numarası paylaşmadan canlı iletişim', '5 araca kadar Family altyapısı', 'AI ve gelişmiş güvenlik özellikleri'].map((item) => <View key={item} style={styles.benefit}><MaterialCommunityIcons name="check-circle" size={18} color={palette.green} /><Text style={styles.benefitText}>{item}</Text></View>)}
          <View style={styles.prices}><View><Text style={styles.price}>49,99 TL</Text><Text style={styles.priceSub}>AYLIK • TEST FİYATI</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={styles.price}>399,99 TL</Text><Text style={styles.priceSub}>YILLIK • TEST FİYATI</Text></View></View>
          <Pressable onPress={() => Alert.alert('Expo Go demo', 'Google Play abonelik satın alma akışı development build aşamasında gerçek Play Billing ile bağlanacak. Backend subscription durumları hazır.')} style={styles.cta}><Text style={styles.ctaText}>14 GÜNLÜK PLUS DEMOSUNU İNCELE</Text></Pressable>
          <Pressable onPress={() => setPlusOpen(false)} style={styles.close}><Text style={styles.closeText}>Kapat</Text></Pressable>
        </View></View>
      </Modal>

      <Modal transparent visible={indoorOpen} animationType="slide" onRequestClose={() => setIndoorOpen(false)}>
        <View style={styles.modalShade}><View style={styles.sheet}><View style={styles.handle} /><Text style={styles.modalTitle}>Kapalı Otopark</Text><Text style={styles.modalBody}>GPS’in yetmediği yerde kat, renk, sıra ve park kodunu sakla.</Text>
          <View style={styles.fieldRow}><Field label="Kat" value={indoor.floor} onChange={(value) => setIndoor((p) => ({ ...p, floor: value }))} /><Field label="Bölge / Renk" value={indoor.zoneColor} onChange={(value) => setIndoor((p) => ({ ...p, zoneColor: value }))} /></View>
          <View style={styles.fieldRow}><Field label="Sıra" value={indoor.row} onChange={(value) => setIndoor((p) => ({ ...p, row: value }))} /><Field label="Park No" value={indoor.bay} onChange={(value) => setIndoor((p) => ({ ...p, bay: value }))} /></View>
          <Pressable onPress={saveIndoor} style={styles.cta}><Text style={styles.ctaText}>PARK DETAYINI KAYDET</Text></Pressable><Pressable onPress={() => setIndoorOpen(false)} style={styles.close}><Text style={styles.closeText}>İptal</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} style={styles.input} placeholderTextColor="#66738A" /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg, overflow: 'hidden' },
  shell: { flex: 1 },
  loading: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 72, height: 72, borderRadius: 25, borderWidth: 1, borderColor: '#235E70', backgroundColor: '#102A33', alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { color: palette.text, fontSize: 27, fontWeight: '900', marginTop: 14 },
  loadingSub: { color: palette.muted, fontSize: 10.5, marginTop: 5 },
  header: { height: 72, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoSmall: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, borderColor: '#235E70', backgroundColor: '#102A33', alignItems: 'center', justifyContent: 'center' },
  brand: { color: palette.text, fontSize: 18.5, fontWeight: '900', letterSpacing: -0.4 },
  tagline: { color: palette.muted, fontSize: 8.8, marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 14, paddingBottom: 108 },
  nav: { position: 'absolute', left: 10, right: 10, bottom: 8, height: 76, borderRadius: 26, backgroundColor: '#0C111D', borderWidth: 1, borderColor: '#202A42', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navIcon: { width: 40, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: palette.cyan },
  navLabel: { color: palette.muted, fontSize: 9, fontWeight: '700' },
  navLabelActive: { color: palette.text },
  modalShade: { flex: 1, backgroundColor: '#000000B8', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0E1320', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: palette.line, padding: 20, paddingBottom: 34 },
  handle: { width: 45, height: 5, borderRadius: 3, backgroundColor: '#303B52', alignSelf: 'center', marginBottom: 18 },
  plusIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#322A1D', borderWidth: 1, borderColor: '#5C4E30', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: palette.text, fontSize: 26, fontWeight: '900', marginTop: 11 },
  modalBody: { color: palette.muted, fontSize: 11.2, lineHeight: 16.5, marginTop: 6, marginBottom: 13 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  benefitText: { color: '#DAE2F1', fontSize: 11 },
  prices: { marginVertical: 15, borderRadius: 18, backgroundColor: '#151B2B', padding: 14, flexDirection: 'row', justifyContent: 'space-between' },
  price: { color: palette.text, fontSize: 17, fontWeight: '900' },
  priceSub: { color: palette.muted, fontSize: 8.7, marginTop: 3 },
  cta: { minHeight: 51, backgroundColor: palette.cyan, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ctaText: { color: palette.bg, fontSize: 10.5, fontWeight: '900' },
  close: { alignSelf: 'center', padding: 12, marginTop: 5 },
  closeText: { color: palette.muted, fontSize: 11, fontWeight: '800' },
  fieldRow: { flexDirection: 'row', gap: 9, marginBottom: 9 },
  fieldLabel: { color: palette.muted, fontSize: 9.5, fontWeight: '800', marginBottom: 5 },
  input: { minHeight: 47, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: '#090E18', color: palette.text, paddingHorizontal: 12, fontWeight: '800' }
});
