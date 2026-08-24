import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import {router,useLocalSearchParams} from 'expo-router';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Image,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PUBLIC_CONTACT_URL} from '@/src/data';
import {palette,radius,type} from '@/src/theme';

type DkdCategory={key:string;title:string;body:string;priority:'normal'|'high'|'emergency'};
type DkdLookup={snapshot?:any;categories?:DkdCategory[];error?:string};
type DkdEvidence={uri:string;base64:string;mime:'image/jpeg';capturedAt:string};
type DkdMessage={id:string;sender_role:string;body_safe:string;created_at:string;attachment_kind?:string|null;attachment_captured_at?:string|null};

async function dkd_request(dkd_body:any){const dkd_response=await fetch(PUBLIC_CONTACT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dkd_body)});const dkd_data=await dkd_response.json().catch(()=>({}));if(!dkd_response.ok){const dkd_error:any=new Error(String(dkd_data?.error||'request_failed'));dkd_error.status=dkd_response.status;dkd_error.retryAfter=dkd_data?.retryAfter;throw dkd_error}return dkd_data}
function dkd_error_text(dkd_value:string){if(dkd_value.includes('tag_not_found'))return 'Bu DraBornPark etiketi bulunamadı.';if(dkd_value.includes('rate_limited'))return 'Çok fazla istek gönderildi. Biraz sonra tekrar dene.';if(dkd_value.includes('session_closed'))return 'Güvenli mesajlaşma oturumunun süresi sona erdi.';if(dkd_value.includes('invalid_evidence'))return 'Fotoğraf güvenlik kontrolünden geçemedi. Kamerayla yeni bir fotoğraf çek.';return 'İşlem şu anda tamamlanamadı.'}

async function dkd_capture_web():Promise<DkdEvidence|null>{
  const dkd_document:any=(globalThis as any).document;
  const DkdFileReader:any=(globalThis as any).FileReader;
  const DkdImage:any=(globalThis as any).Image;
  if(!dkd_document||!DkdFileReader||!DkdImage)throw new Error('camera_unavailable');
  return await new Promise((dkd_resolve,dkd_reject)=>{
    const dkd_input=dkd_document.createElement('input');
    dkd_input.type='file';dkd_input.accept='image/*';dkd_input.capture='environment';dkd_input.style.display='none';
    const dkd_cleanup=()=>{try{dkd_input.remove()}catch{}}
    dkd_input.onchange=()=>{
      const dkd_file=dkd_input.files?.[0];
      if(!dkd_file){dkd_cleanup();dkd_resolve(null);return}
      const dkd_reader=new DkdFileReader();
      dkd_reader.onerror=()=>{dkd_cleanup();dkd_reject(new Error('camera_read_failed'))};
      dkd_reader.onload=()=>{
        const dkd_source=String(dkd_reader.result||'');const dkd_image=new DkdImage();
        dkd_image.onerror=()=>{dkd_cleanup();dkd_reject(new Error('camera_image_failed'))};
        dkd_image.onload=()=>{
          try{
            const dkd_max=1280;const dkd_scale=Math.min(1,dkd_max/Math.max(dkd_image.width,dkd_image.height));
            const dkd_canvas=dkd_document.createElement('canvas');dkd_canvas.width=Math.max(1,Math.round(dkd_image.width*dkd_scale));dkd_canvas.height=Math.max(1,Math.round(dkd_image.height*dkd_scale));
            const dkd_context=dkd_canvas.getContext('2d');if(!dkd_context)throw new Error('camera_canvas_failed');dkd_context.drawImage(dkd_image,0,0,dkd_canvas.width,dkd_canvas.height);
            const dkd_data_url=dkd_canvas.toDataURL('image/jpeg',.72);const dkd_base64=dkd_data_url.split(',')[1]||'';if(!dkd_base64)throw new Error('camera_base64_failed');
            dkd_cleanup();dkd_resolve({uri:dkd_data_url,base64:dkd_base64,mime:'image/jpeg',capturedAt:new Date().toISOString()});
          }catch(dkd_problem){dkd_cleanup();dkd_reject(dkd_problem)}
        };
        dkd_image.src=dkd_source;
      };
      dkd_reader.readAsDataURL(dkd_file);
    };
    dkd_document.body.appendChild(dkd_input);dkd_input.click();
  });
}

