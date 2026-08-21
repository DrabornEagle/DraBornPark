import { supabase } from '@/src/lib/supabase';

export async function deleteReport(reportId:string){
  const {data:sessions,error:sessionError}=await supabase
    .from('drabornpark_contact_sessions')
    .select('id')
    .eq('report_id',reportId);
  if(sessionError)throw sessionError;

  const sessionIds=(sessions??[]).map(item=>String(item.id)).filter(Boolean);
  let evidencePaths:string[]=[];
  if(sessionIds.length){
    const {data:messages,error:messageError}=await supabase
      .from('drabornpark_messages')
      .select('attachment_path')
      .in('session_id',sessionIds)
      .not('attachment_path','is',null);
    if(messageError)throw messageError;
    evidencePaths=[...new Set((messages??[]).map(item=>String(item.attachment_path||'').trim()).filter(Boolean))];
  }

  const {data,error}=await supabase.rpc('drabornpark_delete_report',{
    drabornpark_report_id:reportId,
  });
  if(error)throw error;

  if(data&&evidencePaths.length){
    const {error:storageError}=await supabase.storage.from('drabornpark-private').remove(evidencePaths);
    if(storageError)console.warn('[DraBornPark kanıt] silinen bildirimin fotoğrafı temizlenemedi',storageError.message);
  }
  return Boolean(data);
}
