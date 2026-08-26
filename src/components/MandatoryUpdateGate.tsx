import Constants from 'expo-constants';
import {Linking,Platform} from 'react-native';
import React,{useCallback,useEffect,useState} from 'react';
import {ColorPopup} from '@/src/components/ColorPopup';
import {palette} from '@/src/theme';

const DKD_PLAY_URL='https://play.google.com/store/apps/details?id=com.draborneagle.drabornpark';
const DKD_VERSION_ENDPOINT='https://xpdiwyxnnrmyvpcqwuyb.supabase.co/functions/v1/dkd-drabornpark-app-version';

type DkdVersionPayload={
  latestVersion?:string;
  latestVersionCode?:number;
  minimumVersionCode?:number;
  forceUpdateBelow?:number;
  message?:string;
  playUrl?:string;
};

function dkdCurrentVersionCode(){
  const dkdExpoCode=Number(Constants.expoConfig?.android?.versionCode??0);
  const dkdManifestCode=Number((Constants as any)?.manifest2?.extra?.expoClient?.android?.versionCode??0);
  return Number.isFinite(dkdExpoCode)&&dkdExpoCode>0?dkdExpoCode:(Number.isFinite(dkdManifestCode)?dkdManifestCode:0);
}

export function MandatoryUpdateGate(){
  const [dkdVisible,setDkdVisible]=useState(false);
  const [dkdLatestVersion,setDkdLatestVersion]=useState('');
  const [dkdMessage,setDkdMessage]=useState('DraBornPark için yeni bir sürüm yayınlandı. Devam etmek için uygulamayı Google Play üzerinden güncellemelisin.');
  const [dkdPlayUrl,setDkdPlayUrl]=useState(DKD_PLAY_URL);

  const dkdCheck=useCallback(async()=>{
    if(Platform.OS!=='android')return;
    try{
      const dkdResponse=await fetch(`${DKD_VERSION_ENDPOINT}?dkd=${Date.now()}`,{headers:{Accept:'application/json','Cache-Control':'no-cache'}});
      if(!dkdResponse.ok)return;
      const dkdPayload:DkdVersionPayload=await dkdResponse.json();
      const dkdCurrent=dkdCurrentVersionCode();
      const dkdMinimum=Number(dkdPayload.minimumVersionCode??dkdPayload.forceUpdateBelow??0);
      if(dkdPayload.latestVersion)setDkdLatestVersion(String(dkdPayload.latestVersion));
      if(dkdPayload.message)setDkdMessage(String(dkdPayload.message));
      if(dkdPayload.playUrl)setDkdPlayUrl(String(dkdPayload.playUrl));
      setDkdVisible(Boolean(dkdCurrent>0&&dkdMinimum>0&&dkdCurrent<dkdMinimum));
    }catch(error){
      console.warn('[DraBornPark update]',String((error as any)?.message||error));
    }
  },[]);

  useEffect(()=>{void dkdCheck();},[dkdCheck]);
  const dkdOpenStore=()=>{void Linking.openURL(dkdPlayUrl||DKD_PLAY_URL).catch(error=>console.warn('[DraBornPark update store]',String((error as any)?.message||error)));};

  return <ColorPopup
    visible={dkdVisible}
    icon="cellphone-arrow-down"
    eyebrow="ZORUNLU GÜNCELLEME"
    title="Yeni DraBornPark sürümü hazır"
    body={dkdMessage}
    accent={palette.yellow}
    secondary={palette.cyan}
    primaryLabel="GÜNCELLE"
    onPrimary={dkdOpenStore}
    chips={['GOOGLE PLAY',dkdLatestVersion?`v${dkdLatestVersion}`:'YENİ SÜRÜM','GÜVENLİ GÜNCELLEME']}
  />;
}
