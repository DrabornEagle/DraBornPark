import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bootstrapProfile } from '@/src/lib/drabornpark';
import { supabase } from '@/src/lib/supabase';
import { palette, radius } from '@/src/theme';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Bilgileri kontrol et', 'Geçerli bir e-posta ve en az 6 karakterlik parola gir.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        await bootstrapProfile();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      } else {
        const name = displayName.trim() || email.split('@')[0];
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          await bootstrapProfile(name);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/');
        } else {
          Alert.alert('E-postanı doğrula', 'Hesap oluşturuldu. Supabase e-posta doğrulaması açıksa gelen bağlantıyı onayladıktan sonra giriş yapabilirsin.');
          setMode('login');
        }
      }
    } catch (error: any) {
      Alert.alert('İşlem tamamlanamadı', error?.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={28} color={palette.text} /></Pressable>
          <View style={styles.brandIcon}><MaterialCommunityIcons name="shield-car" size={38} color={palette.cyan} /></View>
          <Text style={styles.brand}>DraBornPark</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Aracına güvenli şekilde bağlan' : 'DraBornPark hesabını oluştur'}</Text>
          <Text style={styles.subtitle}>Telefon numaran araç üzerinde görünmez. NFC + QR, park hafızası ve araç olayları tek hesapta kalır.</Text>

          <View style={styles.tabs}>
            <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.tabActive]}><Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>GİRİŞ YAP</Text></Pressable>
            <Pressable onPress={() => setMode('signup')} style={[styles.tab, mode === 'signup' && styles.tabActive]}><Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>HESAP OLUŞTUR</Text></Pressable>
          </View>

          <View style={styles.form}>
            {mode === 'signup' ? <View><Text style={styles.label}>GÖRÜNEN AD</Text><TextInput value={displayName} onChangeText={setDisplayName} placeholder="Örn. Doğancan" placeholderTextColor="#58647B" style={styles.input} /></View> : null}
            <View><Text style={styles.label}>E-POSTA</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="ornek@mail.com" placeholderTextColor="#58647B" style={styles.input} /></View>
            <View><Text style={styles.label}>PAROLA</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" placeholderTextColor="#58647B" style={styles.input} /></View>
            <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.cta, (pressed || busy) && { opacity: 0.7 }]}>{busy ? <ActivityIndicator color={palette.bg} /> : <><MaterialCommunityIcons name="shield-check" size={21} color={palette.bg} /><Text style={styles.ctaText}>{mode === 'login' ? 'GÜVENLİ GİRİŞ YAP' : 'HESABIMI OLUŞTUR'}</Text></>}</Pressable>
          </View>

          {mode === 'signup' ? <View style={styles.trial}><MaterialCommunityIcons name="crown" size={23} color={palette.yellow} /><View style={{ flex: 1 }}><Text style={styles.trialTitle}>14 Gün DraBornPark+ Hediye</Text><Text style={styles.trialBody}>Yeni hesap ilk aktivasyonda Plus denemesine hazırdır. Basic etiket işlevleri abonelik sona erse de kapanmaz.</Text></View></View> : null}
          <View style={styles.privacy}><MaterialCommunityIcons name="lock-outline" size={18} color={palette.green} /><Text style={styles.privacyText}>Telefon, e-posta, tam ad ve park geçmişi QR/NFC ziyaretçisine gösterilmez.</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { padding: 22, paddingBottom: 50 },
  back: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  brandIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#0B2933', borderWidth: 1, borderColor: '#1B5361', alignItems: 'center', justifyContent: 'center' },
  brand: { color: palette.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 2.3, marginTop: 16 },
  title: { color: palette.text, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -1.1, marginTop: 7, maxWidth: 360 },
  subtitle: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 11, maxWidth: 390 },
  tabs: { flexDirection: 'row', backgroundColor: palette.panel, borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, padding: 5, marginTop: 27 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
  tabActive: { backgroundColor: '#17313A', borderWidth: 1, borderColor: '#285966' },
  tabText: { color: palette.muted, fontSize: 10, fontWeight: '900' },
  tabTextActive: { color: palette.cyan },
  form: { marginTop: 15, gap: 15, padding: 17, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.panel },
  label: { color: '#7E8DA8', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 },
  input: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: '#26334D', backgroundColor: '#090E19', color: palette.text, paddingHorizontal: 14, fontSize: 14 },
  cta: { height: 55, borderRadius: 17, backgroundColor: palette.cyan, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 3 },
  ctaText: { color: palette.bg, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  trial: { marginTop: 15, borderRadius: radius.lg, borderWidth: 1, borderColor: '#4C4424', backgroundColor: '#201E13', padding: 15, flexDirection: 'row', gap: 11 },
  trialTitle: { color: palette.yellow, fontSize: 13, fontWeight: '900' },
  trialBody: { color: '#BFB996', fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  privacy: { marginTop: 15, flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 4 },
  privacyText: { color: '#7FA897', fontSize: 10.5, lineHeight: 15, flex: 1 },
});
