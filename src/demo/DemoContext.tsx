import React, { createContext, useContext, useMemo, useState } from 'react';

export type DemoSection = 'vehicles'|'park'|'notifications'|'tags'|'timeline'|'family'|'guest'|'modes'|'routing'|'emergency'|'privacy'|'plus'|'support'|'factory'|'public';

export type DemoState = {
  profile: { displayName:string; plan:string; trialDaysLeft:number; memberSince:string };
  vehicles: any[];
  parks: any[];
  notifications: any[];
  tags: any[];
  timeline: any[];
  family: any[];
  guestDrivers: any[];
  vehicleModes: any[];
  routingRules: any[];
  emergencyContacts: any[];
  privacy: { showPlate:boolean; showBrandModel:boolean; showColor:boolean; familyParkShare:boolean };
  supportRequests: any[];
  factoryTags: any[];
  stats: { parksThisMonth:number; reportsThisMonth:number; averageParkMinutes:number; favoritePlace:string; privacyScore:number };
};

const initialDemo: DemoState = {
  profile:{displayName:'Demo Kullanıcı',plan:'PLUS_TRIAL',trialDaysLeft:14,memberSince:'20 Ağustos 2026'},
  vehicles:[
    {id:'v1',name:'Volkswagen Tiguan',plate:'06 DBP 2026',brand:'Volkswagen',model:'Tiguan',year:2025,color:'Gece Mavisi',type:'car',active:true,tagCode:'DP-K7M4X2P9'},
    {id:'v2',name:'Şehir Motoru',plate:'06 MOTO 26',brand:'Honda',model:'Forza 250',year:2026,color:'Mat Gri',type:'motorcycle',active:true,tagCode:'DP-M8T3Q7'},
    {id:'v3',name:'Aile Aracı',plate:'06 AIL 606',brand:'Volvo',model:'XC40',year:2024,color:'Beyaz',type:'car',active:true,tagCode:'DP-FAM606'},
  ],
  parks:[
    {id:'p1',vehicleId:'v1',placeName:'Metromall AVM',floor:'P2',zoneColor:'Mavi',row:'C',bay:'128',latitude:39.9357,longitude:32.8063,parkedAt:'2026-08-20T11:32:00+03:00',endedAt:null,note:'Sinema girişine yakın',reminder:'1 saat'},
    {id:'p2',vehicleId:'v1',placeName:'Ankamall',floor:'P1',zoneColor:'Turuncu',row:'B',bay:'42',parkedAt:'2026-08-19T18:46:00+03:00',endedAt:'2026-08-19T21:12:00+03:00'},
    {id:'p3',vehicleId:'v2',placeName:'Armada AVM',floor:'Açık',zoneColor:'Yeşil',row:'D',bay:'17',parkedAt:'2026-08-17T14:10:00+03:00',endedAt:'2026-08-17T16:18:00+03:00'},
  ],
  notifications:[
    {id:'n1',icon:'car-light-high',color:'#FFB15A',title:'Farlarınız açık olabilir',body:'Bir kullanıcı aracınızın farlarının açık olduğunu bildirdi.',time:'5 dk',seen:false,priority:'normal',reply:null},
    {id:'n2',icon:'car-brake-alert',color:'#FF667A',title:'Aracınızı hareket ettirmeniz isteniyor',body:'Aracınız başka bir aracın çıkışını engelliyor olabilir.',time:'18 dk',seen:false,priority:'high',reply:'5 dakika'},
    {id:'n3',icon:'camera-outline',color:'#A97AFF',title:'Fotoğraflı hasar bildirimi',body:'Sağ ön kapı bölgesi için fotoğraflı bildirim gönderildi.',time:'1 sa',seen:true,priority:'normal',reply:null},
    {id:'n4',icon:'dog-side',color:'#4FE6A4',title:'Araçta hayvan var',body:'Yüksek öncelikli bir durum bildirimi alındı.',time:'Dün',seen:true,priority:'emergency',reply:'Gördüm, geliyorum'},
  ],
  tags:[
    {id:'t1',code:'DP-K7M4X2P9',serial:'DBP-260820-001',vehicleId:'v1',status:'ACTIVATED',nfc:'NFC doğrulandı',qr:'QR doğrulandı'},
    {id:'t2',code:'DP-M8T3Q7',serial:'DBP-260820-002',vehicleId:'v2',status:'ACTIVATED',nfc:'NFC doğrulandı',qr:'QR doğrulandı'},
  ],
  timeline:[
    {id:'tl1',type:'PARKED',icon:'map-marker-check',color:'#26D9FF',title:'Park edildi',detail:'Metromall AVM • P2 • Mavi • C128',time:'Bugün 11:32'},
    {id:'tl2',type:'REPORT',icon:'car-light-high',color:'#FFB15A',title:'Far açık bildirimi',detail:'Anonim kullanıcı bildirim gönderdi.',time:'Bugün 12:07'},
    {id:'tl3',type:'MODE',icon:'car-key',color:'#A97AFF',title:'Vale Modu tamamlandı',detail:'Kentpark Vale • 2 saatlik oturum.',time:'Dün 20:10'},
    {id:'tl4',type:'TAG',icon:'nfc',color:'#4FE6A4',title:'NFC etiket doğrulandı',detail:'DP-K7M4X2P9 etiketi başarıyla doğrulandı.',time:'18 Ağustos 14:21'},
  ],
  family:[
    {id:'f1',name:'Eşim',email:'esim@example.com',status:'active',canViewPark:true,canNotify:true},
    {id:'f2',name:'Babam',email:'baba@example.com',status:'active',canViewPark:false,canNotify:true},
    {id:'f3',name:'Kardeşim',email:'kardes@example.com',status:'invited',canViewPark:false,canNotify:false},
  ],
  guestDrivers:[
    {id:'g1',label:'Eşim',vehicleId:'v1',status:'active',endsAt:'Bugün 16:30',redirect:true},
    {id:'g2',label:'Arkadaşım',vehicleId:'v2',status:'ended',endsAt:'18 Ağustos 21:00',redirect:true},
  ],
  vehicleModes:[
    {id:'m1',type:'valet',vehicleId:'v1',label:'Kentpark Vale',status:'ended',state:'completed',endsAt:'Dün 20:10'},
    {id:'m2',type:'service',vehicleId:'v3',label:'Volvo Servis',status:'active',state:'vehicle_ready',endsAt:'Bugün 18:00'},
  ],
  routingRules:[
    {id:'r1',name:'Hafta içi iş saatleri',days:'Pzt–Cum',time:'08:00–18:00',target:'Ben',enabled:true},
    {id:'r2',name:'Akşam aile yönlendirmesi',days:'Her gün',time:'18:00–23:59',target:'Eşim',enabled:true},
  ],
  emergencyContacts:[
    {id:'e1',name:'Eşim',phone:'+90 ••• ••• 12 34',priority:1,enabled:true},
    {id:'e2',name:'Babam',phone:'+90 ••• ••• 56 78',priority:2,enabled:true},
    {id:'e3',name:'Kardeşim',phone:'+90 ••• ••• 90 12',priority:3,enabled:false},
  ],
  privacy:{showPlate:true,showBrandModel:true,showColor:true,familyParkShare:false},
  supportRequests:[
    {id:'s1',subject:'NFC okuma testi',status:'answered',time:'Dün 15:20',body:'Atermik camda okuma mesafesi hakkında bilgi istiyorum.'},
    {id:'s2',subject:'Park fotoğrafı',status:'open',time:'Bugün 09:14',body:'Park fotoğrafını değiştirmek istiyorum.'},
  ],
  factoryTags:[
    {id:'ft1',code:'DP-X4A8K2',serial:'DBP-260820-021',status:'NFC doğrulandı',pin:'••••-4821'},
    {id:'ft2',code:'DP-Q9M3T7',serial:'DBP-260820-022',status:'Paketlendi',pin:'••••-7194'},
    {id:'ft3',code:'DP-L6P2R8',serial:'DBP-260820-023',status:'Satışa hazır',pin:'••••-3358'},
  ],
  stats:{parksThisMonth:17,reportsThisMonth:4,averageParkMinutes:102,favoritePlace:'Metromall AVM',privacyScore:96},
};

type DemoContextValue = {
  active:boolean;
  state:DemoState;
  start:()=>void;
  stop:()=>void;
  reset:()=>void;
  patch:(recipe:(current:DemoState)=>DemoState)=>void;
};

const DemoContext=createContext<DemoContextValue|null>(null);

export function DemoProvider({children}:{children:React.ReactNode}){
  const [active,setActive]=useState(false);
  const [state,setState]=useState<DemoState>(initialDemo);
  const value=useMemo<DemoContextValue>(()=>({
    active,state,
    start:()=>setActive(true),
    stop:()=>setActive(false),
    reset:()=>setState(initialDemo),
    patch:(recipe)=>setState(current=>recipe(current)),
  }),[active,state]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(){const value=useContext(DemoContext);if(!value)throw new Error('DemoProvider missing');return value;}
