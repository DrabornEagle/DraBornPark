import React,{useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import Svg,{Circle,Defs,LinearGradient,Path,Rect,Stop} from 'react-native-svg';

function DkdTransparentLogo(){
  return <Svg width={228} height={228} viewBox="0 0 1024 1024" accessibilityLabel="DraBornPark">
    <Defs>
      <LinearGradient id="dkd_ring" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#22D3EE"/>
        <Stop offset="1" stopColor="#8B5CF6"/>
      </LinearGradient>
    </Defs>
    <Circle cx="512" cy="438" r="268" fill="none" stroke="url(#dkd_ring)" strokeWidth="68"/>
    <Path d="M434 646 512 780 590 646" fill="none" stroke="#22D3EE" strokeWidth="66" strokeLinecap="round" strokeLinejoin="round"/>
    <Rect x="324" y="386" width="376" height="202" rx="74" fill="#F8FAFC"/>
    <Rect x="383" y="330" width="258" height="144" rx="62" fill="#F8FAFC"/>
    <Rect x="411" y="360" width="202" height="72" rx="28" fill="#08111F"/>
    <Circle cx="394" cy="590" r="50" fill="#08111F"/>
    <Circle cx="630" cy="590" r="50" fill="#08111F"/>
    <Circle cx="394" cy="590" r="25" fill="#22D3EE"/>
    <Circle cx="630" cy="590" r="25" fill="#8B5CF6"/>
    <Circle cx="704" cy="268" r="58" fill="#8B5CF6"/>
  </Svg>;
}

export function DkdStartupSplash(){
  const dkd_enter=useRef(new Animated.Value(0)).current;
  const dkd_pulse=useRef(new Animated.Value(0)).current;
  const dkd_float=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.timing(dkd_enter,{toValue:1,duration:360,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
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
    <View style={dkd_styles.logoFrame}>
      <Animated.View style={dkd_styles.logoMotion}>
        <Animated.View style={{transform:[{translateY:dkd_float.interpolate({inputRange:[0,1],outputRange:[0,-5]})},{scale:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[.985,1.008]})}]}}>
          <DkdTransparentLogo/>
        </Animated.View>
      </Animated.View>
    </View>
    <Text style={dkd_styles.title}>DraBornPark</Text>
    <Text style={dkd_styles.sub}>NFC + QR ARAÇ İLETİŞİMİ</Text>
    <View style={dkd_styles.progress}><Animated.View style={[dkd_styles.progressFill,{transform:[{scaleX:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[.35,1]})}]}]}/></View>
  </Animated.View>;
}

const dkd_styles=StyleSheet.create({
  root:{...StyleSheet.absoluteFill,zIndex:9999,elevation:9999,backgroundColor:'#050816',alignItems:'center',justifyContent:'center',paddingHorizontal:32,paddingVertical:48},
  logoFrame:{width:260,height:260,alignItems:'center',justifyContent:'center',overflow:'visible'},
  logoMotion:{width:242,height:242,alignItems:'center',justifyContent:'center',overflow:'visible'},
  title:{marginTop:12,color:'#F7FBFF',fontSize:28,fontWeight:'900',letterSpacing:.2},
  sub:{marginTop:7,color:'#50D9FF',fontSize:11,fontWeight:'900',letterSpacing:1.7},
  progress:{marginTop:24,width:150,height:4,borderRadius:4,overflow:'hidden',backgroundColor:'#17233D'},
  progressFill:{width:'100%',height:'100%',borderRadius:4,backgroundColor:'#19C8FF'},
});
