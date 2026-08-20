import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radius, shadows, type } from '@/src/theme';
import { IconName } from './Primitives';

export function AuroraBackground({ accent = palette.cyan, secondary = palette.purple }: { accent?: string; secondary?: string }) {
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 5600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 5600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    motion.start(); breathing.start();
    return () => { motion.stop(); breathing.stop(); };
  }, [drift, pulse]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={s.base}/>
    <Animated.View style={[s.prismA,{backgroundColor:`${accent}2B`,transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[-45,20]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-15,35]})}],opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.55,.9]})}]}/>
    <Animated.View style={[s.prismB,{backgroundColor:`${secondary}22`,transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[20,-25]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[30,-18]})}],opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.42,.72]})}]}/>
    <View style={s.prismC}/><View style={s.sparkA}/><View style={s.sparkB}/><View style={s.sparkC}/>
  </View>;
}

export function ScreenHeader({ title, eyebrow = 'DraBornPark', right, accent = palette.cyan, back = true, subtitle }: { title: string; eyebrow?: string; right?: React.ReactNode; accent?: string; back?: boolean; subtitle?: string }) {
  return <View style={s.header}>
    {back ? <Pressable onPress={() => router.back()} style={({pressed})=>[s.headerButton,pressed&&s.pressed]}><MaterialCommunityIcons name="arrow-left" size={24} color={palette.text}/></Pressable> : <View style={[s.brandOrb,{borderColor:`${accent}55`,backgroundColor:`${accent}16`}]}><MaterialCommunityIcons name="shield-car" size={23} color={accent}/><View style={[s.brandDot,{backgroundColor:accent}]}/></View>}
    <View style={{flex:1}}><Text style={[s.eyebrow,{color:accent}]}>{eyebrow}</Text><Text numberOfLines={2} style={s.headerTitle}>{title}</Text>{subtitle?<Text style={s.headerSubtitle}>{subtitle}</Text>:null}</View>
    {right ?? <View style={{width:48}}/>}
  </View>;
}

export function BottomDock({ active = 'home', onHub }: { active?: 'home'|'park'|'inbox'|'hub'; onHub?: () => void }) {
  const items: Array<{key:'home'|'park'|'inbox'|'hub'; icon:IconName; label:string; color:string; action:()=>void}> = [
    {key:'home',icon:'home-variant-outline',label:'Ana Sayfa',color:palette.cyan,action:()=>router.replace('/')},
    {key:'park',icon:'map-marker-radius-outline',label:'Park',color:palette.orange,action:()=>router.push('/park')},
    {key:'inbox',icon:'bell-outline',label:'Bildirim',color:palette.pink,action:()=>router.push('/notifications')},
    {key:'hub',icon:'view-grid-outline',label:'Menü',color:palette.purple,action:()=>onHub ? onHub() : router.push('/hub')},
  ];
  return <View style={s.dockWrap}><View style={s.dock}>{items.map(item=>{
    const selected=active===item.key;
    return <Pressable key={item.key} onPress={item.action} style={({pressed})=>[s.dockItem,selected&&s.dockItemActive,pressed&&{opacity:.72}]}>
      <View style={[s.dockIcon,selected&&{backgroundColor:`${item.color}20`,borderColor:`${item.color}55`}]}><MaterialCommunityIcons name={item.icon} size={23} color={selected?item.color:palette.muted2}/></View>
      <Text style={[s.dockLabel,selected&&{color:palette.text}]}>{item.label}</Text>
    </Pressable>})}</View></View>;
}

export function AccentCard({ icon, title, subtitle, color, onPress, badge }: { icon:IconName; title:string; subtitle:string; color:string; onPress:()=>void; badge?:string }) {
  const lift=useRef(new Animated.Value(0)).current;
  const animate=(value:number)=>Animated.spring(lift,{toValue:value,useNativeDriver:true,speed:28,bounciness:3}).start();
  return <Animated.View style={{transform:[{translateY:lift}]}}><Pressable onPress={onPress} onPressIn={()=>animate(-2)} onPressOut={()=>animate(0)} style={[s.accentCard,{borderColor:`${color}55`,backgroundColor:`${color}12`}]}>
    <View style={[s.accentIcon,{backgroundColor:`${color}20`,borderColor:`${color}55`}]}><MaterialCommunityIcons name={icon} size={25} color={color}/></View>
    <View style={{flex:1}}><Text style={s.accentTitle}>{title}</Text><Text style={s.accentSub}>{subtitle}</Text></View>
    {badge?<View style={[s.badge,{backgroundColor:`${color}22`,borderColor:`${color}45`}]}><Text style={[s.badgeText,{color}]}>{badge}</Text></View>:<View style={[s.next,{borderColor:`${color}40`}]}><MaterialCommunityIcons name="arrow-right" size={19} color={color}/></View>}
  </Pressable></Animated.View>;
}

