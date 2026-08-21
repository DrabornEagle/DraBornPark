import * as ExpoIAP from 'expo-iap';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { DKD_PLUS_PRODUCT_IDS, verifyGooglePlaySubscription } from '@/src/lib/v060';

const dkdUseIAP:any=(ExpoIAP as any).useIAP;

export function DkdPlayEntitlementSync(){
  const dkdSeen=useRef(new Set<string>());
  const dkdIap:any=dkdUseIAP();

  useEffect(()=>{
    if(Platform.OS!=='android'||!dkdIap?.connected||!dkdIap?.getAvailablePurchases)return;
    void Promise.resolve(dkdIap.getAvailablePurchases()).catch(()=>{});
  },[dkdIap?.connected]);

  useEffect(()=>{
    if(Platform.OS!=='android')return;
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
  },[dkdIap?.availablePurchases,dkdIap]);

  return null;
}
