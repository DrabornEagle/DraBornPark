import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createRoutingRule, deleteRoutingRule, hasPlusEntitlement, loadLiveDashboard, setRoutingRuleEnabled } from '@/src/lib/drabornpark';
import { palette, radius } from '@/src/theme';

const dayOptions = [
  { id: 1, label: 'Pzt' }, { id: 2, label: 'Sal' }, { id: 3, label: 'Çar' }, { id: 4, label: 'Per' }, { id: 5, label: 'Cum' }, { id: 6, label: 'Cmt' }, { id: 7, label: 'Paz' },
];

export default function RoutingScreen() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('Hafta içi gündüz');
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [targetType, setTargetType] = useState<'owner' | 'family'>('owner');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  async function refresh() {
    try {
      const next = await loadLiveDashboard();
      setData(next);
      if (vehicleId === null && next.vehicles[0]) setVehicleId(next.vehicles[0].id);
    } catch {
      router.replace('/auth');
    }
  }
  useEffect(() => { refresh(); }, []);

  const plus = data ? hasPlusEntitlement(data.profile, data.subscription) : false;
  const selectableFamily = useMemo(() => data?.family?.filter((item: any) => item.member_user_id && item.status === 'active') ?? [], [data]);

  async function save() {
    if (!plus) return Alert.alert('DraBornPark+ gerekli', 'Zaman Kuralları Plus kapsamındadır.');
    if (!name.trim()) return Alert.alert('Kural adı gerekli');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) return Alert.alert('Saat biçimi', 'Saatleri 08:00 gibi HH:MM biçiminde gir.');
    if (!days.length) return Alert.alert('En az bir gün seç');
    if (targetType === 'family' && !targetUserId) return Alert.alert('Aile üyesi seç', 'Aktif ve hesabı eşleşmiş bir aile üyesi seçmelisin.');
    setBusy(true);
    try {
      await createRoutingRule({ vehicleId, ruleName: name, daysOfWeek: days, startTime, endTime, targetType, targetUserId: targetType === 'family' ? targetUserId : null });
      Alert.alert('Kural kaydedildi', 'Bildirim yönlendirme kuralın aktif edildi.');
      await refresh();
    } catch (error: any) {
      Alert.alert('Kural oluşturulamadı', String(error?.message || 'İşlem başarısız.'));
    } finally { setBusy(false); }
  }

  async function toggleRule(id: string, enabled: boolean) {
    try { await setRoutingRuleEnabled(id, enabled); await refresh(); }
    catch (error: any) { Alert.alert('Güncellenemedi', String(error?.message || 'İşlem başarısız.')); }
  }

  async function removeRule(id: string) {
    try { await deleteRoutingRule(id); await refresh(); }
    catch (error: any) { Alert.alert('Silinemedi', String(error?.message || 'İşlem başarısız.')); }
  }

  if (!data) return <SafeAreaView style={styles.safe}><View style={styles.loader}><ActivityIndicator color={palette.pink} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <Header />
    <Text style={styles.over}>DRABORNPARK+ • AKILLI YÖNLENDİRME</Text>
    <Text style={styles.title}>Zaman Kuralları</Text>
    <Text style={styles.sub}>Belirli gün ve saatlerde araç bildirimlerinin hangi hesap sahibine veya aile üyesine yönlendirileceğini tanımla.</Text>

    {!plus ? <Locked /> : null}

    <View style={styles.form}>
      <Text style={styles.formTitle}>Yeni yönlendirme kuralı</Text>
      <Label text="KURAL ADI" /><TextInput value={name} onChangeText={setName} placeholder="Hafta içi gündüz" placeholderTextColor="#627087" style={styles.input} />
      <Label text="ARAÇ" /><View style={styles.chips}><Pressable onPress={() => setVehicleId(null)} style={[styles.chip, vehicleId === null && styles.activeChip]}><Text style={[styles.chipText, vehicleId === null && styles.activeText]}>TÜM ARAÇLAR</Text></Pressable>{data.vehicles.map((vehicle: any) => <Pressable key={vehicle.id} onPress={() => setVehicleId(vehicle.id)} style={[styles.chip, vehicleId === vehicle.id && styles.activeChip]}><Text style={[styles.chipText, vehicleId === vehicle.id && styles.activeText]}>{vehicle.vehicle_name}</Text></Pressable>)}</View>
      <Label text="GÜNLER" /><View style={styles.dayRow}>{dayOptions.map(day => { const active = days.includes(day.id); return <Pressable key={day.id} onPress={() => setDays(current => active ? current.filter(item => item !== day.id) : [...current, day.id].sort())} style={[styles.day, active && styles.dayActive]}><Text style={[styles.dayText, active && { color: palette.pink }]}>{day.label}</Text></Pressable>; })}</View>
      <View style={styles.timeRow}><View style={{ flex: 1 }}><Label text="BAŞLANGIÇ" /><TextInput value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation" placeholder="08:00" placeholderTextColor="#627087" style={styles.input} /></View><View style={{ flex: 1 }}><Label text="BİTİŞ" /><TextInput value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation" placeholder="18:00" placeholderTextColor="#627087" style={styles.input} /></View></View>
      <Label text="HEDEF" /><View style={styles.targetRow}><Pressable onPress={() => { setTargetType('owner'); setTargetUserId(null); }} style={[styles.target, targetType === 'owner' && styles.targetActive]}><MaterialCommunityIcons name="account" size={20} color={targetType === 'owner' ? palette.pink : palette.muted} /><Text style={[styles.targetText, targetType === 'owner' && { color: palette.pink }]}>ARAÇ SAHİBİ</Text></Pressable><Pressable disabled={!selectableFamily.length} onPress={() => setTargetType('family')} style={[styles.target, targetType === 'family' && styles.targetActive, !selectableFamily.length && { opacity: 0.4 }]}><MaterialCommunityIcons name="account-group-outline" size={20} color={targetType === 'family' ? palette.pink : palette.muted} /><Text style={[styles.targetText, targetType === 'family' && { color: palette.pink }]}>AİLE ÜYESİ</Text></Pressable></View>
      {targetType === 'family' ? <View style={styles.chips}>{selectableFamily.map((member: any) => <Pressable key={member.id} onPress={() => setTargetUserId(member.member_user_id)} style={[styles.chip, targetUserId === member.member_user_id && styles.activeChip]}><Text style={[styles.chipText, targetUserId === member.member_user_id && styles.activeText]}>{member.display_name || member.invite_email}</Text></Pressable>)}</View> : null}
      <Pressable disabled={busy || !plus} onPress={save} style={[styles.cta, (busy || !plus) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color={palette.bg} /> : <><MaterialCommunityIcons name="clock-check-outline" size={20} color={palette.bg} /><Text style={styles.ctaText}>KURALI KAYDET</Text></>}</Pressable>
    </View>

    <Text style={styles.section}>AKTİF KURALLAR</Text>
    {data.routingRules.length === 0 ? <Text style={styles.empty}>Henüz yönlendirme kuralın yok.</Text> : data.routingRules.map((rule: any) => <View key={rule.id} style={styles.rule}><View style={{ flex: 1 }}><Text style={styles.ruleTitle}>{rule.rule_name}</Text><Text style={styles.ruleSub}>{formatDays(rule.days_of_week)} • {String(rule.start_time).slice(0, 5)}–{String(rule.end_time).slice(0, 5)} • {rule.target_type === 'owner' ? 'Araç sahibi' : 'Aile üyesi'}</Text></View><Switch value={rule.is_enabled} onValueChange={value => toggleRule(rule.id, value)} trackColor={{ true: '#6A3150' }} thumbColor={rule.is_enabled ? palette.pink : '#7D8798'} /><Pressable onPress={() => Alert.alert('Kuralı sil', rule.rule_name, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => removeRule(rule.id) }])} style={styles.delete}><MaterialCommunityIcons name="trash-can-outline" size={18} color={palette.red} /></Pressable></View>)}
  </ScrollView></SafeAreaView>;
}

