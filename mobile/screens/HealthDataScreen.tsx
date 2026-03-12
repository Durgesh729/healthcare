import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, StatusBar } from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { getBeneficiaries, insertHealthRecord, Beneficiary } from '../services/database';
import { useAuth } from '../context/AuthContext';
import { capturePhoto, requestCameraPermissions, CapturedMedia } from '../services/camera';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAppTranslation } from '../services/i18n';

const { width } = Dimensions.get('window');

const HealthDataScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useAppTranslation();
  const cameraRef = useRef<CameraView>(null);
  
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Beneficiary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Beneficiary | null>(null);
  const [showPatientList, setShowPatientList] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [vitalSigns, setVitalSigns] = useState({
    temperature: '',
    bloodPressure: '',
    heartRate: '',
  });
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<CapturedMedia[]>([]);

  useEffect(() => {
    loadPatients();
    checkCameraPermission();
  }, []);

  const loadPatients = async () => {
    try {
      const beneficiaries = await getBeneficiaries();
      setPatients(beneficiaries);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const checkCameraPermission = async () => {
    const hasPermission = await requestCameraPermissions();
    setCameraPermission(hasPermission);
  };

  const addSymptom = () => {
    if (newSymptom.trim() && !symptoms.includes(newSymptom.trim())) {
      setSymptoms([...symptoms, newSymptom.trim()]);
      setNewSymptom('');
    }
  };

  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  const handleVitalSignChange = (field: string, value: string) => {
    setVitalSigns(prev => ({ ...prev, [field]: value }));
  };

  const handleTakePhoto = async () => {
    if (!cameraPermission) {
      Alert.alert(t('common.error'), t('healthData.cameraPermission'));
      return;
    }
    setShowCamera(true);
  };

  const captureImage = async () => {
    try {
      const photo = await capturePhoto(cameraRef as any);
      if (photo) {
        setAttachments([...attachments, photo]);
        setShowCamera(false);
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert(t('common.error'), t('healthData.cameraError'));
    }
  };

  const validateForm = () => {
    if (!selectedPatient) {
      Alert.alert(t('common.error'), t('healthData.selectPatientError'));
      return false;
    }
    
    if (symptoms.length === 0) {
      Alert.alert(t('common.error'), t('healthData.symptomsError'));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const vitalSignsData = Object.entries(vitalSigns)
        .filter(([_, value]) => value.trim())
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      const healthRecord = {
        id: `health_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        beneficiary_id: selectedPatient!.id,
        worker_id: user?.id || 'unknown_worker',
        symptoms,
        vital_signs: Object.keys(vitalSignsData).length > 0 ? vitalSignsData : undefined,
        notes: notes.trim() || undefined,
        media_urls: attachments.map(a => a.uri),
        created_at: new Date().toISOString(),
      };

      await insertHealthRecord(healthRecord);
      
      Alert.alert(
        t('common.success'),
        t('healthData.saveSuccess'),
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      
    } catch (error) {
      console.error('Failed to save health data:', error);
      Alert.alert(t('common.error'), t('healthData.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const renderPatientSelector = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Feather name="user" size={20} color={COLORS.primary.main} />
        <Text style={styles.sectionTitle}>{t('healthData.selectPatient')}</Text>
      </View>
      {selectedPatient ? (
        <View style={styles.selectedPatient}>
          <View style={styles.patientInfo}>
            <View style={styles.patientAvatar}>
              <Feather name="user" size={24} color={COLORS.primary.main} />
            </View>
            <View>
              <Text style={styles.patientName}>{selectedPatient.name}</Text>
              <Text style={styles.patientDetails}>
                {selectedPatient.age} years, {selectedPatient.gender}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => setShowPatientList(true)}
            style={styles.changeButton}
          >
            <Feather name="edit-2" size={16} color={COLORS.primary.main} />
            <Text style={styles.changeButtonText}>{t('common.change')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          onPress={() => setShowPatientList(true)}
          style={styles.selectPatientButton}
        >
          <Feather name="search" size={20} color={COLORS.neutral.white} />
          <Text style={styles.selectPatientText}>{t('healthData.selectPatientButton')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPatientList = () => (
    <Modal visible={showPatientList} animationType="slide">
      <View style={styles.modalContainer}>
        <LinearGradient colors={COLORS.primary.gradient} style={styles.modalHeader}>
          <View style={styles.modalHeaderContent}>
            <TouchableOpacity onPress={() => setShowPatientList(false)} style={styles.closeButton}>
              <Feather name="x" size={24} color={COLORS.neutral.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('healthData.selectPatient')}</Text>
            <View style={styles.closeButtonPlaceholder} />
          </View>
        </LinearGradient>
        <ScrollView style={styles.patientList}>
          {patients.map((patient) => (
            <TouchableOpacity 
              key={patient.id}
              style={styles.patientItem}
              onPress={() => {
                setSelectedPatient(patient);
                setShowPatientList(false);
              }}
            >
              <View style={styles.patientItemAvatar}>
                <Feather name="user" size={20} color={COLORS.primary.main} />
              </View>
              <View style={styles.patientItemInfo}>
                <Text style={styles.patientItemName}>{patient.name}</Text>
                <Text style={styles.patientItemDetails}>{patient.age} years, {patient.gender}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          ))}
          {patients.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="users" size={48} color={COLORS.text.tertiary} />
              <Text style={styles.noPatients}>{t('healthData.noPatients')}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCamera = () => (
    <Modal visible={showCamera} animationType="slide">
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity 
            onPress={() => setShowCamera(false)}
            style={styles.cameraCloseButton}
          >
            <Feather name="x" size={24} color={COLORS.neutral.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.cameraControls}>
          <TouchableOpacity onPress={captureImage} style={styles.captureButton}>
            <View style={styles.captureInner}>
              <Feather name="camera" size={28} color={COLORS.neutral.white} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary.main} />
      
      <LinearGradient colors={COLORS.primary.gradient} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.neutral.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Health Data Collection</Text>
          <Text style={styles.headerSubtitle}>Record patient health information</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderPatientSelector()}

          {selectedPatient && (
            <>
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Feather name="clipboard" size={20} color={COLORS.primary.main} />
                  <Text style={styles.sectionTitle}>{t('healthData.symptoms')}</Text>
                </View>
                <View style={styles.symptomInput}>
                  <TextInput
                    value={newSymptom}
                    onChangeText={setNewSymptom}
                    style={styles.symptomTextInput}
                    disabled={loading}
                    mode="outlined"
                    outlineColor={COLORS.border.light}
                    activeOutlineColor={COLORS.primary.main}
                    placeholder={t('healthData.symptomPlaceholder')}
                    theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
                  />
                  <TouchableOpacity 
                    onPress={addSymptom}
                    disabled={!newSymptom.trim() || loading}
                    style={styles.addButton}
                  >
                    <LinearGradient colors={COLORS.primary.gradient} style={styles.addGradient}>
                      <Feather name="plus" size={24} color={COLORS.neutral.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.symptomsContainer}>
                  {symptoms.map((symptom, index) => (
                    <TouchableOpacity 
                      key={index}
                      onPress={() => removeSymptom(symptom)}
                      style={styles.symptomChip}
                    >
                      <Text style={styles.symptomChipText}>{symptom}</Text>
                      <Feather name="x" size={14} color={COLORS.primary.main} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="heart-pulse" size={20} color={COLORS.primary.main} />
                  <Text style={styles.sectionTitle}>{t('healthData.vitalSigns')}</Text>
                </View>
                
                <View style={styles.vitalRow}>
                  <View style={styles.vitalIconContainer}>
                    <MaterialCommunityIcons name="thermometer" size={20} color={COLORS.accent.orange} />
                  </View>
                  <TextInput
                    value={vitalSigns.temperature}
                    onChangeText={(value) => handleVitalSignChange('temperature', value)}
                    keyboardType="numeric"
                    style={styles.vitalInput}
                    disabled={loading}
                    mode="outlined"
                    outlineColor={COLORS.border.light}
                    activeOutlineColor={COLORS.primary.main}
                    placeholder={t('healthData.temperature')}
                    theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
                  />
                </View>
                
                <View style={styles.vitalRow}>
                  <View style={styles.vitalIconContainer}>
                    <MaterialCommunityIcons name="blood-bag" size={20} color={COLORS.error.main} />
                  </View>
                  <TextInput
                    value={vitalSigns.bloodPressure}
                    onChangeText={(value) => handleVitalSignChange('bloodPressure', value)}
                    placeholder={t('healthData.bloodPressure')}
                    style={styles.vitalInput}
                    disabled={loading}
                    mode="outlined"
                    outlineColor={COLORS.border.light}
                    activeOutlineColor={COLORS.primary.main}
                    theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
                  />
                </View>
                
                <View style={styles.vitalRow}>
                  <View style={styles.vitalIconContainer}>
                    <Feather name="heart" size={20} color={COLORS.accent.pink} />
                  </View>
                  <TextInput
                    value={vitalSigns.heartRate}
                    onChangeText={(value) => handleVitalSignChange('heartRate', value)}
                    keyboardType="numeric"
                    style={styles.vitalInput}
                    disabled={loading}
                    mode="outlined"
                    outlineColor={COLORS.border.light}
                    activeOutlineColor={COLORS.primary.main}
                    placeholder={t('healthData.heartRate')}
                    theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
                  />
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Feather name="file-text" size={20} color={COLORS.primary.main} />
                  <Text style={styles.sectionTitle}>{t('healthData.notes')}</Text>
                </View>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  style={styles.notesInput}
                  disabled={loading}
                  mode="outlined"
                  outlineColor={COLORS.border.light}
                  activeOutlineColor={COLORS.primary.main}
                  placeholder={t('healthData.notesPlaceholder')}
                  theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
                />
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Feather name="paperclip" size={20} color={COLORS.primary.main} />
                  <Text style={styles.sectionTitle}>{t('healthData.attachments')}</Text>
                </View>
                <TouchableOpacity onPress={handleTakePhoto} disabled={loading} style={styles.photoButton}>
                  <LinearGradient colors={[COLORS.accent.purple, COLORS.accent.pink]} style={styles.photoGradient}>
                    <Feather name="camera" size={20} color={COLORS.neutral.white} />
                    <Text style={styles.photoText}>{t('healthData.takePhoto')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                {attachments.length > 0 && (
                  <View style={styles.attachmentsList}>
                    {attachments.map((_, index) => (
                      <View key={index} style={styles.attachmentChip}>
                        <Feather name="image" size={16} color={COLORS.secondary.main} />
                        <Text style={styles.attachmentText}>{t('healthData.photo')} {index + 1}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  onPress={() => navigation.goBack()} 
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  <Feather name="x" size={20} color={COLORS.text.tertiary} />
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleSubmit} 
                  style={styles.submitButton}
                  disabled={loading}
                >
                  <LinearGradient colors={COLORS.primary.gradient} style={styles.submitGradient}>
                    {loading ? (
                      <ActivityIndicator color={COLORS.neutral.white} />
                    ) : (
                      <>
                        <Feather name="check" size={20} color={COLORS.neutral.white} />
                        <Text style={styles.submitText}>{t('healthData.saveRecord')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPatientList()}
      {renderCamera()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingTop: SPACING['4xl'],
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    marginBottom: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.size['2xl'],
    fontWeight: '700',
    color: COLORS.neutral.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: SPACING.lg,
    marginTop: -SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  selectedPatient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  patientName: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  patientDetails: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.background,
  },
  changeButtonText: {
    color: COLORS.primary.main,
    fontWeight: '600',
    fontSize: FONTS.size.sm,
  },
  selectPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary.main,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  selectPatientText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.base,
    fontWeight: '600',
  },
  symptomInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  symptomTextInput: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  addButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  addGradient: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary.background,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  symptomChipText: {
    color: COLORS.primary.main,
    fontSize: FONTS.size.sm,
    fontWeight: '500',
  },
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  vitalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  vitalInput: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  notesInput: {
    backgroundColor: COLORS.background.primary,
  },
  photoButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  photoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  photoText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.base,
    fontWeight: '600',
  },
  attachmentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.success.background,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  attachmentText: {
    color: COLORS.secondary.main,
    fontSize: FONTS.size.sm,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    marginBottom: SPACING['3xl'],
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cancelText: {
    color: COLORS.text.tertiary,
    fontSize: FONTS.size.base,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  submitText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.base,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  modalHeader: {
    paddingTop: SPACING['4xl'],
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  modalTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  patientList: {
    flex: 1,
    padding: SPACING.lg,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  patientItemAvatar: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  patientItemInfo: {
    flex: 1,
  },
  patientItemName: {
    fontSize: FONTS.size.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  patientItemDetails: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING['5xl'],
  },
  noPatients: {
    textAlign: 'center',
    color: COLORS.text.tertiary,
    marginTop: SPACING.lg,
    fontSize: FONTS.size.base,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: SPACING['4xl'],
    left: SPACING.lg,
  },
  cameraCloseButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: SPACING['4xl'],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HealthDataScreen;