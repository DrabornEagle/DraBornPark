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
    const a=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:.62,duration:2700,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(pulse,{toValue:.2,duration:2700,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));
    const b=Animated.loop(Animated.sequence([Animated.timing(drift,{toValue:1,duration:4600,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(drift,{toValue:0,duration:4600,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));
    a.start();b.start();return()=>{a.stop();b.stop()};
  },[pulse,drift]);
  return <Animated.View pointerEvents="none" style={[styles.orb,{backgroundColor:color,width:size,height:size,borderRadius:size/2,top,left,right,opacity:pulse,transform:[{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-12,14]})},{scale:pulse.interpolate({inputRange:[.2,.62],outputRange:[.96,1.07],extrapolate:'clamp'})}]}]}/>;
}

export function IconBubble({ icon, color, size=54 }: { icon:string;color:string;size?:number }) {
  return <View style={[styles.iconBubble,{width:size,height:size,borderRadius:Math.round(size*.33),backgroundColor:`${color}24`,borderColor:`${color}72`}]}><View pointerEvents="none" style={[styles.iconHalo,{backgroundColor:`${color}16`}]} /><SafeIcon name={icon} size={size*.47} color={color}/><View style={[styles.iconDot,{backgroundColor:color}]}/></View>;
}

export function SectionHeader({ title, action, subtitle }: { title:string;action?:string;subtitle?:string }) {
  return <View style={styles.sectionHead}><View style={{flex:1}}><Text style={styles.sectionEyebrow}>DRABORNPARK</Text><Text style={styles.sectionTitle}>{title}</Text>{subtitle?<Text style={styles.sectionSub}>{subtitle}</Text>:null}</View>{action?<View style={styles.sectionActionWrap}><Text style={styles.sectionAction}>{action}</Text><SafeIcon name="arrow-right" size={16} color={palette.cyan}/></View>:null}</View>;
}

export function Pill({ label, color=palette.cyan, icon }: { label:string;color?:string;icon?:string }) {
  return <View style={[styles.pill,{borderColor:`${color}62`,backgroundColor:`${color}1B`}]}>{icon?<SafeIcon name={icon} size={16} color={color}/>:null}<Text style={[styles.pillText,{color}]}>{label}</Text></View>;
}

export function Card({ children, style, accent }: { children:React.ReactNode;style?:ViewStyle|ViewStyle[];accent?:string }) {
  const color=accent||palette.blue;
  return <View style={[styles.card,style]}><View pointerEvents="none" style={[styles.cardLight,{backgroundColor:color}]}/><View pointerEvents="none" style={[styles.cardRail,{backgroundColor:color}]}/>{children}</View>;
}

export function ActionCard({ icon,color,title,detail,onPress,disabled,badge }: { icon:string;color:string;title:string;detail:string;onPress:()=>void;disabled?:boolean;badge?:string }) {
  const scale=useRef(new Animated.Value(1)).current;
  const move=(to:number)=>Animated.spring(scale,{toValue:to,useNativeDriver:true,speed:28,bounciness:4}).start();
  return <Animated.View style={{width:'48.5%',transform:[{scale}]}}><Pressable disabled={disabled} onPress={onPress} onPressIn={()=>move(.972)} onPressOut={()=>move(1)} style={[styles.actionCard,{borderColor:`${color}5C`,backgroundColor:`${color}14`,opacity:disabled?.42:1}]}><View pointerEvents="none" style={[styles.actionGlow,{backgroundColor:`${color}25`}]}/><View pointerEvents="none" style={[styles.actionCorner,{borderColor:`${color}35`}]}/><View style={styles.actionTop}><IconBubble icon={icon} color={color}/>{badge?<Pill label={badge} color={color}/>:<View style={[styles.arrow,{borderColor:`${color}58`,backgroundColor:`${color}0E`}]}><SafeIcon name="arrow-top-right" size={19} color={color}/></View>}</View><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text><View style={[styles.actionLine,{backgroundColor:color}]}/></Pressable></Animated.View>;
}

export function MetricChip({ icon,color,value,label }: { icon:string;color:string;value:string;label:string }) {
  return <View style={[styles.metric,{borderColor:`${color}52`,backgroundColor:`${color}11`}]}><View pointerEvents="none" style={[styles.metricGlow,{backgroundColor:`${color}18`}]}/><View style={[styles.metricIcon,{backgroundColor:`${color}20`}]}><SafeIcon name={icon} size={20} color={color}/></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><View style={[styles.metricLine,{backgroundColor:color}]}/></View>;
}

const styles=StyleSheet.create({
  orb:{position:'absolute'},
  iconBubble:{borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},iconHalo:{position:'absolute',width:70,height:70,borderRadius:35,right:-38,top:-38},iconDot:{position:'absolute',width:7,height:7,borderRadius:4,right:7,top:7},
  sectionHead:{marginTop:30,marginBottom:14,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12},sectionEyebrow:{color:palette.aqua,fontSize:type.micro,fontWeight:'900',letterSpacing:1.35,marginBottom:4},sectionTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',letterSpacing:-.6},sectionSub:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:5},sectionActionWrap:{borderWidth:1,borderColor:palette.line,backgroundColor:palette.glass,paddingHorizontal:12,paddingVertical:9,borderRadius:999,flexDirection:'row',alignItems:'center',gap:6},sectionAction:{color:palette.cyan,fontSize:type.micro,fontWeight:'900'},
  pill:{borderWidth:1,borderRadius:999,paddingHorizontal:11,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6},pillText:{fontWeight:'900',fontSize:type.micro,letterSpacing:.2},
  card:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.lineSoft,borderRadius:radius.lg,padding:18,overflow:'hidden',...shadows.soft},cardLight:{position:'absolute',width:210,height:210,borderRadius:105,right:-105,top:-125,opacity:.15},cardRail:{position:'absolute',left:0,top:18,bottom:18,width:4,borderRadius:99},
  actionCard:{width:'100%',minHeight:190,borderWidth:1,borderRadius:28,padding:17,overflow:'hidden',...shadows.soft},actionGlow:{position:'absolute',width:190,height:190,borderRadius:95,right:-90,top:-95},actionCorner:{position:'absolute',width:95,height:95,borderRadius:48,borderWidth:1,right:-46,bottom:-52},actionTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},arrow:{width:38,height:38,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},actionTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:17,lineHeight:24},actionDetail:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:7,paddingRight:6},actionLine:{position:'absolute',left:17,right:17,bottom:0,height:4,borderRadius:2},
  metric:{flex:1,minHeight:112,borderRadius:22,borderWidth:1,padding:12,justifyContent:'space-between',overflow:'hidden'},metricGlow:{position:'absolute',width:90,height:90,borderRadius:45,right:-46,top:-50},metricIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center'},metricValue:{color:palette.text,fontSize:21,fontWeight:'900',marginTop:7},metricLabel:{color:palette.muted,fontSize:type.caption,fontWeight:'700'},metricLine:{position:'absolute',left:12,right:12,bottom:0,height:3,borderRadius:2},
});
