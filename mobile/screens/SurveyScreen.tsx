import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import {
  Survey,
  SurveyAssignment,
  Template,
  TemplateField,
  Beneficiary,
  getSurveyAssignments,
  getSurveys,
  getSurveyById,
  getTemplateById,
  insertBeneficiary,
  insertSurveySubmission,
  insertDuplicateRecord,
  checkForDuplicateBeneficiary,
  calculateSimilarityScore,
  updateSurveyAssignmentStatus,
} from '../services/database';
import { useAppTranslation } from '../services/i18n';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

type NavigationProp = any;

export default function SurveyScreen() {
  const { t } = useAppTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  
  const [allSurveys, setAllSurveys] = useState<Survey[]>([]);
  const [assignments, setAssignments] = useState<SurveyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<SurveyAssignment | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Patient registration state
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: 'male',
    phone: '',
    village: '',
  });
  const [registeredBeneficiary, setRegisteredBeneficiary] = useState<Beneficiary | null>(null);
  
  // Form field values
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Duplicate detection state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<Beneficiary | null>(null);

  const loadAssignments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Load all active surveys from local database (visible to all workers)
      const surveys = await getSurveys();
      setAllSurveys(surveys);
      
      // Also load any personal assignments for tracking progress
      const data = await getSurveyAssignments(undefined, user.id);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading surveys:', error);
      Alert.alert(t('common.error'), 'Failed to load surveys');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAssignments();
  }, [loadAssignments]);

  const handleSelectAssignment = async (assignment: SurveyAssignment) => {
    try {
      setLoading(true);
      const survey = await getSurveyById(assignment.survey_id);
      if (!survey) {
        Alert.alert(t('common.error'), 'Survey not found');
        return;
      }
      
      // Get the first template (for simplicity - could show template selection for multi-template surveys)
      const template = await getTemplateById(survey.template_ids[0]);
      if (!template) {
        Alert.alert(t('common.error'), 'Template not found');
        return;
      }
      
      setSelectedAssignment(assignment);
      setSelectedSurvey(survey);
      setSelectedTemplate(template);
      setShowPatientForm(true);
      
      // Update assignment status to in_progress
      if (assignment.status === 'pending') {
        await updateSurveyAssignmentStatus(assignment.id, 'in_progress');
      }
    } catch (error) {
      console.error('Error loading survey details:', error);
      Alert.alert(t('common.error'), 'Failed to load survey details');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSubmit = async () => {
    // Validate patient data
    if (!patientData.name.trim()) {
      Alert.alert(t('common.error'), t('patientRegistration.nameRequired'));
      return;
    }
    
    const age = parseInt(patientData.age);
    if (!age || age < 0 || age > 150) {
      Alert.alert(t('common.error'), t('patientRegistration.ageRequired'));
      return;
    }
    
    if (!patientData.village.trim()) {
      Alert.alert(t('common.error'), t('patientRegistration.villageRequired'));
      return;
    }
    
    try {
      // Check for duplicates
      const existingPatient = await checkForDuplicateBeneficiary(
        patientData.name,
        patientData.phone,
        patientData.village,
        age
      );
      
      if (existingPatient) {
        setDuplicateMatch(existingPatient);
        setShowDuplicateWarning(true);
        return;
      }
      
      // No duplicate, proceed with registration
      await registerPatient();
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      Alert.alert(t('common.error'), 'Failed to check for existing patients');
    }
  };

  const registerPatient = async () => {
    try {
      const beneficiary: Omit<Beneficiary, 'synced'> = {
        id: `beneficiary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: patientData.name.trim(),
        age: parseInt(patientData.age),
        gender: patientData.gender as 'male' | 'female' | 'other',
        phone: patientData.phone.trim() || undefined,
        village_id: patientData.village.trim(),
        worker_id: user?.id || 'unknown_worker',
        created_at: new Date().toISOString(),
      };
      
      await insertBeneficiary(beneficiary);
      setRegisteredBeneficiary({ ...beneficiary, synced: false });
      setShowPatientForm(false);
      setShowDuplicateWarning(false);
      setDuplicateMatch(null);
    } catch (error) {
      console.error('Error registering patient:', error);
      Alert.alert(t('common.error'), 'Failed to register patient');
    }
  };

  const handleRegisterAsDuplicate = async () => {
    if (!duplicateMatch || !user?.id) return;
    
    try {
      // Register the new patient anyway
      const beneficiary: Omit<Beneficiary, 'synced'> = {
        id: `beneficiary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: patientData.name.trim(),
        age: parseInt(patientData.age),
        gender: patientData.gender as 'male' | 'female' | 'other',
        phone: patientData.phone.trim() || undefined,
        village_id: patientData.village.trim(),
        worker_id: user.id,
        created_at: new Date().toISOString(),
      };
      
      await insertBeneficiary(beneficiary);
      
      // Create duplicate record for admin review
      const similarity = calculateSimilarityScore(
        { name: patientData.name, phone: patientData.phone, village: patientData.village, age: parseInt(patientData.age) },
        duplicateMatch
      );
      
      await insertDuplicateRecord({
        id: `duplicate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        new_beneficiary_id: beneficiary.id,
        existing_beneficiary_id: duplicateMatch.id,
        match_fields: similarity.matchFields,
        match_score: similarity.score,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      
      setRegisteredBeneficiary({ ...beneficiary, synced: false });
      setShowPatientForm(false);
      setShowDuplicateWarning(false);
      setDuplicateMatch(null);
    } catch (error) {
      console.error('Error handling duplicate registration:', error);
      Alert.alert(t('common.error'), 'Failed to register patient');
    }
  };

  const handleUseExistingPatient = () => {
    setRegisteredBeneficiary(duplicateMatch);
    setShowPatientForm(false);
    setShowDuplicateWarning(false);
    setDuplicateMatch(null);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const validateField = (field: any, value: any): boolean => {
    // Handle both database format and mobile app format
    const isRequired = field.validation?.required ?? field.required ?? false;
    
    if (isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
      return false;
    }
    
    if (field.type === 'number' && value !== undefined && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num)) return false;
      const minValue = field.validation?.minValue ?? field.validation?.min ?? field.min;
      const maxValue = field.validation?.maxValue ?? field.validation?.max ?? field.max;
      if (minValue !== undefined && num < minValue) return false;
      if (maxValue !== undefined && num > maxValue) return false;
    }
    
    if (field.type === 'text' && value) {
      const minLength = field.validation?.minLength ?? field.minLength;
      const maxLength = field.validation?.maxLength ?? field.maxLength;
      if (minLength !== undefined && value.length < minLength) return false;
      if (maxLength !== undefined && value.length > maxLength) return false;
    }
    
    return true;
  };

  const handleSubmitSurvey = async () => {
    console.log('📝 handleSubmitSurvey called');
    console.log('📝 selectedSurvey:', selectedSurvey?.name);
    console.log('📝 selectedTemplate:', selectedTemplate?.name);
    console.log('📝 registeredBeneficiary:', registeredBeneficiary?.name);
    console.log('📝 user?.id:', user?.id);
    console.log('📝 fieldValues:', JSON.stringify(fieldValues));
    
    if (!selectedSurvey || !selectedTemplate || !registeredBeneficiary || !user?.id) {
      console.log('❌ Missing required data for submission');
      Alert.alert('Error', 'Missing required data. Please try again.');
      return;
    }
    
    // Validate all required fields
    const invalidFields = selectedTemplate.fields.filter(field => !validateField(field, fieldValues[field.id]));
    console.log('📝 Invalid fields:', invalidFields.map(f => f.label));
    if (invalidFields.length > 0) {
      Alert.alert(t('common.error'), `Please fill in all required fields: ${invalidFields.map(f => f.label).join(', ')}`);
      return;
    }
    
    setSubmitting(true);
    try {
      await insertSurveySubmission({
        id: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        survey_id: selectedSurvey.id,
        assignment_id: selectedAssignment?.id || null, // May be null for open surveys
        beneficiary_id: registeredBeneficiary.id,
        worker_id: user.id,
        template_id: selectedTemplate.id,
        field_data: fieldValues,
        submitted_at: new Date().toISOString(),
      });
      
      // Update assignment status if exists
      if (selectedAssignment) {
        await updateSurveyAssignmentStatus(selectedAssignment.id, 'completed');
      }
      
      Alert.alert(t('common.success'), 'Survey submitted successfully!', [
        { text: 'OK', onPress: () => resetForm() }
      ]);
    } catch (error) {
      console.error('Error submitting survey:', error);
      Alert.alert(t('common.error'), 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedAssignment(null);
    setSelectedSurvey(null);
    setSelectedTemplate(null);
    setShowPatientForm(false);
    setPatientData({ name: '', age: '', gender: 'male', phone: '', village: '' });
    setRegisteredBeneficiary(null);
    setFieldValues({});
    loadAssignments();
  };

  const renderFieldInput = (field: any) => {
    const value = fieldValues[field.id] || '';
    
    // Handle both database format and mobile app format
    const fieldType = field.type;
    const isRequired = field.validation?.required ?? field.required ?? false;
    const options = field.validation?.options ?? field.options ?? [];
    const placeholder = field.placeholder || field.label;
    
    const pickImage = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture images');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Store only the URI string
        const imageUri = result.assets[0].uri;
        console.log('📷 Captured image URI:', imageUri);
        handleFieldChange(field.id, imageUri);
      }
    };

    const pickFromGallery = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Store only the URI string
        const imageUri = result.assets[0].uri;
        console.log('📷 Selected image URI:', imageUri);
        handleFieldChange(field.id, imageUri);
      }
    };

    const showImageOptions = () => {
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          { text: 'Take Photo', onPress: pickImage },
          { text: 'Choose from Gallery', onPress: pickFromGallery },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    };
    
    switch (fieldType) {
      case 'text':
      case 'textarea':
        const isMultiline = field.validation?.maxLength !== undefined && field.validation.maxLength > 100;
        return (
          <TextInput
            key={field.id}
            style={[styles.textInput, isMultiline && styles.textArea]}
            placeholder={placeholder}
            value={value}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            multiline={isMultiline || fieldType === 'textarea'}
            numberOfLines={isMultiline || fieldType === 'textarea' ? 3 : 1}
          />
        );
        
      case 'number':
        return (
          <TextInput
            key={field.id}
            style={styles.textInput}
            placeholder={placeholder}
            value={value}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            keyboardType="numeric"
          />
        );
        
      case 'date':
        return (
          <TextInput
            key={field.id}
            style={styles.textInput}
            placeholder={placeholder || 'YYYY-MM-DD'}
            value={value}
            onChangeText={(text) => handleFieldChange(field.id, text)}
          />
        );
        
      case 'dropdown':
      case 'select':
        return (
          <View key={field.id} style={styles.dropdownContainer}>
            {options.map((option: string) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  value === option && styles.dropdownOptionSelected
                ]}
                onPress={() => handleFieldChange(field.id, option)}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  value === option && styles.dropdownOptionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : (value ? value.split(', ') : []);
        return (
          <View key={field.id} style={styles.dropdownContainer}>
            {options.map((option: string) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  selectedValues.includes(option) && styles.dropdownOptionSelected
                ]}
                onPress={() => {
                  const newValues = selectedValues.includes(option)
                    ? selectedValues.filter((v: string) => v !== option)
                    : [...selectedValues, option];
                  handleFieldChange(field.id, newValues);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  selectedValues.includes(option) && styles.dropdownOptionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 'image':
      case 'photo':
        return (
          <View key={field.id} style={styles.imageFieldContainer}>
            {value ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: value }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleFieldChange(field.id, '')}
                >
                  <Feather name="x-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={pickImage}
                >
                  <Feather name="camera" size={24} color="#667eea" />
                  <Text style={styles.imageUploadText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={pickFromGallery}
                >
                  <Feather name="image" size={24} color="#667eea" />
                  <Text style={styles.imageUploadText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
        
      case 'voice':
        return (
          <TouchableOpacity
            key={field.id}
            style={styles.imageUploadButton}
            onPress={() => Alert.alert('Info', 'Voice recording will be available in a future update')}
          >
            <Feather name="mic" size={24} color="#667eea" />
            <Text style={styles.voiceButtonText}>Record Voice Note</Text>
          </TouchableOpacity>
        );
        
      case 'checkbox':
        return (
          <TouchableOpacity
            key={field.id}
            style={styles.checkboxContainer}
            onPress={() => handleFieldChange(field.id, !value)}
          >
            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
              {value && <Feather name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>{field.label}</Text>
          </TouchableOpacity>
        );
        
      default:
        return (
          <TextInput
            key={field.id}
            style={styles.textInput}
            placeholder={placeholder}
            value={value}
            onChangeText={(text) => handleFieldChange(field.id, text)}
          />
        );
    }
  };

  // Render survey list
  if (!selectedSurvey && !showPatientForm) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={COLORS.primary.gradient} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.neutral.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Surveys</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
          </View>
        ) : allSurveys.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="clipboard" size={64} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>No active surveys</Text>
            <Text style={styles.emptySubtext}>Check back later for new surveys</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary.main]} />}
          >
            {allSurveys.map((survey) => (
              <TouchableOpacity
                key={survey.id}
                style={styles.assignmentCard}
                onPress={async () => {
                  try {
                    console.log('📋 Selected survey:', survey.name, 'ID:', survey.id);
                    console.log('📋 Template IDs:', JSON.stringify(survey.template_ids));
                    // Get the first template BEFORE setting survey
                    if (survey.template_ids && survey.template_ids.length > 0) {
                      console.log('📋 Looking for template ID:', survey.template_ids[0]);
                      const template = await getTemplateById(survey.template_ids[0]);
                      console.log('📋 Template found:', template ? template.name : 'null');
                      if (template) {
                        // Set both survey and template together to avoid race condition
                        setSelectedSurvey(survey);
                        setSelectedTemplate(template);
                        setShowPatientForm(true);
                      } else {
                        Alert.alert('Template Not Found', `Template ID ${survey.template_ids[0]} not found in local database. Please sync again.`);
                      }
                    } else {
                      Alert.alert('No Templates', 'This survey has no templates configured. Please edit the survey in admin panel and assign templates.');
                    }
                  } catch (error) {
                    console.error('Error selecting survey:', error);
                    Alert.alert('Error', 'Failed to load survey details');
                  }
                }}
              >
                <View style={styles.assignmentIcon}>
                  <Feather name="file-text" size={24} color={COLORS.primary.main} />
                </View>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentName}>{survey.name}</Text>
                  <Text style={styles.assignmentStatus}>
                    {survey.description || 'No description'}
                  </Text>
                  <Text style={styles.assignmentDate}>
                    Area: {survey.area_village} | Ends: {new Date(survey.end_date).toLocaleDateString()}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // Render patient registration form
  if (showPatientForm && !registeredBeneficiary) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={COLORS.primary.gradient} style={styles.header}>
          <TouchableOpacity onPress={resetForm} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.neutral.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Patient</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        
        <ScrollView style={styles.formContainer}>
          {showDuplicateWarning && duplicateMatch ? (
            <View style={styles.duplicateWarning}>
              <View style={styles.warningHeader}>
                <Feather name="alert-triangle" size={24} color="#f39c12" />
                <Text style={styles.warningTitle}>Possible Duplicate Detected</Text>
              </View>
              <Text style={styles.warningText}>
                A similar patient already exists:
              </Text>
              <View style={styles.duplicateInfo}>
                <Text style={styles.duplicateName}>{duplicateMatch.name}</Text>
                <Text style={styles.duplicateDetails}>
                  Age: {duplicateMatch.age} | Village: {duplicateMatch.village_id}
                </Text>
              </View>
              <Text style={styles.warningQuestion}>
                Would you like to use the existing record or register as a new patient?
              </Text>
              <View style={styles.warningButtons}>
                <TouchableOpacity style={styles.useExistingButton} onPress={handleUseExistingPatient}>
                  <Text style={styles.useExistingText}>Use Existing</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.registerNewButton} onPress={handleRegisterAsDuplicate}>
                  <Text style={styles.registerNewText}>Register as New</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Patient Information</Text>
              
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter patient name"
                value={patientData.name}
                onChangeText={(text) => setPatientData({ ...patientData, name: text })}
              />
              
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter age in years"
                value={patientData.age}
                onChangeText={(text) => setPatientData({ ...patientData, age: text })}
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderContainer}>
                {['male', 'female', 'other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderOption,
                      patientData.gender === gender && styles.genderOptionSelected
                    ]}
                    onPress={() => setPatientData({ ...patientData, gender })}
                  >
                    <Text style={[
                      styles.genderText,
                      patientData.gender === gender && styles.genderTextSelected
                    ]}>
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter phone number"
                value={patientData.phone}
                onChangeText={(text) => setPatientData({ ...patientData, phone: text })}
                keyboardType="phone-pad"
              />
              
              <Text style={styles.label}>Village *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter village name"
                value={patientData.village}
                onChangeText={(text) => setPatientData({ ...patientData, village: text })}
              />
              
              <TouchableOpacity style={styles.submitButton} onPress={handlePatientSubmit}>
                <Text style={styles.submitButtonText}>Continue to Survey</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render survey form
  if (!selectedTemplate) {
    Alert.alert('Error', 'Template not loaded. Please sync and try again.');
    resetForm();
    return null;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={COLORS.primary.gradient} style={styles.header}>
        <TouchableOpacity onPress={resetForm} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.neutral.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedSurvey?.name || 'Survey'}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.patientInfoCard}>
          <Feather name="user" size={20} color={COLORS.primary.main} />
          <View style={styles.patientInfoText}>
            <Text style={styles.patientName}>{registeredBeneficiary?.name}</Text>
            <Text style={styles.patientDetails}>
              Age: {registeredBeneficiary?.age} | {registeredBeneficiary?.gender}
            </Text>
          </View>
        </View>
        
        {selectedTemplate && (
          <>
            <Text style={styles.templateName}>{selectedTemplate.name}</Text>
            {selectedTemplate.description && (
              <Text style={styles.templateDescription}>{selectedTemplate.description}</Text>
            )}
            
            {selectedTemplate.fields
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <View key={field.id} style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    {field.label}
                    {(field.validation?.required ?? field.required) && <Text style={styles.required}> *</Text>}
                  </Text>
                  {renderFieldInput(field)}
                </View>
              ))}
          </>
        )}
        
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitSurvey}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Survey</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['3xl'],
  },
  emptyText: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    marginTop: SPACING.sm,
  },
  listContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  assignmentIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  assignmentName: {
    fontSize: FONTS.size.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  assignmentStatus: {
    fontSize: FONTS.size.sm,
    color: COLORS.primary.main,
    marginTop: SPACING.xs,
  },
  assignmentDate: {
    fontSize: FONTS.size.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  formContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.size.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error.main,
  },
  textInput: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONTS.size.base,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  genderOption: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  genderText: {
    color: COLORS.text.secondary,
    fontSize: FONTS.size.sm,
  },
  genderTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  dropdownOption: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    margin: SPACING.xs,
    minWidth: 80,
    alignItems: 'center',
  },
  dropdownOptionSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  dropdownOptionText: {
    color: COLORS.text.secondary,
    fontSize: FONTS.size.sm,
  },
  dropdownOptionTextSelected: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  imageUploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    borderStyle: 'dashed',
  },
  imageUploadText: {
    marginLeft: SPACING.sm,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  imageFieldContainer: {
    width: '100%',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.lg,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.purple + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent.purple,
    borderStyle: 'dashed',
  },
  voiceButtonText: {
    marginLeft: SPACING.sm,
    color: COLORS.accent.purple,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.base,
    fontWeight: '600',
  },
  patientInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  patientInfoText: {
    marginLeft: SPACING.md,
  },
  patientName: {
    fontSize: FONTS.size.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  patientDetails: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  templateName: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  templateDescription: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.md,
  },
  fieldContainer: {
    marginBottom: SPACING.sm,
  },
  duplicateWarning: {
    backgroundColor: COLORS.warning.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warning.main,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  warningTitle: {
    fontSize: FONTS.size.base,
    fontWeight: '600',
    color: COLORS.warning.main,
    marginLeft: SPACING.sm,
  },
  warningText: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  duplicateInfo: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  duplicateName: {
    fontSize: FONTS.size.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  duplicateDetails: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  warningQuestion: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  warningButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  useExistingButton: {
    flex: 1,
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  useExistingText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  registerNewButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    marginLeft: SPACING.sm,
  },
  registerNewText: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary.main,
  },
  checkboxLabel: {
    fontSize: FONTS.size.base,
    color: COLORS.text.primary,
  },
});
