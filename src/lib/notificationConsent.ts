import { Platform } from 'react-native';

export async function getNotificationPermissionStatus(){
  if(Platform.OS==='web')return 'granted';
  try{const Notifications=await import('expo-notifications');const permission=await Notifications.getPermissionsAsync();return String(permission.status||'undetermined');}catch{return 'unavailable';}
}

export async function isNotificationPermissionGranted(){return (await getNotificationPermissionStatus())==='granted';}

export async function requestDkdNotificationPermission(){
  if(Platform.OS==='web')return true;
  try{const Notifications=await import('expo-notifications');const current=await Notifications.getPermissionsAsync();if(current.status==='granted')return true;const result=await Notifications.requestPermissionsAsync();return result.status==='granted';}catch{return false;}
}
