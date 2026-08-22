import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useIAP } from 'expo-iap';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DkdActionModal } from '@/src/components/DkdActionModal';
import { DKD_PLUS_MONTHLY_BASE_PLAN, DKD_PLUS_PRODUCT_ID, DKD_PLUS_YEARLY_BASE_PLAN, type DkdPlanKey, verifyDkdGooglePurchase } from '@/src/lib/billing';
import { hasPlusEntitlement, loadLiveDashboard } from '@/src/lib/drabornpark';
import { palette, radius, type } from '@/src/theme';

const FEATURES=[
  ['account-group-outline','Aile Paylaşımı','Aile üyeleriyle park ve bildirim bilgilerini izin bazlı paylaş.'],
  ['account-clock-outline','Geçici Sürücü','Belirlediğin süre boyunca güvenli iletişimi başka sürücüye yönlendir.'],
  ['car-key','Vale / Servis Modu','Aracı vale veya servise bıraktığında geçici kullanım durumunu tek ekrandan yönet.'],
  ['calendar-clock-outline','Zaman Kuralları','Belirli gün ve saatlerde bildirimlerin kime gideceğini otomatik ayarla.'],
  ['shield-alert-outline','Acil Durum Zinciri','Acil kişileri öncelik sırasıyla yönet ve kritik durumları öne çıkar.'],
  ['history','Gelişmiş Araç Geçmişi','Park ve araç olaylarını daha uzun geçmişte takip et.'],
  ['chart-donut','Gelişmiş Özetler','Park ve bildirim kullanımını dönemsel özetlerle incele.'],
  ['car-multiple','Çoklu Araç Deneyimi','Birden fazla araç ve etiketi aynı premium hesapta daha rahat yönet.'],
] as const;

function offerBasePlan(offer:any){return String(offer?.basePlanId??offer?.basePlanIdAndroid??offer?.basePlanIdIOS??'').toLowerCase();}
function offerPrice(offer:any){
  const phases=offer?.pricingPhases?.pricingPhaseList??offer?.pricingPhasesAndroid?.pricingPhaseList??offer?.pricingPhases??[];
  const list=Array.isArray(phases)?phases:[];
  const phase=list.find((item:any)=>item?.formattedPrice)||list[0];
  return String(phase?.formattedPrice??phase?.priceFormatted??offer?.formattedPrice??'');
}

