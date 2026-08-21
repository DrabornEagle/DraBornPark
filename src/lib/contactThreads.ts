import { supabase } from '@/src/lib/supabase';

export type ContactMessage = {
  id: string;
  session_id: string;
  sender_role: 'owner' | 'visitor' | 'system' | string;
  body_safe: string;
  created_at: string;
  attachment_kind?: 'evidence_photo' | null;
  attachment_path?: string | null;
  attachment_captured_at?: string | null;
  attachment_mime?: string | null;
};

export type ContactSession = {
  id: string;
  report_id: string;
  status: string;
  expires_at: string;
};

export type ContactThreadBundle = {
  sessionsByReport: Record<string, ContactSession>;
  messagesByReport: Record<string, ContactMessage[]>;
};

export async function loadContactThreads(reportIds: string[]): Promise<ContactThreadBundle> {
  if (!reportIds.length) return { sessionsByReport: {}, messagesByReport: {} };

  const { data: sessions, error: sessionError } = await supabase
    .from('drabornpark_contact_sessions')
    .select('id,report_id,status,expires_at')
    .in('report_id', reportIds)
    .order('created_at', { ascending: false });
  if (sessionError) throw sessionError;

  const sessionsByReport: Record<string, ContactSession> = {};
  const sessionToReport = new Map<string, string>();
  for (const raw of sessions ?? []) {
    const session = raw as ContactSession;
    if (!sessionsByReport[session.report_id]) sessionsByReport[session.report_id] = session;
    sessionToReport.set(session.id, session.report_id);
  }

  const sessionIds = [...sessionToReport.keys()];
  const messagesByReport: Record<string, ContactMessage[]> = {};
  if (!sessionIds.length) return { sessionsByReport, messagesByReport };

  const { data: messages, error: messageError } = await supabase
    .from('drabornpark_messages')
    .select('id,session_id,sender_role,body_safe,created_at,attachment_kind,attachment_path,attachment_captured_at,attachment_mime')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });
  if (messageError) throw messageError;

  for (const raw of messages ?? []) {
    const message = raw as ContactMessage;
    const reportId = sessionToReport.get(message.session_id);
    if (!reportId) continue;
    (messagesByReport[reportId] ??= []).push(message);
  }
  return { sessionsByReport, messagesByReport };
}

export async function getEvidenceSignedUrl(path: string) {
  const clean = String(path || '').trim();
  if (!clean) throw new Error('Kanıt fotoğrafı yolu bulunamadı.');
  const { data, error } = await supabase.storage.from('drabornpark-private').createSignedUrl(clean, 600);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Kanıt fotoğrafı açılamadı.');
  return data.signedUrl;
}

export function subscribeInboxChanges(onChange: () => void) {
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let fallbackTimer: ReturnType<typeof setInterval> | null = null;

  void supabase.auth.getUser().then(({ data, error }) => {
    if (error) throw error;
    const userId = data.user?.id;
    if (!active || !userId) return;

    channel = supabase
      .channel(`drabornpark-inbox-v053-${userId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drabornpark_reports',
        filter: `owner_user_id=eq.${userId}`,
      }, onChange)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'drabornpark_messages',
      }, onChange)
      .subscribe();

    fallbackTimer = setInterval(() => {
      if (active) onChange();
    }, 2000);
  }).catch(() => undefined);

  return {
    remove() {
      active = false;
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (channel) void supabase.removeChannel(channel);
    },
  };
}
