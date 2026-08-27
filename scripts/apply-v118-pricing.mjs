import fs from 'node:fs';

const dkd_file='src/components/DraBornParkPlusPanel.tsx';
let dkd_text=fs.readFileSync(dkd_file,'utf8');

dkd_text=dkd_text.replace(
  "const displayPrice=(id:PlanId)=>id==='monthly'?'69,99 TL / ay':'599,99 TL / yıl';",
  "const displayPrice=(id:PlanId)=>planInfo[id]?.price||(id==='monthly'?'Aylık Google Play fiyatı':'Yıllık Google Play fiyatı');"
);
dkd_text=dkd_text.replace(
  'Aylık 69,99 TL • Yıllık 599,99 TL. Google Play ödeme ekranındaki güncel mağaza fiyatı satın alma sırasında esas alınır.',
  "Aylık ve yıllık güncel fiyatlar Google Play'den canlı alınır. Satın alma ekranında gösterilen mağaza fiyatı her zaman esas alınır."
);
dkd_text=dkd_text.replace('%29 AVANTAJ','YILLIK AVANTAJ');
dkd_text=dkd_text.replace('12 aya göre yaklaşık 239,89 TL avantaj','Google Play fiyatına göre yıllık avantaj');

if(!dkd_text.includes("planInfo[id]?.price"))throw new Error('Live Google Play price binding missing');
if(/Aylık 69,99 TL|239,89 TL|%29 AVANTAJ/.test(dkd_text))throw new Error('Stale hardcoded subscription price copy remains');

fs.writeFileSync(dkd_file,dkd_text);
console.log('DraBornPark v1.0.18 live Google Play pricing ready.');
