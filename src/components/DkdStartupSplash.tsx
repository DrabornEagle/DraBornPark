import React,{useEffect,useRef} from 'react';
import {Animated,Easing,Image,StyleSheet,Text,View} from 'react-native';

export function DkdStartupSplash(){
  const dkd_enter=useRef(new Animated.Value(0)).current;
  const dkd_pulse=useRef(new Animated.Value(0)).current;
  const dkd_float=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.timing(dkd_enter,{toValue:1,duration:420,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
    const dkd_pulse_loop=Animated.loop(Animated.sequence([
      Animated.timing(dkd_pulse,{toValue:1,duration:760,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
      Animated.timing(dkd_pulse,{toValue:0,duration:760,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
    ]));
    const dkd_float_loop=Animated.loop(Animated.sequence([
      Animated.timing(dkd_float,{toValue:1,duration:900,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
      Animated.timing(dkd_float,{toValue:0,duration:900,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
    ]));
    dkd_pulse_loop.start();dkd_float_loop.start();
    return()=>{dkd_pulse_loop.stop();dkd_float_loop.stop()};
  },[dkd_enter,dkd_float,dkd_pulse]);
  return <Animated.View pointerEvents="none" style={[dkd_styles.root,{opacity:dkd_enter}]}>
    <Animated.View style={{transform:[{translateY:dkd_float.interpolate({inputRange:[0,1],outputRange:[0,-8]})},{scale:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[.97,1.025]})}]}}>
      <Image source={require('../../assets/branding/splash-icon.png')} resizeMode="contain" style={dkd_styles.logo}/>
    </Animated.View>
    <Text style={dkd_styles.title}>DraBornPark</Text>
    <Text style={dkd_styles.sub}>NFC + QR ARAÇ İLETİŞİMİ</Text>
    <View style={dkd_styles.progress}><Animated.View style={[dkd_styles.progressFill,{transform:[{scaleX:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[.35,1]})}]}]}/></View>
  </Animated.View>;
}

const dkd_styles=StyleSheet.create({
  root:{...StyleSheet.absoluteFill,zIndex:9999,elevation:9999,backgroundColor:'#050816',alignItems:'center',justifyContent:'center',paddingHorizontal:28},
  logo:{width:286,height:286},
  title:{marginTop:12,color:'#F7FBFF',fontSize:28,fontWeight:'900',letterSpacing:.2},
  sub:{marginTop:7,color:'#50D9FF',fontSize:11,fontWeight:'900',letterSpacing:1.7},
  progress:{marginTop:24,width:150,height:4,borderRadius:4,overflow:'hidden',backgroundColor:'#17233D'},
  progressFill:{width:'100%',height:'100%',borderRadius:4,backgroundColor:'#19C8FF'},
});
