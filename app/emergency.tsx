import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addEmergencyContact, deleteEmergencyContact, hasPlusEntitlement, loadLiveDashboard, setEmergencyContactEnabled } from '@/src/lib/drabornpark';
import { palette, radius } from '@/src/theme';

export default function EmergencyScreen() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState(1);

  async function refresh() {
    try { setData(await loadLiveDashboard()); }
    catch { router.replace('/auth'); }
  }
  useEffect(() => { refresh(); }, []);

  const plus = data ? hasPlusEntitlement(data.profile, data.subscription) : false;

  async function add() {
    if (!plus) return Alert.alert('DraBornPark+ gerekli', 'Acil Durum Zinciri Plus kapsamındadır.');
    if (!name.trim()) return Alert.alert('İsim gerekli', 'Acil durumda ulaşılacak kişiyi adlandır.');
    setBusy(true);
    try {
      await addEmergencyContact({ name, phone, priority });
      setName(''); setPhone('');
      Alert.alert('Acil kişi eklendi', `Öncelik ${priority} olarak kaydedildi.`);
      await refresh();
    } catch (error: any) {
      Alert.alert('Eklenemedi', String(error?.message || 'İşlem başarısız.'));
    } finally { setBusy(false); }
  }

  async function toggle(id: string, value: boolean) {
    try { await setEmergencyContactEnabled(id, value); await refresh(); }
    catch (error: any) { Alert.alert('Güncellenemedi', String(error?.message || 'İşlem başarısız.')); }
  }

  async function remove(id: string) {
    try { await deleteEmergencyContact(id); await refresh(); }
    catch (error: any) { Alert.alert('Silinemedi', String(error?.message || 'İşlem başarısız.')); }
  }

  if (!data) return <SafeAreaView style={styles.safe}><View style={styles.loader}><ActivityIndicator color={palette.red} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <Header />
    <View style={styles.hero}><MaterialCommunityIcons name="alert-circle-outline" size={36} color={palette.red} /><Text style={styles.over}>DRABORNPARK+ • YÜKSEK ÖNCELİK</Text><Text style={styles.title}>Acil Durum Zinciri</Text><Text style={styles.sub}>Yüksek öncelikli bir olayda ana hedefe ulaşılamazsa tanımladığın kişilere öncelik sırasına göre geçilecek şekilde zincir oluştur.</Text></View>
    {!plus ? <View style={styles.locked}><MaterialCommunityIcons name="lock-outline" size={21} color={palette.yellow} /><Text style={styles.lockedText}>Kişi ekleme, kaldırma ve zinciri değiştirme için aktif Plus gerekir.</Text></View> : null}

    <View style={styles.form}>
      <Text style={styles.formTitle}>Acil kişi ekle</Text>
      <Text style={styles.label}>AD / ETİKET</Text><TextInput value={name} onChangeText={setName} placeholder="Eşim / Kardeşim" placeholderTextColor="#627087" style={styles.input} />
      <Text style={styles.label}>TELEFON</Text><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+90 5xx xxx xx xx" placeholderTextColor="#627087" style={styles.input} />
      <Text style={styles.label}>ÖNCELİK</Text><View style={styles.priorityRow}>{[1,2,3,4,5].map(item => <Pressable key={item} onPress={() => setPriority(item)} style={[styles.priority, priority === item && styles.priorityActive]}><Text style={[styles.priorityText, priority === item && { color: palette.red }]}>{item}</Text></Pressable>)}</View>
      <Pressable disabled={busy || !plus} onPress={add} style={[styles.cta, (busy || !plus) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color={palette.bg} /> : <><MaterialCommunityIcons name="account-plus-outline" size={20} color={palette.bg} /><Text style={styles.ctaText}>ACİL KİŞİYİ EKLE</Text></>}</Pressable>
    </View>

    <Text style={styles.section}>ZİNCİR SIRASI</Text>
    <View style={styles.owner}><View style={styles.orderBadge}><Text style={styles.orderText}>0</Text></View><MaterialCommunityIcons name="account" size={21} color={palette.cyan} /><View style={{ flex: 1 }}><Text style={styles.personTitle}>Araç sahibi</Text><Text style={styles.personSub}>Yüksek öncelikli olayın ilk hedefi</Text></View><Text style={styles.primary}>BİRİNCİL</Text></View>
    {data.emergencyContacts.length === 0 ? <Text style={styles.empty}>Henüz acil kişi eklenmedi.</Text> : data.emergencyContacts.map((item: any) => <View key={item.id} style={styles.person}><View style={styles.orderBadge}><Text style={styles.orderText}>{item.priority}</Text></View><View style={{ flex: 1 }}><Text style={styles.personTitle}>{item.contact_name}</Text><Text style={styles.personSub}>{item.phone_e164 || 'Telefon eklenmedi'} • Öncelik {item.priority}</Text></View><Switch value={item.is_enabled} onValueChange={value => toggle(item.id, value)} trackColor={{ true: '#6A3038' }} thumbColor={item.is_enabled ? palette.red : '#7D8798'} /><Pressable onPress={() => Alert.alert('Acil kişiyi sil', item.contact_name, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => remove(item.id) }])} style={styles.delete}><MaterialCommunityIcons name="trash-can-outline" size={17} color={palette.red} /></Pressable></View>)}

    <View style={styles.note}><MaterialCommunityIcons name="information-outline" size={19} color={palette.cyan} /><Text style={styles.noteText}>Zincir verisi ve öncelik mantığı sunucuda hazır. Expo Go, uygulama kapalıyken production remote push teslimatını test edemediği için gerçek kapalı-uygulama eskalasyonu development build katmanında doğrulanacaktır.</Text></View>
  </ScrollView></SafeAreaView>;
}

