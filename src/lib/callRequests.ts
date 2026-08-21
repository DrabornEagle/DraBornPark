import { supabase } from './supabase';

export type CallRequestState={
  report_id:string;
  status:'pending'|'approved'|'rejected'|'expired';
  expires_at:string;
  decided_at?:string|null;
};

export async function loadCallRequests(reportIds:string[]){
  if(!reportIds.length)return {} as Record<string,CallRequestState>;
  const {data,error}=await supabase
    .from('drabornpark_call_requests')
    .select('report_id,status,expires_at,decided_at')
    .in('report_id',reportIds);
  if(error)throw error;
  return Object.fromEntries((data??[]).map((item:any)=>[String(item.report_id),item as CallRequestState]));
}

export async function respondCallRequest(reportId:string,decision:'approved'|'rejected'){
  const {data,error}=await supabase.rpc('dkd_drabornpark_respond_call_request_v053',{dkd_report_id:reportId,dkd_decision:decision});
  if(error)throw error;
  return data as {ok:boolean;status:string;expiresAt?:string;alreadyDecided?:boolean};
}
