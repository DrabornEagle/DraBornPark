import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, IconBubble, SectionHeader } from '@/src/components/Primitives';
import { ParkSnapshot } from '@/src/screens/HomeDashboard';
import { palette, radius } from '@/src/theme';

export function ParkScreen({ park, hasPhoto, onGoCar, onIndoor, onPhoto, onReminder }: {
  park: ParkSnapshot;
  hasPhoto: boolean;
  onGoCar: () => void;
  onIndoor: () => void;
  onPhoto: () => void;
  onReminder: () => void;
}) {
  return (
    <>
      <View style={styles.hero}>
        <View style={styles.map}>
          <View style={[styles.road, { transform: [{ rotate: '24deg' }] }]} />
          <View style={[styles.road, { transform: [{ rotate: '-43deg' }] }]} />
          <View style={styles.ringLarge} /><View style={styles.ringSmall} />
          <View style={styles.pin}><MaterialCommunityIcons name="car-sports" size={27} color={palette.bg} /></View>
          <Text style={styles.mapLabel}>SON PARK</Text>
        </View>
        <Text style={styles.place}>{park.placeName}</Text>
        <Text style={styles.code}>{park.floor} • {park.zoneColor} • {park.row}{park.bay}</Text>
        <View style={styles.buttons}>
          <Pressable onPress={onGoCar} style={styles.primary}><MaterialCommunityIcons name="walk" size={18} color={palette.bg} /><Text style={styles.primaryText}>ARACIMA GİT</Text></Pressable>
          <Pressable onPress={onIndoor} style={styles.secondary}><MaterialCommunityIcons name="parking" size={18} color={palette.cyan} /><Text style={styles.secondaryText}>OTOPARK DETAYI</Text></Pressable>
        </View>
      </View>

      <SectionHeader title="Park Araçları" action="Basic + Plus" />
      <View style={styles.grid}>
        <Pressable onPress={onPhoto} style={styles.tool}><IconBubble icon={hasPhoto ? 'image-check' : 'camera-outline'} color={palette.pink} /><Text style={styles.toolTitle}>{hasPhoto ? 'Fotoğraf Hazır' : 'Park Fotoğrafı'}</Text><Text style={styles.toolBody}>Direk, tabela veya park numarasını sakla.</Text></Pressable>
        <Pressable onPress={onReminder} style={styles.tool}><IconBubble icon="timer-outline" color={palette.orange} /><Text style={styles.toolTitle}>Süre Hatırlat</Text><Text style={styles.toolBody}>Park süresi dolmadan önce bildirim oluştur.</Text></Pressable>
      </View>

      <SectionHeader title="Kapalı Otopark" action="İki aşamalı bulma" />
      <Card>
        <View style={styles.indoorRow}><View style={styles.indoorIcon}><MaterialCommunityIcons name="office-building-marker" size={24} color={palette.purple} /></View><View style={{ flex: 1 }}><Text style={styles.indoorTitle}>GPS’in bittiği yerde hafıza devam eder</Text><Text style={styles.indoorBody}>AVM girişine kadar rota, içeride kat + renk + sıra + park numarası ve fotoğrafla aracını bul.</Text></View></View>
        <View style={styles.indoorChips}><View style={styles.infoChip}><Text style={styles.infoChipTop}>KAT</Text><Text style={styles.infoChipValue}>{park.floor}</Text></View><View style={styles.infoChip}><Text style={styles.infoChipTop}>BÖLGE</Text><Text style={styles.infoChipValue}>{park.zoneColor}</Text></View><View style={styles.infoChip}><Text style={styles.infoChipTop}>PARK</Text><Text style={styles.infoChipValue}>{park.row}{park.bay}</Text></View></View>
      </Card>

      <SectionHeader title="Park Geçmişi" action="DraBornPark+" />
      {[
        ['Metromall AVM', 'P2 • Mavi • C128', palette.cyan],
        ['Ankamall', 'P1 • Turuncu • B42', palette.orange],
        ['Armada AVM', 'P3 • Yeşil • A18', palette.green]
      ].map(([name, detail, color], index) => (
        <View key={name} style={styles.history}><View style={[styles.dot, { backgroundColor: color }]} /><View style={{ flex: 1 }}><Text style={styles.historyName}>{index === 0 ? 'Bugün' : index === 1 ? 'Dün' : '17 Ağustos'} — {name}</Text><Text style={styles.historyDetail}>{detail}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color={palette.muted} /></View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#0D1725', borderWidth: 1, borderColor: '#203553', borderRadius: radius.xl, padding: 14 },
  map: { height: 215, overflow: 'hidden', borderRadius: 25, backgroundColor: '#0D2A31', alignItems: 'center', justifyContent: 'center' },
  road: { position: 'absolute', width: 430, height: 19, backgroundColor: '#173A43' },
  ringLarge: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: '#2F7481' },
  ringSmall: { position: 'absolute', width: 82, height: 82, borderRadius: 41, borderWidth: 1, borderColor: '#3B9AAD' },
  pin: { width: 50, height: 50, borderRadius: 18, backgroundColor: palette.cyan, alignItems: 'center', justifyContent: 'center' },
  mapLabel: { position: 'absolute', bottom: 14, color: '#83EFFF', fontWeight: '900', fontSize: 9.5, letterSpacing: 1.6 },
  place: { color: palette.text, fontSize: 21, fontWeight: '900', marginTop: 16 },
  code: { color: palette.cyan, fontSize: 12.5, fontWeight: '900', marginTop: 5 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primary: { minHeight: 49, flex: 1.1, borderRadius: 16, backgroundColor: palette.cyan, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: palette.bg, fontWeight: '900', fontSize: 10.5 },
  secondary: { minHeight: 49, flex: 1, borderRadius: 16, backgroundColor: palette.panel2, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: palette.text, fontWeight: '900', fontSize: 9.5 },
  grid: { flexDirection: 'row', gap: 10 },
  tool: { flex: 1, minHeight: 155, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 14 },
  toolTitle: { color: palette.text, fontWeight: '900', fontSize: 13.5, marginTop: 12 },
  toolBody: { color: palette.muted, fontSize: 10.5, lineHeight: 15, marginTop: 5 },
  indoorRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  indoorIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#241D38', alignItems: 'center', justifyContent: 'center' },
  indoorTitle: { color: palette.text, fontSize: 13.5, fontWeight: '900' },
  indoorBody: { color: palette.muted, fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  indoorChips: { flexDirection: 'row', gap: 8, marginTop: 14 },
  infoChip: { flex: 1, borderRadius: 15, backgroundColor: '#121A2A', borderWidth: 1, borderColor: '#25314A', padding: 11 },
  infoChipTop: { color: palette.muted, fontSize: 8.5, fontWeight: '900' },
  infoChipValue: { color: palette.cyan, fontWeight: '900', fontSize: 13, marginTop: 4 },
  history: { minHeight: 61, backgroundColor: palette.panel, borderBottomWidth: 1, borderBottomColor: palette.line, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  historyName: { color: palette.text, fontWeight: '800', fontSize: 11.5 },
  historyDetail: { color: palette.muted, fontSize: 9.5, marginTop: 3 }
});
