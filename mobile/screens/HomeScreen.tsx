import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Dimensions, StatusBar, Modal, Alert } from 'react-native';
import { Chip, FAB, ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getSyncStatus, syncToServer, syncFromServer, initializeSync } from '../services/sync';
import { getBeneficiaries, getHealthRecords } from '../services/database';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAppTranslation } from '../services/i18n';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { signOut, user } = useAuth();
  const { t, language, changeLanguage, isEnglish, isMarathi } = useAppTranslation();
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [stats, setStats] = useState({ patients: 0, records: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const loadData = async () => {
    const beneficiaries = await getBeneficiaries();
    const healthRecords = await getHealthRecords();
    setStats({
      patients: beneficiaries.length,
      records: healthRecords.length,
    });
    setSyncStatus(getSyncStatus());
  };

  useEffect(() => {
    initializeSync();
    loadData();
    
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log('🔄 Starting sync from server...');
      // First sync from server to get surveys, templates, assignments
      const fromResult = await syncFromServer();
      console.log('📥 Sync from server result:', JSON.stringify(fromResult));
      if (fromResult.success) {
        console.log(`✅ Synced ${fromResult.synced} items from server`);
      } else {
        console.error('❌ Sync from server errors:', fromResult.errors);
        Alert.alert('Sync Error', fromResult.errors.join(', '));
      }
      
      // Then sync to server to send local data
      const toResult = await syncToServer();
      console.log('📤 Sync to server result:', JSON.stringify(toResult));
      if (toResult.success) {
        console.log(`✅ Synced ${toResult.synced} records to server`);
      } else {
        console.error('❌ Sync to server errors:', toResult.errors);
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      Alert.alert('Sync Failed', String(error));
    } finally {
      setSyncing(false);
      await loadData();
    }
  };

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
    setShowLanguageModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary.main} />
      
      <LinearGradient colors={COLORS.primary.gradient} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{t('home.welcomeBack')}</Text>
            <Text style={styles.userName}>{user?.email?.split('@')[0] || t('home.fieldWorker')}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setShowLanguageModal(true)} 
              style={styles.languageButton}
            >
              <Feather name="globe" size={20} color={COLORS.neutral.white} />
              <Text style={styles.languageText}>{isEnglish ? 'EN' : 'मराठी'}</Text>
            </TouchableOpacity>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: syncStatus.isOnline ? COLORS.success.main : COLORS.error.main }]} />
              <Text style={styles.statusText}>{syncStatus.isOnline ? t('home.online') : t('home.offline')}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary.main]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary.main }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.info.background }]}>
                <Feather name="users" size={24} color={COLORS.primary.main} />
              </View>
              <View>
                <Text style={styles.statNumber}>{stats.patients}</Text>
                <Text style={styles.statLabel}>{t('home.patients')}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statCard, { borderLeftColor: COLORS.secondary.main }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.success.background }]}>
                <Feather name="file-text" size={24} color={COLORS.secondary.main} />
              </View>
              <View>
                <Text style={styles.statNumber}>{stats.records}</Text>
                <Text style={styles.statLabel}>{t('home.records')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sync Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Feather name="refresh-cw" size={20} color={COLORS.primary.main} />
              <Text style={styles.cardTitle}>{t('home.syncStatus')}</Text>
            </View>
            <Chip
              icon={syncStatus.isOnline ? 'wifi' : 'wifi-off'}
              style={[styles.statusChip, { backgroundColor: syncStatus.isOnline ? COLORS.success.main : COLORS.error.main }]}
              textStyle={{ color: COLORS.neutral.white, fontSize: 12 }}
            >
              {syncStatus.isOnline ? t('home.online') : t('home.offline')}
            </Chip>
          </View>
          
          {syncStatus.lastSync && (
            <Text style={styles.lastSync}>
              {t('home.lastSync')}: {new Date(syncStatus.lastSync).toLocaleString()}
            </Text>
          )}
          
          <View style={styles.pendingContainer}>
            <View style={styles.pendingInfo}>
              <Feather name="clock" size={20} color={COLORS.text.tertiary} />
              <Text style={styles.pendingLabel}>{t('home.pendingRecords')}</Text>
            </View>
            <View style={[styles.pendingBadge, { backgroundColor: syncStatus.pendingRecords > 0 ? COLORS.warning.background : COLORS.success.background }]}>
              <Text style={[styles.pendingNumber, { color: syncStatus.pendingRecords > 0 ? COLORS.warning.main : COLORS.success.main }]}>
                {syncStatus.pendingRecords}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.syncButton}>
            <LinearGradient colors={COLORS.primary.gradient} style={styles.syncButtonGradient}>
              {syncing ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <>
                  <Feather name="upload-cloud" size={20} color={COLORS.neutral.white} />
                  <Text style={styles.syncButtonText}>{t('home.syncNow')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Feather name="zap" size={20} color={COLORS.primary.main} />
            <Text style={styles.cardTitle}>{t('home.quickActions')}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('PatientRegistration' as never)}
            style={styles.actionButton}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.primary.background }]}>
              <Feather name="user-plus" size={22} color={COLORS.primary.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{t('home.registerPatient')}</Text>
              <Text style={styles.actionSubtitle}>{t('home.registerPatientDesc')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('HealthData' as never)}
            style={styles.actionButton}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.accent.purple + '15' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={22} color={COLORS.accent.purple} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{t('home.collectHealthData')}</Text>
              <Text style={styles.actionSubtitle}>{t('home.collectHealthDataDesc')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('Survey' as never)}
            style={styles.actionButton}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.success.background }]}>
              <Feather name="clipboard" size={22} color={COLORS.success.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{t('home.surveys')}</Text>
              <Text style={styles.actionSubtitle}>{t('home.surveysDesc')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Feather name="log-out" size={20} color={COLORS.text.tertiary} />
          <Text style={styles.logoutText}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModal}>
            <View style={styles.modalHeader}>
              <Feather name="globe" size={24} color={COLORS.primary.main} />
              <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.languageOption, isEnglish && styles.languageOptionSelected]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={[styles.languageOptionText, isEnglish && styles.languageOptionTextSelected]}>
                {t('settings.english')}
              </Text>
              {isEnglish && <Feather name="check" size={20} color={COLORS.primary.main} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.languageOption, isMarathi && styles.languageOptionSelected]}
              onPress={() => handleLanguageChange('mr')}
            >
              <Text style={[styles.languageOptionText, isMarathi && styles.languageOptionTextSelected]}>
                {t('settings.marathi')}
              </Text>
              {isMarathi && <Feather name="check" size={20} color={COLORS.primary.main} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FAB
        icon="sync"
        style={styles.fab}
        onPress={handleSync}
        loading={syncing}
        disabled={syncing}
        color={COLORS.neutral.white}
      />
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
    paddingBottom: SPACING['2xl'],
    paddingHorizontal: SPACING.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  languageText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },
  greeting: {
    fontSize: FONTS.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: FONTS.size['2xl'],
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
  },
  statusText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    marginTop: -SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    ...SHADOWS.md,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  statNumber: {
    fontSize: FONTS.size['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
  },
  card: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  statusChip: {
    height: 28,
  },
  lastSync: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.lg,
  },
  pendingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pendingLabel: {
    fontSize: FONTS.size.base,
    color: COLORS.text.secondary,
  },
  pendingBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  pendingNumber: {
    fontSize: FONTS.size.lg,
    fontWeight: '700',
  },
  syncButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  syncButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  syncButtonText: {
    color: COLORS.neutral.white,
    fontSize: FONTS.size.base,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FONTS.size.base,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  actionSubtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: SPACING.sm,
  },
  logoutText: {
    color: COLORS.text.tertiary,
    fontSize: FONTS.size.base,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModal: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    width: width - 80,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  modalTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background.primary,
  },
  languageOptionSelected: {
    backgroundColor: COLORS.primary.background,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  languageOptionText: {
    fontSize: FONTS.size.base,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  languageOptionTextSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: SPACING.lg,
    right: 0,
    bottom: SPACING.xl,
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.full,
  },
});

export default HomeScreen;