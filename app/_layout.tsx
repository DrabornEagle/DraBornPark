import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider } from '@/src/demo/DemoContext';
import { palette } from '@/src/theme';

export default function RootLayout(){
  return <SafeAreaProvider>
    <DemoProvider>
      <StatusBar style="light"/>
      {Platform.OS==='android'?<NavigationBar style="dark" hidden={false}/>:null}
      <Stack screenOptions={{
        headerShown:false,
        contentStyle:{backgroundColor:palette.bg},
        animation:'fade_from_bottom',
        animationDuration:220,
        gestureEnabled:true,
        fullScreenGestureEnabled:true,
      }}/>
    </DemoProvider>
  </SafeAreaProvider>;
}
