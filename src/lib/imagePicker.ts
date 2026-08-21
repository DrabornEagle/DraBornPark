import * as ImagePicker from 'expo-image-picker';
import { InteractionManager, Platform } from 'react-native';

function wait(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}
async function afterInteractions(){await new Promise<void>(resolve=>InteractionManager.runAfterInteractions(()=>resolve()));}

export async function pickProfileImage(){
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!permission.granted) return {permissionDenied:true as const,asset:null};
  await afterInteractions();
  if(Platform.OS==='android') await wait(180);
  const options:ImagePicker.ImagePickerOptions={mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.82};
  try{
    const result=await ImagePicker.launchImageLibraryAsync(options);
    return {permissionDenied:false as const,asset:result.canceled?null:result.assets?.[0]??null};
  }catch(error:any){
    const message=String(error?.message||error||'');
    if(Platform.OS==='android'&&/ActivityResultLauncher|unregistered|launchImageLibraryAsync/i.test(message)){
      await afterInteractions();
      await wait(500);
      const retry=await ImagePicker.launchImageLibraryAsync(options);
      return {permissionDenied:false as const,asset:retry.canceled?null:retry.assets?.[0]??null};
    }
    throw error;
  }
}
