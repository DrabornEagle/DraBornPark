import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { palette, radius, type } from '@/src/theme';
import { IconBubble, SafeIcon } from './Primitives';

export function AuroraBackground({ accent = palette.cyan, secondary = palette.purple }: { accent?: string; secondary?: string }) {
  const drift=useRef(new Animated.Value(0)).current;
  const pulse=useRef(new Animated.Value(0)).current;
  const sweep=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const a=Animated.loop(Animated.sequence([
      Animated.timing(drift,{toValue:1,duration:7200,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(drift,{toValue:0,duration:7200,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    ]));
    const b=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:3400,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
      Animated.timing(pulse,{toValue:0,duration:3400,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
    ]));
    const c=Animated.loop(Animated.timing(sweep,{toValue:1,duration:8200,easing:Easing.linear,useNativeDriver:true}));
    a.start();b.start();c.start();return()=>{a.stop();b.stop();c.stop()};
  },[drift,pulse,sweep]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={s.base}/>
    <Animated.View style={[s.orbA,{backgroundColor:`${accent}30`,opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.34,.62]}),transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[-44,34]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[-30,38]})}]}]}/>
    <Animated.View style={[s.orbB,{backgroundColor:`${secondary}2A`,opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.26,.52]}),transform:[{translateX:drift.interpolate({inputRange:[0,1],outputRange:[42,-32]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[28,-28]})}]}]}/>
    <Animated.View style={[s.orbC,{opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.24,.46]})}]}/>
    <Animated.View style={[s.orbD,{opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.2,.4]})}]}/>
    <Animated.View style={[s.spectrumBeam,{transform:[{translateX:sweep.interpolate({inputRange:[0,1],outputRange:[-430,460]})},{rotate:'-14deg'}]}]}><View style={[s.beamSegment,{backgroundColor:palette.cyan}]}/><View style={[s.beamSegment,{backgroundColor:palette.purple}]}/><View style={[s.beamSegment,{backgroundColor:palette.pink}]}/><View style={[s.beamSegment,{backgroundColor:palette.orange}]}/><View style={[s.beamSegment,{backgroundColor:palette.green}]}/></Animated.View>
  </View>;
}

export function NotificationBell({countOverride}:{countOverride?:number}){
  const [count,setCount]=useState(typeof countOverride==='number'?countOverride:0);
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(typeof countOverride==='number'){setCount(countOverride);return;}
    let mounted=true;
    const load=async()=>{
      try{
        const {data}=await supabase.auth.getUser();
        if(!mounted||!data.user){if(mounted)setCount(0);return;}
        const {count:next}=await supabase.from('drabornpark_reports').select('id',{count:'exact',head:true}).eq('owner_user_id',data.user.id).is('seen_at',null);
        if(mounted)setCount(next??0);
      }catch{if(mounted)setCount(0)}
    };
    load();const timer=setInterval(load,10000);return()=>{mounted=false;clearInterval(timer)};
  },[countOverride]);
  useEffect(()=>{
    if(count<=0){pulse.stopAnimation();pulse.setValue(0);return;}
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:620,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
      Animated.timing(pulse,{toValue:0,duration:780,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
      Animated.delay(900),
    ]));loop.start();return()=>loop.stop();
  },[count,pulse]);
  const active=count>0;
  return <Animated.View style={{opacity:active?1:.28,transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.1]})}]}}><Pressable accessibilityLabel="Bildirimler" onPress={()=>router.push('/notifications')} style={({pressed})=>[s.bell,{borderColor:active?`${palette.pink}88`:'#FFFFFF20',backgroundColor:active?`${palette.pink}22`:'#FFFFFF08'},pressed&&s.pressed]}><SafeIcon name={active?'bell-ring':'bell-outline'} size={23} color={active?palette.pink:palette.muted2}/>{active?<View style={s.bellBadge}><Text style={s.bellBadgeText}>{count>9?'9+':count}</Text></View>:null}</Pressable></Animated.View>;
}

export function ScreenHeader({title,eyebrow='DraBornPark',right,accent=palette.cyan,back=true,subtitle}:{title:string;eyebrow?:string;right?:React.ReactNode;accent?:string;back?:boolean;subtitle?:string}){
  return <View style={[s.headerWrap,{borderColor:`${accent}52`}]}><View style={s.header}>{back?<Pressable onPress={()=>router.back()} style={({pressed})=>[s.headerButton,pressed&&s.pressed]}><SafeIcon name="arrow-left" size={25} color={palette.text}/></Pressable>:<View style={[s.brand,{borderColor:`${accent}78`,backgroundColor:`${accent}27`}]}><SafeIcon name="shield-car" size={26} color={accent}/><View style={[s.brandDot,{backgroundColor:accent}]}/></View>}<View style={{flex:1,minWidth:0}}>{eyebrow?<Text numberOfLines={1} style={[s.eyebrow,{color:accent}]}>{eyebrow}</Text>:null}<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62} style={s.headerTitle}>{title}</Text>{subtitle?<Text style={s.headerSubtitle}>{subtitle}</Text>:null}</View><View style={s.headerRight}>{right??null}<NotificationBell/></View></View><Spectrum/></View>;
}

