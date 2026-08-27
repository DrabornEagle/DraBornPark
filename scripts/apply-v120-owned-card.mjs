import fs from 'node:fs';
const dkd_file='src/components/DraBornParkPlusPanel.tsx';
let dkd_text=fs.readFileSync(dkd_file,'utf8');
if(!dkd_text.includes('dkdOwnedPlanCardId')){
  dkd_text=dkd_text.replace(
    "const dkdCountdownTitle=dkdPaidPremium?'PREMİUM SÜRESİ':'DENEME SÜRESİ';const dkdOwnedPlan=",
    "const dkdCountdownTitle=dkdPaidPremium?'PREMİUM SÜRESİ':'DENEME SÜRESİ';const dkdOwnedPlanCardId=(String(lastVerified?.basePlanId||data?.subscription?.base_plan_id||'').toLowerCase().includes('year')?'yearly':String(lastVerified?.basePlanId||data?.subscription?.base_plan_id||'').toLowerCase().includes('month')?'monthly':null) as PlanId|null;const dkdOwnedPlan="
  );
  dkd_text=dkd_text.replace(
    'onPress={()=>setSelected(plan.id)} style={[s.plan,',
    'onPress={()=>{if(dkdPaidPremium&&dkdOwnedPlanCardId===plan.id){setDkdInfoPopup(true);return;}setSelected(plan.id);}} style={[s.plan,'
  );
}
if(!dkd_text.includes('dkdPaidPremium&&dkdOwnedPlanCardId===plan.id'))throw new Error('owned plan card popup marker missing');
fs.writeFileSync(dkd_file,dkd_text);
console.log('DraBornPark v1.0.20 owned plan card popup ready.');
