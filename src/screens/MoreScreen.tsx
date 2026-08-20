import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DemoPayload } from '@/src/data';
import { IconBubble, IconName, Pill, SectionHeader } from '@/src/components/Primitives';
import { palette, radius } from '@/src/theme';

const features: Array<{ icon: IconName; title: string; detail: string; color: string; plus?: boolean }> = [
  { icon: 'account-group-outline', title: 'Family', detail: 'Aile araç ağı ve park paylaşımı', color: palette.purple, plus: true },
  { icon: 'account-switch-outline', title: 'Geçici Sürücü', detail: 'Süreli bildirim yönlendirme', color: palette.green, plus: true },
  { icon: 'car-key', title: 'Vale Modu', detail: 'Valeye özel geçici iletişim', color: palette.orange, plus: true },
  { icon: 'wrench-outline', title: 'Servis Modu', detail: 'Servis durumu ve mesajları', color: palette.blue, plus: true },
  { icon: 'account-clock-outline', title: 'Zaman Kuralları', detail: 'Saat bazlı yönlendirme', color: palette.pink, plus: true },
  { icon: 'alert-decagram-outline', title: 'Acil Zincir', detail: 'Aile ve acil kişilere kademeli ulaş', color: palette.red, plus: true },
  { icon: 'shield-lock-outline', title: 'Gizlilik', detail: 'Görünen araç alanlarını yönet', color: palette.cyan },
  { icon: 'nfc', title: 'Etiketlerim', detail: 'NFC + QR + devir yönetimi', color: palette.yellow }
];