export default function DkdPublicTagScreen(){
  const dkd_params=useLocalSearchParams<{token?:string}>();
  const dkd_token=String(dkd_params.token||'').trim();
  const [dkd_data,setDkdData]=useState<DkdLookup|null>(null);
  const [dkd_error,setDkdError]=useState('');
  const [dkd_busy,setDkdBusy]=useState(false);
  const [dkd_selected,setDkdSelected]=useState<DkdCategory|null>(null);
  const [dkd_message,setDkdMessage]=useState('');
  const [dkd_evidence,setDkdEvidence]=useState<DkdEvidence|null>(null);
  const [dkd_session_token,setDkdSessionToken]=useState<string|null>(null);
  const [dkd_expires_at,setDkdExpiresAt]=useState<string|null>(null);
  const [dkd_messages,setDkdMessages]=useState<DkdMessage[]>([]);
  const [dkd_chat,setDkdChat]=useState('');
  const [dkd_chat_busy,setDkdChatBusy]=useState(false);
  const dkd_timer=useRef<ReturnType<typeof setInterval>|null>(null);
  const dkd_vehicle=dkd_data?.snapshot?.vehicle;
  const dkd_active=Boolean(dkd_data?.snapshot?.activated);
  const dkd_categories=useMemo(()=>dkd_data?.categories??[],[dkd_data]);

  const dkd_load=async()=>{if(!dkd_token){setDkdError('Geçersiz etiket bağlantısı.');return}setDkdBusy(true);setDkdError('');try{setDkdData(await dkd_request({action:'lookup',tagCode:dkd_token}))}catch(dkd_problem:any){setDkdError(dkd_error_text(String(dkd_problem?.message||'')))}finally{setDkdBusy(false)}};
  useEffect(()=>{void dkd_load()},[dkd_token]);
  useEffect(()=>{if(!dkd_session_token)return;if(dkd_timer.current)clearInterval(dkd_timer.current);const dkd_poll=async()=>{try{const dkd_status=await dkd_request({action:'status',sessionToken:dkd_session_token});setDkdMessages(dkd_status.messages||[]);setDkdExpiresAt(dkd_status.expiresAt||null)}catch(dkd_problem:any){if(dkd_problem.status===410){setDkdSessionToken(null);setDkdError('Güvenli mesajlaşma oturumunun süresi sona erdi.')}}};void dkd_poll();dkd_timer.current=setInterval(dkd_poll,3500);return()=>{if(dkd_timer.current)clearInterval(dkd_timer.current)}},[dkd_session_token]);

  async function dkd_capture(){
    setDkdError('');
    try{
      if(Platform.OS==='web'){const dkd_photo=await dkd_capture_web();if(dkd_photo)setDkdEvidence(dkd_photo);return}
      const dkd_permission=await ImagePicker.requestCameraPermissionsAsync();if(!dkd_permission.granted){setDkdError('Anlık fotoğraf göndermek için kamera izni gerekiyor.');return}
      const dkd_result=await ImagePicker.launchCameraAsync({mediaTypes:['images'] as ImagePicker.MediaType[],allowsEditing:false,quality:.72,base64:true});if(dkd_result.canceled||!dkd_result.assets?.[0])return;const dkd_asset:any=dkd_result.assets[0];if(!dkd_asset.base64){setDkdError('Fotoğraf hazırlanamadı. Kamerayla tekrar çek.');return}setDkdEvidence({uri:dkd_asset.uri,base64:dkd_asset.base64,mime:'image/jpeg',capturedAt:new Date().toISOString()});
    }catch{setDkdError('Kamera açılamadı. Kamera iznini ve tarayıcı kamera erişimini kontrol et.')}
  }

  async function dkd_notify(){
    if(!dkd_selected)return Alert.alert('Bildirim seç','Araç sahibine iletilecek bildirimi seç.');
    setDkdBusy(true);setDkdError('');
    try{
      const dkd_result=await dkd_request({action:'notify',tagCode:dkd_token,category:dkd_selected.key,message:dkd_message.trim()||undefined,evidence:dkd_evidence?{base64:dkd_evidence.base64,mime:dkd_evidence.mime,capturedAt:dkd_evidence.capturedAt,stampLabel:'DraBornPark v1.0.3 • Güvenli Araç İletişimi'}:undefined,sessionKey:`v103-${Date.now()}-${Math.random().toString(36).slice(2,10)}`});
      setDkdSessionToken(dkd_result.sessionToken);setDkdExpiresAt(dkd_result.expiresAt);setDkdMessages(dkd_result.initialMessage?[dkd_result.initialMessage]:[]);setDkdMessage('');setDkdEvidence(null);setDkdSelected(null);
    }catch(dkd_problem:any){setDkdError(dkd_problem.status===429?`Çok fazla istek gönderildi. Yaklaşık ${Math.max(1,Math.ceil((dkd_problem.retryAfter||60)/60))} dakika sonra tekrar dene.`:dkd_error_text(String(dkd_problem?.message||'')))}finally{setDkdBusy(false)}
  }

  async function dkd_send_chat(){if(!dkd_session_token||!dkd_chat.trim())return;setDkdChatBusy(true);setDkdError('');try{await dkd_request({action:'chat',sessionToken:dkd_session_token,message:dkd_chat.trim()});setDkdChat('');const dkd_status=await dkd_request({action:'status',sessionToken:dkd_session_token});setDkdMessages(dkd_status.messages||[])}catch(dkd_problem:any){if(dkd_problem.status===410){setDkdSessionToken(null);setDkdError('Güvenli mesajlaşma oturumunun süresi sona erdi.')}else setDkdError('Mesaj gönderilemedi.')}finally{setDkdChatBusy(false)}}

  const dkd_direct:DkdCategory={key:'direct_message',title:'Araç sahibine güvenli mesaj',body:'Kendi mesajını yaz ve istersen o anda çektiğin fotoğrafı ekle.',priority:'normal'};
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={s.brand}><View style={s.brandIcon}><MaterialCommunityIcons name="shield-car" size={25} color={palette.cyan}/></View><View style={{flex:1}}><Text style={s.brandText}>DraBornPark</Text><Text style={s.brandSub}>GÜVENLİ ARAÇ İLETİŞİMİ</Text></View><Text style={s.version}>v1.0.3</Text></View>
    {dkd_busy&&!dkd_data?<View style={s.center}><ActivityIndicator color={palette.cyan}/><Text style={s.muted}>Etiket doğrulanıyor…</Text></View>:null}
    {dkd_error?<View style={s.error}><MaterialCommunityIcons name="alert-circle-outline" size={24} color={palette.orange}/><Text style={s.errorText}>{dkd_error}</Text></View>:null}
    {dkd_data?.snapshot&&!dkd_active?<View style={s.card}><MaterialCommunityIcons name="shield-key-outline" size={42} color={palette.orange}/><Text style={s.title}>Etiket aktivasyon bekliyor</Text><Text style={s.body}>Bu NFC/QR etiketi henüz bir DraBornPark hesabı ve araçla eşleştirilmemiş. Kutudaki gizli PIN ile yalnızca gerçek sahibi aktive edebilir.</Text><Pressable onPress={()=>router.push(`/activate-token/${encodeURIComponent(dkd_token)}` as any)} style={s.primary}><MaterialCommunityIcons name="key-variant" size={22} color={palette.ink}/><Text style={s.primaryText}>ETİKETİ AKTİVE ET</Text></Pressable></View>:null}
    {dkd_active?<>
      <View style={s.hero}><View style={s.heroIcon}><MaterialCommunityIcons name={dkd_vehicle?.type==='motorcycle'?'motorbike':'car-sports'} size={40} color={palette.cyan}/></View><Text style={s.eyebrow}>DRABORNPARK KORUMALI ARAÇ</Text><Text style={s.title}>{dkd_vehicle?.name||[dkd_vehicle?.brand,dkd_vehicle?.model].filter(Boolean).join(' ')||'DraBornPark Aracı'}</Text><Text style={s.body}>{[dkd_vehicle?.plate,dkd_vehicle?.color].filter(Boolean).join(' • ')||'Araç sahibinin paylaştığı bilgiler görüntüleniyor.'}</Text></View>
      <View style={s.privacy}><MaterialCommunityIcons name="phone-lock" size={26} color={palette.green}/><Text style={s.privacyText}>Telefon ve e-posta paylaşılmaz. İletişim DraBornPark üzerinden güvenli şekilde yürür.</Text></View>
      {!dkd_session_token?<>
        <Text style={s.section}>ARAÇ SAHİBİNE ULAŞ</Text><Pressable onPress={()=>setDkdSelected(dkd_direct)} style={[s.direct,dkd_selected?.key==='direct_message'&&s.selected]}><MaterialCommunityIcons name="message-text-fast-outline" size={28} color={palette.cyan}/><View style={{flex:1}}><Text style={s.directTitle}>Kendi mesajını yaz</Text><Text style={s.directBody}>Hazır bildirim yerine doğrudan güvenli mesaj gönder.</Text></View></Pressable>
        <View style={s.grid}>{dkd_categories.map(dkd_item=><Pressable key={dkd_item.key} onPress={()=>setDkdSelected(dkd_item)} style={[s.category,dkd_selected?.key===dkd_item.key&&s.selected]}><MaterialCommunityIcons name={dkd_selected?.key===dkd_item.key?'check-circle':'bell-outline'} size={22} color={dkd_selected?.key===dkd_item.key?palette.green:palette.cyan}/><Text style={s.categoryTitle}>{dkd_item.title}</Text></Pressable>)}</View>
        {dkd_selected?<View style={s.composer}><Text style={s.composeKicker}>DOĞRUDAN GÜVENLİ MESAJ</Text><Text style={s.composeTitle}>{dkd_selected.title}</Text><TextInput value={dkd_message} onChangeText={setDkdMessage} maxLength={700} multiline placeholder="Mesajını buraya yaz…" placeholderTextColor={palette.muted2} style={s.input}/><Pressable onPress={()=>void dkd_capture()} style={s.camera}><MaterialCommunityIcons name="camera-outline" size={25} color={palette.pink}/><View style={{flex:1}}><Text style={s.cameraTitle}>{dkd_evidence?'FOTOĞRAF HAZIR':'ANLIK FOTOĞRAF ÇEK'}</Text><Text style={s.cameraBody}>Galeriden seçilmez • kamera o anda açılır</Text></View></Pressable>{dkd_evidence?<View style={s.preview}><Image source={{uri:dkd_evidence.uri}} style={s.previewImage}/><Pressable onPress={()=>setDkdEvidence(null)} style={s.previewRemove}><MaterialCommunityIcons name="close" size={20} color="#fff"/></Pressable></View>:null}<Pressable disabled={dkd_busy} onPress={()=>void dkd_notify()} style={[s.primary,dkd_busy&&{opacity:.5}]}>{dkd_busy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="send" size={22} color={palette.ink}/><Text style={s.primaryText}>ARAÇ SAHİBİNE GÖNDER</Text></>}</Pressable></View>:null}
      </>:<View style={s.chat}><View style={s.chatHead}><MaterialCommunityIcons name="message-lock-outline" size={28} color={palette.green}/><View style={{flex:1}}><Text style={s.chatTitle}>Güvenli mesajlaşma açık</Text><Text style={s.chatSub}>{dkd_expires_at?`Oturum ${new Date(dkd_expires_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})} saatine kadar açık.`:'Geçici oturum aktif.'}</Text></View></View><Text style={s.historyTitle}>MESAJ GEÇMİŞİ</Text><View style={s.history}>{dkd_messages.length?dkd_messages.map(dkd_item=><View key={dkd_item.id} style={[s.bubble,dkd_item.sender_role==='visitor'?s.bubbleVisitor:s.bubbleOwner]}><Text style={s.bubbleRole}>{dkd_item.sender_role==='visitor'?'SEN':'ARAÇ SAHİBİ'}</Text><Text style={s.bubbleText}>{dkd_item.body_safe}</Text>{dkd_item.attachment_kind?<Text style={s.attachment}>📷 Anlık kanıt fotoğrafı eklendi</Text>:null}<Text style={s.bubbleTime}>{new Date(dkd_item.created_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</Text></View>):<Text style={s.muted}>Mesaj geçmişi yükleniyor…</Text>}</View><TextInput value={dkd_chat} onChangeText={setDkdChat} maxLength={700} multiline placeholder="Mesaj yaz…" placeholderTextColor={palette.muted2} style={s.chatInput}/><Pressable disabled={dkd_chat_busy||!dkd_chat.trim()} onPress={()=>void dkd_send_chat()} style={[s.primary,(dkd_chat_busy||!dkd_chat.trim())&&{opacity:.45}]}>{dkd_chat_busy?<ActivityIndicator color={palette.ink}/>:<><MaterialCommunityIcons name="send" size={21} color={palette.ink}/><Text style={s.primaryText}>MESAJ GÖNDER</Text></>}</Pressable></View>}
    </>:null}
    <Text style={s.footer}>DraBornPark v1.0.3 • NFC ve QR aynı güvenli etikete bağlıdır.</Text>
  </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#050816'},scroll:{padding:20,paddingBottom:70},brand:{height:66,flexDirection:'row',alignItems:'center',gap:10},brandIcon:{width:44,height:44,borderRadius:15,backgroundColor:`${palette.cyan}18`,alignItems:'center',justifyContent:'center'},brandText:{color:palette.text,fontSize:21,fontWeight:'900'},brandSub:{color:palette.cyan,fontSize:8.5,fontWeight:'900',letterSpacing:1},version:{color:palette.purple,fontSize:12,fontWeight:'900'},center:{minHeight:280,alignItems:'center',justifyContent:'center',gap:12},muted:{color:palette.muted,fontSize:type.caption},error:{borderRadius:18,borderWidth:1,borderColor:`${palette.orange}55`,backgroundColor:`${palette.orange}0E`,padding:13,flexDirection:'row',gap:9,alignItems:'center',marginTop:10},errorText:{flex:1,color:palette.text,fontSize:type.caption,lineHeight:19},card:{marginTop:24,borderRadius:radius.xl,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:24,alignItems:'center'},hero:{marginTop:15,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.cyan}55`,backgroundColor:palette.panel,padding:24,alignItems:'center'},heroIcon:{width:76,height:76,borderRadius:24,backgroundColor:`${palette.cyan}14`,alignItems:'center',justifyContent:'center',marginBottom:15},eyebrow:{color:palette.cyan,fontSize:10,fontWeight:'900',letterSpacing:1.2},title:{color:palette.text,fontSize:24,fontWeight:'900',textAlign:'center',marginTop:9},body:{color:palette.muted,fontSize:type.body,lineHeight:22,textAlign:'center',marginTop:8},privacy:{marginTop:12,borderRadius:18,borderWidth:1,borderColor:`${palette.green}42`,backgroundColor:`${palette.green}0B`,padding:14,flexDirection:'row',alignItems:'center',gap:10},privacyText:{flex:1,color:palette.muted,fontSize:type.caption,lineHeight:18},section:{color:palette.text,fontSize:13,fontWeight:'900',letterSpacing:.8,marginTop:24,marginBottom:10},direct:{minHeight:82,borderRadius:20,borderWidth:1,borderColor:`${palette.cyan}55`,backgroundColor:`${palette.cyan}0C`,padding:15,flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},directTitle:{color:palette.text,fontSize:type.bodyStrong,fontWeight:'900'},directBody:{color:palette.muted,fontSize:type.caption,marginTop:4},grid:{gap:8},category:{minHeight:62,borderRadius:17,borderWidth:1,borderColor:palette.line,backgroundColor:palette.panel,padding:13,flexDirection:'row',alignItems:'center',gap:10},selected:{borderColor:`${palette.green}70`,backgroundColor:`${palette.green}0F`},categoryTitle:{flex:1,color:palette.text,fontSize:type.caption,fontWeight:'800'},composer:{marginTop:14,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.cyan}55`,backgroundColor:palette.panel,padding:16},composeKicker:{color:palette.cyan,fontSize:9,fontWeight:'900',letterSpacing:1},composeTitle:{color:palette.text,fontSize:21,fontWeight:'900',marginTop:7},input:{minHeight:130,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:'#061020',color:palette.text,padding:14,textAlignVertical:'top',fontSize:type.body,marginTop:13},camera:{minHeight:70,borderRadius:18,borderWidth:1,borderColor:`${palette.pink}55`,backgroundColor:`${palette.pink}0C`,padding:13,flexDirection:'row',alignItems:'center',gap:10,marginTop:11},cameraTitle:{color:palette.text,fontSize:type.caption,fontWeight:'900'},cameraBody:{color:palette.muted,fontSize:type.micro,marginTop:3},preview:{height:190,borderRadius:18,overflow:'hidden',marginTop:11,backgroundColor:'#000'},previewImage:{width:'100%',height:'100%',resizeMode:'cover'},previewRemove:{position:'absolute',right:10,top:10,width:38,height:38,borderRadius:19,backgroundColor:'#000A',alignItems:'center',justifyContent:'center'},primary:{minHeight:60,borderRadius:19,backgroundColor:palette.aqua,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,paddingHorizontal:18,marginTop:13},primaryText:{color:palette.ink,fontSize:type.bodyStrong,fontWeight:'900',textAlign:'center'},chat:{marginTop:22,borderRadius:radius.xl,borderWidth:1,borderColor:`${palette.green}50`,backgroundColor:palette.panel,padding:16},chatHead:{flexDirection:'row',gap:11,alignItems:'center'},chatTitle:{color:palette.text,fontSize:type.section,fontWeight:'900'},chatSub:{color:palette.muted,fontSize:type.micro,marginTop:3},historyTitle:{color:palette.cyan,fontSize:10,fontWeight:'900',letterSpacing:1,marginTop:20,marginBottom:9},history:{gap:8},bubble:{maxWidth:'88%',borderRadius:18,padding:12},bubbleVisitor:{alignSelf:'flex-end',backgroundColor:`${palette.cyan}18`,borderWidth:1,borderColor:`${palette.cyan}45`},bubbleOwner:{alignSelf:'flex-start',backgroundColor:`${palette.purple}18`,borderWidth:1,borderColor:`${palette.purple}45`},bubbleRole:{color:palette.muted2,fontSize:8,fontWeight:'900'},bubbleText:{color:palette.text,fontSize:type.caption,lineHeight:19,marginTop:4},bubbleTime:{color:palette.muted2,fontSize:8,marginTop:6,textAlign:'right'},attachment:{color:palette.pink,fontSize:9,fontWeight:'800',marginTop:6},chatInput:{minHeight:92,borderRadius:18,borderWidth:1,borderColor:palette.line,backgroundColor:'#061020',color:palette.text,padding:13,textAlignVertical:'top',fontSize:type.body,marginTop:14},footer:{color:palette.muted2,fontSize:10,textAlign:'center',marginTop:28}});
