import {Redirect,useLocalSearchParams} from 'expo-router';
import React from 'react';

export default function DkdPublicShortTagRoute(){
  const dkd_params=useLocalSearchParams<{slug?:string}>();
  const dkd_slug=String(dkd_params.slug||'').trim();
  return <Redirect href={`/DraBornPark/t/${encodeURIComponent(dkd_slug)}` as any}/>;
}