export function BottomDock({active='home',onHub,transparent=false,floating=false}:{active?:'home'|'park'|'inbox'|'hub';onHub?:()=>void;transparent?:boolean;floating?:boolean}){
  const visibility=useRef(new Animated.Value(transparent?0:1)).current;
  useEffect(()=>{Animated.timing(visibility,{toValue:transparent?0:1,duration:220,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()},[transparent,visibility]);
  const items=[
    {key:'home' as const,icon:'home-variant-outline',label:'Ana Sayfa',color:palette.cyan,action:()=>router.replace('/')},
    {key:'park' as const,icon:'map-marker-radius-outline',label:'Park Alanı',color:palette.orange,action:()=>router.push('/park')},
    {key:'inbox' as const,icon:'bell-outline',label:'Bildirimler',color:palette.pink,action:()=>router.push('/notifications')},
    {key:'hub' as const,icon:'view-grid-outline',label:'Merkezim',color:palette.purple,action:()=>onHub?onHub():router.push('/hub')},
  ];
  return <Animated.View pointerEvents={transparent?'none':'box-none'} style={[s.dockWrap,floating&&s.dockFloating,{opacity:visibility,transform:[{translateY:visibility.interpolate({inputRange:[0,1],outputRange:[118,0]})}]}]}><View style={s.dock}><Spectrum/>{items.map(item=>{const selected=active===item.key;return <Pressable key={item.key} onPress={item.action} style={({pressed})=>[s.dockItem,selected&&{backgroundColor:`${item.color}20`,borderColor:`${item.color}62`},pressed&&{opacity:.72,transform:[{scale:.97}]}]}><View style={[s.dockIcon,selected&&{borderColor:`${item.color}88`,backgroundColor:`${item.color}30`}]}><SafeIcon name={item.icon} size={24} color={selected?item.color:palette.muted2}/>{selected?<View style={[s.activeDot,{backgroundColor:item.color}]}/>:null}</View><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.dockLabel,selected&&{color:palette.text}]}>{item.label}</Text></Pressable>})}</View></Animated.View>;
}

export function AccentCard({icon,title,subtitle,color,onPress,badge}:{icon:string;title:string;subtitle:string;color:string;onPress:()=>void;badge?:string}){
  const scale=useRef(new Animated.Value(1)).current;const press=(v:number)=>Animated.spring(scale,{toValue:v,useNativeDriver:true,speed:32,bounciness:3}).start();
  return <Animated.View style={{transform:[{scale}]}}><Pressable onPress={onPress} onPressIn={()=>press(.98)} onPressOut={()=>press(1)} style={[s.accentCard,{borderColor:`${color}82`,backgroundColor:`${color}1D`}]}><View style={[s.accentRail,{backgroundColor:color}]}/><IconBubble icon={icon} color={color} size={58}/><View style={{flex:1}}><Text style={s.accentTitle}>{title}</Text><Text style={s.accentSub}>{subtitle}</Text></View>{badge?<View style={[s.badge,{borderColor:`${color}72`,backgroundColor:`${color}28`}]}><Text style={[s.badgeText,{color}]}>{badge}</Text></View>:<View style={[s.next,{borderColor:`${color}72`,backgroundColor:`${color}20`}]}><SafeIcon name="arrow-right" size={20} color={color}/></View>}</Pressable></Animated.View>;
}

export function SectionHeading({title,subtitle,badge,color=palette.cyan}:{title:string;subtitle?:string;badge?:string;color?:string}){
  return <View style={s.sectionHead}><View style={{flex:1}}><View style={s.sectionTitleRow}><View style={[s.sectionDot,{backgroundColor:color}]}/><Text style={s.sectionTitle}>{title}</Text></View>{subtitle?<Text style={s.sectionSub}>{subtitle}</Text>:null}</View>{badge?<View style={[s.sectionBadge,{borderColor:`${color}68`,backgroundColor:`${color}20`}]}><Text style={[s.sectionBadgeText,{color}]}>{badge}</Text></View>:null}</View>;
}