export function PlusExperience({data:initialData}:{data?:any}){
  const [dashboard,setDashboard]=useState<any>(initialData??null);
  const [selected,setSelected]=useState<DkdPlanKey>('yearly');
  const [busy,setBusy]=useState(false);
  const [restorePending,setRestorePending]=useState(false);
  const [success,setSuccess]=useState(false);
  const [billingMessage,setBillingMessage]=useState('Google Play bağlantısı hazırlanıyor…');
  const selectedRef=useRef<DkdPlanKey>('yearly');
  const pulse=useRef(new Animated.Value(0)).current;
  const sweep=useRef(new Animated.Value(0)).current;

  const onPurchaseSuccess=useCallback(async(purchase:any)=>{
    setBusy(true);
    try{
      if(Platform.OS!=='android')throw new Error('Bu sürümde DraBornPark+ satın alma Google Play üzerinden Android için hazırlanmıştır.');
      await verifyDkdGooglePurchase(purchase,selectedRef.current);
      await finishTransaction({purchase,isConsumable:false});
      const next=await loadLiveDashboard();setDashboard(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    }catch(error:any){Alert.alert('Abonelik doğrulanamadı',error?.message||'Satın alma sunucuda doğrulanamadı. İşlem Google Play hesabında görünüyorsa “Satın alımları geri yükle” seçeneğini kullanabilirsin.');}
    finally{setBusy(false);setRestorePending(false)}
  },[]);

  const onPurchaseError=useCallback((error:any)=>{
    setBusy(false);
    const code=String(error?.code||'').toLowerCase();
    if(code.includes('cancel'))return;
    Alert.alert('Satın alma tamamlanamadı',error?.message||'Google Play satın alma akışı tamamlanamadı.');
  },[]);

  const {connected,subscriptions,availablePurchases,fetchProducts,requestPurchase,finishTransaction,getAvailablePurchases}=useIAP({onPurchaseSuccess,onPurchaseError});

  useEffect(()=>{if(!dashboard)loadLiveDashboard().then(setDashboard).catch(()=>undefined)},[dashboard]);
  useEffect(()=>{
    const p=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:1000,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:1000,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})]));
    const q=Animated.loop(Animated.timing(sweep,{toValue:1,duration:3100,easing:Easing.linear,useNativeDriver:true}));p.start();q.start();return()=>{p.stop();q.stop()};
  },[pulse,sweep]);
  useEffect(()=>{
    if(Platform.OS!=='android'){setBillingMessage('DraBornPark+ satın alma bu sürümde Google Play / Android için hazırlanmıştır.');return;}
    if(!connected){setBillingMessage('Google Play bağlantısı bekleniyor…');return;}
    setBillingMessage('Google Play fiyatları yükleniyor…');
    void fetchProducts({skus:[DKD_PLUS_PRODUCT_ID],type:'subs'}).catch(()=>setBillingMessage('Google Play ürünü henüz bu test hesabında görünmüyor.'));
  },[connected,fetchProducts]);

  const subscription:any=(subscriptions??[]).find((item:any)=>String(item?.id??item?.productId??'')===DKD_PLUS_PRODUCT_ID)??subscriptions?.[0];
  const offers:any[]=subscription?.subscriptionOfferDetailsAndroid??subscription?.subscriptionOffers??[];
  const monthlyOffer=offers.find(offer=>offerBasePlan(offer).includes(DKD_PLUS_MONTHLY_BASE_PLAN))??offers[0];
  const yearlyOffer=offers.find(offer=>offerBasePlan(offer).includes(DKD_PLUS_YEARLY_BASE_PLAN))??offers[1]??offers[0];
  const monthlyPrice=offerPrice(monthlyOffer)||'Google Play fiyatı';
  const yearlyPrice=offerPrice(yearlyOffer)||'Google Play fiyatı';
  const plus=useMemo(()=>dashboard?hasPlusEntitlement(dashboard.profile,dashboard.subscription):false,[dashboard]);
  const trialUntil=dashboard?.profile?.plus_trial_until?new Date(dashboard.profile.plus_trial_until):null;
  const trialActive=Boolean(trialUntil&&trialUntil.getTime()>Date.now());

  useEffect(()=>{
    if(subscription)setBillingMessage('Google Play ürünü hazır. Fiyat ve teklif bilgileri mağazadan alındı.');
  },[subscription]);
  useEffect(()=>{
    if(!restorePending||!(availablePurchases??[]).length)return;
    const purchase=(availablePurchases??[]).find((item:any)=>String(item?.productId??'')===DKD_PLUS_PRODUCT_ID);
    if(purchase)void onPurchaseSuccess(purchase);
  },[availablePurchases,onPurchaseSuccess,restorePending]);

  async function buy(plan:DkdPlanKey){
    if(Platform.OS!=='android'){Alert.alert('Google Play gerekli','DraBornPark+ aboneliği Android Google Play akışı için yapılandırılmıştır.');return;}
    if(!connected){Alert.alert('Google Play bağlanıyor','Mağaza bağlantısı henüz hazır değil. Birkaç saniye sonra tekrar dene.');return;}
    const offer=plan==='yearly'?yearlyOffer:monthlyOffer;
    const token=String(offer?.offerToken??'');
    if(!subscription||!token){Alert.alert('Abonelik ürünü bulunamadı','Google Play Console’da drabornpark_plus ürünü ile monthly ve yearly base planlarının aktif olduğundan emin ol.');return;}
    selectedRef.current=plan;setSelected(plan);setBusy(true);
    try{
      await requestPurchase({request:{apple:{sku:DKD_PLUS_PRODUCT_ID},google:{skus:[DKD_PLUS_PRODUCT_ID],subscriptionOffers:[{sku:DKD_PLUS_PRODUCT_ID,offerToken:token}]}},type:'subs'});
    }catch(error:any){setBusy(false);Alert.alert('Satın alma başlatılamadı',error?.message||'Google Play satın alma ekranı açılamadı.');}
  }
  async function restore(){
    if(Platform.OS!=='android')return;
    setRestorePending(true);setBusy(true);
    try{await getAvailablePurchases();setTimeout(()=>setBusy(false),1800);}catch(error:any){setBusy(false);setRestorePending(false);Alert.alert('Geri yüklenemedi',error?.message||'Google Play satın alımları okunamadı.');}
  }

  return <View>
    <Animated.View style={[styles.hero,{transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.006]})}]}]}>
      <Animated.View pointerEvents="none" style={[styles.heroSweep,{transform:[{translateX:sweep.interpolate({inputRange:[0,1],outputRange:[-130,720]})},{rotate:'14deg'}]}]}/>
      <View style={styles.spectrum}><View style={[styles.bar,{backgroundColor:palette.yellow}]}/><View style={[styles.bar,{backgroundColor:palette.orange}]}/><View style={[styles.bar,{backgroundColor:palette.pink}]}/><View style={[styles.bar,{backgroundColor:palette.purple}]}/><View style={[styles.bar,{backgroundColor:palette.cyan}]}/></View>
      <View style={styles.heroRow}><Animated.View style={[styles.crown,{transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.07]})}]}]}><MaterialCommunityIcons name="crown" size={42} color={palette.yellow}/><View style={styles.crownDot}/></Animated.View><View style={{flex:1}}><Text style={styles.kicker}>DRABORNPARK+ • PREMIUM</Text><Text style={styles.heroTitle}>{plus?'Premium deneyimin aktif':'Aracın için daha akıllı bir katman.'}</Text><Text style={styles.heroBody}>{trialActive?`14 günlük hediye denemen ${trialUntil?.toLocaleDateString('tr-TR')} tarihine kadar aktif.`:'Temel NFC + QR güvenlik özelliklerin abonelik olmasa da çalışmaya devam eder.'}</Text></View></View>
      <View style={styles.heroBadges}><Mini icon="shield-check-outline" text="TEMEL HEP AKTİF" color={palette.green}/><Mini icon="google-play" text="GOOGLE PLAY" color={palette.cyan}/></View>
    </Animated.View>

    <Text style={styles.sectionTitle}>Gerçek premium özellikler</Text><Text style={styles.sectionBody}>Plus yalnızca sunucu tarafında üyelik yetkisi olan hesaplarda açılır.</Text>
    <View style={styles.features}>{FEATURES.map(([icon,title,body],index)=><View key={title} style={[styles.feature,index===FEATURES.length-1&&{borderBottomWidth:0}]}><View style={[styles.featureIcon,{backgroundColor:index%2?`${palette.purple}18`:`${palette.yellow}18`}]}><MaterialCommunityIcons name={icon as any} size={24} color={index%2?palette.purple:palette.yellow}/></View><View style={{flex:1}}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{body}</Text></View><MaterialCommunityIcons name={plus?'check-circle':'lock-outline'} size={22} color={plus?palette.green:palette.muted2}/></View>)}</View>

    <Text style={styles.sectionTitle}>Abonelik seç</Text><Text style={styles.sectionBody}>Fiyatlar uygulamaya sabit yazılmaz; Google Play’den canlı olarak okunur.</Text>
    <View style={styles.plans}><Plan plan="monthly" title="Aylık" subtitle="Esnek kullanım" price={monthlyPrice} selected={selected==='monthly'} onPress={()=>setSelected('monthly')}/><Plan plan="yearly" title="Yıllık" subtitle="Uzun dönem avantajı" price={yearlyPrice} selected={selected==='yearly'} badge="ÖNERİLEN" onPress={()=>setSelected('yearly')}/></View>
    <View style={styles.storeState}><MaterialCommunityIcons name={subscription?'check-decagram-outline':'google-play'} size={23} color={subscription?palette.green:palette.cyan}/><Text style={styles.storeStateText}>{billingMessage}</Text></View>
    <Pressable disabled={busy} onPress={()=>buy(selected)} style={[styles.buy,busy&&{opacity:.58}]}>{busy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="crown" size={24} color={palette.ink}/><View style={{flex:1}}><Text style={styles.buyTitle}>{selected==='yearly'?'YILLIK DRABORNPARK+':'AYLIK DRABORNPARK+'}</Text><Text style={styles.buySub}>Google Play güvenli ödeme</Text></View><MaterialCommunityIcons name="arrow-right" size={23} color={palette.ink}/></>}</Pressable>
    <Pressable disabled={busy} onPress={restore} style={styles.restore}><MaterialCommunityIcons name="restore" size={20} color={palette.cyan}/><Text style={styles.restoreText}>Satın alımları geri yükle</Text></Pressable>
    <View style={styles.note}><MaterialCommunityIcons name="information-outline" size={22} color={palette.green}/><Text style={styles.noteText}>Abonelik doğrulaması Google Play sunucusundan yapılır. Satın alma anahtarının yalnızca SHA-256 özeti DraBornPark veritabanında saklanır; ham satın alma anahtarı kalıcı tutulmaz.</Text></View>

    <DkdActionModal visible={success} eyebrow="PREMIUM AKTİF" title="DraBornPark+ hazır" body="Google Play aboneliğin doğrulandı ve premium hakların hesabına işlendi." icon="crown" color={palette.yellow} secondaryColor={palette.green} badge="GOOGLE PLAY DOĞRULANDI" bullets={['Plus yetkileri sunucuda aktif edildi.','Temel NFC + QR özelliklerin üyelikten bağımsız kalır.']} primaryLabel="HARİKA" onPrimary={()=>setSuccess(false)}/>
  </View>;
}

