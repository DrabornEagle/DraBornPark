import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadLiveDashboard } from '@/src/lib/drabornpark';
import { palette, radius } from '@/src/theme';

type Filter = 'all' | 'park' | 'notice' | 'mode' | 'tag';

function classify(eventType: string): Filter {
  const type = String(eventType || '').toUpperCase();
  if (type.includes('PARK')) return 'park';
  if (type.includes('REPORT') || type.includes('MESSAGE') || type.includes('NOTIFICATION')) return 'notice';
  if (type.includes('VALET') || type.includes('SERVICE') || type.includes('GUEST')) return 'mode';
  if (type.includes('TAG') || type.includes('ACTIVAT') || type.includes('TRANSFER')) return 'tag';
  return 'all';
}

function eventIcon(eventType: string) {
  const kind = classify(eventType);
  if (kind === 'park') return 'map-marker-outline' as const;
  if (kind === 'notice') return 'bell-outline' as const;
  if (kind === 'mode') return 'car' as const;
  if (kind === 'tag') return 'nfc' as const;
  return 'history' as const;
}

function eventColor(eventType: string) {
  const kind = classify(eventType);
  if (kind === 'park') return palette.orange;
  if (kind === 'notice') return palette.cyan;
  if (kind === 'mode') return palette.purple;
  if (kind === 'tag') return palette.green;
  return palette.muted;
}

export default function TimelineScreen() {
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  async function refresh() {
    try { setData(await loadLiveDashboard()); }
    catch { router.replace('/auth'); }
  }
  useEffect(() => { refresh(); }, []);

  const events = useMemo(() => {
    if (!data) return [];
    return data.timeline.filter((item: any) => {
      const filterMatch = filter === 'all' || classify(item.event_type) === filter;
      const vehicleMatch = !vehicleId || item.vehicle_id === vehicleId;
      return filterMatch && vehicleMatch;
    });
  }, [data, filter, vehicleId]);

  if (!data) return <SafeAreaView style={styles.safe}><View style={styles.loader}><ActivityIndicator color={palette.purple} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll}>
    <Header />
    <Text style={styles.over}>ARAÇ HAFIZASI</Text><Text style={styles.title}>Timeline</Text><Text style={styles.sub}>Park, bildirim, etiket, geçici sürücü, Vale ve Servis olaylarının tamamı tek kronolojik geçmişte.</Text>

    <Text style={styles.label}>ARAÇ</Text><View style={styles.chips}><Pressable onPress={() => setVehicleId(null)} style={[styles.chip, !vehicleId && styles.chipActive]}><Text style={[styles.chipText, !vehicleId && styles.chipTextActive]}>TÜMÜ</Text></Pressable>{data.vehicles.map((vehicle: any) => <Pressable key={vehicle.id} onPress={() => setVehicleId(vehicle.id)} style={[styles.chip, vehicleId === vehicle.id && styles.chipActive]}><Text style={[styles.chipText, vehicleId === vehicle.id && styles.chipTextActive]}>{vehicle.vehicle_name}</Text></Pressable>)}</View>
    <Text style={styles.label}>FİLTRE</Text><View style={styles.filters}>{[
      ['all','Tümü'],['park','Park'],['notice','Bildirim'],['mode','Modlar'],['tag','Etiket']
    ].map(([key,label]) => <Pressable key={key} onPress={() => setFilter(key as Filter)} style={[styles.filter, filter === key && styles.filterActive]}><Text style={[styles.filterText, filter === key && { color: palette.purple }]}>{label}</Text></Pressable>)}</View>

    <View style={styles.summary}><View><Text style={styles.summaryValue}>{events.length}</Text><Text style={styles.summaryLabel}>GÖSTERİLEN OLAY</Text></View><View><Text style={styles.summaryValue}>{data.timeline.length}</Text><Text style={styles.summaryLabel}>TOPLAM HAFIZA</Text></View><MaterialCommunityIcons name="history" size={30} color={palette.purple} /></View>

    {events.length === 0 ? <View style={styles.empty}><MaterialCommunityIcons name="history" size={30} color={palette.muted} /><Text style={styles.emptyTitle}>Bu filtrede olay yok</Text><Text style={styles.emptyBody}>Yeni park ve araç olayları oluştukça burada görünecek.</Text></View> : events.map((item: any, index: number) => { const color = eventColor(item.event_type); return <View key={item.id || `${item.event_type}-${index}`} style={styles.event}><View style={styles.rail}><View style={[styles.dot,{ borderColor: color, backgroundColor: `${color}22` }]}><MaterialCommunityIcons name={eventIcon(item.event_type)} size={18} color={color} /></View>{index < events.length - 1 ? <View style={styles.line} /> : null}</View><View style={styles.eventBody}><View style={styles.eventTop}><Text style={styles.eventTitle}>{item.title || item.event_type}</Text><Text style={styles.time}>{new Date(item.occurred_at).toLocaleString('tr-TR')}</Text></View><Text style={styles.eventText}>{item.description || formatMetadata(item.metadata)}</Text><Text style={[styles.eventType,{ color }]}>{String(item.event_type).replaceAll('_',' ')}</Text></View></View>; })}
  </ScrollView></SafeAreaView>;
}

