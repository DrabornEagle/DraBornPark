import {router,usePathname} from 'expo-router';
import React,{useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {ColorPopup} from '@/src/components/ColorPopup';
import {hasPlusEntitlement,loadLiveDashboard} from '@/src/lib/drabornpark';
import {palette} from '@/src/theme';

const DKD_PREMIUM_ROUTES=['/family','/guest','/modes','/routing','/emergency','/timeline','/insights'];

type DkdGateState='idle'|'checking'|'allowed'|'blocked';

export function PremiumRouteGuard(){
  const pathname=usePathname();
  const dkd_requires_plus=useMemo(()=>DKD_PREMIUM_ROUTES.some(dkd_route=>pathname===dkd_route||pathname.startsWith(dkd_route+'/')),[pathname]);
  const [dkd_state,setDkdState]=useState<DkdGateState>('idle');

  useEffect(()=>{
    let dkd_alive=true;
    if(!dkd_requires_plus){setDkdState('idle');return()=>{dkd_alive=false};}
    setDkdState('checking');
    void loadLiveDashboard().then(dkd_dashboard=>{
      if(!dkd_alive)return;
      setDkdState(hasPlusEntitlement(dkd_dashboard.profile,dkd_dashboard.subscription)?'allowed':'blocked');
    }).catch(()=>{if(dkd_alive)setDkdState('blocked')});
    return()=>{dkd_alive=false};
  },[dkd_requires_plus,pathname]);

  if(!dkd_requires_plus||dkd_state==='allowed'||dkd_state==='idle')return null;
  return <>
    {dkd_state==='checking'?<View style={s.blocker}><View style={s.checkCard}><ActivityIndicator color={palette.yellow} size="large"/><Text style={s.checkTitle}>DraBornPark+ kontrol ediliyor</Text><Text style={s.checkBody}>Premium erişimin Google Play üzerinden doğrulanıyor.</Text></View></View>:null}
    <ColorPopup visible={dkd_state==='blocked'} icon="crown-outline" eyebrow="DRABORNPARK+ GEREKLİ" title="Bu özellik Premium üyelikle açılır" body="Aktif DraBornPark+ aboneliğin bulunamadı. Aile, Geçici Sürücü, Vale / Servis, Zaman Kuralları, Acil Durum Zinciri, Gelişmiş Araç Geçmişi ve Aylık Özet için DraBornPark+ üyeliği gerekir." accent={palette.yellow} secondary={palette.purple} primaryLabel="DRABORNPARK+'A GİT" onPrimary={()=>{setDkdState('idle');router.replace('/feature/plus')}} secondaryLabel="MERKEZİME DÖN" onSecondary={()=>{setDkdState('idle');router.replace('/hub')}} chips={['PREMIUM ERİŞİM','GOOGLE PLAY','GÜVENLİ DOĞRULAMA']}/>
  </>;
}

const s=StyleSheet.create({blocker:{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:9998,elevation:9998,backgroundColor:'rgba(5,8,22,.94)',alignItems:'center',justifyContent:'center',padding:26},checkCard:{width:'100%',maxWidth:420,borderWidth:1,borderColor:palette.yellow+'55',backgroundColor:palette.panel,borderRadius:28,padding:24,alignItems:'center'},checkTitle:{color:palette.text,fontSize:20,fontWeight:'900',marginTop:14,textAlign:'center'},checkBody:{color:palette.muted,fontSize:13,lineHeight:20,marginTop:6,textAlign:'center'}});
