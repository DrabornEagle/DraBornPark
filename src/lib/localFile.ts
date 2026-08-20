import { File } from 'expo-file-system';

/**
 * Reads a local Expo/ImagePicker file without relying on fetch(file://...),
 * which is unreliable on some Android devices and Expo Go builds.
 */
export async function readLocalFileBytes(uri: string, errorMessage = 'Dosya okunamadı.') {
  try {
    const file = new File(uri);
    const bytes = await file.arrayBuffer();
    if (!bytes.byteLength) throw new Error(errorMessage);
    return bytes;
  } catch (fileError) {
    try {
      const response = await fetch(uri);
      if (!response.ok) throw new Error(errorMessage);
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength) throw new Error(errorMessage);
      return bytes;
    } catch {
      throw new Error(errorMessage);
    }
  }
}
