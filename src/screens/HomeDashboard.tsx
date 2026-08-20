import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionCard, Card, IconBubble, Pill, SectionHeader } from '@/src/components/Primitives';
import { DemoPayload } from '@/src/data';
import { palette, radius } from '@/src/theme';

export type ParkSnapshot = DemoPayload['lastPark'];

export function HomeDashboard({ demo, park, savingPark, onPark, onGoCar, onOpenPark, onOpenAlerts, onOpenPlus }: {
  demo: DemoPayload;
  park: ParkSnapshot;
  savingPark: boolean;
  onPark: () => void;
  onGoCar: () => void;
  onOpenPark: () => void;
  onOpenAlerts: () => void;
  onOpenPlus: () => void;
}) {
  const latest = demo.notifications[0];
  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroHaloA} />
        <View style={styles.heroHaloB} />
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>AKTİF ARAÇ</Text>
            <Text style={styles.vehicle}>{demo.vehicle.name}</Text>
            <Text style={styles.plate}>{demo.vehicle.plate}</Text>
          </View>
          <IconBubble icon={demo.vehicle.type === 'motorcycle' ? 'motorbike' : 'car-sports'} color={palette.cyan} size={62} />
        </View>
        <View style={styles.statusRow}>
          <View style={styles.liveDot} />
          <Text style={styles.status}>DraBornPark aktif</Text>
          <Pill label={demo.vehicle.tagCode} icon="nfc" color={palette.yellow} />
        </View>
      </View>

      <View style={styles.actionGrid}>
        <ActionCard icon="map-marker-plus" color={palette.cyan} title={savingPark ? 'KONUM ALINIYOR' : 'PARK ETTİM'} detail="Konumu, katı, bölgeyi ve park fotoğrafını kaydet." onPress={onPark} disabled={savingPark} />
        <ActionCard icon="walk" color={palette.purple} title="ARACIMA GİT" detail="Son park noktasına yürüyüş rotasını tek dokunuşla aç." onPress={onGoCar} />
      </View>

      <SectionHeader title="Son Park" action="Park hafızası" />
      <Pressable onPress={onOpenPark} style={({ pressed }) => [styles.parkCard, pressed && { opacity: 0.82 }]}>
        <View style={styles.mapMock}>
          <View style={[styles.road, { transform: [{ rotate: '33deg' }] }]} />
          <View style={[styles.road, { transform: [{ rotate: '-38deg' }] }]} />
          <View style={styles.carPin}><MaterialCommunityIcons name="car" size={21} color={palette.bg} /></View>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={styles.parkPlace}>{park.placeName}</Text>
          <Text style={styles.parkCode}>{park.floor} • {park.zoneColor} • {park.row}{park.bay}</Text>
          <Text style={styles.muted}>Son park kaydı hazır</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={28} color={palette.muted} />
      </Pressable>

      <SectionHeader title="Son Bildirim" action={`${demo.notifications.length} kayıt`} />
      <Pressable onPress={onOpenAlerts} style={({ pressed }) => [styles.alert, pressed && { opacity: 0.82 }]}>
        <IconBubble icon={latest.priority === 'emergency' ? 'alert-octagon' : 'lightbulb-alert-outline'} color={latest.priority === 'emergency' ? palette.red : palette.orange} />
        <View style={{ flex: 1 }}>
          <View style={styles.inline}><Text style={styles.alertTitle}>{latest.title}</Text>{!latest.seen ? <Pill label="YENİ" color={palette.red} /> : null}</View>
          <Text style={styles.alertBody}>{latest.body}</Text>
          <Text style={styles.muted}>{latest.minutesAgo} dakika önce</Text>
        </View>
      </Pressable>

      <SectionHeader title="Ağustos Özeti" action="DraBornPark+" />
      <View style={styles.stats}>
        <Card style={styles.stat}><Text style={styles.statValue}>{demo.stats.parksThisMonth}</Text><Text style={styles.statLabel}>Park kaydı</Text></Card>
        <Card style={styles.stat}><Text style={[styles.statValue, { color: palette.orange }]}>{demo.stats.reportsThisMonth}</Text><Text style={styles.statLabel}>Bildirim</Text></Card>
        <Card style={styles.stat}><Text style={[styles.statValue, { color: palette.purple }]}>1s 42d</Text><Text style={styles.statLabel}>Ort. park</Text></Card>
      </View>

      <Pressable onPress={onOpenPlus} style={({ pressed }) => [styles.plus, pressed && { opacity: 0.84 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.plusOverline}>14 GÜN HEDİYE</Text>
          <Text style={styles.plusTitle}>DraBornPark+</Text>
          <Text style={styles.plusBody}>AI park okuma, Family, otomatik park, anonim chat ve gelişmiş güvenlik.</Text>
        </View>
        <View style={styles.crown}><MaterialCommunityIcons name="crown" size={28} color={palette.yellow} /></View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', backgroundColor: '#0B2230', borderWidth: 1, borderColor: '#17445B', borderRadius: radius.xl, padding: 18, minHeight: 190 },
  heroHaloA: { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -65, top: -70, backgroundColor: '#17526A55' },
  heroHaloB: { position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -50, bottom: -70, backgroundColor: '#753DD944' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  overline: { color: palette.cyan, fontSize: 9.5, letterSpacing: 1.5, fontWeight: '900' },
  vehicle: { color: palette.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.7, marginTop: 6 },
  plate: { color: '#C5D8E3', fontSize: 13, fontWeight: '800', marginTop: 5 },
  statusRow: { marginTop: 'auto', paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.green },
  status: { color: palette.green, fontWeight: '800', fontSize: 10.5, marginRight: 'auto' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  parkCard: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 12, flexDirection: 'row', alignItems: 'center' },
  mapMock: { width: 78, height: 78, borderRadius: 21, overflow: 'hidden', backgroundColor: '#102B31', alignItems: 'center', justifyContent: 'center' },
  road: { position: 'absolute', width: 115, height: 10, backgroundColor: '#234148' },
  carPin: { width: 35, height: 35, borderRadius: 18, backgroundColor: palette.cyan, borderWidth: 5, borderColor: '#3D8795', alignItems: 'center', justifyContent: 'center' },
  parkPlace: { color: palette.text, fontWeight: '900', fontSize: 15 },
  parkCode: { color: palette.cyan, fontWeight: '900', fontSize: 11.5, marginTop: 5 },
  muted: { color: palette.muted, fontSize: 9.8, marginTop: 6 },
  alert: { backgroundColor: '#17151F', borderWidth: 1, borderColor: '#3C2D39', borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 12 },
  inline: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  alertTitle: { color: palette.text, fontWeight: '900', fontSize: 13.5, flexShrink: 1 },
  alertBody: { color: palette.muted, fontSize: 10.8, lineHeight: 15, marginTop: 5 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 13 },
  statValue: { color: palette.cyan, fontSize: 18, fontWeight: '900' },
  statLabel: { color: palette.muted, fontSize: 9.5, marginTop: 5 },
  plus: { marginTop: 16, backgroundColor: '#231A3D', borderWidth: 1, borderColor: '#4E3777', borderRadius: radius.xl, padding: 18, flexDirection: 'row', alignItems: 'center' },
  plusOverline: { color: palette.yellow, fontWeight: '900', fontSize: 9.5, letterSpacing: 1.3 },
  plusTitle: { color: palette.text, fontSize: 25, fontWeight: '900', marginTop: 4 },
  plusBody: { color: '#C8BDDC', fontSize: 10.8, lineHeight: 15, maxWidth: 265, marginTop: 5 },
  crown: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#3C3226', borderWidth: 1, borderColor: '#6D5C39', alignItems: 'center', justifyContent: 'center' }
});
