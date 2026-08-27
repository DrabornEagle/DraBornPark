import fs from 'node:fs';

const dkd_file='src/components/DraBornParkPlusPanel.tsx';
let dkd_text=fs.readFileSync(dkd_file,'utf8');

const dkd_persist_re=/  const dkdPersistLocalReceipt=async\(dkdReceipt:\{planId:PlanId;transactionDate:number;trialBonusMs:number\}\)=>\{setDkdLocalReceipt\(dkdReceipt\);try\{await AsyncStorage\.setItem\('@drabornpark:plus-local-v118',JSON\.stringify\(dkdReceipt\)\);\}catch\{\}\};\n/g;
let dkd_persist_seen=0;
dkd_text=dkd_text.replace(dkd_persist_re,dkd_match=>{dkd_persist_seen+=1;return dkd_persist_seen===1?dkd_match:'';});

const dkd_load_line="  useEffect(()=>{void AsyncStorage.getItem('@drabornpark:plus-local-v118').then(dkdRaw=>{if(!dkdRaw)return;try{const dkdParsed=JSON.parse(dkdRaw);if((dkdParsed?.planId==='monthly'||dkdParsed?.planId==='yearly')&&Number(dkdParsed?.transactionDate)>0){setDkdLocalReceipt(dkdParsed);dkdPlanRef.current=dkdParsed.planId;}}catch{}});},[]);\n";
let dkd_load_seen=0;
dkd_text=dkd_text.split(dkd_load_line).join('__DKD_V118_LOAD_SPLIT__');
dkd_text=dkd_text.replace(/__DKD_V118_LOAD_SPLIT__/g,()=>{dkd_load_seen+=1;return dkd_load_seen===1?dkd_load_line:'';});

const dkd_persist_count=(dkd_text.match(/const dkdPersistLocalReceipt=/g)||[]).length;
const dkd_load_count=(dkd_text.match(/AsyncStorage\.getItem\('@drabornpark:plus-local-v118'\)/g)||[]).length;
if(dkd_persist_count!==1)throw new Error(`Expected one dkdPersistLocalReceipt, got ${dkd_persist_count}`);
if(dkd_load_count!==1)throw new Error(`Expected one v1.0.18 local receipt loader, got ${dkd_load_count}`);

fs.writeFileSync(dkd_file,dkd_text);
console.log('DraBornPark v1.0.18 idempotency cleanup ready.');
