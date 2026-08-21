import { supabase } from '@/src/lib/supabase';

export async function deleteReport(reportId:string){
  const {data,error}=await supabase.rpc('drabornpark_delete_report',{
    drabornpark_report_id:reportId,
  });
  if(error)throw error;
  return Boolean(data);
}
