import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider } from '@/src/demo/DemoContext';
import { palette } from '@/src/theme';

export default function RootLayout(){
  return <SafeAreaProvider>
    <DemoProvider>
      <StatusBar style="light" translucent backgroundColor="transparent"/>
      <Stack screenOptions={{
        headerShown:false,
        contentStyle:{backgroundColor:palette.bg},
        animation:'slide_from_right',
        animationDuration:260,
        gestureEnabled:true,
        fullScreenGestureEnabled:true,
      }}/>
    </DemoProvider>
  </SafeAreaProvider>;
}