function formatDays(days: number[]) { return dayOptions.filter(day => days?.includes(day.id)).map(day => day.label).join(', '); }
function Header() { return <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={27} color={palette.text} /></Pressable><Text style={styles.headerTitle}>Zaman Kuralları</Text><View style={{ width: 42 }} /></View>; }
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Locked() { return <View style={styles.locked}><MaterialCommunityIcons name="lock-outline" size={21} color={palette.yellow} /><Text style={styles.lockedText}>Kural ekleme ve değiştirme için aktif DraBornPark+ gerekir. Mevcut kuralların geçmişi görünmeye devam eder.</Text></View>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: palette.bg }, scroll: { padding: 19, paddingBottom: 55 }, loader: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: palette.text, fontSize: 14, fontWeight: '900' }, over: { color: palette.pink, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4, marginTop: 25 }, title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.1, marginTop: 6 }, sub: { color: palette.muted, fontSize: 11.5, lineHeight: 17, marginTop: 8 }, locked: { marginTop: 15, borderRadius: 17, borderWidth: 1, borderColor: '#514A25', backgroundColor: '#211F14', padding: 13, flexDirection: 'row', gap: 9 }, lockedText: { color: '#B9B286', fontSize: 10, lineHeight: 14, flex: 1 }, form: { marginTop: 17, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.panel, padding: 15 }, formTitle: { color: palette.text, fontSize: 15, fontWeight: '900' }, label: { color: '#7E8A9F', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.1, marginTop: 14, marginBottom: 6 }, input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#27324A', backgroundColor: '#090E18', color: palette.text, paddingHorizontal: 13, fontSize: 12 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderRadius: 12, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 10, paddingVertical: 9 }, activeChip: { borderColor: '#6B3454', backgroundColor: '#271522' }, chipText: { color: palette.muted, fontSize: 8.5, fontWeight: '800' }, activeText: { color: palette.pink }, dayRow: { flexDirection: 'row', gap: 6 }, day: { flex: 1, height: 38, borderRadius: 11, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }, dayActive: { borderColor: '#67324F', backgroundColor: '#261521' }, dayText: { color: palette.muted, fontSize: 8.5, fontWeight: '900' }, timeRow: { flexDirection: 'row', gap: 9 }, targetRow: { flexDirection: 'row', gap: 8 }, target: { flex: 1, height: 65, borderRadius: 15, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center', gap: 5 }, targetActive: { borderColor: '#6B3454', backgroundColor: '#271522' }, targetText: { color: palette.muted, fontSize: 8.5, fontWeight: '900' }, cta: { height: 54, borderRadius: 16, backgroundColor: palette.pink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 18 }, ctaText: { color: palette.bg, fontSize: 9.5, fontWeight: '900' }, section: { color: palette.text, fontSize: 14, fontWeight: '900', marginTop: 23, marginBottom: 8 }, empty: { color: palette.muted, fontSize: 10.5 }, rule: { borderBottomWidth: 1, borderBottomColor: '#171F31', paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, ruleTitle: { color: palette.text, fontSize: 11.5, fontWeight: '900' }, ruleSub: { color: palette.muted, fontSize: 8.8, lineHeight: 13, marginTop: 3 }, delete: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#4A2730', alignItems: 'center', justifyContent: 'center' } });
