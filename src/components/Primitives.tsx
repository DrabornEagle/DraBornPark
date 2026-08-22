import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius, type } from '@/src/theme';

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
    const a=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:.66,duration:2500,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(pulse,{toValue:.2,duration:2500,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));
    const b=Animated.loop(Animated.sequence([Animated.timing(drift,{toValue:1,duration:4400,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(drift,{toValue:0,duration:4400,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));
    a.start();b.start();return()=>{a.stop();b.stop()};
  },[pulse,drift]);
  return <Animated.View pointerEvents="none" style={[styles.orb,{backgroundColor:color,width:size,height:size,borderRadius:size/2,top,left,right,opacity:pulse,transform:[{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-12,14]})},{scale:pulse.interpolate({inputRange:[.2,.66],outputRange:[.96,1.09],extrapolate:'clamp'})}]}]}/>;
}

export function IconBubble({ icon, color, size=54 }: { icon:string;color:string;size?:number }) {
  return <View style={[styles.iconBubble,{width:size,height:size,borderRadius:Math.round(size*.31),backgroundColor:`${color}30`,borderColor:`${color}90`}]}><SafeIcon name={icon} size={size*.48} color={color}/><View style={[styles.iconDot,{backgroundColor:color}]}/><View style={[styles.iconBar,{backgroundColor:color}]}/></View>;
}

export function SectionHeader({ title, action, subtitle }: { title:string;action?:string;subtitle?:string }) {
  return <View style={styles.sectionHead}><View style={{flex:1}}><Text style={styles.sectionEyebrow}>DRABORNPARK</Text><Text style={styles.sectionTitle}>{title}</Text>{subtitle?<Text style={styles.sectionSub}>{subtitle}</Text>:null}</View>{action?<View style={styles.sectionActionWrap}><Text style={styles.sectionAction}>{action}</Text><SafeIcon name="arrow-right" size={16} color={palette.cyan}/></View>:null}</View>;
}

export function Pill({ label, color=palette.cyan, icon }: { label:string;color?:string;icon?:string }) {
  const dkd_label=label==='v0.5.5'?'v0.5.6':label;
  return <View style={[styles.pill,{borderColor:`${color}78`,backgroundColor:`${color}25`}]}>{icon?<SafeIcon name={icon} size={16} color={color}/>:null}<Text style={[styles.pillText,{color}]}>{dkd_label}</Text></View>;
}

export function Card({ children, style, accent }: { children:React.ReactNode;style?:ViewStyle|ViewStyle[];accent?:string }) {
  const color=accent||palette.blue;
  return <View style={[styles.card,{borderColor:`${color}58`,backgroundColor:`${color}12`},style]}><View pointerEvents="none" style={[styles.cardRail,{backgroundColor:color}]}/><View pointerEvents="none" style={[styles.cardDot,{backgroundColor:color}]}/>{children}</View>;
}

export function ActionCard({ icon,color,title,detail,onPress,disabled,badge }: { icon:string;color:string;title:string;detail:string;onPress:()=>void;disabled?:boolean;badge?:string }) {
  const pressScale=useRef(new Animated.Value(1)).current;
  const move=(to:number)=>Animated.spring(pressScale,{toValue:to,useNativeDriver:true,speed:34,bounciness:4}).start();
  return <Animated.View style={{width:'48.5%',transform:[{scale:pressScale}]}}><Pressable disabled={disabled} onPress={onPress} onPressIn={()=>move(.965)} onPressOut={()=>move(1)} style={[styles.actionCard,{borderColor:`${color}82`,backgroundColor:`${color}20`,opacity:disabled?.42:1}]}><View pointerEvents="none" style={[styles.actionCorner,{borderColor:`${color}52`}]} /><View style={styles.actionTop}><IconBubble icon={icon} color={color}/>{badge?<Pill label={badge} color={color}/>:<View style={[styles.arrow,{borderColor:`${color}75`,backgroundColor:`${color}20`}]}><SafeIcon name="arrow-top-right" size={19} color={color}/></View>}</View><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text><View style={[styles.actionLine,{backgroundColor:color}]}/></Pressable></Animated.View>;
}

export function MetricChip({ icon,color,value,label }: { icon:string;color:string;value:string;label:string }) {
  return <View style={[styles.metric,{borderColor:`${color}78`,backgroundColor:`${color}1D`}]}><View style={[styles.metricIcon,{backgroundColor:`${color}32`,borderColor:`${color}72`}]}><SafeIcon name={icon} size={21} color={color}/></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><View style={[styles.metricLine,{backgroundColor:color}]}/><View style={[styles.metricDot,{backgroundColor:color}]}/></View>;
}

const styles=StyleSheet.create({
  orb:{position:'absolute'},
  iconBubble:{borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},iconDot:{position:'absolute',width:8,height:8,borderRadius:4,right:7,top:7},iconBar:{position:'absolute',left:9,right:9,bottom:0,height:3,borderRadius:2},
  sectionHead:{marginTop:30,marginBottom:14,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12},sectionEyebrow:{color:palette.aqua,fontSize:type.micro,fontWeight:'900',letterSpacing:1.35,marginBottom:4},sectionTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',letterSpacing:-.6},sectionSub:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:5},sectionActionWrap:{borderWidth:1,borderColor:palette.line,backgroundColor:palette.glass,paddingHorizontal:12,paddingVertical:9,borderRadius:999,flexDirection:'row',alignItems:'center',gap:6},sectionAction:{color:palette.cyan,fontSize:type.micro,fontWeight:'900'},
  pill:{borderWidth:1,borderRadius:999,paddingHorizontal:11,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6},pillText:{fontWeight:'900',fontSize:type.micro,letterSpacing:.2},
  card:{borderWidth:1,borderRadius:radius.lg,padding:18,overflow:'hidden'},cardRail:{position:'absolute',left:0,top:18,bottom:18,width:4,borderRadius:99},cardDot:{position:'absolute',right:15,top:15,width:8,height:8,borderRadius:4},
  actionCard:{width:'100%',minHeight:194,borderWidth:1,borderRadius:29,padding:17,overflow:'hidden'},actionCorner:{position:'absolute',width:110,height:110,borderRadius:55,borderWidth:1,right:-54,bottom:-62,opacity:.7},actionTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},arrow:{width:40,height:40,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},actionTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:17,lineHeight:24},actionDetail:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:7,paddingRight:6},actionLine:{position:'absolute',left:17,right:17,bottom:0,height:5,borderRadius:3},
  metric:{flex:1,minHeight:116,borderRadius:23,borderWidth:1,padding:12,justifyContent:'space-between',overflow:'hidden'},metricIcon:{width:40,height:40,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},metricValue:{color:palette.text,fontSize:22,fontWeight:'900',marginTop:7},metricLabel:{color:palette.muted,fontSize:type.caption,fontWeight:'800'},metricLine:{position:'absolute',left:12,right:12,bottom:0,height:4,borderRadius:2},metricDot:{position:'absolute',right:12,top:12,width:7,height:7,borderRadius:4},
});