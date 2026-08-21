import * as ImagePicker from 'expo-image-picker';
import { AppState, InteractionManager, Platform } from 'react-native';

function dkdWait(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}
async function dkdAfterInteractions(){await new Promise<void>(resolve=>InteractionManager.runAfterInteractions(()=>resolve()));}
async function dkdWaitForActiveActivity(timeoutMs=3500){
  if(Platform.OS!=='android'||AppState.currentState==='active')return;
  await new Promise<void>(resolve=>{
    let dkdDone=false;
    const dkdFinish=()=>{if(dkdDone)return;dkdDone=true;dkdSub.remove();clearTimeout(dkdTimer);resolve();};
    const dkdSub=AppState.addEventListener('change',dkdState=>{if(dkdState==='active')dkdFinish();});
    const dkdTimer=setTimeout(dkdFinish,timeoutMs);
  });
}
async function dkdPreparePickerLaunch(){await dkdWaitForActiveActivity();await dkdAfterInteractions();if(Platform.OS==='android')await dkdWait(260);}

export async function pickProfileImage(){
  await dkdWaitForActiveActivity();
  const dkdPermission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!dkdPermission.granted)return {permissionDenied:true as const,asset:null};
  const dkdOptions:ImagePicker.ImagePickerOptions={mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.82};
  await dkdPreparePickerLaunch();
  try{
    const dkdResult=await ImagePicker.launchImageLibraryAsync(dkdOptions);
    return {permissionDenied:false as const,asset:dkdResult.canceled?null:dkdResult.assets?.[0]??null};
  }catch(dkdError:any){
    const dkdMessage=String(dkdError?.message||dkdError||'');
    if(Platform.OS==='android'&&/ActivityResultLauncher|unregistered|launchImageLibraryAsync|IllegalStateException/i.test(dkdMessage)){
      await dkdWaitForActiveActivity();await dkdAfterInteractions();await dkdWait(800);
      const dkdRetry=await ImagePicker.launchImageLibraryAsync(dkdOptions);
      return {permissionDenied:false as const,asset:dkdRetry.canceled?null:dkdRetry.assets?.[0]??null};
    }
    throw dkdError;
  }
}
