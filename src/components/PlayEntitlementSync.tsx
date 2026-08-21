import * as ExpoIAP from 'expo-iap';
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { DKD_PLUS_PRODUCT_IDS, verifyGooglePlaySubscription } from '@/src/lib/v060';
import { supabase } from '@/src/lib/supabase';

const dkdUseIAP:any=(ExpoIAP as any).useIAP;

export function DkdPlayEntitlementSync(){
  const [dkdUserId,setDkdUserId]=useState<string|null>(null);
  const dkdSeen=useRef(new Set<string>());
  const dkdIap:any=dkdUseIAP();

  useEffect(()=>{
    let dkdMounted=true;
    supabase.auth.getSession().then(({data})=>{if(dkdMounted)setDkdUserId(data.session?.user?.id||null)}).catch(()=>{});
    const {data:dkdAuth}=supabase.auth.onAuthStateChange((_dkdEvent,dkdSession)=>{if(dkdMounted){dkdSeen.current.clear();setDkdUserId(dkdSession?.user?.id||null);}});
    return()=>{dkdMounted=false;dkdAuth.subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    if(Platform.OS!=='android'||!dkdUserId||!dkdIap?.connected||!dkdIap?.getAvailablePurchases)return;
    void Promise.resolve(dkdIap.getAvailablePurchases()).catch(()=>{});
  },[dkdIap?.connected,dkdUserId]);

  useEffect(()=>{
    if(Platform.OS!=='android'||!dkdUserId)return;
    const dkdRows=Array.isArray(dkdIap?.availablePurchases)?dkdIap.availablePurchases:[];
    for(const dkdPurchase of dkdRows){
      const dkdProductId=String(dkdPurchase?.productId||'');
      const dkdToken=String(dkdPurchase?.purchaseToken||'');
      if(!DKD_PLUS_PRODUCT_IDS.includes(dkdProductId as any)||!dkdToken||dkdSeen.current.has(dkdToken))continue;
      dkdSeen.current.add(dkdToken);
      void (async()=>{
        try{
          await verifyGooglePlaySubscription({productId:dkdProductId,purchaseToken:dkdToken});
          if(dkdIap?.finishTransaction)await dkdIap.finishTransaction({purchase:dkdPurchase,isConsumable:false});
        }catch(dkdError:any){
          console.warn('[DraBornPark Play sync]',String(dkdError?.message||dkdError));
          dkdSeen.current.delete(dkdToken);
        }
      })();
    }
  },[dkdIap?.availablePurchases,dkdIap,dkdUserId]);

  return null;
}
