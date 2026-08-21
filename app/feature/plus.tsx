import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ExpoIAP from 'expo-iap';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { hasPlusEntitlement, loadLiveDashboard } from '@/src/lib/drabornpark';
import { DKD_PLUS_MONTHLY, DKD_PLUS_PRODUCT_IDS, DKD_PLUS_YEARLY, verifyGooglePlaySubscription } from '@/src/lib/v060';
import { palette, radius, type } from '@/src/theme';

const dkdUseIAP:any=(ExpoIAP as any).useIAP;
const DKD_FEATURES=[
  ['account-group-outline','Aile Paylaşımı','Aile üyeleriyle izin bazlı park ve bildirim paylaşımı.',palette.purple],
  ['account-clock-outline','Geçici Sürücü','Belirlediğin süre boyunca bildirim yönlendirme.',palette.cyan],
  ['car-key','Vale / Servis Modu','Araç teslimi ve servis süreci durum yönetimi.',palette.orange],
  ['calendar-clock-outline','Zaman Kuralları','Gün ve saate göre akıllı iletişim yönlendirmesi.',palette.pink],
  ['shield-alert-outline','Acil Durum Zinciri','Öncelikli kişilerle hızlı güvenlik akışı.',palette.red],
  ['history','Gelişmiş Araç Geçmişi','Araç olaylarını daha ayrıntılı inceleme.',palette.blue],
  ['chart-donut','Aylık Akıllı Özet','Park ve bildirim kullanımının anlaşılır aylık özeti.',palette.green],
] as const;

