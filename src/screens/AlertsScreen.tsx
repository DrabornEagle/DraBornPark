import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DemoPayload } from '@/src/data';
import { IconBubble, Pill, SectionHeader } from '@/src/components/Primitives';
import { palette, radius } from '@/src/theme';

const replies = ['Geliyorum', '2 dakika', '5 dakika', '10 dakika', 'Şu anda hareket ettiremiyorum', 'Güvenliğe bilgi verebilirsiniz', 'Teşekkür ederim'];

export function AlertsScreen({ demo, selectedId, reply, onSelect, onReplyChange, onQuickReply, onSendReply }: {
  demo: DemoPayload;
  selectedId: string | null;
  reply: string;
  onSelect: (id: string) => void;
  onReplyChange: (value: string) => void;
  onQuickReply: (value: string) => void;
  onSendReply: () => void;
}) {
  const selected = demo.notifications.find((item) => item.id === selectedId);
  return (
    <>
      <View style={styles.privacy}>
        <View style={styles.privacyIcon}><MaterialCommunityIcons name="shield-lock" size={22} color={palette.green} /></View>
        <View style={{ flex: 1 }}><Text style={styles.privacyTitle}>Numaran paylaşılmadan iletişim kur</Text><Text style={styles.privacyBody}>Telefon, e-posta ve gerçek ad varsayılan olarak iki tarafa da gösterilmez.</Text></View>
      </View>

      <SectionHeader title="Bildirimler" action="Araç olayları" />
      {demo.notifications.map((item) => {
        const active = item.id === selectedId;
        const color = item.priority === 'emergency' ? palette.red : item.priority === 'high' ? palette.orange : palette.cyan;
        return (
          <Pressable key={item.id} onPress={() => onSelect(item.id)} style={({ pressed }) => [styles.notification, active && styles.notificationActive, pressed && { opacity: 0.82 }]}>
            <IconBubble icon={item.priority === 'emergency' ? 'alert-octagon-outline' : item.priority === 'high' ? 'alert-outline' : 'message-alert-outline'} color={color} size={42} />
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}><Text style={styles.title}>{item.title}</Text>{!item.seen ? <Pill label="YENİ" color={palette.red} /> : null}</View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{item.minutesAgo} dakika önce</Text>
            </View>
            <MaterialCommunityIcons name={active ? 'chevron-up' : 'chevron-down'} size={20} color={palette.muted} />
          </Pressable>
        );
      })}

      {selected ? (
        <View style={styles.replyPanel}>
          <View style={styles.replyHead}><View><Text style={styles.replyOverline}>ANONİM HIZLI CEVAP</Text><Text style={styles.replyTitle}>Araç sahibinden yanıt</Text></View><MaterialCommunityIcons name="incognito" size={28} color={palette.purple} /></View>
          <View style={styles.chips}>
            {replies.map((value) => <Pressable key={value} onPress={() => onQuickReply(value)} style={styles.chip}><Text style={styles.chipText}>{value}</Text></Pressable>)}
          </View>
          <TextInput value={reply} onChangeText={onReplyChange} placeholder="Kısa bir yanıt yaz..." placeholderTextColor="#64728C" style={styles.input} maxLength={240} />
          <Pressable disabled={!reply.trim()} onPress={onSendReply} style={({ pressed }) => [styles.send, (!reply.trim() || pressed) && { opacity: 0.6 }]}><MaterialCommunityIcons name="send" size={17} color={palette.bg} /><Text style={styles.sendText}>ANONİM YANIT GÖNDER</Text></Pressable>
          <Text style={styles.sessionNote}>DraBornPark Live oturumu süre sonunda otomatik kapanacak. Kişisel iletişim bilgileri paylaşılmaz.</Text>
        </View>
      ) : (
        <View style={styles.empty}><MaterialCommunityIcons name="gesture-tap" size={25} color={palette.muted} /><Text style={styles.emptyText}>Hazır cevapları görmek için bir bildirime dokun.</Text></View>
      )}

      <SectionHeader title="Güvenlik Katmanı" action="DraBorn AI" />
      <View style={styles.safetyGrid}>
        <View style={styles.safetyCard}><IconBubble icon="message-lock-outline" color={palette.purple} /><Text style={styles.safetyTitle}>Mesaj filtresi</Text><Text style={styles.safetyBody}>Küfür, hakaret, telefon/e-posta ve saldırgan metinler nötrleştirilir.</Text></View>
        <View style={styles.safetyCard}><IconBubble icon="shield-refresh-outline" color={palette.green} /><Text style={styles.safetyTitle}>Spam koruması</Text><Text style={styles.safetyBody}>IP, cihaz ve istek hızına göre kötüye kullanım sınırlandırılır.</Text></View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  privacy: { backgroundColor: '#10271F', borderWidth: 1, borderColor: '#26543E', borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 11, alignItems: 'center' },
  privacyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#163526', alignItems: 'center', justifyContent: 'center' },
  privacyTitle: { color: palette.green, fontWeight: '900', fontSize: 13 },
  privacyBody: { color: '#9DCCB9', fontSize: 10.4, lineHeight: 14.5, marginTop: 3 },
  notification: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 13, flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 9 },
  notificationActive: { borderColor: '#3C6982', backgroundColor: '#101A27' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: palette.text, fontSize: 12.8, fontWeight: '900', flexShrink: 1 },
  body: { color: palette.muted, fontSize: 10.5, lineHeight: 14.5, marginTop: 4 },
  time: { color: '#66738B', fontSize: 9.3, marginTop: 6 },
  replyPanel: { marginTop: 5, backgroundColor: '#11182A', borderWidth: 1, borderColor: '#2A3959', borderRadius: radius.lg, padding: 15 },
  replyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  replyOverline: { color: palette.purple, fontSize: 8.8, fontWeight: '900', letterSpacing: 1.2 },
  replyTitle: { color: palette.text, fontSize: 15.5, fontWeight: '900', marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 11 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#18263A', borderWidth: 1, borderColor: '#2D4668', borderRadius: 12 },
  chipText: { color: '#D2EBF2', fontWeight: '700', fontSize: 10 },
  input: { minHeight: 48, backgroundColor: '#090E18', color: palette.text, borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, fontSize: 12 },
  send: { minHeight: 48, backgroundColor: palette.cyan, borderRadius: 15, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  sendText: { color: palette.bg, fontWeight: '900', fontSize: 10.5 },
  sessionNote: { color: palette.muted, fontSize: 9.3, lineHeight: 13.5, marginTop: 10, textAlign: 'center' },
  empty: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.line, borderRadius: radius.lg },
  emptyText: { color: palette.muted, fontSize: 10.5 },
  safetyGrid: { flexDirection: 'row', gap: 10 },
  safetyCard: { flex: 1, minHeight: 160, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, backgroundColor: palette.panel, padding: 14 },
  safetyTitle: { color: palette.text, fontSize: 13, fontWeight: '900', marginTop: 12 },
  safetyBody: { color: palette.muted, fontSize: 10.2, lineHeight: 14.5, marginTop: 5 }
});
