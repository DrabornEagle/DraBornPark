import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius, shadows, type } from '@/src/theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_ALIASES: Record<string, IconName> = {
  'car-plus': 'car-multiple',
  'car-alert': 'car-brake-alert',
  'shield-search-outline': 'shield-star-outline',
  'map-marker-heart-outline': 'map-marker-star-outline',
};

// Expo Vector Icons warns before rendering if a dynamic name is unknown. Some older
// Demo records can still carry legacy names, so register safe aliases globally and
// also validate every icon rendered through SafeIcon.
const materialGlyphMap = (MaterialCommunityIcons as any).glyphMap || {};
for (const [alias, target] of Object.entries(ICON_ALIASES)) {
  if (!materialGlyphMap[alias] && materialGlyphMap[target]) materialGlyphMap[alias] = materialGlyphMap[target];
}

export function safeIconName(icon?: string | null): IconName {
  const wanted = ICON_ALIASES[String(icon || '')] || String(icon || 'shape-outline');
  return (materialGlyphMap[wanted] ? wanted : 'shape-outline') as IconName;
}

export function SafeIcon({ name, size = 24, color = palette.text, style }: { name?: string | null; size?: number; color?: string; style?: any }) {
  const safe = useMemo(() => safeIconName(name), [name]);
  return <MaterialCommunityIcons name={safe} size={size} color={color} style={style}/>;
}

export function GlowOrb({ color, size, top, left, right }: { color: string; size: number; top: number; left?: number; right?: number }) {
  const pulse=useRef(new Animated.Value(.22)).current;
  const drift=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const a=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:.58,duration:2800,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(pulse,{toValue:.2,duration:2800,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));
    const b=Animated.loop(Animated.sequence([Animated.timing(drift,{toValue:1,duration:4600,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(drift,{toValue:0,duration:4600,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));
    a.start();b.start();return()=>{a.stop();b.stop()};
  },[pulse,drift]);
  return <Animated.View pointerEvents="none" style={[styles.orb,{backgroundColor:color,width:size,height:size,borderRadius:size/2,top,left,right,opacity:pulse,transform:[{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-12,14]})},{scale:pulse.interpolate({inputRange:[.2,.58],outputRange:[.96,1.05],extrapolate:'clamp'})}]}]}/>;
}

export function IconBubble({ icon, color, size=54 }: { icon:string;color:string;size?:number }) {
  return <View style={[styles.iconBubble,{width:size,height:size,borderRadius:Math.round(size*.33),backgroundColor:`${color}20`,borderColor:`${color}60`}]}><SafeIcon name={icon} size={size*.47} color={color}/><View style={[styles.iconDot,{backgroundColor:color}]}/></View>;
}

export function SectionHeader({ title, action, subtitle }: { title:string;action?:string;subtitle?:string }) {
  return <View style={styles.sectionHead}><View style={{flex:1}}><Text style={styles.sectionEyebrow}>DRABORNPARK</Text><Text style={styles.sectionTitle}>{title}</Text>{subtitle?<Text style={styles.sectionSub}>{subtitle}</Text>:null}</View>{action?<View style={styles.sectionActionWrap}><Text style={styles.sectionAction}>{action}</Text><SafeIcon name="arrow-right" size={16} color={palette.cyan}/></View>:null}</View>;
}

export function Pill({ label, color=palette.cyan, icon }: { label:string;color?:string;icon?:string }) {
  return <View style={[styles.pill,{borderColor:`${color}55`,backgroundColor:`${color}18`}]}>{icon?<SafeIcon name={icon} size={16} color={color}/>:null}<Text style={[styles.pillText,{color}]}>{label}</Text></View>;
}

export function Card({ children, style, accent }: { children:React.ReactNode;style?:ViewStyle|ViewStyle[];accent?:string }) {
  return <View style={[styles.card,style]}><View pointerEvents="none" style={[styles.cardLight,{backgroundColor:accent||palette.blue}]}/>{children}</View>;
}

export function ActionCard({ icon,color,title,detail,onPress,disabled,badge }: { icon:string;color:string;title:string;detail:string;onPress:()=>void;disabled?:boolean;badge?:string }) {
  const scale=useRef(new Animated.Value(1)).current;
  const move=(to:number)=>Animated.spring(scale,{toValue:to,useNativeDriver:true,speed:28,bounciness:4}).start();
  return <Animated.View style={{width:'48.5%',transform:[{scale}]}}><Pressable disabled={disabled} onPress={onPress} onPressIn={()=>move(.972)} onPressOut={()=>move(1)} style={[styles.actionCard,{borderColor:`${color}52`,backgroundColor:`${color}12`,opacity:disabled?.42:1}]}><View pointerEvents="none" style={[styles.actionGlow,{backgroundColor:`${color}20`}]}/><View style={styles.actionTop}><IconBubble icon={icon} color={color}/>{badge?<Pill label={badge} color={color}/>:<View style={[styles.arrow,{borderColor:`${color}46`}]}><SafeIcon name="arrow-top-right" size={19} color={color}/></View>}</View><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text><View style={[styles.actionLine,{backgroundColor:color}]}/></Pressable></Animated.View>;
}

export function MetricChip({ icon,color,value,label }: { icon:string;color:string;value:string;label:string }) {
  return <View style={[styles.metric,{borderColor:`${color}48`,backgroundColor:`${color}0F`}]}><SafeIcon name={icon} size={21} color={color}/><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles=StyleSheet.create({
  orb:{position:'absolute'},
  iconBubble:{borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},iconDot:{position:'absolute',width:7,height:7,borderRadius:4,right:7,top:7},
  sectionHead:{marginTop:30,marginBottom:14,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12},sectionEyebrow:{color:palette.aqua,fontSize:type.micro,fontWeight:'900',letterSpacing:1.35,marginBottom:4},sectionTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',letterSpacing:-.6},sectionSub:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:5},sectionActionWrap:{borderWidth:1,borderColor:palette.line,backgroundColor:palette.glass,paddingHorizontal:12,paddingVertical:9,borderRadius:999,flexDirection:'row',alignItems:'center',gap:6},sectionAction:{color:palette.cyan,fontSize:type.micro,fontWeight:'900'},
  pill:{borderWidth:1,borderRadius:999,paddingHorizontal:11,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6},pillText:{fontWeight:'900',fontSize:type.micro,letterSpacing:.2},
  card:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.lineSoft,borderRadius:radius.lg,padding:18,overflow:'hidden',...shadows.soft},cardLight:{position:'absolute',width:190,height:190,borderRadius:95,right:-95,top:-115,opacity:.11},
  actionCard:{width:'100%',minHeight:190,borderWidth:1,borderRadius:28,padding:17,overflow:'hidden',...shadows.soft},actionGlow:{position:'absolute',width:170,height:170,borderRadius:85,right:-78,top:-82},actionTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},arrow:{width:38,height:38,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},actionTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:17,lineHeight:24},actionDetail:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:7,paddingRight:6},actionLine:{position:'absolute',left:17,right:17,bottom:0,height:4,borderRadius:2},
  metric:{flex:1,minHeight:106,borderRadius:21,borderWidth:1,padding:13,justifyContent:'space-between'},metricValue:{color:palette.text,fontSize:21,fontWeight:'900',marginTop:8},metricLabel:{color:palette.muted,fontSize:type.caption,fontWeight:'700'},
});
