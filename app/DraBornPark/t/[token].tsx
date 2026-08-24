import {Redirect,useLocalSearchParams} from 'expo-router';
import React from 'react';

export default function DkdLegacyPublicTagRedirect(){
  const dkd_params=useLocalSearchParams<{token?:string}>();
  const dkd_token=String(dkd_params.token||'').trim();
  return <Redirect href={`/t/${encodeURIComponent(dkd_token)}` as any}/>;
}