function Mini({icon,text,color}:{icon:any;text:string;color:string}){return <View style={[styles.mini,{borderColor:`${color}55`,backgroundColor:`${color}12`}]}><MaterialCommunityIcons name={icon} size={16} color={color}/><Text style={[styles.miniText,{color}]}>{text}</Text></View>}
function Plan({plan,title,subtitle,price,selected,badge,onPress}:{plan:DkdPlanKey;title:string;subtitle:string;price:string;selected:boolean;badge?:string;onPress:()=>void}){const color=plan==='yearly'?palette.yellow:palette.cyan;return <Pressable onPress={onPress} style={[styles.plan,{borderColor:selected?`${color}A0`:palette.line,backgroundColor:selected?`${color}15`:palette.panel}]}>{badge?<View style={[styles.planBadge,{backgroundColor:color}]}><Text style={styles.planBadgeText}>{badge}</Text></View>:null}<View style={[styles.planRadio,{borderColor:color}]}>{selected?<View style={[styles.planRadioDot,{backgroundColor:color}]}/>:null}</View><Text style={styles.planTitle}>{title}</Text><Text style={styles.planSubtitle}>{subtitle}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.planPrice,{color}]}>{price}</Text></Pressable>}

const styles=StyleSheet.create({hero:{borderRadius:31,borderWidth:1,borderColor:`${palette.yellow}68`,backgroundColor:'#202115',padding:18,overflow:'hidden'},heroSweep:{position:'absolute',top:-70,bottom:-70,width:90,backgroundColor:'#FFFFFF10'},spectrum:{position:'absolute',top:0,left:17,right:17,height:5,flexDirection:'row',gap:4},bar:{flex:1,borderRadius:99},heroRow:{marginTop:9,flexDirection:'row',alignItems:'center',gap:14},crown:{width:74,height:74,borderRadius:25,borderWidth:1,borderColor:`${palette.yellow}72`,backgroundColor:`${palette.yellow}1D`,alignItems:'center',justifyContent:'center'},crownDot:{position:'absolute',right:7,top:7,width:10,height:10,borderRadius:5,backgroundColor:palette.green,borderWidth:2,borderColor:'#202115'},kicker:{color:palette.yellow,fontSize:type.micro,fontWeight:'900',letterSpacing:1.1},heroTitle:{color:palette.text,fontSize:25,fontWeight:'900',lineHeight:29,marginTop:4},heroBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,marginTop:6},heroBadges:{flexDirection:'row',gap:8,marginTop:17},mini:{flex:1,minHeight:40,borderRadius:14,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:8},miniText:{fontSize:10,fontWeight:'900'},sectionTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginTop:27},sectionBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:5,marginBottom:12},features:{borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,paddingHorizontal:15},feature:{minHeight:88,borderBottomWidth:1,borderBottomColor:palette.lineSoft,flexDirection:'row',alignItems:'center',gap:11},featureIcon:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},featureTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},featureBody:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:3},plans:{flexDirection:'row',gap:10},plan:{flex:1,minHeight:160,borderRadius:24,borderWidth:1,padding:14,overflow:'hidden'},planRadio:{width:26,height:26,borderRadius:13,borderWidth:2,alignItems:'center',justifyContent:'center'},planRadioDot:{width:12,height:12,borderRadius:6},planTitle:{color:palette.text,fontSize:20,fontWeight:'900',marginTop:12},planSubtitle:{color:palette.muted,fontSize:type.caption,marginTop:3},planPrice:{fontSize:17,fontWeight:'900',marginTop:'auto'},planBadge:{position:'absolute',right:8,top:8,borderRadius:999,paddingHorizontal:8,paddingVertical:5},planBadgeText:{color:palette.ink,fontSize:8,fontWeight:'900'},storeState:{borderRadius:18,borderWidth:1,borderColor:`${palette.cyan}3D`,backgroundColor:`${palette.cyan}0D`,padding:13,marginTop:12,flexDirection:'row',alignItems:'center',gap:9},storeStateText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:18},buy:{minHeight:68,borderRadius:21,backgroundColor:palette.yellow,marginTop:12,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:11},buyTitle:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},buySub:{color:'#5B5010',fontSize:type.caption,marginTop:2},restore:{minHeight:52,borderRadius:17,borderWidth:1,borderColor:`${palette.cyan}40`,backgroundColor:`${palette.cyan}0B`,marginTop:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},restoreText:{color:palette.cyan,fontSize:type.caption,fontWeight:'900'},note:{borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}38`,backgroundColor:`${palette.green}0B`,padding:15,marginTop:12,flexDirection:'row',gap:10},noteText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:19}});