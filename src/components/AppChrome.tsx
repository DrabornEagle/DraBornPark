import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radius } from '@/src/theme';
import { IconName } from './Primitives';

export function AuroraBackground({ accent = palette.cyan }: { accent?: string }) {
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [drift, pulse]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={s.baseGlow}/>
    <Animated.View style={[s.auroraA,{backgroundColor:`${accent}24`,transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[-35,20]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-8,24]})}],opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.6,.95]})}]}/>
    <Animated.View style={[s.auroraB,{transform:[{translateY:drift.interpolate({inputRange:[0,1],outputRange:[18,-20]})}],opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.25,.55]})}]}/>
    <View style={s.lineA}/><View style={s.lineB}/><View style={s.lineC}/>
  </View>;
}

export function ScreenHeader({ title, eyebrow = 'DRABORNPARK', right, accent = palette.cyan, back = true }: { title: string; eyebrow?: string; right?: React.ReactNode; accent?: string; back?: boolean }) {
  return <View style={s.header}>
    {back ? <Pressable onPress={() => router.back()} style={s.headerButton}><MaterialCommunityIcons name="chevron-left" size={27} color={palette.text}/></Pressable> : <View style={s.brandOrb}><MaterialCommunityIcons name="shield-car" size={22} color={accent}/></View>}
    <View style={{flex:1}}><Text style={[s.eyebrow,{color:accent}]}>{eyebrow}</Text><Text numberOfLines={1} style={s.headerTitle}>{title}</Text></View>
    {right ?? <View style={{width:44}}/>}
  </View>;
}

export function BottomDock({ active = 'home', onHub }: { active?: 'home'|'park'|'inbox'|'hub'; onHub?: () => void }) {
  const items: Array<{key:'home'|'park'|'inbox'|'hub'; icon:IconName; label:string; action:()=>void}> = [
    {key:'home',icon:'home-outline',label:'Ana',action:()=>router.replace('/')},
    {key:'park',icon:'map-marker-radius-outline',label:'Park',action:()=>router.push('/park')},
    {key:'inbox',icon:'bell-outline',label:'Bildirim',action:()=>router.push('/notifications')},
    {key:'hub',icon:'apps',label:'Menü',action:()=>onHub ? onHub() : router.push('/hub')},
  ];
  return <View style={s.dockWrap}><View style={s.dock}>{items.map(item=>{
    const selected=active===item.key;
    return <Pressable key={item.key} onPress={item.action} style={[s.dockItem,selected&&s.dockItemActive]}>
      <View style={[s.dockIcon,selected&&{backgroundColor:`${palette.cyan}16`}]}><MaterialCommunityIcons name={item.icon} size={21} color={selected?palette.cyan:palette.muted2}/>{selected?<View style={s.activeDot}/>:null}</View>
      <Text style={[s.dockLabel,selected&&{color:palette.text}]}>{item.label}</Text>
    </Pressable>})}</View></View>;
}

export function AccentCard({ icon, title, subtitle, color, onPress, badge }: { icon:IconName; title:string; subtitle:string; color:string; onPress:()=>void; badge?:string }) {
  return <Pressable onPress={onPress} style={({pressed})=>[s.accentCard,{borderColor:`${color}45`,backgroundColor:`${color}10`,transform:[{scale:pressed?.985:1}]}]}>
    <View style={[s.accentIcon,{backgroundColor:`${color}1A`,borderColor:`${color}40`}]}><MaterialCommunityIcons name={icon} size={24} color={color}/></View>
    <View style={{flex:1}}><Text style={s.accentTitle}>{title}</Text><Text style={s.accentSub}>{subtitle}</Text></View>
    {badge?<View style={[s.badge,{backgroundColor:`${color}18`}]}><Text style={[s.badgeText,{color}]}>{badge}</Text></View>:<MaterialCommunityIcons name="chevron-right" size={20} color={color}/>} 
  </Pressable>;
}

const s=StyleSheet.create({
  baseGlow:{position:'absolute',left:-100,right:-100,top:-150,height:360,borderRadius:180,backgroundColor:'#10365A',opacity:.28},
  auroraA:{position:'absolute',width:330,height:330,borderRadius:165,right:-160,top:-90},
  auroraB:{position:'absolute',width:300,height:300,borderRadius:150,left:-185,bottom:80,backgroundColor:'#B884FF'},
  lineA:{position:'absolute',left:18,right:18,top:245,height:1,backgroundColor:'#16314D',opacity:.45},
  lineB:{position:'absolute',width:1,top:130,bottom:0,right:78,backgroundColor:'#17324D',opacity:.35},
  lineC:{position:'absolute',left:0,right:0,bottom:160,height:1,backgroundColor:'#142B44',opacity:.25},
  header:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:18},
  headerButton:{width:44,height:44,borderRadius:16,borderWidth:1,borderColor:palette.lineSoft,backgroundColor:'#0C1A2A',alignItems:'center',justifyContent:'center'},
  brandOrb:{width:44,height:44,borderRadius:16,borderWidth:1,borderColor:'#28506B',backgroundColor:'#0C2233',alignItems:'center',justifyContent:'center'},
  eyebrow:{fontSize:8,fontWeight:'900',letterSpacing:1.8},
  headerTitle:{fontSize:21,fontWeight:'900',color:palette.text,letterSpacing:-.55,marginTop:2},
  dockWrap:{paddingTop:14,paddingBottom:8},
  dock:{height:72,borderRadius:25,borderWidth:1,borderColor:'#29435F',backgroundColor:'#0D1A2BEE',paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  dockItem:{flex:1,alignItems:'center',justifyContent:'center',gap:3},dockItemActive:{},
  dockIcon:{width:38,height:34,borderRadius:14,alignItems:'center',justifyContent:'center'},
  activeDot:{position:'absolute',bottom:2,width:4,height:4,borderRadius:2,backgroundColor:palette.cyan},
  dockLabel:{fontSize:8,color:palette.muted2,fontWeight:'800'},
  accentCard:{minHeight:84,borderWidth:1,borderRadius:22,padding:13,flexDirection:'row',alignItems:'center',gap:12,overflow:'hidden'},
  accentIcon:{width:48,height:48,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center'},
  accentTitle:{fontSize:13.5,fontWeight:'900',color:palette.text},accentSub:{fontSize:9.5,lineHeight:13,color:palette.muted,marginTop:3},
  badge:{paddingHorizontal:8,paddingVertical:5,borderRadius:999},badgeText:{fontSize:7.5,fontWeight:'900'},
});
