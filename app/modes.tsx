import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { endVehicleMode, hasPlusEntitlement, loadLiveDashboard, setServiceState, startVehicleMode } from '@/src/lib/drabornpark';
import { palette, radius } from '@/src/theme';

type ModeType = 'valet' | 'service';
type ServiceState = 'in_service' | 'extra_work' | 'ready' | 'pickup';

const durations = [30, 60, 120, 240, 480];
const serviceStates: Array<{ key: ServiceState; label: string }> = [
  { key: 'in_service', label: 'SERVİSTE' },
  { key: 'extra_work', label: 'EK İŞLEM' },
  { key: 'ready', label: 'ARAÇ HAZIR' },
  { key: 'pickup', label: 'TESLİM AL' },
];

export default function ModesScreen() {
  const [data, setData] = useState<any>(null);
  const [modeType, setModeType] = useState<ModeType>('valet');
  const [vehicleId, setVehicleId] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState(120);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const next = await loadLiveDashboard();
      setData(next);
      if (!vehicleId && next.vehicles[0]) setVehicleId(next.vehicles[0].id);
    } catch {
      router.replace('/auth');
    }
  }

  useEffect(() => { refresh(); }, []);

  const plus = data ? hasPlusEntitlement(data.profile, data.subscription) : false;
  const activeMode = useMemo(() => data?.vehicleModes?.find((item: any) => item.status === 'active' && new Date(item.ends_at).getTime() > Date.now()), [data]);

  async function run(action: () => Promise<any>, success: string) {
    setBusy(true);
    try {
      await action();
      Alert.alert('Tamamlandı', success);
      await refresh();
    } catch (error: any) {
      const message = String(error?.message || 'İşlem tamamlanamadı.');
      Alert.alert(message.includes('plus_required') ? 'DraBornPark+ gerekli' : 'İşlem başarısız', message.includes('plus_required') ? 'Bu özellik aktif Plus üyeliği veya deneme süresi gerektirir.' : message);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!vehicleId) return Alert.alert('Araç seç', 'Vale veya Servis modu için bir araç seçmelisin.');
    if (!plus) return Alert.alert('DraBornPark+ gerekli', 'Vale ve Servis modu Plus kapsamındadır.');
    await run(async () => {
      const mode: any = await startVehicleMode({
        vehicleId,
        modeType,
        label: label || (modeType === 'valet' ? 'Vale teslimi' : 'Servis ziyareti'),
        durationMinutes: duration,
        metadata: modeType === 'service' ? { serviceState: 'in_service' } : {},
      });
      if (modeType === 'service' && mode?.id) await setServiceState(mode.id, 'in_service', note || 'Araç servise bırakıldı.');
    }, modeType === 'valet' ? 'Vale modu başlatıldı. Süre bitince oturum geçersiz olur.' : 'Servis modu başlatıldı.');
  }

  async function updateService(state: ServiceState) {
    if (!activeMode || activeMode.mode_type !== 'service') return;
    await run(() => setServiceState(activeMode.id, state, note), 'Servis durumu Timeline’a kaydedildi.');
  }

  if (!data) return <SafeAreaView style={styles.safe}><View style={styles.loader}><ActivityIndicator color={palette.cyan} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Header />
      <Text style={styles.overline}>DRABORNPARK+ • GEÇİCİ ARAÇ OTURUMU</Text>
      <Text style={styles.title}>Vale ve Servis Modu</Text>
      <Text style={styles.sub}>Aracı başkasına bıraktığında iletişim durumunu süreli olarak yönet. Mod başlangıçları, servis durumları ve kapanışlar Timeline’a yazılır.</Text>

      {!plus ? <View style={styles.locked}><MaterialCommunityIcons name="lock-outline" size={22} color={palette.yellow} /><View style={{ flex: 1 }}><Text style={styles.lockedTitle}>Plus erişimi gerekli</Text><Text style={styles.lockedBody}>14 günlük deneme veya aktif Plus üyeliği ile bu modüller açılır.</Text></View></View> : null}

      {activeMode ? <View style={[styles.active, { borderColor: activeMode.mode_type === 'valet' ? '#6A4A25' : '#244B66' }]}>
        <View style={styles.activeTop}><MaterialCommunityIcons name={activeMode.mode_type === 'valet' ? 'car' : 'wrench'} size={26} color={activeMode.mode_type === 'valet' ? palette.orange : palette.blue} /><View style={{ flex: 1 }}><Text style={styles.activeOver}>AKTİF {activeMode.mode_type === 'valet' ? 'VALE' : 'SERVİS'} OTURUMU</Text><Text style={styles.activeTitle}>{activeMode.label || 'Aktif oturum'}</Text><Text style={styles.activeSub}>{new Date(activeMode.ends_at).toLocaleString('tr-TR')} tarihinde otomatik sona erer</Text></View></View>
        {activeMode.mode_type === 'service' ? <><Text style={styles.label}>SERVİS DURUMU</Text><View style={styles.serviceGrid}>{serviceStates.map(item => <Pressable key={item.key} disabled={busy} onPress={() => updateService(item.key)} style={styles.serviceChip}><Text style={styles.serviceText}>{item.label}</Text></Pressable>)}</View><TextInput value={note} onChangeText={setNote} placeholder="Servis notu..." placeholderTextColor="#627087" style={styles.input} /></> : null}
        <Pressable disabled={busy} onPress={() => run(() => endVehicleMode(activeMode.id), 'Geçici mod kapatıldı.')} style={styles.endButton}><MaterialCommunityIcons name="stop-circle-outline" size={19} color={palette.red} /><Text style={styles.endText}>MODU ŞİMDİ KAPAT</Text></Pressable>
      </View> : <View style={styles.form}>
        <Text style={styles.formTitle}>Yeni geçici mod</Text>
        <View style={styles.modeRow}><ModeButton active={modeType === 'valet'} title="VALE" icon="car" color={palette.orange} onPress={() => setModeType('valet')} /><ModeButton active={modeType === 'service'} title="SERVİS" icon="wrench" color={palette.blue} onPress={() => setModeType('service')} /></View>
        <Text style={styles.label}>ARAÇ</Text>
        <View style={styles.chips}>{data.vehicles.map((vehicle: any) => <Pressable key={vehicle.id} onPress={() => setVehicleId(vehicle.id)} style={[styles.chip, vehicleId === vehicle.id && styles.chipActive]}><Text style={[styles.chipText, vehicleId === vehicle.id && { color: palette.cyan }]}>{vehicle.vehicle_name}</Text></Pressable>)}</View>
        <Text style={styles.label}>OTURUM ETİKETİ</Text><TextInput value={label} onChangeText={setLabel} placeholder={modeType === 'valet' ? 'Örn. AVM Vale' : 'Örn. Yetkili Servis'} placeholderTextColor="#627087" style={styles.input} />
        <Text style={styles.label}>SÜRE</Text><View style={styles.chips}>{durations.map(minutes => <Pressable key={minutes} onPress={() => setDuration(minutes)} style={[styles.chip, duration === minutes && styles.chipActive]}><Text style={[styles.chipText, duration === minutes && { color: palette.cyan }]}>{minutes < 60 ? `${minutes} dk` : `${minutes / 60} sa`}</Text></Pressable>)}</View>
        {modeType === 'service' ? <><Text style={styles.label}>İLK SERVİS NOTU</Text><TextInput value={note} onChangeText={setNote} placeholder="Araç servise bırakıldı..." placeholderTextColor="#627087" style={styles.input} /></> : null}
        <Pressable disabled={busy || !plus} onPress={start} style={[styles.cta, (!plus || busy) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color={palette.bg} /> : <><MaterialCommunityIcons name="play-circle-outline" size={20} color={palette.bg} /><Text style={styles.ctaText}>{modeType === 'valet' ? 'VALE MODUNU BAŞLAT' : 'SERVİS MODUNU BAŞLAT'}</Text></>}</Pressable>
      </View>}

      <Text style={styles.section}>SON OTURUMLAR</Text>
      {data.vehicleModes.length === 0 ? <Text style={styles.empty}>Henüz Vale veya Servis oturumu yok.</Text> : data.vehicleModes.slice(0, 8).map((item: any) => <View key={item.id} style={styles.history}><MaterialCommunityIcons name={item.mode_type === 'valet' ? 'car' : 'wrench'} size={20} color={item.mode_type === 'valet' ? palette.orange : palette.blue} /><View style={{ flex: 1 }}><Text style={styles.historyTitle}>{item.label || (item.mode_type === 'valet' ? 'Vale' : 'Servis')}</Text><Text style={styles.historySub}>{item.status.toUpperCase()} • {new Date(item.starts_at).toLocaleString('tr-TR')}</Text></View></View>)}
    </ScrollView>
  </SafeAreaView>;
}

