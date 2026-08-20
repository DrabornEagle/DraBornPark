import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius } from '@/src/theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function GlowOrb({ color, size, top, left, right }: { color: string; size: number; top: number; left?: number; right?: number }) {
  const pulse = useRef(new Animated.Value(0.2)).current;
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const opacityLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.48, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.18, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ]));
    const floatLoop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ]));
    opacityLoop.start(); floatLoop.start();
    return () => { opacityLoop.stop(); floatLoop.stop(); };
  }, [pulse,float]);
  return <Animated.View pointerEvents="none" style={[styles.orb, { backgroundColor: color, width: size, height: size, borderRadius: size / 2, top, left, right, opacity: pulse, transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[-8,10]})}] }]} />;
}

export function IconBubble({ icon, color, size = 46 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.iconBubble, { width: size, height: size, borderRadius: Math.round(size * .34), backgroundColor: `${color}18`, borderColor: `${color}50` }]}>
      <MaterialCommunityIcons name={icon} size={size * 0.48} color={color} />
      <View style={[styles.iconDot,{backgroundColor:color}]}/>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHead}>
      <View><Text style={styles.sectionEyebrow}>DRABORNPARK</Text><Text style={styles.sectionTitle}>{title}</Text></View>
      {action ? <View style={styles.sectionActionWrap}><Text style={styles.sectionAction}>{action}</Text></View> : null}
    </View>
  );
}

export function Pill({ label, color = palette.cyan, icon }: { label: string; color?: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={13} color={color} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}><View pointerEvents="none" style={styles.cardAccent}/>{children}</View>;
}

export function ActionCard({ icon, color, title, detail, onPress, disabled }: { icon: IconName; color: string; title: string; detail: string; onPress: () => void; disabled?: boolean }) {
  const scale=useRef(new Animated.Value(1)).current;
  const press=(to:number)=>Animated.spring(scale,{toValue:to,useNativeDriver:true,speed:28,bounciness:5}).start();
  return (
    <Animated.View style={{width:'48.6%',transform:[{scale}]}}>
      <Pressable disabled={disabled} onPress={onPress} onPressIn={()=>press(.97)} onPressOut={()=>press(1)} style={[styles.actionCard, { borderColor: `${color}3D`, backgroundColor: `${color}0D`, opacity: disabled ? 0.48 : 1 }]}>
        <View pointerEvents="none" style={[styles.actionAmbient,{backgroundColor:`${color}18`}]}/>
        <View style={styles.actionTop}><IconBubble icon={icon} color={color} /><View style={[styles.actionArrowBox,{borderColor:`${color}35`}]}><MaterialCommunityIcons name="arrow-top-right" size={16} color={color}/></View></View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
        <View style={[styles.actionLine,{backgroundColor:color}]}/>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute' },
  iconBubble: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow:'hidden' },
  iconDot:{position:'absolute',right:6,top:6,width:4,height:4,borderRadius:2,opacity:.85},
  sectionHead: { marginTop: 25, marginBottom: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow:{color:palette.muted2,fontSize:6.8,fontWeight:'900',letterSpacing:1.3,marginBottom:3},
  sectionTitle: { color: palette.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.45 },
  sectionActionWrap:{borderWidth:1,borderColor:'#235366',backgroundColor:'#0B202A',paddingHorizontal:9,paddingVertical:5,borderRadius:999},
  sectionAction: { color: palette.cyan, fontSize: 7.8, fontWeight: '900',letterSpacing:.5 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontWeight: '900', fontSize: 8.5,letterSpacing:.25 },
  card: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: radius.lg, padding: 15,overflow:'hidden' },
  cardAccent:{position:'absolute',width:90,height:90,borderRadius:45,backgroundColor:'#193450',opacity:.12,right:-35,top:-40},
  actionCard: { width:'100%', minHeight: 154, borderWidth: 1, borderRadius: 22, padding: 14,overflow:'hidden' },
  actionAmbient:{position:'absolute',width:110,height:110,borderRadius:55,right:-52,top:-48},
  actionTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  actionArrowBox:{width:31,height:31,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center'},
  actionTitle: { color: palette.text, fontSize: 13.5, fontWeight: '900', marginTop: 13,letterSpacing:-.15 },
  actionDetail: { color: palette.muted, fontSize: 9.2, lineHeight: 13.5, marginTop: 4, paddingRight: 7 },
  actionLine:{position:'absolute',height:3,borderRadius:2,left:14,right:14,bottom:0,opacity:.75}
});