function formatMetadata(metadata: any) {
  if (!metadata || Object.keys(metadata).length === 0) return 'Araç olayı kaydedildi.';
  const entries = Object.entries(metadata).slice(0, 3).map(([key,value]) => `${key}: ${String(value)}`);
  return entries.join(' • ');
}
function Header() { return <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={27} color={palette.text} /></Pressable><Text style={styles.headerTitle}>Timeline</Text><Pressable onPress={() => router.replace('/timeline')} style={styles.back}><MaterialCommunityIcons name="refresh" size={20} color={palette.muted} /></Pressable></View>; }

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:palette.bg},scroll:{padding:19,paddingBottom:55},loader:{flex:1,alignItems:'center',justifyContent:'center'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},headerTitle:{color:palette.text,fontSize:14,fontWeight:'900'},over:{color:palette.purple,fontSize:8.5,fontWeight:'900',letterSpacing:1.4,marginTop:25},title:{color:palette.text,fontSize:31,fontWeight:'900',letterSpacing:-1.1,marginTop:5},sub:{color:palette.muted,fontSize:11.5,lineHeight:17,marginTop:7},label:{color:'#7E8A9F',fontSize:8.5,fontWeight:'900',letterSpacing:1.1,marginTop:16,marginBottom:7},chips:{flexDirection:'row',flexWrap:'wrap',gap:7},chip:{borderRadius:12,borderWidth:1,borderColor:palette.line,paddingHorizontal:10,paddingVertical:9},chipActive:{borderColor:'#563A75',backgroundColor:'#1E162A'},chipText:{color:palette.muted,fontSize:8.5,fontWeight:'800'},chipTextActive:{color:palette.purple},filters:{flexDirection:'row',gap:6},filter:{flex:1,height:38,borderRadius:11,borderWidth:1,borderColor:palette.line,alignItems:'center',justifyContent:'center'},filterActive:{borderColor:'#563A75',backgroundColor:'#1E162A'},filterText:{color:palette.muted,fontSize:8.2,fontWeight:'900'},summary:{marginTop:17,borderRadius:radius.lg,borderWidth:1,borderColor:'#3C2C50',backgroundColor:'#171121',padding:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},summaryValue:{color:palette.text,fontSize:20,fontWeight:'900'},summaryLabel:{color:palette.muted,fontSize:7.5,fontWeight:'900',marginTop:2},event:{flexDirection:'row',gap:11,marginTop:13},rail:{width:38,alignItems:'center'},dot:{width:38,height:38,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},line:{width:1,flex:1,minHeight:48,backgroundColor:palette.line,marginTop:5},eventBody:{flex:1,borderBottomWidth:1,borderBottomColor:'#171F31',paddingBottom:14},eventTop:{flexDirection:'row',gap:8,alignItems:'flex-start'},eventTitle:{color:palette.text,fontSize:12,fontWeight:'900',flex:1},time:{color:'#657187',fontSize:8.5},eventText:{color:palette.muted,fontSize:9.8,lineHeight:14,marginTop:4},eventType:{fontSize:7.5,fontWeight:'900',letterSpacing:.8,marginTop:6},empty:{marginTop:25,borderRadius:radius.lg,borderWidth:1,borderColor:palette.line,padding:24,alignItems:'center'},emptyTitle:{color:palette.text,fontSize:15,fontWeight:'900',marginTop:10},emptyBody:{color:palette.muted,fontSize:10,textAlign:'center',marginTop:4} });
