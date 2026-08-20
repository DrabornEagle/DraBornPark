import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radius, shadows, type } from '@/src/theme';
import { IconBubble, SafeIcon } from './Primitives';

export function AuroraBackground({ accent = palette.cyan, secondary = palette.purple }: { accent?: string; secondary?: string }) {
  const drift=useRef(new Animated.Value(0)).current;
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const a=Animated.loop(Animated.sequence([
      Animated.timing(drift,{toValue:1,duration:7000,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(drift,{toValue:0,duration:7000,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    ]));
    const b=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:3600,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
      Animated.timing(pulse,{toValue:0,duration:3600,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
    ]));
    a.start();b.start();return()=>{a.stop();b.stop()};
  },[drift,pulse]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={s.base}/>
    <Animated.View style={[s.orbA,{backgroundColor:`${accent}2E`,opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.52,.9]}),transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[-40,32]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-28,34]})},{scale:pulse.interpolate({inputRange:[0,1],outputRange:[.96,1.08]})}]}]}/>
    <Animated.View style={[s.orbB,{backgroundColor:`${secondary}27`,opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.35,.7]}),transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[38,-30]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[24,-24]})}]}]}/>
    <View style={s.orbC}/><View style={s.orbD}/>
    <Animated.View style={[s.spectrumRail,{transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[-100,35]})}]}]}><View style={[s.railDot,{backgroundColor:palette.cyan}]}/><View style={[s.railDot,{backgroundColor:palette.purple}]}/><View style={[s.railDot,{backgroundColor:palette.pink}]}/><View style={[s.railDot,{backgroundColor:palette.orange}]}/><View style={[s.railDot,{backgroundColor:palette.green}]}/></Animated.View>
  </View>;
}

export function ScreenHeader({title,eyebrow='DraBornPark',right,accent=palette.cyan,back=true,subtitle}:{title:string;eyebrow?:string;right?:React.ReactNode;accent?:string;back?:boolean;subtitle?:string}){
  return <View style={s.header}>
    {back?<Pressable onPress={()=>router.back()} style={({pressed})=>[s.headerButton,pressed&&s.pressed]}><SafeIcon name="arrow-left" size={25} color={palette.text}/></Pressable>:<View style={[s.brand,{borderColor:`${accent}5C`,backgroundColor:`${accent}18`}]}><SafeIcon name="shield-car" size={26} color={accent}/><View style={[s.brandDot,{backgroundColor:accent}]}/></View>}
    <View style={{flex:1}}><Text style={[s.eyebrow,{color:accent}]}>{eyebrow}</Text><Text style={s.headerTitle}>{title}</Text>{subtitle?<Text style={s.headerSubtitle}>{subtitle}</Text>:null}</View>
    {right??<View style={{width:50}}/>}
  </View>;
}

export function BottomDock({active='home',onHub}:{active?:'home'|'park'|'inbox'|'hub';onHub?:()=>void}){
  const items=[
    {key:'home' as const,icon:'home-variant-outline',label:'Ana',color:palette.cyan,action:()=>router.replace('/')},
    {key:'park' as const,icon:'map-marker-radius-outline',label:'Park',color:palette.orange,action:()=>router.push('/park')},
    {key:'inbox' as const,icon:'bell-outline',label:'Bildirim',color:palette.pink,action:()=>router.push('/notifications')},
    {key:'hub' as const,icon:'view-grid-outline',label:'Merkez',color:palette.purple,action:()=>onHub?onHub():router.push('/hub')},
  ];
  return <View style={s.dockWrap}><View style={s.dock}>{items.map(item=>{const selected=active===item.key;return <Pressable key={item.key} onPress={item.action} style={({pressed})=>[s.dockItem,selected&&{backgroundColor:`${item.color}12`},pressed&&{opacity:.7}]}><View style={[s.dockIcon,selected&&{borderColor:`${item.color}65`,backgroundColor:`${item.color}20`}]}><SafeIcon name={item.icon} size={24} color={selected?item.color:palette.muted2}/>{selected?<View style={[s.activeDot,{backgroundColor:item.color}]}/>:null}</View><Text style={[s.dockLabel,selected&&{color:palette.text}]}>{item.label}</Text></Pressable>})}</View></View>;
}

