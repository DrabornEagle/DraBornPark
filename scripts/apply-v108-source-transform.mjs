import fs from 'node:fs';
import path from 'node:path';

const dkd_root=process.cwd();
function dkd_patch(dkd_file,dkd_replacements){
  const dkd_path=path.join(dkd_root,dkd_file);
  let dkd_text=fs.readFileSync(dkd_path,'utf8');
  let dkd_changed=false;
  for(const [dkd_from,dkd_to] of dkd_replacements){
    if(dkd_text.includes(dkd_to))continue;
    if(!dkd_text.includes(dkd_from))throw new Error(`DraBornPark v1.0.8 transform marker missing in ${dkd_file}: ${dkd_from.slice(0,120)}`);
    dkd_text=dkd_text.replace(dkd_from,dkd_to);
    dkd_changed=true;
  }
  if(dkd_changed)fs.writeFileSync(dkd_path,dkd_text);
}

dkd_patch('src/components/AppChrome.tsx',[[
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:8}]}",
  "dockLabel:{fontSize:type.micro,color:palette.muted2,fontWeight:'900',transform:[{translateX:0}]}"
]]);

dkd_patch('app/index.tsx',[
  [
    'function StatusPill({icon,text,color,compact=false,offsetX=0}:{icon:string;text:string;color:string;compact?:boolean;offsetX?:number}){return <View style={[s.statusPill,{borderColor:color+\'60\',backgroundColor:color+\'14\',transform:[{translateX:offsetX}]},compact&&s.statusPillCompact]}><SafeIcon name={icon} size={compact?13:16} color={color}/><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={[s.statusPillText,{color},compact&&s.statusTextCompact]}>{text}</Text></View>}',
    'function StatusPill({icon,text,color,compact=false,offsetX=0,textOffsetX=0}:{icon:string;text:string;color:string;compact?:boolean;offsetX?:number;textOffsetX?:number}){return <View style={[s.statusPill,{borderColor:color+\'60\',backgroundColor:color+\'14\',transform:[{translateX:offsetX}]},compact&&s.statusPillCompact]}><SafeIcon name={icon} size={compact?13:16} color={color}/><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={[s.statusPillText,{color},compact&&s.statusTextCompact,{transform:[{translateX:textOffsetX}]}]}>{text}</Text></View>}'
  ],
  [
    '<StatusPill compact offsetX={-20} icon="shield-check-outline" text="GÜVENLİ OTURUM" color={palette.green}/>',
    '<StatusPill compact offsetX={-12} textOffsetX={-3} icon="shield-check-outline" text="GÜVENLİ OTURUM" color={palette.green}/>'
  ],
  [
    '<Pill label="v1.0" color={palette.purple}/>',
    '<Pill label="v1.0.8" color={palette.purple}/>'
  ]
]);

dkd_patch('app/factory.tsx',[[
  'NFC + QR ETİKET MERKEZİ • v1.0.7',
  'NFC + QR ETİKET MERKEZİ • v1.0.8'
]]);

console.log('DraBornPark v1.0.8 source transforms ready • centered dock labels • restored secure-session badge position • secure-session text micro-alignment.');
