import React,{useEffect,useRef} from 'react';
import {Animated,Easing,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {SafeIcon} from '@/src/components/Primitives';
import {palette,radius,type} from '@/src/theme';

export function ColorPopup({visible,icon='check-decagram-outline',eyebrow,title,body,accent=palette.cyan,secondary=palette.purple,primaryLabel='TAMAM',secondaryLabel,onPrimary,onSecondary,chips=[]}:{visible:boolean;icon?:string;eyebrow?:string;title:string;body:string;accent?:string;secondary?:string;primaryLabel?:string;secondaryLabel?:string;onPrimary:()=>void;onSecondary?:()=>void;chips?:string[]}){
  const enter=useRef(new Animated.Value(0)).current;
  const pulse=useRef(new Animated.Value(0)).current;
  const sweep=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(!visible){enter.setValue(0);return;}
    Animated.spring(enter,{toValue:1,useNativeDriver:true,speed:16,bounciness:5}).start();
    const p=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:850,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:850,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})]));
    const s=Animated.loop(Animated.timing(sweep,{toValue:1,duration:2400,easing:Easing.linear,useNativeDriver:true}));
    p.start();s.start();return()=>{p.stop();s.stop()};
  },[enter,pulse,sweep,visible]);
  return <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onSecondary??onPrimary}>
    <Animated.View style={[styles.overlay,{opacity:enter}]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onSecondary??onPrimary}/>
      <Animated.View style={[styles.card,{borderColor:`${accent}88`,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[40,0]})},{scale:enter.interpolate({inputRange:[0,1],outputRange:[.92,1]})}]}]}>
        <Animated.View pointerEvents="none" style={[styles.sweep,{backgroundColor:`${secondary}20`,transform:[{translateX:sweep.interpolate({inputRange:[0,1],outputRange:[-120,520]})},{rotate:'14deg'}]}]}/>
        <View style={styles.spectrum}><View style={[styles.bar,{backgroundColor:accent}]}/><View style={[styles.bar,{backgroundColor:secondary}]}/><View style={[styles.bar,{backgroundColor:palette.pink}]}/><View style={[styles.bar,{backgroundColor:palette.orange}]}/><View style={[styles.bar,{backgroundColor:palette.green}]}/></View>
        <Animated.View style={[styles.icon,{borderColor:`${accent}88`,backgroundColor:`${accent}20`,transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.07]})}]}]}><SafeIcon name={icon} size={42} color={accent}/><Animated.View style={[styles.dot,{backgroundColor:secondary,opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.5,1]})}]}/></Animated.View>
        {eyebrow?<Text style={[styles.eyebrow,{color:accent}]}>{eyebrow}</Text>:null}
        <Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text>
        {chips.length?<View style={styles.chips}>{chips.map((chip,index)=><View key={`${chip}-${index}`} style={[styles.chip,{borderColor:`${index%2?secondary:accent}55`,backgroundColor:`${index%2?secondary:accent}12`}]}><Text style={[styles.chipText,{color:index%2?secondary:accent}]}>{chip}</Text></View>)}</View>:null}
        <Pressable onPress={onPrimary} style={({pressed})=>[styles.primary,{backgroundColor:accent},pressed&&styles.pressed]}><Text style={styles.primaryText}>{primaryLabel}</Text><SafeIcon name="arrow-right" size={21} color={palette.ink}/></Pressable>
        {secondaryLabel&&onSecondary?<Pressable onPress={onSecondary} style={({pressed})=>[styles.secondary,{borderColor:`${secondary}60`},pressed&&styles.pressed]}><Text style={styles.secondaryText}>{secondaryLabel}</Text></Pressable>:null}
      </Animated.View>
    </Animated.View>
  </Modal>;
}
const styles=StyleSheet.create({overlay:{flex:1,backgroundColor:'#01040CD9',alignItems:'center',justifyContent:'center',padding:20},card:{width:'100%',maxWidth:430,borderRadius:radius.xl,borderWidth:1,backgroundColor:palette.glassStrong,padding:20,overflow:'hidden',alignItems:'center'},sweep:{position:'absolute',top:-45,bottom:-45,width:88},spectrum:{width:'100%',height:5,flexDirection:'row',gap:4,marginBottom:22},bar:{flex:1,borderRadius:99},icon:{width:84,height:84,borderRadius:29,borderWidth:1,alignItems:'center',justifyContent:'center'},dot:{position:'absolute',right:9,top:9,width:10,height:10,borderRadius:5},eyebrow:{fontSize:type.micro,fontWeight:'900',letterSpacing:1.2,marginTop:16},title:{color:palette.text,fontSize:27,fontWeight:'900',letterSpacing:-.7,textAlign:'center',marginTop:5},body:{color:palette.muted,fontSize:type.body,lineHeight:23,textAlign:'center',marginTop:9},chips:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7,marginTop:15},chip:{borderRadius:999,borderWidth:1,paddingHorizontal:10,paddingVertical:7},chipText:{fontSize:type.micro,fontWeight:'900'},primary:{width:'100%',minHeight:61,borderRadius:20,marginTop:20,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},primaryText:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},secondary:{width:'100%',minHeight:54,borderRadius:18,borderWidth:1,marginTop:9,alignItems:'center',justifyContent:'center'},secondaryText:{color:palette.text,fontSize:type.caption,fontWeight:'900'},pressed:{opacity:.78,transform:[{scale:.985}]}});
