import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  claimTagTransfer,
  disableTag,
  loadLiveDashboard,
  resetTag,
  startTagTransfer,
} from '@/src/lib/drabornpark';
import { palette, radius } from '@/src/theme';

export default function TagsScreen() {
  const [data, setData] = useState<any>(null);
  const [tagCode, setTagCode] = useState('');
  const [transferCode, setTransferCode] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const dashboard = await loadLiveDashboard();
      setData(dashboard);
      if (dashboard.vehicles[0] && !vehicleId) setVehicleId(dashboard.vehicles[0].id);
    } catch {
      router.replace('/auth');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function run(action: () => Promise<any>, success: string) {
    setBusy(true);
    try {
      const result = await action();
      Alert.alert('Tamamlandı', success);
      await refresh();
      return result;
    } catch (error: any) {
      Alert.alert('İşlem başarısız', error?.message || 'Beklenmeyen hata.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function beginTransfer(tag: any) {
    setBusy(true);
    try {
      const result: any = await startTagTransfer(tag.id);
      Alert.alert(
        'Devir kodu oluşturuldu',
        `${result.transferCode}\n\nBu kod 24 saat geçerlidir. Yalnızca etiketi devralacak kişiyle paylaş.`,
      );
      await refresh();
    } catch (error: any) {
      Alert.alert('Devir başlatılamadı', error?.message || 'İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}><ActivityIndicator color={palette.cyan} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Header />
        <Text style={styles.over}>NFC + QR KONTROL MERKEZİ</Text>
        <Text style={styles.title}>Etiketlerim</Text>
        <Text style={styles.sub}>
          Etiketin URL’si değişmez; araç bağlantısını sıfırlayabilir, güvenli devir başlatabilir veya kayıp etiketi devre dışı bırakabilirsin.
        </Text>

        <Pressable onPress={() => router.push('/activate/new')} style={styles.activate}>
          <MaterialCommunityIcons name="nfc" size={24} color={palette.bg} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activateTitle}>YENİ ETİKET AKTİVE ET</Text>
            <Text style={styles.activateSub}>Kutudaki gizli PIN ile hesabına bağla.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.bg} />
        </Pressable>

        {data.tags.map((tag: any) => (
          <View key={tag.id} style={styles.tag}>
            <View style={styles.tagHead}>
              <View style={styles.nfc}>
                <MaterialCommunityIcons name="nfc-variant" size={28} color={palette.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tagCode}>{tag.tag_code}</Text>
                <Text style={styles.tagMeta}>{tag.serial_number} • {tag.status}</Text>
                <Text style={styles.tagUrl}>{tag.nfc_url}</Text>
              </View>
              <MaterialCommunityIcons
                name={tag.status === 'DISABLED' ? 'shield-off-outline' : 'shield-check'}
                size={24}
                color={tag.status === 'DISABLED' ? palette.red : palette.green}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                disabled={busy || tag.status === 'DISABLED'}
                onPress={() => beginTransfer(tag)}
                style={styles.action}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={17} color={palette.purple} />
                <Text style={[styles.actionText, { color: palette.purple }]}>DEVRET</Text>
              </Pressable>

              <Pressable
                disabled={busy}
                onPress={() => {
                  const targetVehicle = data.vehicles[0];
                  if (!targetVehicle) return;
                  Alert.alert(
                    'Etiketi yeniden bağla',
                    `${tag.tag_code} etiketi ${targetVehicle.vehicle_name} aracına bağlansın mı?`,
                    [
                      { text: 'Vazgeç', style: 'cancel' },
                      {
                        text: 'BAĞLA',
                        onPress: () => run(
                          () => resetTag(tag.id, targetVehicle.id),
                          'Etiket araç bağlantısı güncellendi.',
                        ),
                      },
                    ],
                  );
                }}
                style={styles.action}
              >
                <MaterialCommunityIcons name="restart" size={17} color={palette.orange} />
                <Text style={[styles.actionText, { color: palette.orange }]}>SIFIRLA</Text>
              </Pressable>

              <Pressable
                disabled={busy || tag.status === 'DISABLED'}
                onPress={() => Alert.alert(
                  'Etiketi kapat',
                  'Kayıp veya kullanılmayan etiket dış iletişime kapatılır.',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'DEVRE DIŞI',
                      style: 'destructive',
                      onPress: () => run(() => disableTag(tag.id), 'Etiket devre dışı bırakıldı.'),
                    },
                  ],
                )}
                style={styles.action}
              >
                <MaterialCommunityIcons name="shield-off-outline" size={17} color={palette.red} />
                <Text style={[styles.actionText, { color: palette.red }]}>KAPAT</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {data.tags.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="nfc" size={34} color={palette.muted} />
            <Text style={styles.emptyTitle}>Bağlı etiket yok</Text>
          </View>
        ) : null}

        <View style={styles.claim}>
          <Text style={styles.claimOver}>ETİKET DEVRAL</Text>
          <Text style={styles.claimTitle}>Başka bir kullanıcıdan gelen etiketi al</Text>
          <Text style={styles.claimBody}>
            Eski araç sahibi 24 saat geçerli bir devir kodu oluşturur. Tag ID ve devir kodu eşleşmeden sahiplik değişmez.
          </Text>

          <Text style={styles.label}>TAG ID</Text>
          <TextInput
            value={tagCode}
            onChangeText={setTagCode}
            autoCapitalize="characters"
            placeholder="DP-K7M4X2P9"
            placeholderTextColor="#626C80"
            style={styles.input}
          />

          <Text style={styles.label}>DEVİR KODU</Text>
          <TextInput
            value={transferCode}
            onChangeText={setTransferCode}
            autoCapitalize="characters"
            placeholder="A1B2C3D4E5F6"
            placeholderTextColor="#626C80"
            style={styles.input}
          />

          <Text style={styles.label}>YENİ ARAÇ</Text>
          <View style={styles.vehicles}>
            {data.vehicles.map((vehicle: any) => (
              <Pressable
                key={vehicle.id}
                onPress={() => setVehicleId(vehicle.id)}
                style={[styles.vehicle, vehicleId === vehicle.id && styles.vehicleOn]}
              >
                <MaterialCommunityIcons
                  name={vehicle.vehicle_type === 'motorcycle' ? 'motorbike' : 'car'}
                  size={18}
                  color={vehicleId === vehicle.id ? palette.cyan : palette.muted}
                />
                <Text style={[styles.vehicleText, vehicleId === vehicle.id && { color: palette.cyan }]}>
                  {vehicle.vehicle_name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={busy || !tagCode || !transferCode || !vehicleId}
            onPress={() => run(
              () => claimTagTransfer(tagCode, transferCode, vehicleId),
              'Etiket hesabına ve seçtiğin araca devredildi.',
            )}
            style={[styles.claimBtn, (busy || !tagCode || !transferCode || !vehicleId) && { opacity: 0.5 }]}
          >
            {busy ? (
              <ActivityIndicator color={palette.bg} />
            ) : (
              <>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color={palette.bg} />
                <Text style={styles.claimBtnText}>ETİKETİ GÜVENLİ DEVRAL</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.info}>
          <MaterialCommunityIcons name="information-outline" size={20} color={palette.cyan} />
          <Text style={styles.infoText}>
            NFC’ye yazılan bağlantı araç plakası değildir. Bu nedenle etiket yeni araca geçtiğinde fiziksel NFC yeniden programlanmaz.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <MaterialCommunityIcons name="chevron-left" size={27} color={palette.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Etiketlerim</Text>
      <View style={{ width: 42 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { padding: 19, paddingBottom: 55 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: palette.text, fontSize: 14, fontWeight: '900' },
  over: { color: palette.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 24 },
  title: { color: palette.text, fontSize: 29, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  sub: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 7 },
  activate: { marginTop: 17, minHeight: 72, borderRadius: 19, backgroundColor: palette.cyan, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  activateTitle: { color: palette.bg, fontSize: 11, fontWeight: '900' },
  activateSub: { color: '#174752', fontSize: 8.8, marginTop: 3 },
  tag: { marginTop: 11, borderRadius: radius.lg, borderWidth: 1, borderColor: '#264554', backgroundColor: '#0C1921', padding: 14 },
  tagHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  nfc: { width: 50, height: 50, borderRadius: 17, backgroundColor: '#0C2A34', alignItems: 'center', justifyContent: 'center' },
  tagCode: { color: palette.text, fontSize: 15, fontWeight: '900' },
  tagMeta: { color: palette.green, fontSize: 8.5, fontWeight: '800', marginTop: 3 },
  tagUrl: { color: palette.muted, fontSize: 7.5, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 12 },
  action: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.line, backgroundColor: '#090F18', alignItems: 'center', justifyContent: 'center', gap: 2 },
  actionText: { fontSize: 7.5, fontWeight: '900' },
  empty: { marginTop: 15, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.line, padding: 22, alignItems: 'center' },
  emptyTitle: { color: palette.muted, fontSize: 11, fontWeight: '900', marginTop: 8 },
  claim: { marginTop: 18, borderRadius: radius.lg, borderWidth: 1, borderColor: '#493761', backgroundColor: '#171020', padding: 15 },
  claimOver: { color: palette.purple, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  claimTitle: { color: palette.text, fontSize: 17, fontWeight: '900', marginTop: 5 },
  claimBody: { color: '#A79BB5', fontSize: 9.5, lineHeight: 14, marginTop: 5 },
  label: { color: '#7D899F', fontSize: 8.2, fontWeight: '900', letterSpacing: 1.1, marginTop: 12, marginBottom: 6 },
  input: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: '#352842', backgroundColor: '#0B0811', color: palette.text, paddingHorizontal: 12, fontSize: 11.5 },
  vehicles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  vehicle: { borderRadius: 11, borderWidth: 1, borderColor: '#342942', paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', gap: 5, alignItems: 'center' },
  vehicleOn: { borderColor: '#285867', backgroundColor: '#0D252E' },
  vehicleText: { color: palette.muted, fontSize: 8.5, fontWeight: '800' },
  claimBtn: { height: 54, borderRadius: 16, backgroundColor: palette.purple, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 16 },
  claimBtnText: { color: palette.bg, fontSize: 9.5, fontWeight: '900' },
  info: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#234A58', backgroundColor: '#0C1F27', padding: 12, flexDirection: 'row', gap: 9 },
  infoText: { color: '#87ABB5', fontSize: 9.5, lineHeight: 14, flex: 1 },
});
