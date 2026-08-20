import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius } from '@/src/theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function GlowOrb({ color, size, top, left, right }: { color: string; size: number; top: number; left?: number; right?: number }) {
  const pulse = useRef(new Animated.Value(0.28)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.58, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.25, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View pointerEvents="none" style={[styles.orb, { backgroundColor: color, width: size, height: size, borderRadius: size / 2, top, left, right, opacity: pulse }]} />;
}

export function IconBubble({ icon, color, size = 44 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.iconBubble, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function Pill({ label, color = palette.cyan, icon }: { label: string; color?: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={13} color={color} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ActionCard({ icon, color, title, detail, onPress, disabled }: { icon: IconName; color: string; title: string; detail: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.actionCard, { borderColor: `${color}4D`, backgroundColor: `${color}12`, opacity: disabled ? 0.6 : pressed ? 0.82 : 1 }]}>
      <IconBubble icon={icon} color={color} />
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
      <MaterialCommunityIcons name="arrow-top-right" size={18} color={color} style={styles.actionArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute' },
  iconBubble: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { marginTop: 23, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: palette.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sectionAction: { color: palette.cyan, fontSize: 10, fontWeight: '800' },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontWeight: '900', fontSize: 9.5 },
  card: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 15 },
  actionCard: { width: '48.5%', minHeight: 155, borderWidth: 1, borderRadius: radius.lg, padding: 15 },
  actionTitle: { color: palette.text, fontSize: 14.5, fontWeight: '900', marginTop: 14 },
  actionDetail: { color: palette.muted, fontSize: 10.5, lineHeight: 15, marginTop: 5, paddingRight: 10 },
  actionArrow: { position: 'absolute', right: 12, top: 14 }
});