function Spectrum(){return <View pointerEvents="none" style={s.spectrum}><View style={[s.spectrumBar,{backgroundColor:palette.cyan}]}/><View style={[s.spectrumBar,{backgroundColor:palette.purple}]}/><View style={[s.spectrumBar,{backgroundColor:palette.pink}]}/><View style={[s.spectrumBar,{backgroundColor:palette.orange}]}/><View style={[s.spectrumBar,{backgroundColor:palette.green}]}/></View>}

const s=StyleSheet.create({
  base:{...StyleSheet.absoluteFill,backgroundColor:palette.bg},orbA:{position:'absolute',width:460,height:460,borderRadius:230,right:-218,top:-165},orbB:{position:'absolute',width:420,height:420,borderRadius:210,left:-250,bottom:8},orbC:{position:'absolute',width:270,height:270,borderRadius:135,right:-125,bottom:180,backgroundColor:`${palette.pink}14`},orbD:{position:'absolute',width:220,height:220,borderRadius:110,left:-120,top:260,backgroundColor:`${palette.green}10`},spectrumBeam:{position:'absolute',top:190,left:-420,width:430,height:13,flexDirection:'row',gap:4,opacity:.14},beamSegment:{flex:1,borderRadius:99},
  spectrum:{position:'absolute',left:18,right:18,top:0,height:4,flexDirection:'row',gap:4},spectrumBar:{flex:1,borderRadius:99},
  headerWrap:{borderRadius:28,borderWidth:1,backgroundColor:palette.glass,padding:13,marginBottom:20,overflow:'hidden'},header:{flexDirection:'row',alignItems:'center',gap:10},headerRight:{flexDirection:'row',alignItems:'center',gap:5},headerButton:{width:48,height:48,borderRadius:17,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel2,alignItems:'center',justifyContent:'center'},pressed:{opacity:.72,transform:[{scale:.97}]},brand:{width:50,height:50,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center'},brandDot:{position:'absolute',right:6,bottom:6,width:8,height:8,borderRadius:4},eyebrow:{fontSize:type.micro,fontWeight:'900',letterSpacing:1.4},headerTitle:{fontSize:type.title,fontWeight:'900',color:palette.text,letterSpacing:-1,lineHeight:34,marginTop:1,flexShrink:1},headerSubtitle:{fontSize:type.caption,color:palette.muted,lineHeight:19,marginTop:4},bell:{width:44,height:44,borderRadius:15,borderWidth:1,alignItems:'center',justifyContent:'center'},bellBadge:{position:'absolute',right:4,top:4,minWidth:16,height:16,borderRadius:8,backgroundColor:palette.orange,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:2,borderColor:palette.bg},bellBadgeText:{color:palette.ink,fontSize:9,fontWeight:'900'},
  dockWrap:{paddingTop:12,paddingBottom:0},dockFloating:{position:'absolute',left:14,right:14,bottom:8,zIndex:40},dock:{minHeight:92,borderRadius:31,borderWidth:1,borderColor:palette.line,backgroundColor:palette.glassStrong,paddingHorizontal:7,paddingVertical:9,flexDirection:'row',alignItems:'center',overflow:'hidden'},dockItem:{flex:1,minHeight:70,borderRadius:22,borderWidth:1,borderColor:'transparent',alignItems:'center',justifyContent:'center',gap:5},dockIcon:{width:46,height:42,borderRadius:16,borderWidth:1,borderColor:'transparent',alignItems:'center',justifyContent:'center'},activeDot:{position:'absolute',width:5,height:5,borderRadius:3,bottom:4},dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:6}]},
  accentCard:{minHeight:110,borderWidth:1,borderRadius:radius.md,padding:16,flexDirection:'row',alignItems:'center',gap:14,overflow:'hidden'},accentRail:{position:'absolute',left:0,top:14,bottom:14,width:5,borderRadius:99},accentTitle:{fontSize:type.cardTitle,fontWeight:'900',color:palette.text},accentSub:{fontSize:type.caption,lineHeight:20,color:palette.muted,marginTop:5},badge:{paddingHorizontal:11,paddingVertical:8,borderRadius:999,borderWidth:1},badgeText:{fontSize:type.micro,fontWeight:'900'},next:{width:38,height:38,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},
  sectionHead:{marginTop:28,marginBottom:13,flexDirection:'row',alignItems:'flex-end',gap:10},sectionTitleRow:{flexDirection:'row',alignItems:'center',gap:10},sectionDot:{width:8,height:8,borderRadius:4},sectionTitle:{fontSize:type.section,fontWeight:'900',color:palette.text,letterSpacing:-.6},sectionSub:{fontSize:type.caption,color:palette.muted,marginLeft:18,marginTop:5},sectionBadge:{borderWidth:1,borderRadius:999,paddingHorizontal:11,paddingVertical:8},sectionBadgeText:{fontSize:type.micro,fontWeight:'900'},
});