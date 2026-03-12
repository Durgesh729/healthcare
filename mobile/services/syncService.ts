import { supabase } from './supabase';
import {
  getUnsyncedSurveySubmissions,
  markAsSynced,
  getUnsyncedBeneficiaries,
  getUnsyncedHealthRecords,
  getUnsyncedPatientImages,
  updatePatientImageRemoteUrl
} from './database';
import * as FileSystem from 'expo-file-system';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncService {
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    // Listen for network status changes
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    // This would use NetInfo from @react-native-community/netinfo
    // For now, we'll rely on manual sync triggers
  }

  addSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach(listener => listener(status));
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', message: 'Starting sync...' });

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      // Sync in order: beneficiaries first, then health records, then survey submissions, then images
      const beneficiariesResult = await this.syncBeneficiaries();
      result.synced += beneficiariesResult.synced;
      result.failed += beneficiariesResult.failed;
      result.errors.push(...beneficiariesResult.errors);

      const healthRecordsResult = await this.syncHealthRecords();
      result.synced += healthRecordsResult.synced;
      result.failed += healthRecordsResult.failed;
      result.errors.push(...healthRecordsResult.errors);

      const submissionsResult = await this.syncSurveySubmissions();
      result.synced += submissionsResult.synced;
      result.failed += submissionsResult.failed;
      result.errors.push(...submissionsResult.errors);

      const imagesResult = await this.syncPatientImages();
      result.synced += imagesResult.synced;
      result.failed += imagesResult.failed;
      result.errors.push(...imagesResult.errors);

      this.lastSyncTime = new Date();
      result.success = result.failed === 0;

      this.notifyListeners({
        status: result.success ? 'success' : 'partial',
        message: `Synced ${result.synced} items${result.failed > 0 ? `, ${result.failed} failed` : ''}`
      });
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      this.notifyListeners({ status: 'error', message: result.errors[result.errors.length - 1] });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async syncBeneficiaries(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      const beneficiaries = await getUnsyncedBeneficiaries();

      for (const beneficiary of beneficiaries) {
        try {
          const { error } = await supabase
            .from('beneficiaries')
            .upsert({
              id: beneficiary.id,
              name: beneficiary.name,
              age: beneficiary.age,
              gender: beneficiary.gender,
              phone: beneficiary.phone,
              village_id: beneficiary.village_id,
              worker_id: beneficiary.worker_id,
              created_at: beneficiary.created_at,
              is_synced: true
            });

          if (error) throw error;

          await markAsSynced('beneficiaries', beneficiary.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync beneficiary ${beneficiary.id}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Beneficiaries sync error: ${error}`);
    }

    return result;
  }

  private async syncHealthRecords(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      const records = await getUnsyncedHealthRecords();

      for (const record of records) {
        try {
          const { error } = await supabase
            .from('health_records')
            .upsert({
              id: record.id,
              beneficiary_id: record.beneficiary_id,
              worker_id: record.worker_id,
              symptoms: record.symptoms,
              vital_signs: record.vital_signs,
              notes: record.notes,
              media_urls: record.media_urls,
              visit_date: record.created_at,
              created_at: record.created_at,
              is_synced: true
            });

          if (error) throw error;

          await markAsSynced('health_records', record.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync health record ${record.id}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Health records sync error: ${error}`);
    }

    return result;
  }

  private async syncSurveySubmissions(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      const submissions = await getUnsyncedSurveySubmissions();

      for (const submission of submissions) {
        try {
          const { error } = await supabase
            .from('survey_submissions')
            .upsert({
              id: submission.id,
              survey_id: submission.survey_id,
              assignment_id: submission.assignment_id,
              beneficiary_id: submission.beneficiary_id,
              worker_id: submission.worker_id,
              template_id: submission.template_id,
              field_data: submission.field_data,
              images: submission.images,
              voice_notes: submission.voice_notes,
              submitted_at: submission.submitted_at,
              is_synced: true
            });

          if (error) throw error;

          await markAsSynced('survey_submissions', submission.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync survey submission ${submission.id}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Survey submissions sync error: ${error}`);
    }

    return result;
  }

  private async syncPatientImages(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      const images = await getUnsyncedPatientImages();

      for (const image of images) {
        try {
          // Read the local file
          if (!image.local_uri) {
            throw new Error('No local URI for image');
          }

          const fileExists = await FileSystem.getInfoAsync(image.local_uri);
          if (!fileExists.exists) {
            throw new Error('Local image file not found');
          }

          // Read file as base64
          const base64 = await FileSystem.readAsStringAsync(image.local_uri, {
            encoding: 'base64'
          });

          // Determine file extension and content type
          const ext = image.local_uri.split('.').pop()?.toLowerCase() || 'jpg';
          const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

          // Convert base64 to Uint8Array
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

          // Upload to Supabase Storage
          const fileName = `${image.beneficiary_id}/${image.id}.${ext}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('patient-images')
            .upload(fileName, bytes, {
              contentType,
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('patient-images')
            .getPublicUrl(fileName);

          const remoteUrl = urlData.publicUrl;

          // Update remote URL in local database
          await updatePatientImageRemoteUrl(image.id, remoteUrl);

          // Update remote URL in Supabase
          const { error: updateError } = await supabase
            .from('patient_images')
            .upsert({
              id: image.id,
              beneficiary_id: image.beneficiary_id,
              remote_url: remoteUrl,
              description: image.description,
              image_type: image.image_type,
              created_at: image.created_at,
              is_synced: true
            });

          if (updateError) throw updateError;

          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync image ${image.id}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Patient images sync error: ${error}`);
    }

    return result;
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'partial' | 'error';
  message?: string;
}

// Export singleton instance
export const syncService = new SyncService();
