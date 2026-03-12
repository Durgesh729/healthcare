import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { 
  getUnsyncedBeneficiaries, 
  getUnsyncedHealthRecords, 
  markAsSynced,
  insertBeneficiary,
  insertTemplate,
  insertSurvey,
  insertSurveyAssignment,
  getTemplates,
  getSurveys,
  getSurveyAssignments,
  updateSurvey,
  updateSurveyAssignmentStatus,
  deleteSurvey,
  getUnsyncedSurveySubmissions,
  getVillages
} from './database';
import { processHealthRecord } from './ai';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingRecords: number;
}

let syncStatus: SyncStatus = {
  isOnline: false,
  lastSync: null,
  pendingRecords: 0
};

export const getSyncStatus = (): SyncStatus => syncStatus;

export const checkConnectivity = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('villages').select('id').limit(1);
    syncStatus.isOnline = !error;
    return !error;
  } catch (error) {
    syncStatus.isOnline = false;
    return false;
  }
};

// Sync surveys, templates, and assignments FROM Supabase TO local database
export const syncFromServer = async (): Promise<{ success: boolean; synced: number; errors: string[] }> => {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      throw new Error('No internet connection');
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Sync templates from Supabase
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('*');

    if (templatesError) {
      console.log('❌ Template sync error:', templatesError.message);
      errors.push(`Templates: ${templatesError.message}`);
    } else if (templates) {
      console.log(`📋 Found ${templates.length} templates in Supabase`);
      const localTemplates = await getTemplates();
      console.log(`📋 Found ${localTemplates.length} local templates`);
      const localTemplateIds = new Set(localTemplates.map(t => t.id));
      
      for (const template of templates) {
        if (!localTemplateIds.has(template.id)) {
          try {
            await insertTemplate({
              id: template.id,
              name: template.name,
              description: template.description,
              fields: typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields,
              is_system: template.is_system,
              created_by: template.created_by,
              created_at: template.created_at,
              updated_at: template.updated_at
            });
            console.log(`✅ Inserted template: ${template.name} (${template.id})`);
            syncedCount++;
          } catch (e) {
            console.log('❌ Failed to insert template:', e);
          }
        } else {
          console.log(`📝 Template already exists: ${template.name}`);
        }
      }
    } else {
      console.log('📋 No templates found in Supabase');
    }

    // Sync active surveys from Supabase (all active surveys visible to all workers)
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .eq('status', 'active');

    if (surveysError) {
      console.log('❌ Survey sync error:', surveysError.message);
      errors.push(`Surveys: ${surveysError.message}`);
    } else if (surveys) {
      console.log(`📊 Found ${surveys.length} active surveys in Supabase`);
      const localSurveys = await getSurveys();
      const localSurveyIds = new Set(localSurveys.map(s => s.id));
      const remoteSurveyIds = new Set(surveys.map(s => s.id));
      
      // Delete local surveys that no longer exist in Supabase
      for (const localSurvey of localSurveys) {
        if (!remoteSurveyIds.has(localSurvey.id)) {
          await deleteSurvey(localSurvey.id);
          console.log(`🗑️ Deleted survey: ${localSurvey.name}`);
        }
      }
      
      for (const survey of surveys) {
        try {
          console.log(`📊 Survey: ${survey.name}, template_ids type: ${typeof survey.template_ids}, value: ${JSON.stringify(survey.template_ids)}`);
          if (!localSurveyIds.has(survey.id)) {
            await insertSurvey({
              id: survey.id,
              name: survey.name,
              description: survey.description,
              area_village: survey.area_village,
              start_date: survey.start_date,
              end_date: survey.end_date,
              template_ids: survey.template_ids || [],
              created_by: survey.created_by || 'system',
              status: survey.status,
              created_at: survey.created_at,
              updated_at: survey.updated_at
            });
            console.log(`✅ Inserted survey: ${survey.name}`);
          } else {
            // Update existing survey if changed
            await updateSurvey(survey.id, {
              name: survey.name,
              description: survey.description,
              status: survey.status,
              updated_at: survey.updated_at
            });
          }
          syncedCount++;
        } catch (e) {
          console.warn('Failed to sync survey:', e);
        }
      }
    }

    // Sync survey assignments for this user from Supabase (for tracking worker's progress)
    const { data: assignments, error: assignmentsError } = await supabase
      .from('survey_assignments')
      .select('*')
      .eq('worker_id', user.id);

    if (assignmentsError) {
      errors.push(`Assignments: ${assignmentsError.message}`);
    } else if (assignments) {
      const localAssignments = await getSurveyAssignments(undefined, user.id);
      const localAssignmentIds = new Set(localAssignments.map(a => a.id));
      
      for (const assignment of assignments) {
        if (!localAssignmentIds.has(assignment.id)) {
          try {
            await insertSurveyAssignment({
              id: assignment.id,
              survey_id: assignment.survey_id,
              worker_id: assignment.worker_id,
              assigned_by: assignment.assigned_by || 'system',
              assigned_at: assignment.assigned_at,
              status: assignment.status
            });
            syncedCount++;
          } catch (e) {
            console.warn('Failed to insert assignment:', e);
          }
        } else {
          // Update status if changed
          await updateSurveyAssignmentStatus(assignment.id, assignment.status);
        }
      }
    }

    syncStatus.lastSync = new Date().toISOString();

    return {
      success: errors.length === 0,
      synced: syncedCount,
      errors
    };

  } catch (error) {
    errors.push(`Sync from server failed: ${error}`);
    return {
      success: false,
      synced: syncedCount,
      errors
    };
  }
};

