import fs from 'node:fs';

function dkd_write(dkd_path,dkd_transform){
  const dkd_before=fs.readFileSync(dkd_path,'utf8');
  const dkd_after=dkd_transform(dkd_before);
  if(dkd_after===dkd_before)throw new Error(`No changes applied to ${dkd_path}`);
  fs.writeFileSync(dkd_path,dkd_after);
}

dkd_write('app/index.tsx',dkd_source=>{
  let dkd_next=dkd_source.replace('offsetX={-7} icon="shield-check-outline" text="GÜVENLİ OTURUM"','offsetX={-12} icon="shield-check-outline" text="GÜVENLİ OTURUM"');
  dkd_next=dkd_next.replace('<View><Text style={s.liveOver}>•CANLI•</Text><Text style={s.liveText}>AKTİF ARAÇ • CANLI</Text></View>','<Text style={s.liveOver}>•CANLI•</Text>');
  dkd_next=dkd_next.replace("liveBadge:{minHeight:42,borderRadius:15,borderWidth:1,borderColor:palette.green+'72',backgroundColor:palette.green+'13',paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:7},liveDot:{width:8,height:8,borderRadius:4,backgroundColor:palette.green},liveOver:{color:palette.green,fontSize:10,fontWeight:'900',letterSpacing:1.4,textAlign:'center',lineHeight:12},liveText:{color:palette.green,fontSize:10.5,fontWeight:'900',marginTop:1}","liveBadge:{minHeight:36,borderRadius:15,borderWidth:1,borderColor:palette.green+'72',backgroundColor:palette.green+'13',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:7},liveDot:{width:8,height:8,borderRadius:4,backgroundColor:palette.green},liveOver:{color:palette.green,fontSize:11.5,fontWeight:'900',letterSpacing:1.5,textAlign:'center',lineHeight:14},liveText:{color:palette.green,fontSize:10.5,fontWeight:'900',marginTop:1}");
  return dkd_next;
});

dkd_write('app/feature/[slug].tsx',dkd_source=>{
  const dkd_hero='<View style={[s.hero,{borderColor:`${color}55`,backgroundColor:`${color}10`}]}><View style={[s.heroIcon,{backgroundColor:`${color}22`}]}><MaterialCommunityIcons name={icon as any} size={35} color={color}/></View><View style={{flex:1}}><Text style={s.heroTitle}>{support?\'Sorununu doğru kişiye ulaştır.\':plusPage?(plus?\'DraBornPark+ aktif\':\'DraBornPark+ ile daha fazlası\'):\'Kişisel bilgiler varsayılan olarak gizli.\'}</Text><Text style={s.heroBody}>{support?\'Yeni kayıt admin tarafına anında düşer; kayıt durumunu aynı ekrandan takip edebilirsin.\':plusPage?\'Yeni etiket aktivasyonu 14 günlük Premium ödül kazandırır. Sonrasında Google Play aylık veya yıllık planla devam edebilirsin.\':\'Telefon, e-posta, tam ad ve park geçmişi bu ayarlardan bağımsız olarak kamusal değildir.\'}</Text></View></View>';
  if(!dkd_source.includes(dkd_hero))throw new Error('Plus hero marker missing');
  return dkd_source.replace(dkd_hero,`{!plusPage?<View style={[s.hero,{borderColor:\`${'${color}'}55\`,backgroundColor:\`${'${color}'}10\`}]}><View style={[s.heroIcon,{backgroundColor:\`${'${color}'}22\`}]}><MaterialCommunityIcons name={icon as any} size={35} color={color}/></View><View style={{flex:1}}><Text style={s.heroTitle}>{support?'Sorununu doğru kişiye ulaştır.':'Kişisel bilgiler varsayılan olarak gizli.'}</Text><Text style={s.heroBody}>{support?'Yeni kayıt admin tarafına anında düşer; kayıt durumunu aynı ekrandan takip edebilirsin.':'Telefon, e-posta, tam ad ve park geçmişi bu ayarlardan bağımsız olarak kamusal değildir.'}</Text></View></View>:null}`);
});

dkd_write('src/components/DraBornParkPlusPanel.tsx',dkd_source=>{
  let dkd_next=dkd_source;
  dkd_next=dkd_next.replace(/\n\s*<Animated\.View style=\{\[s\.status,[\s\S]*?<\/Animated\.View>\n\s*<View style=\{s\.priceRail\}>[\s\S]*?<\/View>\n\s*<View style=\{s\.planHead\}>/,"\n    <View style={s.planHead}>");
  if(dkd_next===dkd_source)throw new Error('Plus status/price rail block not found');
  return dkd_next;
});

dkd_write('scripts/check-project.mjs',dkd_source=>{
  let dkd_next=dkd_source.replace("['DraBornPark+','AKTİF ARAÇ • CANLI','•CANLI•','ARACINIZI KORUYUN','Konum ayrıntısı kaydedilmedi','vehiclePills','vehicleGlow']","['DraBornPark+','•CANLI•','ARACINIZI KORUYUN','Konum ayrıntısı kaydedilmedi','vehiclePills','vehicleGlow']");
  dkd_next=dkd_next.replace("offsetX={-7}","offsetX={-12}");
  return dkd_next;
});

console.log('DraBornPark v0.5.5 UI cleanup applied.');