function Header() { return <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={27} color={palette.text} /></Pressable><Text style={styles.headerTitle}>Vale / Servis</Text><View style={{ width: 42 }} /></View>; }
function ModeButton({ active, title, icon, color, onPress }: { active: boolean; title: string; icon: 'car' | 'wrench'; color: string; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.modeButton, active && { borderColor: `${color}88`, backgroundColor: `${color}16` }]}><MaterialCommunityIcons name={icon} size={26} color={active ? color : palette.muted} /><Text style={[styles.modeText, active && { color }]}>{title}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg }, scroll: { padding: 19, paddingBottom: 55 }, loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: palette.text, fontSize: 14, fontWeight: '900' },
  overline: { color: palette.orange, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4, marginTop: 25 }, title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.1, marginTop: 6 }, sub: { color: palette.muted, fontSize: 11.5, lineHeight: 17, marginTop: 8 },
  locked: { marginTop: 15, borderRadius: 18, borderWidth: 1, borderColor: '#514A25', backgroundColor: '#211F14', padding: 14, flexDirection: 'row', gap: 10 }, lockedTitle: { color: palette.yellow, fontSize: 12, fontWeight: '900' }, lockedBody: { color: '#B9B286', fontSize: 10, lineHeight: 14, marginTop: 3 },
  form: { marginTop: 17, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.panel, padding: 15 }, formTitle: { color: palette.text, fontSize: 15, fontWeight: '900' }, modeRow: { flexDirection: 'row', gap: 9, marginTop: 13 }, modeButton: { flex: 1, height: 83, borderRadius: 18, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center', gap: 7 }, modeText: { color: palette.muted, fontSize: 9, fontWeight: '900' },
  label: { color: '#7E8A9F', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.1, marginTop: 14, marginBottom: 6 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderRadius: 12, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#0A0F19' }, chipActive: { borderColor: '#24586A', backgroundColor: '#0D2730' }, chipText: { color: palette.muted, fontSize: 9.5, fontWeight: '800' }, input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#27324A', backgroundColor: '#090E18', color: palette.text, paddingHorizontal: 13, fontSize: 12 }, cta: { height: 55, borderRadius: 17, backgroundColor: palette.cyan, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 18 }, ctaText: { color: palette.bg, fontSize: 10, fontWeight: '900' },
  active: { marginTop: 17, borderRadius: radius.lg, borderWidth: 1, backgroundColor: palette.panel, padding: 15 }, activeTop: { flexDirection: 'row', gap: 11, alignItems: 'center' }, activeOver: { color: palette.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, activeTitle: { color: palette.text, fontSize: 15, fontWeight: '900', marginTop: 3 }, activeSub: { color: palette.muted, fontSize: 9.5, marginTop: 3 }, serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, serviceChip: { width: '48%', borderRadius: 12, borderWidth: 1, borderColor: '#2B4056', paddingVertical: 10, alignItems: 'center' }, serviceText: { color: palette.blue, fontSize: 8.5, fontWeight: '900' }, endButton: { marginTop: 13, height: 47, borderRadius: 14, borderWidth: 1, borderColor: '#5A2C33', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, endText: { color: palette.red, fontSize: 9, fontWeight: '900' },
  section: { color: palette.text, fontSize: 14, fontWeight: '900', marginTop: 23, marginBottom: 8 }, empty: { color: palette.muted, fontSize: 10.5 }, history: { borderBottomWidth: 1, borderBottomColor: '#171F31', paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, historyTitle: { color: palette.text, fontSize: 11.5, fontWeight: '900' }, historySub: { color: palette.muted, fontSize: 9, marginTop: 2 },
});
