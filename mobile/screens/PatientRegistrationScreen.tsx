import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, Image, Modal } from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { insertBeneficiary, insertPatientImage, PatientImage } from '../services/database';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAppTranslation } from '../services/i18n';

const PatientRegistrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useAppTranslation();
  const [loading, setLoading] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    phone: '',
    village: '',
  });
  
  const [capturedImages, setCapturedImages] = useState<{
    uri: string;
    type: PatientImage['image_type'];
    description: string;
  }[]>([]);
  
  const [currentImageType, setCurrentImageType] = useState<PatientImage['image_type']>('other');
  const [imageDescription, setImageDescription] = useState('');
  const [showImageTypeModal, setShowImageTypeModal] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('patientRegistration.nameRequired'));
      return false;
    }
    
    const age = parseInt(formData.age);
    if (!age || age < 0 || age > 150) {
      Alert.alert(t('common.error'), t('patientRegistration.ageRequired'));
      return false;
    }
    
    if (!formData.village.trim()) {
      Alert.alert(t('common.error'), t('patientRegistration.villageRequired'));
      return false;
    }
    
    return true;
  };

  const requestPermissions = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(t('common.error'), t('patientRegistration.cameraPermissionRequired'));
      return;
    }
    setShowCamera(true);
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(t('common.error'), t('patientRegistration.galleryPermissionRequired'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
      setShowImageTypeModal(true);
    }
  };

  const handleCameraCapture = async (cameraRef: any) => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync({ quality: 0.8 });
      setShowCamera(false);
      if (photo?.uri) {
        setPendingImageUri(photo.uri);
        setShowImageTypeModal(true);
      }
    }
  };

  const confirmImage = async () => {
    if (!pendingImageUri) return;
    
    // Store the image URI directly - images from camera/gallery are already persisted
    setCapturedImages(prev => [...prev, {
      uri: pendingImageUri,
      type: currentImageType,
      description: imageDescription,
    }]);
    
    setShowImageTypeModal(false);
    setPendingImageUri(null);
    setCurrentImageType('other');
    setImageDescription('');
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const beneficiaryId = `beneficiary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const beneficiary = {
        id: beneficiaryId,
        name: formData.name.trim(),
        age: parseInt(formData.age),
        gender: formData.gender as 'male' | 'female' | 'other',
        phone: formData.phone.trim() || undefined,
        village_id: `village_${formData.village.toLowerCase().replace(/\s+/g, '_')}`,
        worker_id: user?.id || 'unknown_worker',
        created_at: new Date().toISOString(),
      };

      await insertBeneficiary(beneficiary);
      
      for (const img of capturedImages) {
        await insertPatientImage({
          id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          beneficiary_id: beneficiaryId,
          local_uri: img.uri,
          description: img.description,
          image_type: img.type,
          created_at: new Date().toISOString(),
        });
      }
      
      Alert.alert(
        t('common.success'),
        t('patientRegistration.registrationSuccess'),
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      
    } catch (error) {
      console.error('Failed to register patient:', error);
      Alert.alert(t('common.error'), t('patientRegistration.registrationError'));
    } finally {
      setLoading(false);
    }
  };

  const genderOptions = [
    { value: 'male', label: t('patientRegistration.male'), icon: 'user' as const },
    { value: 'female', label: t('patientRegistration.female'), icon: 'user' as const },
    { value: 'other', label: t('patientRegistration.other'), icon: 'user' as const },
  ];

  const imageTypeOptions: { value: PatientImage['image_type']; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { value: 'disease', label: t('patientRegistration.imageTypeDisease') || 'Disease', icon: 'virus' },
    { value: 'infection', label: t('patientRegistration.imageTypeInfection') || 'Infection', icon: 'bacteria' },
    { value: 'wound', label: t('patientRegistration.imageTypeWound') || 'Wound', icon: 'bandage' },
    { value: 'other', label: t('patientRegistration.imageTypeOther') || 'Other', icon: 'image' },
  ];

  let cameraRef: any = null;

  // Camera Modal
  const renderCameraModal = () => (
    <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={(ref) => { cameraRef = ref; }}
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity 
            style={styles.closeCameraButton}
            onPress={() => setShowCamera(false)}
          >
            <Feather name="x" size={28} color={COLORS.neutral.white} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.flipCameraButton}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <Feather name="repeat" size={24} color={COLORS.neutral.white} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={() => handleCameraCapture(cameraRef)}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Image Type Modal
  const renderImageTypeModal = () => (
    <Modal visible={showImageTypeModal} animationType="slide" transparent onRequestClose={() => setShowImageTypeModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('patientRegistration.selectImageType') || 'Select Image Type'}</Text>
          
          {pendingImageUri && (
            <Image source={{ uri: pendingImageUri }} style={styles.previewImage} />
          )}
          
          <View style={styles.imageTypeGrid}>
            {imageTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.imageTypeOption,
                  currentImageType === option.value && styles.imageTypeSelected
                ]}
                onPress={() => setCurrentImageType(option.value)}
              >
                <MaterialCommunityIcons 
                  name={option.icon} 
                  size={28} 
                  color={currentImageType === option.value ? COLORS.neutral.white : COLORS.primary.main} 
                />
                <Text style={[
                  styles.imageTypeLabel,
                  currentImageType === option.value && styles.imageTypeLabelSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TextInput
            value={imageDescription}
            onChangeText={setImageDescription}
            placeholder={t('patientRegistration.imageDescription') || 'Description (optional)'}
            style={styles.descriptionInput}
            mode="outlined"
            outlineColor={COLORS.border.light}
            activeOutlineColor={COLORS.primary.main}
            theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => {
                setShowImageTypeModal(false);
                setPendingImageUri(null);
              }}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmImage}>
              <Text style={styles.modalConfirmText}>{t('common.confirm') || 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
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
          <Text style={styles.headerTitle}>{t('patientRegistration.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('patientRegistration.subtitle')}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Personal Info Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={20} color={COLORS.primary.main} />
              <Text style={styles.sectionTitle}>{t('patientRegistration.personalInfo')}</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('patientRegistration.fullName')} *</Text>
              <TextInput
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                style={styles.input}
                disabled={loading}
                mode="outlined"
                outlineColor={COLORS.border.light}
                activeOutlineColor={COLORS.primary.main}
                placeholder={t('patientRegistration.fullNamePlaceholder')}
                theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('patientRegistration.age')} *</Text>
              <TextInput
                value={formData.age}
                onChangeText={(value) => handleInputChange('age', value)}
                keyboardType="numeric"
                style={styles.input}
                disabled={loading}
                mode="outlined"
                outlineColor={COLORS.border.light}
                activeOutlineColor={COLORS.primary.main}
                placeholder={t('patientRegistration.agePlaceholder')}
                theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('patientRegistration.gender')} *</Text>
              <View style={styles.genderContainer}>
                {genderOptions.map((option) => (
                  <TouchableOpacity 
                    key={option.value}
                    style={[
                      styles.genderOption, 
                      formData.gender === option.value && styles.genderSelected
                    ]}
                    onPress={() => handleInputChange('gender', option.value)}
                  >
                    <View style={[
                      styles.genderIconContainer,
                      formData.gender === option.value && styles.genderIconSelected
                    ]}>
                      <Feather 
                        name={option.icon} 
                        size={20} 
                        color={formData.gender === option.value ? COLORS.neutral.white : COLORS.text.tertiary} 
                      />
                    </View>
                    <Text style={[
                      styles.genderText, 
                      formData.gender === option.value && styles.genderTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Contact Info Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="map-pin" size={20} color={COLORS.primary.main} />
              <Text style={styles.sectionTitle}>{t('patientRegistration.contactInfo')}</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('patientRegistration.phoneNumber')}</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>{t('common.optional')}</Text>
              </View>
              <TextInput
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                style={styles.input}
                disabled={loading}
                mode="outlined"
                outlineColor={COLORS.border.light}
                activeOutlineColor={COLORS.primary.main}
                placeholder={t('patientRegistration.phonePlaceholder')}
                theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('patientRegistration.village')} *</Text>
              <TextInput
                value={formData.village}
                onChangeText={(value) => handleInputChange('village', value)}
                style={styles.input}
                disabled={loading}
                mode="outlined"
                outlineColor={COLORS.border.light}
                activeOutlineColor={COLORS.primary.main}
                placeholder={t('patientRegistration.villagePlaceholder')}
                theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
              />
            </View>
          </View>

          {/* Image Capture Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="camera" size={20} color={COLORS.primary.main} />
              <Text style={styles.sectionTitle}>{t('patientRegistration.healthImages') || 'Health Images'}</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>{t('common.optional')}</Text>
              </View>
            </View>
            
            <Text style={styles.imageSectionDescription}>
              {t('patientRegistration.imageSectionDescription') || 'Capture photos of diseases, infections, or wounds for patient records. Images will be synced when online.'}
            </Text>
            
            <View style={styles.imageActionButtons}>
              <TouchableOpacity style={styles.imageActionButton} onPress={takePhoto}>
                <View style={styles.imageActionButtonIcon}>
                  <Feather name="camera" size={24} color={COLORS.primary.main} />
                </View>
                <Text style={styles.imageActionButtonText}>{t('patientRegistration.takePhoto') || 'Take Photo'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageActionButton} onPress={pickImage}>
                <View style={styles.imageActionButtonIcon}>
                  <Feather name="image" size={24} color={COLORS.primary.main} />
                </View>
                <Text style={styles.imageActionButtonText}>{t('patientRegistration.chooseFromGallery') || 'Gallery'}</Text>
              </TouchableOpacity>
            </View>
            
            {capturedImages.length > 0 && (
              <View style={styles.capturedImagesContainer}>
                <Text style={styles.capturedImagesTitle}>
                  {t('patientRegistration.capturedImages') || 'Captured Images'} ({capturedImages.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {capturedImages.map((img, index) => (
                    <View key={index} style={styles.capturedImageWrapper}>
                      <Image source={{ uri: img.uri }} style={styles.capturedImageThumb} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Feather name="x" size={14} color={COLORS.neutral.white} />
                      </TouchableOpacity>
                      <View style={styles.imageTypeTag}>
                        <Text style={styles.imageTypeTagText}>{img.type}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Submit Buttons */}
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
                    <Text style={styles.submitText}>{t('patientRegistration.registerButton')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {renderCameraModal()}
      {renderImageTypeModal()}
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
  formContainer: {
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
    flex: 1,
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.size.sm,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  optionalBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: COLORS.background.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  optionalText: {
    fontSize: FONTS.size.xs,
    color: COLORS.text.tertiary,
  },
  input: {
    backgroundColor: COLORS.background.primary,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background.primary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.background,
  },
  genderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  genderIconSelected: {
    backgroundColor: COLORS.primary.main,
  },
  genderText: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  genderTextSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  // Image capture styles
  imageSectionDescription: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  imageActionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  imageActionButton: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary.background,
    borderWidth: 1,
    borderColor: COLORS.primary.light,
  },
  imageActionButtonIcon: {
    marginBottom: SPACING.sm,
  },
  imageActionButtonText: {
    fontSize: FONTS.size.sm,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  capturedImagesContainer: {
    marginTop: SPACING.sm,
  },
  capturedImagesTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  capturedImageWrapper: {
    width: 100,
    height: 100,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  capturedImageThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageTypeTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  imageTypeTagText: {
    fontSize: 10,
    color: COLORS.neutral.white,
    textTransform: 'capitalize',
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xl,
  },
  closeCameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipCameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary.main,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    resizeMode: 'cover',
  },
  imageTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  imageTypeOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background.primary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageTypeSelected: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.main,
  },
  imageTypeLabel: {
    fontSize: FONTS.size.sm,
    color: COLORS.primary.main,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  imageTypeLabelSelected: {
    color: COLORS.neutral.white,
  },
  descriptionInput: {
    backgroundColor: COLORS.background.primary,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FONTS.size.base,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: FONTS.size.base,
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  // Button styles
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
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: SPACING.sm,
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
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  submitText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.base,
    fontWeight: '600',
  },
});

export default PatientRegistrationScreen;