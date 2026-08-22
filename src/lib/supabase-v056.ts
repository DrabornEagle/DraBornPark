import { supabase as dkd_base_supabase } from './supabase';

let dkd_home_channel_sequence = 0;
const dkd_original_channel = dkd_base_supabase.channel.bind(dkd_base_supabase);

export const supabase = new Proxy(dkd_base_supabase, {
  get(dkd_target, dkd_property, dkd_receiver) {
    if (dkd_property === 'channel') {
      return (dkd_topic: string, dkd_options?: any) => {
        const dkd_safe_topic = dkd_topic.startsWith('dkd_home_sync_')
          ? `${dkd_topic}_${Date.now()}_${++dkd_home_channel_sequence}`
          : dkd_topic;
        return dkd_original_channel(dkd_safe_topic, dkd_options);
      };
    }
    return Reflect.get(dkd_target, dkd_property, dkd_receiver);
  },
}) as typeof dkd_base_supabase;
