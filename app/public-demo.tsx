import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground, ScreenHeader, SectionHeading } from '@/src/components/AppChrome';
import { Pill, SafeIcon } from '@/src/components/Primitives';
import { useDemo } from '@/src/demo/DemoContext';
import { palette, radius, shadows, type } from '@/src/theme';

const options = [
  {title:'Aracınız çıkışımı engelliyor',icon:'car-arrow-right',color:palette.orange,priority:'normal'},
  {title:'Farlarınız açık olabilir',icon:'car-light-high',color:palette.yellow,priority:'normal'},
  {title:'Camınız açık olabilir',icon:'car-door-lock-open',color:palette.cyan,priority:'normal'},
  {title:'Aracınıza zarar verilmiş olabilir',icon:'car-wrench',color:palette.red,priority:'high'},
  {title:'Araçta çocuk var',icon:'alert-octagon-outline',color:palette.red,priority:'emergency'},
  {title:'Araçta hayvan var',icon:'paw-outline',color:palette.red,priority:'emergency'},
  {title:'Bir olaya şahit oldum',icon:'eye-outline',color:palette.purple,priority:'high'},
  {title:'Başka bir mesaj',icon:'message-text-outline',color:palette.blue,priority:'normal'},
] as const;

export default function PublicDemoScreen(){
  const demo=useDemo();
  const [selected,setSelected]=useState<(typeof options)[number]>(options[1]);
  const [message,setMessage]=useState('');
  const [sent,setSent]=useState(false);
  const [ownerReply,setOwnerReply]=useState('');
  const vehicle=demo.state.vehicles.find((v:any)=>v.active)||demo.state.vehicles[0];
  const privacy=demo.state.privacy;
  const publicMeta=useMemo(()=>[
    privacy.showPlate?vehicle?.plate:null,
    privacy.showBrandModel?`${vehicle?.brand||''} ${vehicle?.model||''}`.trim():null,
    privacy.showColor?vehicle?.color:null,
  ].filter(Boolean).join(' • '),[privacy,vehicle]);
  const tagCode=vehicle?.tagCode||'DP-K7M4X2P9';
  const url=`www.draborneagle.com/DraBornPark/?tag=${tagCode.replace(/^DP-/,'')}`;

  function send(){
    const emergency=selected.priority==='emergency';
    const item={id:`pub-${Date.now()}`,icon:selected.icon,color:selected.color,title:selected.title,body:message.trim()||'Dış NFC/QR ziyaretçisi hazır bildirim gönderdi.',time:'Şimdi',seen:false,priority:emergency?'emergency':'normal',reply:null};
    demo.patch(st=>({...st,notifications:[item,...st.notifications],stats:{...st.stats,reportsThisMonth:st.stats.reportsThisMonth+1},timeline:[{id:`tl-${Date.now()}`,type:'REPORT',icon:item.icon,color:item.color,title:selected.title,detail:'Dış NFC/QR web ziyaretçisi bildirimi',time:'Şimdi'},...st.timeline]}));
    setSent(true);
    setOwnerReply('5 dakika içinde geliyorum.');
  }

  function reset(){setSent(false);setOwnerReply('');setMessage('');setSelected(options[1])}

  return <SafeAreaView style={s.safe}><AuroraBackground accent={palette.cyan} secondary={palette.purple}/><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="NFC / QR Ziyaretçi Demo" eyebrow="DIŞ KULLANICI DENEYİMİ" accent={palette.cyan} subtitle="Etiketi okutan kişinin uygulama yüklemeden gördüğü mobil web akışını test et." right={<Pill label="WEB DEMO" color={palette.cyan}/>}/>

    <View style={s.browser}><View style={s.browserTop}><View style={s.browserDots}><View style={[s.dot,{backgroundColor:palette.red}]}/><View style={[s.dot,{backgroundColor:palette.yellow}]}/><View style={[s.dot,{backgroundColor:palette.green}]}/></View><View style={s.address}><SafeIcon name="lock-outline" size={16} color={palette.green}/><Text numberOfLines={1} style={s.addressText}>{url}</Text></View></View>
      <View style={s.webBrand}><View style={s.webLogo}><Text style={s.webLogoText}>DP</Text></View><View style={{flex:1}}><Text style={s.webBrandName}>DraBornPark</Text><Text style={s.webBrandSub}>PRIVATE VEHICLE NETWORK</Text></View><View style={s.secure}><SafeIcon name="shield-check-outline" size={17} color={palette.green}/><Text style={s.secureText}>GÜVENLİ</Text></View></View>

      {!sent?<>
        <View style={s.vehicle}><View style={s.vehicleIcon}><SafeIcon name="car-connected" size={38} color={palette.cyan}/></View><View style={{flex:1}}><Text style={s.kicker}>DRABORNPARK KORUMALI ARAÇ</Text><Text style={s.vehicleTitle}>{vehicle?.name||'Volkswagen Tiguan'}</Text><Text style={s.vehicleMeta}>{publicMeta||'Araç bilgileri gizli'}</Text></View></View>
        <View style={s.privacy}><SafeIcon name="phone-lock" size={27} color={palette.green}/><View style={{flex:1}}><Text style={s.privacyTitle}>Telefon numarası gizlidir</Text><Text style={s.privacyBody}>Araç sahibinin telefon, e-posta ve tam adı gösterilmez. Mesaj DraBornPark üzerinden iletilir.</Text></View></View>

        <SectionHeading title="Ne bildirmek istiyorsunuz?" subtitle="Ziyaretçi birkaç saniyede uygun durumu seçer"/>
        <View style={s.optionGrid}>{options.map(x=><Pressable key={x.title} onPress={()=>setSelected(x)} style={[s.option,selected.title===x.title&&{borderColor:x.color,backgroundColor:`${x.color}13`}]}><View style={[s.optionIcon,{backgroundColor:`${x.color}18`}]}><SafeIcon name={x.icon} size={23} color={x.color}/></View><Text style={s.optionText}>{x.title}</Text>{x.priority==='emergency'?<Text style={s.emergency}>ACİL</Text>:null}</Pressable>)}</View>

        <View style={s.compose}><Text style={s.composeKicker}>SEÇİLEN BİLDİRİM</Text><Text style={s.composeTitle}>{selected.title}</Text><Text style={s.composeLabel}>İsteğe bağlı kısa açıklama</Text><TextInput value={message} onChangeText={setMessage} multiline maxLength={700} placeholder="Örn. sağ ön cam yaklaşık 2 cm açık görünüyor…" placeholderTextColor={palette.muted2} style={s.input}/><Text style={s.filterNote}>Telefon/e-posta ve saldırgan içerik güvenlik filtresinden geçirilir.</Text><Pressable onPress={send} style={s.send}><SafeIcon name="shield-check-outline" size={23} color={palette.ink}/><Text style={s.sendText}>ARAÇ SAHİBİNE GÜVENLİ GÖNDER</Text></Pressable></View>
      </>:<>
        <View style={s.success}><View style={s.successIcon}><SafeIcon name="check-circle-outline" size={42} color={palette.green}/></View><Text style={s.successTitle}>Bildirim araç sahibine iletildi</Text><Text style={s.successBody}>Telefon numarası paylaşılmadı. Bu ziyaret için geçici anonim iletişim oturumu açıldı.</Text></View>
        <SectionHeading title="Geçici anonim iletişim" subtitle="Araç sahibi cevap verirse ziyaretçi burada görür" color={palette.green}/>
        <View style={s.chat}><View style={s.messageVisitor}><Text style={s.messageLabel}>SİZ</Text><Text style={s.messageText}>{selected.title}{message.trim()?` — ${message.trim()}`:''}</Text></View>{ownerReply?<View style={s.messageOwner}><Text style={[s.messageLabel,{color:palette.green}]}>ARAÇ SAHİBİ</Text><Text style={s.messageText}>{ownerReply}</Text></View>:null}<View style={s.session}><SafeIcon name="timer-sand" size={20} color={palette.purple}/><Text style={s.sessionText}>Oturum yaklaşık 30 dakika sonra otomatik kapanır. Tarafların gerçek iletişim bilgileri paylaşılmaz.</Text></View></View>
        <Pressable onPress={reset} style={s.reset}><SafeIcon name="refresh" size={22} color={palette.cyan}/><Text style={s.resetText}>ZİYARETÇİ AKIŞINI TEKRAR TEST ET</Text></Pressable>
      </>}
    </View>

    <SectionHeading title="Demo neyi değiştiriyor?" subtitle="Gönderim gerçek Demo state'iyle bağlantılı"/>
    <View style={s.explain}><Explain icon="bell-badge-outline" color={palette.orange} title="Bildirim Merkezi" body="Gönderdiğin ziyaretçi bildirimi Demo Bildirim Merkezi'ne düşer."/><Explain icon="history" color={palette.purple} title="Timeline" body="Aynı olay Demo Timeline'a yeni kayıt olarak eklenir."/><Explain icon="shield-lock-outline" color={palette.green} title="Gizlilik" body="Demo Gizlilik ayarlarında kapattığın plaka/marka/renk burada da gizlenir."/></View>
    <Pressable onPress={()=>router.push('/hub')} style={s.backHub}><SafeIcon name="view-grid-outline" size={22} color={palette.cyan}/><Text style={s.backHubText}>DraBorn Merkezi'ne dön</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

function Explain({icon,color,title,body}:{icon:string;color:string;title:string;body:string}){return <View style={s.explainRow}><View style={[s.explainIcon,{backgroundColor:`${color}18`}]}><SafeIcon name={icon} size={22} color={color}/></View><View style={{flex:1}}><Text style={s.explainTitle}>{title}</Text><Text style={s.explainBody}>{body}</Text></View></View>}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:18,paddingBottom:48},browser:{borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.cyan}45`,backgroundColor:'#08101F',overflow:'hidden',...shadows.floating},browserTop:{minHeight:58,backgroundColor:'#111B2D',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10},browserDots:{flexDirection:'row',gap:5},dot:{width:8,height:8,borderRadius:4},address:{flex:1,height:36,borderRadius:13,backgroundColor:'#07101E',borderWidth:1,borderColor:palette.lineSoft,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:6},addressText:{flex:1,color:palette.muted,fontSize:type.caption},webBrand:{padding:16,borderBottomWidth:1,borderBottomColor:palette.lineSoft,flexDirection:'row',alignItems:'center',gap:10},webLogo:{width:46,height:46,borderRadius:16,backgroundColor:palette.cyan,alignItems:'center',justifyContent:'center'},webLogoText:{color:palette.ink,fontSize:17,fontWeight:'900'},webBrandName:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900'},webBrandSub:{color:palette.muted2,fontSize:type.micro,fontWeight:'800',letterSpacing:.8},secure:{borderRadius:999,borderWidth:1,borderColor:`${palette.green}45`,paddingHorizontal:8,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:4},secureText:{color:palette.green,fontSize:type.micro,fontWeight:'900'},vehicle:{margin:16,marginBottom:10,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.cyan}42`,backgroundColor:`${palette.cyan}0B`,padding:15,flexDirection:'row',alignItems:'center',gap:12},vehicleIcon:{width:64,height:64,borderRadius:22,backgroundColor:`${palette.cyan}18`,alignItems:'center',justifyContent:'center'},kicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:.8},vehicleTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',marginTop:4},vehicleMeta:{color:palette.muted,fontSize:type.caption,marginTop:4},privacy:{marginHorizontal:16,minHeight:88,borderRadius:radius.md,borderWidth:1,borderColor:`${palette.green}3D`,backgroundColor:`${palette.green}0D`,padding:14,flexDirection:'row',alignItems:'center',gap:11},privacyTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},privacyBody:{color:palette.muted,fontSize:type.caption,lineHeight:19,marginTop:3},optionGrid:{paddingHorizontal:16,flexDirection:'row',flexWrap:'wrap',gap:8},option:{width:'48.5%',minHeight:108,borderRadius:radius.md,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:12},optionIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},optionText:{color:palette.text,fontSize:type.caption,fontWeight:'900',lineHeight:18,marginTop:8},emergency:{color:palette.red,fontSize:type.micro,fontWeight:'900',marginTop:6},compose:{margin:16,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:15},composeKicker:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',letterSpacing:.7},composeTitle:{color:palette.text,fontSize:type.cardTitle,fontWeight:'900',marginTop:5},composeLabel:{color:palette.muted,fontSize:type.caption,fontWeight:'800',marginTop:15,marginBottom:7},input:{minHeight:100,borderRadius:17,borderWidth:1,borderColor:palette.line,backgroundColor:palette.bg2,color:palette.text,padding:13,fontSize:type.body,textAlignVertical:'top'},filterNote:{color:palette.muted2,fontSize:type.caption,lineHeight:18,marginTop:8},send:{minHeight:58,borderRadius:18,backgroundColor:palette.aqua,marginTop:13,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},sendText:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900'},success:{margin:16,borderRadius:radius.lg,borderWidth:1,borderColor:`${palette.green}45`,backgroundColor:`${palette.green}0D`,padding:22,alignItems:'center'},successIcon:{width:72,height:72,borderRadius:24,backgroundColor:`${palette.green}18`,alignItems:'center',justifyContent:'center'},successTitle:{color:palette.text,fontSize:type.section,fontWeight:'900',textAlign:'center',marginTop:12},successBody:{color:palette.muted,fontSize:type.caption,lineHeight:20,textAlign:'center',marginTop:6},chat:{marginHorizontal:16,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:14,gap:10},messageVisitor:{alignSelf:'flex-end',maxWidth:'88%',borderRadius:18,borderBottomRightRadius:5,backgroundColor:`${palette.cyan}1C`,borderWidth:1,borderColor:`${palette.cyan}35`,padding:12},messageOwner:{alignSelf:'flex-start',maxWidth:'88%',borderRadius:18,borderBottomLeftRadius:5,backgroundColor:`${palette.green}16`,borderWidth:1,borderColor:`${palette.green}35`,padding:12},messageLabel:{color:palette.cyan,fontSize:type.micro,fontWeight:'900',marginBottom:4},messageText:{color:palette.text,fontSize:type.caption,lineHeight:20},session:{borderRadius:15,backgroundColor:`${palette.purple}10`,padding:11,flexDirection:'row',alignItems:'center',gap:8},sessionText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:18},reset:{margin:16,minHeight:56,borderRadius:18,borderWidth:1,borderColor:`${palette.cyan}45`,backgroundColor:`${palette.cyan}0D`,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},resetText:{color:palette.cyan,fontSize:type.bodyStrong,fontWeight:'900'},explain:{gap:9},explainRow:{minHeight:82,borderRadius:radius.md,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:12,flexDirection:'row',alignItems:'center',gap:11},explainIcon:{width:46,height:46,borderRadius:15,alignItems:'center',justifyContent:'center'},explainTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},explainBody:{color:palette.muted,fontSize:type.caption,lineHeight:18,marginTop:3},backHub:{minHeight:58,borderRadius:18,borderWidth:1,borderColor:`${palette.cyan}35`,marginTop:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},backHubText:{color:palette.cyan,fontSize:type.bodyStrong,fontWeight:'900'}});