export function MoreScreen({ demo, onOpenPlus, onDemoTag }: { demo: DemoPayload; onOpenPlus: () => void; onDemoTag: () => void }) {
  return (
    <>
      <View style={styles.account}>
        <View style={styles.avatar}><MaterialCommunityIcons name="account" size={29} color={palette.text} /></View>
        <View style={{ flex: 1 }}><Text style={styles.accountName}>{demo.profile.displayName}</Text><Text style={styles.accountSub}>DraBornPark hesabı • Gizlilik korumalı</Text></View>
        <Pill label={demo.profile.plan === 'PLUS_TRIAL' ? `PLUS • ${demo.profile.trialDaysLeft} GÜN` : demo.profile.plan} color={palette.yellow} icon="crown" />
      </View>

      <SectionHeader title="Araç Timeline" action="Olay günlüğü" />
      <View style={styles.timeline}>
        {demo.timeline.map((event, index) => (
          <View key={`${event.time}-${event.type}`} style={styles.timelineRow}>
            <View style={styles.rail}><View style={[styles.timelineDot, { backgroundColor: index === 0 ? palette.cyan : index === 1 ? palette.orange : palette.pink }]} />{index < demo.timeline.length - 1 ? <View style={styles.line} /> : null}</View>
            <View style={{ flex: 1, paddingBottom: 16 }}><Text style={styles.timelineTitle}>{event.title}</Text><Text style={styles.timelineDetail}>{event.detail}</Text><Text style={styles.timelineTime}>{event.time}</Text></View>
          </View>
        ))}
      </View>

      <SectionHeader title="DraBornPark Ağı" action="Modüller" />
      <View style={styles.grid}>
        {features.map((feature) => (
          <Pressable key={feature.title} onPress={() => feature.plus && onOpenPlus()} style={({ pressed }) => [styles.feature, pressed && { opacity: 0.82 }]}>
            {feature.plus ? <View style={styles.plusBadge}><Text style={styles.plusBadgeText}>PLUS</Text></View> : null}
            <IconBubble icon={feature.icon} color={feature.color} />
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureBody}>{feature.detail}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Etiket Testi" action="NFC + QR" />
      <Pressable onPress={onDemoTag} style={({ pressed }) => [styles.testTag, pressed && { opacity: 0.82 }]}>
        <View><Text style={styles.testOverline}>DEMO ETİKET</Text><Text style={styles.testCode}>DP-K7M4X2P9</Text><Text style={styles.testBody}>Dışarıdaki kişinin NFC/QR sonrası gördüğü güvenli iletişim ekranını aç.</Text></View>
        <View style={styles.scan}><MaterialCommunityIcons name="qrcode-scan" size={27} color={palette.cyan} /></View>
      </Pressable>

      <Pressable onPress={onOpenPlus} style={({ pressed }) => [styles.plusCard, pressed && { opacity: 0.84 }]}>
        <View style={styles.plusIcon}><MaterialCommunityIcons name="crown" size={27} color={palette.yellow} /></View>
        <View style={{ flex: 1 }}><Text style={styles.plusTitle}>DraBornPark+</Text><Text style={styles.plusBody}>49,99 TL / ay test fiyatı • Yıllık 399,99 TL • Etiket Basic özellikleri abonelik olmasa da çalışır.</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={25} color={palette.muted} />
      </Pressable>

      <View style={styles.nativeNotice}><MaterialCommunityIcons name="flask-outline" size={20} color={palette.yellow} /><Text style={styles.nativeText}>Expo Go testinde konum, web NFC/QR akışı ve uygulama UI’si çalışır. Remote push, Google Play Billing, VoIP, BLE background ve native NFC factory writer development build aşamasında etkinleşir.</Text></View>
    </>
  );
}

const styles = StyleSheet.create({
  account: { borderWidth: 1, borderColor: palette.line, backgroundColor: '#101625', borderRadius: radius.xl, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 51, height: 51, borderRadius: 18, backgroundColor: '#222A3C', borderWidth: 1, borderColor: '#35415D', alignItems: 'center', justifyContent: 'center' },
  accountName: { color: palette.text, fontSize: 16, fontWeight: '900' },
  accountSub: { color: palette.muted, fontSize: 9.5, marginTop: 4 },
  timeline: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 15 },
  timelineRow: { flexDirection: 'row', gap: 11 },
  rail: { width: 17, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { width: 1, flex: 1, backgroundColor: '#2C3852', marginVertical: 4 },
  timelineTitle: { color: palette.text, fontWeight: '900', fontSize: 12.5 },
  timelineDetail: { color: palette.muted, fontSize: 10.3, lineHeight: 14.5, marginTop: 3 },
  timelineTime: { color: '#66738C', fontSize: 9.2, marginTop: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  feature: { width: '48.5%', minHeight: 150, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.panel, borderRadius: radius.lg, padding: 14 },
  plusBadge: { position: 'absolute', right: 10, top: 10, borderRadius: 8, backgroundColor: '#34294A', paddingHorizontal: 6, paddingVertical: 3 },
  plusBadgeText: { color: palette.purple, fontSize: 7.8, fontWeight: '900' },
  featureTitle: { color: palette.text, fontSize: 13, fontWeight: '900', marginTop: 12 },
  featureBody: { color: palette.muted, fontSize: 10, lineHeight: 14.2, marginTop: 4 },
  testTag: { backgroundColor: '#0F222B', borderWidth: 1, borderColor: '#22505D', borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  testOverline: { color: palette.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  testCode: { color: palette.text, fontSize: 19, fontWeight: '900', marginTop: 4 },
  testBody: { color: palette.muted, fontSize: 10.2, maxWidth: 260, lineHeight: 14, marginTop: 4 },
  scan: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#12323C', alignItems: 'center', justifyContent: 'center' },
  plusCard: { marginTop: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: '#4D3A67', backgroundColor: '#221B34', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  plusIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#382F20', alignItems: 'center', justifyContent: 'center' },
  plusTitle: { color: palette.text, fontSize: 14, fontWeight: '900' },
  plusBody: { color: '#BDB1D4', fontSize: 9.8, lineHeight: 14, marginTop: 3 },
  nativeNotice: { marginTop: 14, borderRadius: radius.md, backgroundColor: '#211F14', borderWidth: 1, borderColor: '#49432A', padding: 13, flexDirection: 'row', gap: 10 },
  nativeText: { color: '#CFC59A', flex: 1, fontSize: 9.8, lineHeight: 14 }
});