export function AccentCard({icon,title,subtitle,color,onPress,badge}:{icon:string;title:string;subtitle:string;color:string;onPress:()=>void;badge?:string}){
  const scale=useRef(new Animated.Value(1)).current;
  const press=(v:number)=>Animated.spring(scale,{toValue:v,useNativeDriver:true,speed:30,bounciness:3}).start();
  return <Animated.View style={{transform:[{scale}]}}><Pressable onPress={onPress} onPressIn={()=>press(.985)} onPressOut={()=>press(1)} style={[s.accentCard,{borderColor:`${color}55`,backgroundColor:`${color}10`}]}><View style={[s.accentGlow,{backgroundColor:`${color}18`}]}/><IconBubble icon={icon} color={color} size={58}/><View style={{flex:1}}><Text style={s.accentTitle}>{title}</Text><Text style={s.accentSub}>{subtitle}</Text></View>{badge?<View style={[s.badge,{borderColor:`${color}55`,backgroundColor:`${color}1D`}]}><Text style={[s.badgeText,{color}]}>{badge}</Text></View>:<View style={[s.next,{borderColor:`${color}4A`}]}><SafeIcon name="arrow-right" size={20} color={color}/></View>}</Pressable></Animated.View>;
}

export function SectionHeading({title,subtitle,badge,color=palette.cyan}:{title:string;subtitle?:string;badge?:string;color?:string}){
  return <View style={s.sectionHead}><View style={{flex:1}}><Text style={s.sectionTitle}>{title}</Text>{subtitle?<Text style={s.sectionSub}>{subtitle}</Text>:null}</View>{badge?<View style={[s.sectionBadge,{borderColor:`${color}50`,backgroundColor:`${color}14`}]}><Text style={[s.sectionBadgeText,{color}]}>{badge}</Text></View>:null}</View>;
}

const s=StyleSheet.create({
  base:{...StyleSheet.absoluteFill,backgroundColor:palette.bg},
  orbA:{position:'absolute',width:430,height:430,borderRadius:215,right:-205,top:-155},orbB:{position:'absolute',width:390,height:390,borderRadius:195,left:-230,bottom:15},orbC:{position:'absolute',width:230,height:230,borderRadius:115,right:-110,bottom:185,backgroundColor:`${palette.pink}12`},orbD:{position:'absolute',width:190,height:190,borderRadius:95,left:-105,top:280,backgroundColor:`${palette.green}0B`},
  spectrumRail:{position:'absolute',top:74,left:-30,flexDirection:'row',gap:26,opacity:.55},railDot:{width:8,height:8,borderRadius:4},
  header:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:24},headerButton:{width:50,height:50,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glass,alignItems:'center',justifyContent:'center',...shadows.soft},pressed:{opacity:.72,transform:[{scale:.97}]},brand:{width:52,height:52,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center'},brandDot:{position:'absolute',right:6,bottom:6,width:8,height:8,borderRadius:4},eyebrow:{fontSize:type.micro,fontWeight:'900',letterSpacing:1.45},headerTitle:{fontSize:type.title,fontWeight:'900',color:palette.text,letterSpacing:-1,lineHeight:35,marginTop:2},headerSubtitle:{fontSize:type.caption,color:palette.muted,lineHeight:20,marginTop:5},
  dockWrap:{paddingTop:18,paddingBottom:8},dock:{minHeight:90,borderRadius:31,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glassStrong,paddingHorizontal:8,paddingVertical:8,flexDirection:'row',alignItems:'center',...shadows.floating},dockItem:{flex:1,minHeight:70,borderRadius:22,alignItems:'center',justifyContent:'center',gap:5},dockIcon:{width:46,height:42,borderRadius:16,borderWidth:1,borderColor:'transparent',alignItems:'center',justifyContent:'center'},activeDot:{position:'absolute',width:5,height:5,borderRadius:3,bottom:4},dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900'},
  accentCard:{minHeight:108,borderWidth:1,borderRadius:radius.md,padding:16,flexDirection:'row',alignItems:'center',gap:14,overflow:'hidden',...shadows.soft},accentGlow:{position:'absolute',width:170,height:170,borderRadius:85,right:-95,top:-100},accentTitle:{fontSize:type.cardTitle,fontWeight:'900',color:palette.text},accentSub:{fontSize:type.caption,lineHeight:20,color:palette.muted,marginTop:5},badge:{paddingHorizontal:11,paddingVertical:8,borderRadius:999,borderWidth:1},badgeText:{fontSize:type.micro,fontWeight:'900'},next:{width:38,height:38,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},
  sectionHead:{marginTop:29,marginBottom:13,flexDirection:'row',alignItems:'flex-end',gap:12},sectionTitle:{fontSize:type.section,fontWeight:'900',color:palette.text,letterSpacing:-.65},sectionSub:{fontSize:type.caption,color:palette.muted,lineHeight:20,marginTop:5},sectionBadge:{paddingHorizontal:11,paddingVertical:8,borderRadius:999,borderWidth:1},sectionBadgeText:{fontSize:type.micro,fontWeight:'900'},
});