export default function DkdPlusScreen(){
  const [dkdData,setDkdData]=useState<any>(null);
  const [dkdBusySku,setDkdBusySku]=useState<string|null>(null);
  const [dkdStoreError,setDkdStoreError]=useState('');
  const [dkdRestoring,setDkdRestoring]=useState(false);
  const dkdSelectedPlan=useRef<{productId:string;basePlanId:string|null}|null>(null);
  const dkdSeenTokens=useRef(new Set<string>());
  const dkdRestoreRequested=useRef(false);
  const dkdPulse=useRef(new Animated.Value(0)).current;
  const dkdSweep=useRef(new Animated.Value(0)).current;

  const dkdRefreshDashboard=useCallback(async()=>setDkdData(await loadLiveDashboard()),[]);

  const dkdIap:any=dkdUseIAP({
    onPurchaseSuccess:async(dkdPurchase:any)=>{
      try{
        const dkdProductId=String(dkdPurchase?.productId||dkdSelectedPlan.current?.productId||'');
        const dkdPurchaseToken=String(dkdPurchase?.purchaseToken||'');
        if(Platform.OS==='android'&&!dkdPurchaseToken)throw new Error('Google Play satın alma tokenı alınamadı.');
        if(Platform.OS==='android'){
          await verifyGooglePlaySubscription({productId:dkdProductId,purchaseToken:dkdPurchaseToken,basePlanId:dkdSelectedPlan.current?.basePlanId||null});
          dkdSeenTokens.current.add(dkdPurchaseToken);
        }
        if(dkdIap?.finishTransaction)await dkdIap.finishTransaction({purchase:dkdPurchase,isConsumable:false});
        await dkdRefreshDashboard();
        Alert.alert('DraBornPark+ aktif','Google Play aboneliğin sunucuda doğrulandı ve Premium özelliklerin açıldı.');
      }catch(dkdError:any){Alert.alert('Satın alma doğrulanamadı',dkdError?.message||'İşlem tamamlanamadı. Satın alma kaydın kaybolmaz; Geri Yükle ile yeniden doğrulayabilirsin.');}
      finally{setDkdBusySku(null)}
    },
    onPurchaseError:(dkdError:any)=>{
      setDkdBusySku(null);
      const dkdMessage=String(dkdError?.message||'Satın alma tamamlanmadı.');
      if(!/cancel|user cancelled|canceled/i.test(dkdMessage))Alert.alert('Google Play işlemi',dkdMessage);
    },
  });

  useEffect(()=>{dkdRefreshDashboard().catch(()=>router.replace('/auth'))},[dkdRefreshDashboard]);
  useEffect(()=>{const dkdA=Animated.loop(Animated.sequence([Animated.timing(dkdPulse,{toValue:1,duration:1050,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(dkdPulse,{toValue:0,duration:1050,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));const dkdB=Animated.loop(Animated.timing(dkdSweep,{toValue:1,duration:3300,easing:Easing.linear,useNativeDriver:true}));dkdA.start();dkdB.start();return()=>{dkdA.stop();dkdB.stop()}},[dkdPulse,dkdSweep]);

  useEffect(()=>{
    if(!dkdIap?.connected||Platform.OS!=='android')return;
    setDkdStoreError('');
    const dkdFetch=dkdIap.fetchProducts||dkdIap.requestProducts;
    if(dkdFetch)Promise.resolve(dkdFetch({skus:[...DKD_PLUS_PRODUCT_IDS],type:'subs'})).catch((dkdError:any)=>setDkdStoreError(String(dkdError?.message||'Google Play ürünleri alınamadı.')));
    if(dkdIap.getAvailablePurchases)Promise.resolve(dkdIap.getAvailablePurchases()).catch(()=>{});
  },[dkdIap?.connected]);

  const dkdSyncAvailable=useCallback(async(dkdRows:any[],dkdShowResult:boolean)=>{
    if(Platform.OS!=='android')return;
    let dkdVerified=0;
    for(const dkdPurchase of dkdRows||[]){
      const dkdProductId=String(dkdPurchase?.productId||'');
      const dkdToken=String(dkdPurchase?.purchaseToken||'');
      if(!DKD_PLUS_PRODUCT_IDS.includes(dkdProductId as any)||!dkdToken||dkdSeenTokens.current.has(dkdToken))continue;
      try{
        await verifyGooglePlaySubscription({productId:dkdProductId,purchaseToken:dkdToken});
        dkdSeenTokens.current.add(dkdToken);dkdVerified++;
        if(dkdIap?.finishTransaction)await dkdIap.finishTransaction({purchase:dkdPurchase,isConsumable:false});
      }catch(dkdError:any){setDkdStoreError(String(dkdError?.message||'Abonelik doğrulaması tamamlanamadı.'));}
    }
    if(dkdVerified)await dkdRefreshDashboard();
    if(dkdShowResult)Alert.alert(dkdVerified?'Satın alma geri yüklendi':'Aktif satın alma bulunamadı',dkdVerified?'Google Play aboneliğin yeniden doğrulandı ve DraBornPark+ hakkın güncellendi.':'Bu Google Play hesabında doğrulanabilir aktif DraBornPark+ aboneliği bulunamadı.');
  },[dkdIap,dkdRefreshDashboard]);

  useEffect(()=>{
    const dkdRows=Array.isArray(dkdIap?.availablePurchases)?dkdIap.availablePurchases:[];
    if(!dkdRows.length)return;
    const dkdShow=dkdRestoreRequested.current;dkdRestoreRequested.current=false;setDkdRestoring(false);
    void dkdSyncAvailable(dkdRows,dkdShow);
  },[dkdIap?.availablePurchases,dkdSyncAvailable]);

  const dkdSubscriptions:any[]=Array.isArray(dkdIap?.subscriptions)?dkdIap.subscriptions:[];
  const dkdById=(dkdId:string)=>dkdSubscriptions.find((dkdItem:any)=>String(dkdItem?.id||dkdItem?.productId)===dkdId);
  const dkdPrice=(dkdId:string)=>{const dkdProduct=dkdById(dkdId);return String(dkdProduct?.displayPrice||dkdProduct?.localizedPrice||dkdProduct?.price||'Google Play fiyatı');};
  const dkdOffer=(dkdProduct:any)=>{const dkdOffers=dkdProduct?.subscriptionOfferDetailsAndroid||dkdProduct?.subscriptionOffers||dkdProduct?.subscriptionOfferDetails||[];return Array.isArray(dkdOffers)?dkdOffers[0]:null;};

  async function dkdBuy(dkdProductId:string){
    if(Platform.OS!=='android'){Alert.alert('Google Play','DraBornPark+ satın alma Android Google Play üzerinden hazırlanmıştır.');return;}
    if(!dkdIap?.connected){Alert.alert('Google Play bağlanıyor','Mağaza bağlantısı henüz hazır değil. Birkaç saniye sonra tekrar dene.');return;}
    const dkdProduct=dkdById(dkdProductId);
    if(!dkdProduct){Alert.alert('Plan mağazada görünmüyor','Google Play Console’da DraBornPark+ ürünü ve base plan aktif olduğunda fiyat ve satın alma düğmesi otomatik bağlanır.');return;}
    const dkdFirstOffer=dkdOffer(dkdProduct);const dkdOfferToken=dkdFirstOffer?.offerToken||dkdFirstOffer?.offerTokenAndroid;const dkdBasePlanId=dkdFirstOffer?.basePlanId||dkdFirstOffer?.basePlanIdAndroid||null;
    if(!dkdOfferToken){Alert.alert('Google Play planı hazır değil','Android aboneliği için etkin bir base plan / teklif bulunamadı. Play Console ürün yapılandırmasını kontrol et.');return;}
    dkdSelectedPlan.current={productId:dkdProductId,basePlanId:dkdBasePlanId};setDkdBusySku(dkdProductId);
    try{await dkdIap.requestPurchase({request:{google:{skus:[dkdProductId],subscriptionOffers:[{sku:dkdProductId,offerToken:dkdOfferToken}]}},type:'subs'});}catch(dkdError:any){setDkdBusySku(null);Alert.alert('Satın alma başlatılamadı',dkdError?.message||'Google Play işlemi açılamadı.');}
  }

  async function dkdRestore(){
    if(Platform.OS!=='android'||!dkdIap?.connected||!dkdIap?.getAvailablePurchases){Alert.alert('Google Play bağlanıyor','Geri yükleme için Google Play bağlantısının hazır olması gerekiyor.');return;}
    dkdSeenTokens.current.clear();dkdRestoreRequested.current=true;setDkdRestoring(true);
    try{
      await dkdIap.getAvailablePurchases();
      setTimeout(()=>{if(dkdRestoreRequested.current){dkdRestoreRequested.current=false;setDkdRestoring(false);Alert.alert('Aktif satın alma bulunamadı','Bu Google Play hesabında doğrulanabilir aktif DraBornPark+ aboneliği bulunamadı.');}},1500);
    }catch(dkdError:any){dkdRestoreRequested.current=false;setDkdRestoring(false);Alert.alert('Geri yükleme başarısız',dkdError?.message||'Google Play satın almaları alınamadı.');}
  }

  const dkdPlus=useMemo(()=>dkdData?hasPlusEntitlement(dkdData.profile,dkdData.subscription):false,[dkdData]);
  if(!dkdData)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.yellow}/><View style={s.loading}><ActivityIndicator color={palette.yellow}/><Text style={s.loadingText}>DraBornPark+ hazırlanıyor…</Text></View></SafeAreaView>;
  const dkdTrialUntil=dkdData.profile?.plus_trial_until?new Date(dkdData.profile.plus_trial_until):null;const dkdTrialActive=String(dkdData.profile?.subscription_status)==='PLUS_TRIAL'&&dkdTrialUntil&&dkdTrialUntil.getTime()>Date.now();
  const dkdSubscription=dkdData.subscription;const dkdSubStatus=String(dkdSubscription?.status||'').toUpperCase();

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.yellow} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="DraBornPark+" eyebrow="PREMIUM EXPERIENCE" accent={palette.yellow} subtitle="Aile, paylaşım, otomasyon ve gelişmiş araç özelliklerini tek üyelikte yönet."/>
    <Animated.View style={[s.hero,{transform:[{scale:dkdPulse.interpolate({inputRange:[0,1],outputRange:[1,1.012]})}]}]}><Animated.View pointerEvents="none" style={[s.sweep,{transform:[{translateX:dkdSweep.interpolate({inputRange:[0,1],outputRange:[-180,720]})},{rotate:'15deg'}]}]}/><View style={s.spectrum}>{[palette.yellow,palette.cyan,palette.pink,palette.purple,palette.green].map(dkdColor=><View key={dkdColor} style={[s.bar,{backgroundColor:dkdColor}]}/>)}</View><View style={s.crown}><MaterialCommunityIcons name="crown" size={48} color={palette.yellow}/></View><View style={{flex:1}}><Text style={s.kicker}>{dkdPlus?'PREMIUM AKTİF':'BASIC + PREMIUM'}</Text><Text style={s.heroTitle}>{dkdTrialActive?'14 günlük Premium hediyen aktif':dkdPlus?'DraBornPark+ aktif':'Aracının Premium katmanı'}</Text><Text style={s.heroBody}>{dkdTrialActive&&dkdTrialUntil?`Ödül bitişi: ${dkdTrialUntil.toLocaleString('tr-TR')}`:dkdPlus&&dkdSubStatus?`Google Play durumu: ${dkdSubStatus}`:'Basic NFC + QR güvenlik işlevlerin abonelik sona erse bile devam eder.'}</Text></View></Animated.View>

    <SectionHeading title="Planını seç" subtitle="Fiyatı ve yenileme bilgisini Google Play belirler" color={palette.yellow}/>
    <View style={s.plans}><DkdPlan title="Aylık" badge="ESNEK" price={dkdPrice(DKD_PLUS_MONTHLY)} detail="Her ay yenilenir • Google Play’den yönetilebilir veya iptal edilebilir" color={palette.cyan} busy={dkdBusySku===DKD_PLUS_MONTHLY} onPress={()=>dkdBuy(DKD_PLUS_MONTHLY)}/><DkdPlan title="Yıllık" badge="AVANTAJLI" price={dkdPrice(DKD_PLUS_YEARLY)} detail="12 aylık Premium • yıllık mağaza fiyatı etkin base plan üzerinden gelir" color={palette.yellow} busy={dkdBusySku===DKD_PLUS_YEARLY} onPress={()=>dkdBuy(DKD_PLUS_YEARLY)}/></View>
    <Pressable disabled={dkdRestoring} onPress={dkdRestore} style={[s.restore,dkdRestoring&&{opacity:.6}]}>{dkdRestoring?<ActivityIndicator color={palette.cyan}/>:<MaterialCommunityIcons name="restore" size={23} color={palette.cyan}/>}<View style={{flex:1}}><Text style={s.restoreTitle}>SATIN ALMALARI GERİ YÜKLE</Text><Text style={s.restoreBody}>Yeni cihaz, yeniden kurulum veya yarım kalan doğrulamada Google Play hakkını tekrar eşleştir.</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color={palette.cyan}/></Pressable>
    {dkdStoreError?<View style={s.note}><MaterialCommunityIcons name="google-play" size={23} color={palette.orange}/><Text style={s.noteText}>{dkdStoreError}</Text></View>:null}

    <View style={s.basic}><MaterialCommunityIcons name="shield-check-outline" size={27} color={palette.green}/><View style={{flex:1}}><Text style={s.basicTitle}>Basic güvencen kalıcı</Text><Text style={s.basicBody}>Etiket kimliği, temel NFC + QR araç iletişimi ve güvenlik bağlantısı Premium sona erdiğinde kapanmaz.</Text></View></View>

    <SectionHeading title="DraBornPark+ ile açılanlar" subtitle="Gerçek uygulama özellikleri • üyelik yetkisiyle korunur" color={palette.purple}/>
    <View style={s.features}>{DKD_FEATURES.map(([dkdIcon,dkdTitle,dkdBody,dkdColor])=><View key={dkdTitle} style={s.feature}><View style={[s.featureIcon,{backgroundColor:`${dkdColor}18`}]}><MaterialCommunityIcons name={dkdIcon as any} size={25} color={dkdColor}/></View><View style={{flex:1}}><Text style={s.featureTitle}>{dkdTitle}</Text><Text style={s.featureBody}>{dkdBody}</Text></View><MaterialCommunityIcons name={dkdPlus?'check-circle':'lock-outline'} size={22} color={dkdPlus?palette.green:palette.muted2}/></View>)}</View>

    <SectionHeading title="Satın alma güvenliği" subtitle="Premium hakkı doğrulanmış mağaza durumundan verilir" color={palette.green}/>
    <View style={s.security}><DkdSecurity icon="google-play" title="Google Play ödeme" body="Kart ve ödeme bilgileri DraBornPark sunucusuna gelmez; ödeme Google Play tarafından işlenir."/><DkdSecurity icon="server-security" title="Sunucu doğrulaması" body="Satın alma tokenı Google Play Developer API ile doğrulanmadan Premium yetkisi açılmaz."/><DkdSecurity icon="fingerprint" title="Token güvenliği" body="Satın alma tokenının açık değeri kalıcı tabloda tutulmaz; doğrulama kaydında SHA-256 özeti kullanılır."/><DkdSecurity icon="restore" title="Geri yükleme" body="Aktif Google Play satın almaları yeni cihazda yeniden doğrulanabilir ve üyelik hakkı geri getirilebilir."/></View>
  </ScrollView></SafeAreaView>;
}

function DkdPlan({title,badge,price,detail,color,busy,onPress}:{title:string;badge:string;price:string;detail:string;color:string;busy:boolean;onPress:()=>void}){return <View style={[s.plan,{borderColor:`${color}65`,backgroundColor:`${color}0F`}]}><View style={s.planTop}><View style={[s.planIcon,{backgroundColor:`${color}20`}]}><MaterialCommunityIcons name={title==='Yıllık'?'crown-outline':'calendar-month-outline'} size={27} color={color}/></View><View style={[s.planBadge,{borderColor:`${color}55`}]}><Text style={[s.planBadgeText,{color}]}>{badge}</Text></View></View><Text style={s.planTitle}>{title}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.planPrice,{color}]}>{price}</Text><Text style={s.planDetail}>{detail}</Text><Pressable disabled={busy} onPress={onPress} style={[s.planButton,{backgroundColor:color},busy&&{opacity:.6}]}>{busy?<ActivityIndicator color={palette.ink}/>:<><Text style={s.planButtonText}>GOOGLE PLAY İLE SEÇ</Text><MaterialCommunityIcons name="arrow-right" size={19} color={palette.ink}/></>}</Pressable></View>}
function DkdSecurity({icon,title,body}:{icon:any;title:string;body:string}){return <View style={s.securityRow}><View style={s.securityIcon}><MaterialCommunityIcons name={icon} size={23} color={palette.green}/></View><View style={{flex:1}}><Text style={s.securityTitle}>{title}</Text><Text style={s.securityBody}>{body}</Text></View></View>}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:70},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},loadingText:{color:palette.muted,fontSize:type.body},hero:{minHeight:192,borderRadius:32,borderWidth:1,borderColor:`${palette.yellow}65`,backgroundColor:'#1D1A19',padding:20,flexDirection:'row',alignItems:'center',gap:15,overflow:'hidden'},sweep:{position:'absolute',top:-70,bottom:-70,width:120,backgroundColor:'#FFFFFF0E'},spectrum:{position:'absolute',left:18,right:18,top:0,height:5,flexDirection:'row',gap:4},bar:{flex:1,borderRadius:99},crown:{width:82,height:82,borderRadius:28,borderWidth:1,borderColor:`${palette.yellow}70`,backgroundColor:`${palette.yellow}1A`,alignItems:'center',justifyContent:'center'},kicker:{color:palette.yellow,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',lineHeight:30,marginTop:5},heroBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:6},plans:{flexDirection:'row',gap:10},plan:{flex:1,minHeight:292,borderRadius:26,borderWidth:1,padding:15},planTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},planIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center'},planBadge:{borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:5},planBadgeText:{fontSize:9,fontWeight:'900'},planTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:15},planPrice:{fontSize:20,fontWeight:'900',marginTop:5},planDetail:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:7,flex:1},planButton:{minHeight:53,borderRadius:17,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},planButtonText:{color:palette.ink,fontSize:10,fontWeight:'900',textAlign:'center'},restore:{minHeight:82,borderRadius:22,borderWidth:1,borderColor:`${palette.cyan}48`,backgroundColor:`${palette.cyan}0A`,padding:14,marginTop:11,flexDirection:'row',alignItems:'center',gap:11},restoreTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},restoreBody:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:3},note:{marginTop:10,borderRadius:18,borderWidth:1,borderColor:`${palette.orange}40`,backgroundColor:`${palette.orange}0A`,padding:13,flexDirection:'row',gap:10},noteText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19},basic:{marginTop:13,borderRadius:22,borderWidth:1,borderColor:`${palette.green}45`,backgroundColor:`${palette.green}0D`,padding:16,flexDirection:'row',gap:12},basicTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},basicBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},features:{borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.purple}40`,backgroundColor:palette.panel,paddingHorizontal:15},feature:{minHeight:86,borderBottomWidth:1,borderBottomColor:palette.lineSoft,flexDirection:'row',alignItems:'center',gap:12},featureIcon:{width:49,height:49,borderRadius:16,alignItems:'center',justifyContent:'center'},featureTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},featureBody:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:3},security:{gap:9},securityRow:{minHeight:92,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}35`,backgroundColor:`${palette.green}08`,padding:14,flexDirection:'row',alignItems:'center',gap:12},securityIcon:{width:50,height:50,borderRadius:17,backgroundColor:`${palette.green}18`,alignItems:'center',justifyContent:'center'},securityTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},securityBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4}});
