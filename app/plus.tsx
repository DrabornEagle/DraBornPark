import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ExpoIAP from 'expo-iap';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { hasPlusEntitlement, loadLiveDashboard } from '@/src/lib/drabornpark';
import { DKD_PLUS_MONTHLY, DKD_PLUS_PRODUCT_IDS, DKD_PLUS_YEARLY, verifyGooglePlaySubscription } from '@/src/lib/v060';
import { palette, radius, type } from '@/src/theme';

const useIAP:any=(ExpoIAP as any).useIAP;
const finishTransaction:any=(ExpoIAP as any).finishTransaction;

const FEATURES=[
  ['account-group-outline','Aile Paylaşımı','Aile üyeleriyle izin bazlı park ve bildirim paylaşımı.'],
  ['account-clock-outline','Geçici Sürücü','Belirlediğin süre boyunca bildirim yönlendirme.'],
  ['car-key','Vale / Servis Modu','Araç teslimi, servis süreci ve durum takibi.'],
  ['calendar-clock-outline','Zaman Kuralları','Gün ve saate göre akıllı iletişim yönlendirmesi.'],
  ['shield-alert-outline','Acil Durum Zinciri','Öncelikli kişilerle hızlı güvenlik akışı.'],
  ['history','Gelişmiş Araç Geçmişi','Olayları ve araç hareketlerini daha detaylı inceleme.'],
  ['chart-donut','Aylık Akıllı Özet','Park ve bildirim kullanımının anlaşılır aylık özeti.'],
];

