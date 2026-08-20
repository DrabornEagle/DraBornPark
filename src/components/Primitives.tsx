import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius, shadows } from '@/src/theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function GlowOrb({ color, size, top, left, right }: { color: string; size: number; top: number; left?: number; right?: number }) {
  const pulse=useRef(new Animated.Value(.22)).current;
  const drift=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const a=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:.5,duration:2500,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(pulse,{toValue:.2,duration:2500,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));
    const b=Animated.loop(Animated.sequence([Animated.timing(drift,{toValue:1,duration:3800,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(drift,{toValue:0,duration:3800,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));
    a.start();b.start();return()=>{a.stop();b.stop()};
  },[pulse,drift]);
  return <Animated.View pointerEvents="none" style={[styles.orb,{backgroundColor:color,width:size,height:size,borderRadius:size/2,top,left,right,opacity:pulse,transform:[{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-10,12]})}]}]}/>;
}

export function IconBubble({ icon, color, size=46 }: { icon:IconName;color:string;size?:number }) {
  return <View style={[styles.iconBubble,{width:size,height:size,borderRadius:Math.round(size*.34),backgroundColor:`${color}17`,borderColor:`${color}48`}]}><MaterialCommunityIcons name={icon} size={size*.48} color={color}/><View style={[styles.iconDot,{backgroundColor:color}]}/></View>;
}

export function SectionHeader({ title, action }: { title:string;action?:string }) {
  return <View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>DRABORNPARK</Text><Text style={styles.sectionTitle}>{title}</Text></View>{action?<View style={styles.sectionActionWrap}><Text style={styles.sectionAction}>{action}</Text><MaterialCommunityIcons name="arrow-right" size={13} color={palette.cyan}/></View>:null}</View>;
}

export function Pill({ label, color=palette.cyan, icon }: { label:string;color?:string;icon?:IconName }) {
  return <View style={[styles.pill,{borderColor:`${color}48`,backgroundColor:`${color}12`}]}>{icon?<MaterialCommunityIcons name={icon} size={13} color={color}/>:null}<Text style={[styles.pillText,{color}]}>{label}</Text></View>;
}

export function Card({ children, style }: { children:React.ReactNode;style?:ViewStyle|ViewStyle[] }) {
  return <View style={[styles.card,style]}><View pointerEvents="none" style={styles.cardLight}/>{children}</View>;
}

export function ActionCard({ icon,color,title,detail,onPress,disabled }: { icon:IconName;color:string;title:string;detail:string;onPress:()=>void;disabled?:boolean }) {
  const scale=useRef(new Animated.Value(1)).current;
  const move=(to:number)=>Animated.spring(scale,{toValue:to,useNativeDriver:true,speed:28,bounciness:4}).start();
  return <Animated.View style={{width:'48.5%',transform:[{scale}]}}><Pressable disabled={disabled} onPress={onPress} onPressIn={()=>move(.975)} onPressOut={()=>move(1)} style={[styles.actionCard,{borderColor:`${color}42`,backgroundColor:`${color}0E`,opacity:disabled?.45:1}]}><View pointerEvents="none" style={[styles.actionGlow,{backgroundColor:`${color}16`}]}/><View style={styles.actionTop}><IconBubble icon={icon} color={color}/><View style={[styles.arrow,{borderColor:`${color}36`}]}><MaterialCommunityIcons name="arrow-top-right" size={16} color={color}/></View></View><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text><View style={[styles.actionLine,{backgroundColor:color}]}/></Pressable></Animated.View>;
}

const styles=StyleSheet.create({
  orb:{position:'absolute'},iconBubble:{borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},iconDot:{position:'absolute',width:5,height:5,borderRadius:3,right:6,top:6},
  sectionHead:{marginTop:25,marginBottom:11,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},sectionEyebrow:{color:palette.aqua,fontSize:6.8,fontWeight:'900',letterSpacing:1.5,marginBottom:3},sectionTitle:{color:palette.text,fontSize:19.5,fontWeight:'900',letterSpacing:-.45},sectionActionWrap:{borderWidth:1,borderColor:'#29536B',backgroundColor:'#0D2232',paddingHorizontal:9,paddingVertical:6,borderRadius:999,flexDirection:'row',alignItems:'center',gap:4},sectionAction:{color:palette.cyan,fontSize:7.5,fontWeight:'900'},
  pill:{borderWidth:1,borderRadius:999,paddingHorizontal:9,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:5},pillText:{fontWeight:'900',fontSize:8.2,letterSpacing:.2},
  card:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.lineSoft,borderRadius:radius.lg,padding:15,overflow:'hidden',...shadows.soft},cardLight:{position:'absolute',width:130,height:130,borderRadius:65,right:-55,top:-65,backgroundColor:'#315D7A',opacity:.08},
  actionCard:{width:'100%',minHeight:150,borderWidth:1,borderRadius:24,padding:14,overflow:'hidden'},actionGlow:{position:'absolute',width:120,height:120,borderRadius:60,right:-55,top:-55},actionTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},arrow:{width:31,height:31,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center'},actionTitle:{color:palette.text,fontSize:13.5,fontWeight:'900',marginTop:13},actionDetail:{color:palette.muted,fontSize:9,lineHeight:13.5,marginTop:4,paddingRight:6},actionLine:{position:'absolute',left:14,right:14,bottom:0,height:3,borderRadius:2},
});