export const syncToServer = async (): Promise<{ success: boolean; synced: number; errors: string[] }> => {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      throw new Error('No internet connection');
    }

    // Get current user ID for foreign key constraints
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure healthcare_worker record exists
    const { data: existingWorker } = await supabase
      .from('healthcare_workers')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingWorker) {
      // Create healthcare_worker record for this user
      const { error: workerError } = await supabase
        .from('healthcare_workers')
        .insert({
          id: user.id,
          full_name: user.email?.split('@')[0] || 'Field Worker',
          designation: 'Field Worker',
          is_active: true,
          preferred_language: 'en'
        });
      
      if (workerError) {
        throw new Error(`Failed to create worker profile: ${workerError.message}`);
      }
    }

    // Sync beneficiaries first
    const unsyncedBeneficiaries = await getUnsyncedBeneficiaries();
    for (const beneficiary of unsyncedBeneficiaries) {
      try {
        // Look up village name from local DB, then find UUID in Supabase
        let villageUuid: string | null = null;
        if (beneficiary.village_id) {
          // Get village name from local villages table
          const localVillages = await getVillages();
          const localVillage = localVillages.find(v => v.id === beneficiary.village_id);
          
          if (localVillage) {
            // Find matching village in Supabase by name
            const { data: villageData } = await supabase
              .from('villages')
              .select('id')
              .eq('name', localVillage.name)
              .single();
            villageUuid = villageData?.id || null;
          }
        }

        const { error } = await supabase
          .from('beneficiaries')
          .insert({
            local_id: beneficiary.id,
            full_name: beneficiary.name,
            age: beneficiary.age,
            gender: beneficiary.gender,
            phone_number: beneficiary.phone,
            village_id: villageUuid,
            registered_by: user.id
          });

        if (error) {
          errors.push(`Beneficiary ${beneficiary.name}: ${error.message}`);
        } else {
          await markAsSynced('beneficiaries', beneficiary.id);
          syncedCount++;
        }
      } catch (error) {
        errors.push(`Beneficiary ${beneficiary.name}: ${error}`);
      }
    }

    // Sync health records
    const unsyncedRecords = await getUnsyncedHealthRecords();
    for (const record of unsyncedRecords) {
      try {
        const { error } = await supabase
          .from('health_records')
          .insert({
            local_id: record.id,
            symptoms_text: Array.isArray(record.symptoms) ? record.symptoms.join(', ') : record.symptoms,
            symptom_tags: Array.isArray(record.symptoms) ? record.symptoms : [record.symptoms],
            temperature_celsius: record.vital_signs?.temperature,
            blood_pressure_systolic: record.vital_signs?.bpSystolic,
            blood_pressure_diastolic: record.vital_signs?.bpDiastolic,
            pulse_rate: record.vital_signs?.heartRate,
            notes: record.notes,
            recorded_by: user.id
          });

        if (error) {
          errors.push(`Health record: ${error.message}`);
        } else {
          await markAsSynced('health_records', record.id);
          syncedCount++;
          
          // Trigger AI analysis for the synced health record
          try {
            await processHealthRecord(record);
          } catch (aiError) {
            console.warn('AI processing failed:', aiError);
            // Don't add to errors as sync was successful
          }
        }
      } catch (error) {
        errors.push(`Health record: ${error}`);
      }
    }

    // Sync survey submissions
    const unsyncedSubmissions = await getUnsyncedSurveySubmissions();
    console.log(`📤 Syncing ${unsyncedSubmissions.length} survey submissions`);
    for (const submission of unsyncedSubmissions) {
      try {
        // Look up beneficiary UUID from local_id
        let beneficiaryUuid: string | null = null;
        if (submission.beneficiary_id) {
          const { data: beneficiaryData } = await supabase
            .from('beneficiaries')
            .select('id')
            .eq('local_id', submission.beneficiary_id)
            .single();
          beneficiaryUuid = beneficiaryData?.id || null;
        }
        // Upload images to Supabase storage and get URLs
        let uploadedImages: string[] = [];
        const fieldDataWithUrls = { ...submission.field_data };

        // Helper function to upload image from local URI
        const uploadImage = async (localUri: string, fileName: string): Promise<string | null> => {
          try {
            console.log(`📥 Reading file from: ${localUri}`);

            // Check if file exists
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (!(fileInfo as any).exists) {
              console.log('❌ File does not exist at URI');
              return null;
            }
            console.log(`📁 File exists`);

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(localUri, {
              encoding: 'base64',
            });
            console.log(`✅ Read ${base64.length} characters of base64 data`);

            // Convert base64 to Uint8Array
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            console.log(`📦 Converted to ${byteArray.length} bytes`);

            console.log(`☁️ Uploading to survey-images/${fileName}`);
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('survey-images')
              .upload(fileName, byteArray, {
                contentType: 'image/jpeg',
                upsert: true,
              });

            if (uploadError) {
              console.log('❌ Upload error:', JSON.stringify(uploadError, null, 2));
              return null;
            }

            console.log('✅ Upload successful:', uploadData);

            const { data: urlData } = supabase.storage
              .from('survey-images')
              .getPublicUrl(fileName);

            console.log(`🔗 Public URL: ${urlData.publicUrl}`);
            return urlData.publicUrl;
          } catch (err) {
            console.log('❌ Failed to upload image:', err);
            return null;
          }
        };

        // Find all image fields in field_data and upload them
        for (const [fieldId, value] of Object.entries(submission.field_data)) {
          console.log(`🔍 Field ${fieldId}, value type: ${typeof value}`, value);

          // Handle both string URIs and objects with uri property
          let imageUri: string | null = null;
          if (typeof value === 'string' && (value.startsWith('file://') || value.startsWith('content://'))) {
            imageUri = value;
            console.log(`✅ Found string URI: ${imageUri}`);
          } else if (value && typeof value === 'object') {
            const valueObj = value as any;
            console.log(`📦 Found object, checking for uri...`, valueObj);
            if (valueObj.uri && (valueObj.uri.startsWith('file://') || valueObj.uri.startsWith('content://'))) {
              imageUri = valueObj.uri;
              console.log(`✅ Extracted URI from object: ${imageUri}`);
            }
          }

          if (imageUri) {
            console.log(`📤 Uploading image for field ${fieldId}...`);
            const fileName = `${user!.id}/${submission.id}/${fieldId}_${Date.now()}.jpg`;
            const url = await uploadImage(imageUri, fileName);
            if (url) {
              fieldDataWithUrls[fieldId] = url;
              uploadedImages.push(url);
              console.log(`✅ Replaced field ${fieldId} with URL: ${url}`);
            }
          }
        }

        // Also upload any images in the images array
        if (submission.images && Array.isArray(submission.images)) {
          for (const imgData of submission.images) {
            let imageUri: string | null = null;
            if (typeof imgData === 'string' && (imgData.startsWith('file://') || imgData.startsWith('content://'))) {
              imageUri = imgData;
            } else if (imgData && typeof imgData === 'object') {
              const imgObj = imgData as any;
              if (imgObj.uri && (imgObj.uri.startsWith('file://') || imgObj.uri.startsWith('content://'))) {
                imageUri = imgObj.uri;
              }
            }

            if (imageUri) {
              const fileName = `${user!.id}/${submission.id}/img_${Date.now()}.jpg`;
              const url = await uploadImage(imageUri, fileName);
              if (url) {
                uploadedImages.push(url);
              }
            }
          }
        }

        const { error } = await supabase
          .from('survey_submissions')
          .upsert({
            local_id: submission.id,
            survey_id: submission.survey_id,
            assignment_id: submission.assignment_id || null,
            beneficiary_id: beneficiaryUuid,
            worker_id: submission.worker_id,
            template_id: submission.template_id,
            field_data: fieldDataWithUrls,
            images: uploadedImages.length > 0 ? uploadedImages : null,
            voice_notes: submission.voice_notes || null,
            submitted_at: submission.submitted_at,
            is_synced: true
          }, {
            onConflict: 'local_id'
          });

        if (error) {
          console.log('❌ Failed to sync submission:', error.message);
          errors.push(`Survey submission: ${error.message}`);
        } else {
          await markAsSynced('survey_submissions', submission.id);
          console.log('✅ Synced submission:', submission.id);
          syncedCount++;
        }
      } catch (error) {
        console.log('❌ Error syncing submission:', error);
        errors.push(`Survey submission: ${error}`);
      }
    }

    syncStatus.lastSync = new Date().toISOString();
    syncStatus.pendingRecords = (await getUnsyncedBeneficiaries()).length + (await getUnsyncedHealthRecords()).length + (await getUnsyncedSurveySubmissions()).length;

    return {
      success: errors.length === 0,
      synced: syncedCount,
      errors
    };

  } catch (error) {
    errors.push(`Sync failed: ${error}`);
    return {
      success: false,
      synced: syncedCount,
      errors
    };
  }
};

// Initialize sync status (no automatic polling - sync is manual via button)
export const initializeSync = async () => {
  await checkConnectivity();
  syncStatus.pendingRecords = (await getUnsyncedBeneficiaries()).length + (await getUnsyncedHealthRecords()).length;
  
  // No automatic sync on init - user must press sync button manually
  console.log('✅ Sync service ready (manual sync mode)');
};