function Header() { return <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={27} color={palette.text} /></Pressable><Text style={styles.headerTitle}>Acil Durum Zinciri</Text><View style={{ width: 42 }} /></View>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: palette.bg }, scroll: { padding: 19, paddingBottom: 55 }, loader: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: palette.text, fontSize: 14, fontWeight: '900' }, hero: { marginTop: 22, borderRadius: radius.xl, borderWidth: 1, borderColor: '#5A2C33', backgroundColor: '#241217', padding: 20 }, over: { color: palette.red, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4, marginTop: 12 }, title: { color: palette.text, fontSize: 29, fontWeight: '900', letterSpacing: -1, marginTop: 5 }, sub: { color: '#B79AA0', fontSize: 11, lineHeight: 16, marginTop: 7 }, locked: { marginTop: 13, borderRadius: 17, borderWidth: 1, borderColor: '#514A25', backgroundColor: '#211F14', padding: 13, flexDirection: 'row', gap: 9 }, lockedText: { color: '#B9B286', fontSize: 10, lineHeight: 14, flex: 1 }, form: { marginTop: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.panel, padding: 15 }, formTitle: { color: palette.text, fontSize: 15, fontWeight: '900' }, label: { color: '#7E8A9F', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.1, marginTop: 13, marginBottom: 6 }, input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#27324A', backgroundColor: '#090E18', color: palette.text, paddingHorizontal: 13, fontSize: 12 }, priorityRow: { flexDirection: 'row', gap: 7 }, priority: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }, priorityActive: { borderColor: '#673139', backgroundColor: '#27151A' }, priorityText: { color: palette.muted, fontSize: 11, fontWeight: '900' }, cta: { height: 54, borderRadius: 16, backgroundColor: palette.red, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 18 }, ctaText: { color: palette.bg, fontSize: 9.5, fontWeight: '900' }, section: { color: palette.text, fontSize: 14, fontWeight: '900', marginTop: 23, marginBottom: 8 }, owner: { borderRadius: 16, borderWidth: 1, borderColor: '#244455', backgroundColor: '#0D1B23', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 5 }, person: { borderBottomWidth: 1, borderBottomColor: '#171F31', paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, orderBadge: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, borderColor: '#4A3036', alignItems: 'center', justifyContent: 'center' }, orderText: { color: palette.red, fontSize: 10, fontWeight: '900' }, personTitle: { color: palette.text, fontSize: 11.5, fontWeight: '900' }, personSub: { color: palette.muted, fontSize: 9, marginTop: 2 }, primary: { color: palette.cyan, fontSize: 7.5, fontWeight: '900' }, delete: { width: 35, height: 35, borderRadius: 11, borderWidth: 1, borderColor: '#4B2730', alignItems: 'center', justifyContent: 'center' }, empty: { color: palette.muted, fontSize: 10.5, paddingVertical: 8 }, note: { marginTop: 18, borderRadius: 17, borderWidth: 1, borderColor: '#214152', backgroundColor: '#0D1A21', padding: 13, flexDirection: 'row', gap: 9 }, noteText: { color: '#8EA7B4', fontSize: 9.5, lineHeight: 14, flex: 1 } });
