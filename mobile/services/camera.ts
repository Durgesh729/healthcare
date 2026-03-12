import { Camera, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

export interface CapturedMedia {
  uri: string;
  type: 'photo' | 'video';
  filename: string;
}

export const requestCameraPermissions = async (): Promise<boolean> => {
  const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
  const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
  
  return cameraStatus === 'granted' && mediaStatus === 'granted';
};

export const capturePhoto = async (cameraRef: any): Promise<CapturedMedia | null> => {
  try {
    if (!cameraRef.current) {
      throw new Error('Camera reference not available');
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
      skipProcessing: false,
    });

    // Generate a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `health_doc_${timestamp}.jpg`;
    
    // Move to app's document directory
    const documentDirectory = FileSystem.documentDirectory + 'health_media/';
    await FileSystem.makeDirectoryAsync(documentDirectory, { intermediates: true });
    
    const newUri = documentDirectory + filename;
    await FileSystem.moveAsync({
      from: photo.uri,
      to: newUri,
    });

    // Save to device gallery
    await MediaLibrary.saveToLibraryAsync(newUri);

    return {
      uri: newUri,
      type: 'photo',
      filename,
    };

  } catch (error) {
    console.error('Failed to capture photo:', error);
    return null;
  }
};

export const getStoredMedia = async (): Promise<CapturedMedia[]> => {
  try {
    const documentDirectory = FileSystem.documentDirectory + 'health_media/';
    const dirInfo = await FileSystem.getInfoAsync(documentDirectory);
    
    if (!dirInfo.exists) {
      return [];
    }

    const files = await FileSystem.readDirectoryAsync(documentDirectory);
    
    return files.map(filename => ({
      uri: documentDirectory + filename,
      type: filename.endsWith('.mp4') ? 'video' as const : 'photo' as const,
      filename,
    }));

  } catch (error) {
    console.error('Failed to get stored media:', error);
    return [];
  }
};

export const deleteMedia = async (uri: string): Promise<boolean> => {
  try {
    await FileSystem.deleteAsync(uri);
    return true;
  } catch (error) {
    console.error('Failed to delete media:', error);
    return false;
  }
};

export const uploadMediaToSupabase = async (media: CapturedMedia): Promise<string | null> => {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(media.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // In a real implementation, you would upload to Supabase Storage
    // For now, we'll return a placeholder URL
    const publicUrl = `https://your-supabase-storage.com/health-media/${media.filename}`;
    
    console.log(`Media uploaded: ${media.filename}`);
    return publicUrl;

  } catch (error) {
    console.error('Failed to upload media:', error);
    return null;
  }
};