export function SectionHeading({ title, subtitle, badge, color=palette.cyan }: { title:string; subtitle?:string; badge?:string; color?:string }) {
  return <View style={s.sectionHead}><View style={{flex:1}}><Text style={s.sectionTitle}>{title}</Text>{subtitle?<Text style={s.sectionSub}>{subtitle}</Text>:null}</View>{badge?<View style={[s.sectionBadge,{backgroundColor:`${color}18`,borderColor:`${color}45`}]}><Text style={[s.sectionBadgeText,{color}]}>{badge}</Text></View>:null}</View>;
}

const s=StyleSheet.create({
  base:{...StyleSheet.absoluteFillObject,backgroundColor:palette.bg},
  prismA:{position:'absolute',width:390,height:390,borderRadius:195,right:-185,top:-135},
  prismB:{position:'absolute',width:345,height:345,borderRadius:173,left:-210,bottom:45},
  prismC:{position:'absolute',width:210,height:210,borderRadius:105,right:-90,bottom:180,backgroundColor:`${palette.orange}10`},
  sparkA:{position:'absolute',width:8,height:8,borderRadius:4,right:42,top:175,backgroundColor:palette.cyan,opacity:.55},
  sparkB:{position:'absolute',width:5,height:5,borderRadius:3,left:28,top:320,backgroundColor:palette.purple,opacity:.55},
  sparkC:{position:'absolute',width:6,height:6,borderRadius:3,right:95,bottom:92,backgroundColor:palette.orange,opacity:.45},
  header:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:22},
  headerButton:{width:48,height:48,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glass,alignItems:'center',justifyContent:'center',...shadows.soft},
  pressed:{opacity:.72,transform:[{scale:.97}]},
  brandOrb:{width:50,height:50,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center'},
  brandDot:{position:'absolute',right:6,bottom:6,width:7,height:7,borderRadius:4},
  eyebrow:{fontSize:type.micro,fontWeight:'900',letterSpacing:1.25},
  headerTitle:{fontSize:type.title,fontWeight:'900',color:palette.text,letterSpacing:-.8,marginTop:1,lineHeight:32},
  headerSubtitle:{fontSize:type.caption,color:palette.muted,lineHeight:18,marginTop:4},
  dockWrap:{paddingTop:16,paddingBottom:8},
  dock:{minHeight:86,borderRadius:30,borderWidth:1,borderColor:palette.line,backgroundColor:'#0B2233F2',paddingHorizontal:8,paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between',...shadows.soft},
  dockItem:{flex:1,minHeight:68,alignItems:'center',justifyContent:'center',gap:5,borderRadius:22},dockItemActive:{backgroundColor:'#FFFFFF08'},
  dockIcon:{width:43,height:39,borderRadius:15,borderWidth:1,borderColor:'transparent',alignItems:'center',justifyContent:'center'},
  dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'850'},
  accentCard:{minHeight:96,borderWidth:1,borderRadius:radius.md,padding:15,flexDirection:'row',alignItems:'center',gap:14,overflow:'hidden'},
  accentIcon:{width:54,height:54,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center'},
  accentTitle:{fontSize:type.cardTitle,fontWeight:'900',color:palette.text},accentSub:{fontSize:type.caption,lineHeight:18,color:palette.muted,marginTop:4},
  badge:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,borderWidth:1},badgeText:{fontSize:type.micro,fontWeight:'900'},
  next:{width:35,height:35,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},
  sectionHead:{marginTop:26,marginBottom:12,flexDirection:'row',alignItems:'flex-end',gap:12},
  sectionTitle:{fontSize:type.section,fontWeight:'900',color:palette.text,letterSpacing:-.45},
  sectionSub:{fontSize:type.caption,color:palette.muted,lineHeight:18,marginTop:4},
  sectionBadge:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,borderWidth:1},sectionBadgeText:{fontSize:type.micro,fontWeight:'900'},
});