export default function PlusScreen(){
  const [data,setData]=useState<any>(null);const [busySku,setBusySku]=useState<string|null>(null);const [storeError,setStoreError]=useState('');const selectedPlan=useRef<{productId:string;basePlanId:string|null}|null>(null);const pulse=useRef(new Animated.Value(0)).current;const sweep=useRef(new Animated.Value(0)).current;
  const iap:any=useIAP({
    onPurchaseSuccess:async(purchase:any)=>{
      try{
        const productId=String(purchase?.productId||selectedPlan.current?.productId||'');
        const purchaseToken=String(purchase?.purchaseToken||'');
        if(Platform.OS==='android'&&!purchaseToken)throw new Error('Google Play satın alma tokenı alınamadı.');
        if(Platform.OS==='android')await verifyGooglePlaySubscription({productId,purchaseToken,basePlanId:selectedPlan.current?.basePlanId||null});
        if(finishTransaction)await finishTransaction({purchase,isConsumable:false});
        const fresh=await loadLiveDashboard();setData(fresh);Alert.alert('DraBornPark+ aktif','Google Play aboneliğin doğrulandı ve Premium özelliklerin açıldı.');
      }catch(error:any){Alert.alert('Satın alma doğrulanamadı',error?.message||'İşlem tamamlanamadı. Satın alma kaydın kaybolmaz; tekrar doğrulanabilir.');}
      finally{setBusySku(null)}
    },
    onPurchaseError:(error:any)=>{setBusySku(null);const message=String(error?.message||'Satın alma tamamlanmadı.');if(!/cancel/i.test(message))Alert.alert('Google Play işlemi',message);}
  });
  useEffect(()=>{loadLiveDashboard().then(setData).catch(()=>router.replace('/auth'))},[]);
  useEffect(()=>{const a=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:1100,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:1100,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));const b=Animated.loop(Animated.timing(sweep,{toValue:1,duration:3200,easing:Easing.linear,useNativeDriver:true}));a.start();b.start();return()=>{a.stop();b.stop()}},[pulse,sweep]);
  useEffect(()=>{if(!iap?.connected)return;const fetcher=iap.fetchProducts||iap.requestProducts;if(!fetcher)return;Promise.resolve(fetcher({skus:[...DKD_PLUS_PRODUCT_IDS],type:'subs'})).catch((error:any)=>setStoreError(String(error?.message||'Google Play ürünleri alınamadı.')))},[iap?.connected]);
  const plus=useMemo(()=>data?hasPlusEntitlement(data.profile,data.subscription):false,[data]);
  const subscriptions:any[]=iap?.subscriptions||[];
  const byId=(id:string)=>subscriptions.find((x:any)=>String(x?.id||x?.productId)===id);
  function priceFor(id:string,fallback:string){const p=byId(id);return p?.displayPrice||p?.localizedPrice||p?.price||fallback;}
  function firstOffer(product:any){const offers=product?.subscriptionOfferDetailsAndroid||product?.subscriptionOffers||product?.subscriptionOfferDetails||[];return Array.isArray(offers)?offers[0]:null;}
  async function buy(productId:string){
    if(Platform.OS!=='android'){Alert.alert('Google Play','Bu sürümde abonelik satın alma Android Google Play üzerinden hazırlanmıştır.');return;}
    if(!iap?.connected){Alert.alert('Google Play bağlanıyor','Mağaza bağlantısı henüz hazır değil. Birkaç saniye sonra tekrar dene.');return;}
    const product=byId(productId);if(!product){Alert.alert('Plan henüz mağazada görünmüyor','Google Play Console’da ürün aktif olduğunda fiyat ve satın alma düğmesi otomatik bağlanır.');return;}
    const offer=firstOffer(product);const offerToken=offer?.offerToken||offer?.offerTokenAndroid;const basePlanId=offer?.basePlanId||offer?.basePlanIdAndroid||null;
    selectedPlan.current={productId,basePlanId};setBusySku(productId);
    try{
      const google:any={skus:[productId]};if(offerToken)google.subscriptionOffers=[{sku:productId,offerToken}];
      await iap.requestPurchase({request:{google},type:'subs'});
    }catch(error:any){setBusySku(null);Alert.alert('Satın alma başlatılamadı',error?.message||'Google Play işlemi açılamadı.');}
  }
  if(!data)return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.yellow}/><View style={s.loading}><ActivityIndicator color={palette.yellow}/><Text style={s.loadingText}>DraBornPark+ hazırlanıyor…</Text></View></SafeAreaView>;
  const trialUntil=data.profile?.plus_trial_until?new Date(data.profile.plus_trial_until):null;const trialActive=String(data.profile?.subscription_status)==='PLUS_TRIAL'&&trialUntil&&trialUntil.getTime()>Date.now();
  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.yellow} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="DraBornPark+" eyebrow="PREMIUM EXPERIENCE" accent={palette.yellow} subtitle="Aracının iletişim, paylaşım ve otomasyon özelliklerini tek üyelikte büyüt."/>
    <Animated.View style={[s.hero,{transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.012]})}]}]}><Animated.View pointerEvents="none" style={[s.heroSweep,{transform:[{translateX:sweep.interpolate({inputRange:[0,1],outputRange:[-180,700]})},{rotate:'15deg'}]}]}/><View style={s.heroSpectrum}>{[palette.yellow,palette.cyan,palette.pink,palette.purple,palette.green].map(c=><View key={c} style={[s.heroBar,{backgroundColor:c}]}/>)}</View><View style={s.crown}><MaterialCommunityIcons name="crown" size={48} color={palette.yellow}/></View><View style={{flex:1}}><Text style={s.heroKicker}>{plus?'PREMIUM AKTİF':'BASIC + PREMIUM SEÇENEĞİ'}</Text><Text style={s.heroTitle}>{trialActive?'14 günlük hediyen aktif':plus?'DraBornPark+ aktif':'Daha akıllı bir araç ağı'}</Text><Text style={s.heroBody}>{trialActive&&trialUntil?`Deneme bitişi: ${trialUntil.toLocaleString('tr-TR')}`:'Basic NFC + QR güvenlik işlevlerin abonelikten bağımsız çalışmaya devam eder.'}</Text></View></Animated.View>
    <SectionHeading title="Planını seç" subtitle="Google Play üzerinden güvenli, yönetilebilir ve iptal edilebilir" color={palette.yellow}/>
    <View style={s.plans}><Plan title="Aylık" badge="ESNEK" price={priceFor(DKD_PLUS_MONTHLY,'Google Play fiyatı')} detail="Her ay yenilenir • istediğin zaman Google Play’den yönet" color={palette.cyan} busy={busySku===DKD_PLUS_MONTHLY} onPress={()=>buy(DKD_PLUS_MONTHLY)}/><Plan title="Yıllık" badge="AVANTAJLI" price={priceFor(DKD_PLUS_YEARLY,'Google Play fiyatı')} detail="12 ay Premium • yıllık plan aktif olduğunda mağaza fiyatı görünür" color={palette.yellow} busy={busySku===DKD_PLUS_YEARLY} onPress={()=>buy(DKD_PLUS_YEARLY)}/></View>
    {storeError?<View style={s.storeNote}><MaterialCommunityIcons name="google-play" size={23} color={palette.orange}/><Text style={s.storeNoteText}>{storeError}</Text></View>:null}
    <View style={s.basic}><MaterialCommunityIcons name="shield-check-outline" size={27} color={palette.green}/><View style={{flex:1}}><Text style={s.basicTitle}>Basic güvencen kalıcı</Text><Text style={s.basicBody}>Etiketin NFC + QR kimliği, temel araç bildirimi ve güvenlik bağlantısı Premium sona erdiğinde kapanmaz.</Text></View></View>
    <SectionHeading title="DraBornPark+ ile açılanlar" subtitle="Gerçek uygulama özellikleri • sunucu tarafında üyelik yetkisiyle korunur" color={palette.purple}/>
    <View style={s.features}>{FEATURES.map(([icon,title,body],i)=><View key={title} style={s.feature}><View style={[s.featureIcon,{backgroundColor:`${[palette.purple,palette.cyan,palette.orange,palette.pink,palette.red,palette.blue,palette.green][i]}18`}]}><MaterialCommunityIcons name={icon as any} size={25} color={[palette.purple,palette.cyan,palette.orange,palette.pink,palette.red,palette.blue,palette.green][i]}/></View><View style={{flex:1}}><Text style={s.featureTitle}>{title}</Text><Text style={s.featureBody}>{body}</Text></View><MaterialCommunityIcons name={plus?'check-circle':'lock-outline'} size={22} color={plus?palette.green:palette.muted2}/></View>)}</View>
    <SectionHeading title="Satın alma güvenliği" subtitle="DraBornPark+ yetkisi yalnızca doğrulanmış mağaza durumundan verilir" color={palette.green}/>
    <View style={s.security}><Security icon="google-play" title="Google Play ödeme" body="Kart ve ödeme bilgileri DraBornPark sunucusuna gelmez; ödeme Google Play tarafından işlenir."/><Security icon="server-security" title="Sunucu doğrulaması" body="Satın alma tokenı Google Play Developer API ile doğrulanmadan Premium yetkisi açılmaz."/><Security icon="refresh-auto" title="Yenileme durumu" body="Aktif, grace period, iptal ve süre bitişi sunucu abonelik kaydına işlenir."/></View>
  </ScrollView></SafeAreaView>;
}
function Plan({title,badge,price,detail,color,busy,onPress}:{title:string;badge:string;price:string;detail:string;color:string;busy:boolean;onPress:()=>void}){return <View style={[s.plan,{borderColor:`${color}65`,backgroundColor:`${color}0F`}]}><View style={s.planTop}><View style={[s.planIcon,{backgroundColor:`${color}20`}]}><MaterialCommunityIcons name={title==='Yıllık'?'crown-outline':'calendar-month-outline'} size={27} color={color}/></View><View style={[s.planBadge,{borderColor:`${color}55`}]}><Text style={[s.planBadgeText,{color}]}>{badge}</Text></View></View><Text style={s.planTitle}>{title}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.planPrice,{color}]}>{price}</Text><Text style={s.planDetail}>{detail}</Text><Pressable disabled={busy} onPress={onPress} style={[s.planButton,{backgroundColor:color},busy&&{opacity:.6}]}>{busy?<ActivityIndicator color={palette.ink}/>:<><Text style={s.planButtonText}>GOOGLE PLAY İLE SEÇ</Text><MaterialCommunityIcons name="arrow-right" size={19} color={palette.ink}/></>}</Pressable></View>}
function Security({icon,title,body}:{icon:any;title:string;body:string}){return <View style={s.securityRow}><View style={s.securityIcon}><MaterialCommunityIcons name={icon} size={23} color={palette.green}/></View><View style={{flex:1}}><Text style={s.securityTitle}>{title}</Text><Text style={s.securityBody}>{body}</Text></View></View>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:20,paddingBottom:60},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},loadingText:{color:palette.muted,fontSize:type.body},hero:{minHeight:190,borderRadius:32,borderWidth:1,borderColor:`${palette.yellow}65`,backgroundColor:'#1D1A19',padding:20,flexDirection:'row',alignItems:'center',gap:15,overflow:'hidden'},heroSweep:{position:'absolute',top:-70,bottom:-70,width:120,backgroundColor:'#FFFFFF0E'},heroSpectrum:{position:'absolute',left:18,right:18,top:0,height:5,flexDirection:'row',gap:4},heroBar:{flex:1,borderRadius:99},crown:{width:82,height:82,borderRadius:28,borderWidth:1,borderColor:`${palette.yellow}70`,backgroundColor:`${palette.yellow}1A`,alignItems:'center',justifyContent:'center'},heroKicker:{color:palette.yellow,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',lineHeight:30,marginTop:5},heroBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:6},plans:{flexDirection:'row',gap:10},plan:{flex:1,minHeight:290,borderRadius:26,borderWidth:1,padding:15},planTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},planIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center'},planBadge:{borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:5},planBadgeText:{fontSize:9,fontWeight:'900'},planTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:15},planPrice:{fontSize:20,fontWeight:'900',marginTop:5},planDetail:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:7,flex:1},planButton:{minHeight:53,borderRadius:17,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},planButtonText:{color:palette.ink,fontSize:10,fontWeight:'900',textAlign:'center'},storeNote:{marginTop:10,borderRadius:18,borderWidth:1,borderColor:`${palette.orange}40`,backgroundColor:`${palette.orange}0A`,padding:13,flexDirection:'row',gap:10},storeNoteText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19},basic:{marginTop:13,borderRadius:22,borderWidth:1,borderColor:`${palette.green}45`,backgroundColor:`${palette.green}0B`,padding:16,flexDirection:'row',gap:12},basicTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},basicBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:4},features:{borderRadius:26,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,paddingHorizontal:15},feature:{minHeight:88,borderBottomWidth:1,borderBottomColor:palette.lineSoft,flexDirection:'row',alignItems:'center',gap:11},featureIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center'},featureTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},featureBody:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:3},security:{gap:9},securityRow:{borderRadius:20,borderWidth:1,borderColor:`${palette.green}35`,backgroundColor:`${palette.green}09`,padding:14,flexDirection:'row',gap:11},securityIcon:{width:46,height:46,borderRadius:15,backgroundColor:`${palette.green}16`,alignItems:'center',justifyContent:'center'},securityTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},securityBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:3}});