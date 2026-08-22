import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radius, type } from '@/src/theme';

export type DkdActionModalProps={
  visible:boolean;
  eyebrow:string;
  title:string;
  body:string;
  icon:any;
  color?:string;
  secondaryColor?:string;
  badge?:string;
  bullets?:string[];
  primaryLabel:string;
  onPrimary:()=>void;
  secondaryLabel?:string;
  onSecondary?:()=>void;
  dismissible?:boolean;
};

export function DkdActionModal({visible,eyebrow,title,body,icon,color=palette.cyan,secondaryColor=palette.purple,badge,bullets=[],primaryLabel,onPrimary,secondaryLabel,onSecondary,dismissible=true}:DkdActionModalProps){
  const enter=useRef(new Animated.Value(0)).current;
  const pulse=useRef(new Animated.Value(0)).current;
  const sweep=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(!visible){enter.setValue(0);return;}
    Animated.spring(enter,{toValue:1,useNativeDriver:true,speed:18,bounciness:6}).start();
    const p=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:880,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:880,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.delay(340)]));
    const s=Animated.loop(Animated.timing(sweep,{toValue:1,duration:2500,easing:Easing.linear,useNativeDriver:true}));
    p.start();s.start();return()=>{p.stop();s.stop()};
  },[enter,pulse,sweep,visible]);
  if(!visible)return null;
  const dismiss=()=>{if(dismissible&&onSecondary)onSecondary();};
  return <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill,styles.scrim,{opacity:enter.interpolate({inputRange:[0,1],outputRange:[0,.78]})}]}/>
      <Animated.View style={[styles.card,{borderColor:`${color}80`,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[42,0]})},{scale:enter.interpolate({inputRange:[0,1],outputRange:[.92,1]})}]}]}>
        <Animated.View pointerEvents="none" style={[styles.orbA,{backgroundColor:`${color}28`,transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.15]})}]}]}/>
        <View pointerEvents="none" style={[styles.orbB,{backgroundColor:`${secondaryColor}22`}]}/>
        <Animated.View pointerEvents="none" style={[styles.sweep,{backgroundColor:'#FFFFFF12',transform:[{translateX:sweep.interpolate({inputRange:[0,1],outputRange:[-120,430]})},{rotate:'13deg'}]}]}/>
        <View style={styles.spectrum}><View style={[styles.bar,{backgroundColor:palette.cyan}]}/><View style={[styles.bar,{backgroundColor:palette.blue}]}/><View style={[styles.bar,{backgroundColor:palette.purple}]}/><View style={[styles.bar,{backgroundColor:palette.pink}]}/><View style={[styles.bar,{backgroundColor:palette.orange}]}/><View style={[styles.bar,{backgroundColor:palette.green}]}/></View>
        <View style={styles.header}>
          <Animated.View style={[styles.icon,{borderColor:`${color}84`,backgroundColor:`${color}22`,transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.055]})}]}]}><MaterialCommunityIcons name={icon} size={37} color={color}/><View style={[styles.dot,{backgroundColor:secondaryColor}]}/></Animated.View>
          <View style={{flex:1,minWidth:0}}><Text style={[styles.eyebrow,{color}]}>{eyebrow}</Text><Text style={styles.title}>{title}</Text>{badge?<View style={[styles.badge,{borderColor:`${secondaryColor}70`,backgroundColor:`${secondaryColor}19`}]}><Text style={[styles.badgeText,{color:secondaryColor}]}>{badge}</Text></View>:null}</View>
        </View>
        <Text style={styles.body}>{body}</Text>
        {bullets.length?<View style={styles.bullets}>{bullets.map((item,index)=><View key={`${item}-${index}`} style={styles.bullet}><View style={[styles.bulletIcon,{backgroundColor:`${color}20`}]}><MaterialCommunityIcons name="check" size={16} color={color}/></View><Text style={styles.bulletText}>{item}</Text></View>)}</View>:null}
        <Pressable onPress={onPrimary} style={({pressed})=>[styles.primary,{backgroundColor:color},pressed&&styles.pressed]}><Text style={styles.primaryText}>{primaryLabel}</Text><MaterialCommunityIcons name="arrow-right" size={22} color={palette.ink}/></Pressable>
        {secondaryLabel&&onSecondary?<Pressable onPress={onSecondary} style={({pressed})=>[styles.secondary,{borderColor:`${secondaryColor}60`,backgroundColor:`${secondaryColor}10`},pressed&&styles.pressed]}><Text style={[styles.secondaryText,{color:secondaryColor}]}>{secondaryLabel}</Text></Pressable>:null}
      </Animated.View>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({root:{flex:1,alignItems:'center',justifyContent:'center',padding:20},scrim:{backgroundColor:'#01040D'},card:{width:'100%',maxWidth:520,borderWidth:1,borderRadius:32,backgroundColor:'#0B1328',padding:20,paddingTop:24,overflow:'hidden'},orbA:{position:'absolute',width:220,height:220,borderRadius:110,right:-105,top:-120},orbB:{position:'absolute',width:180,height:180,borderRadius:90,left:-100,bottom:-90},sweep:{position:'absolute',top:-60,bottom:-60,width:90},spectrum:{position:'absolute',left:20,right:20,top:0,height:5,flexDirection:'row',gap:4},bar:{flex:1,borderRadius:99},header:{flexDirection:'row',alignItems:'center',gap:15},icon:{width:76,height:76,borderRadius:25,borderWidth:1,alignItems:'center',justifyContent:'center'},dot:{position:'absolute',right:7,top:7,width:10,height:10,borderRadius:5,borderWidth:2,borderColor:'#0B1328'},eyebrow:{fontSize:type.micro,fontWeight:'900',letterSpacing:1.25},title:{color:palette.text,fontSize:27,fontWeight:'900',lineHeight:31,letterSpacing:-.7,marginTop:4},badge:{alignSelf:'flex-start',borderWidth:1,borderRadius:999,paddingHorizontal:10,paddingVertical:6,marginTop:8},badgeText:{fontSize:10,fontWeight:'900',letterSpacing:.5},body:{color:'#CBD5E6',fontSize:type.body,lineHeight:23,marginTop:17},bullets:{gap:9,marginTop:15},bullet:{flexDirection:'row',alignItems:'center',gap:10},bulletIcon:{width:28,height:28,borderRadius:10,alignItems:'center',justifyContent:'center'},bulletText:{flex:1,color:palette.text,fontSize:type.caption,lineHeight:19,fontWeight:'700'},primary:{minHeight:62,borderRadius:20,marginTop:20,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},primaryText:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},secondary:{minHeight:54,borderRadius:18,borderWidth:1,marginTop:9,alignItems:'center',justifyContent:'center',paddingHorizontal:14},secondaryText:{fontSize:type.caption,fontWeight:'900'},pressed:{opacity:.78,transform:[{scale:.985}]}});
