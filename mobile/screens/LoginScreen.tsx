import React, { useState } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAppTranslation } from '../services/i18n';

const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const { t } = useAppTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.fillInAllFields'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        Alert.alert(t('auth.loginError'), t('auth.invalidEmailOrPassword'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary.main} />
      
      <LinearGradient colors={COLORS.primary.gradient} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Feather name="heart" size={32} color={COLORS.neutral.white} />
            </View>
          </View>
          <Text style={styles.appName}>HealthSync</Text>
          <Text style={styles.tagline}>Field Data Collection System</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('auth.login')}</Text>
            <Text style={styles.formSubtitle}>{t('auth.signIn')} to your account</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.email')}</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={20} color={COLORS.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  disabled={loading}
                  mode="outlined"
                  outlineColor={COLORS.border.light}
                  activeOutlineColor={COLORS.primary.main}
                  placeholder={t('auth.emailPlaceholder')}
                  theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.password')}</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color={COLORS.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                  style={styles.input}
                  disabled={loading}
                  mode="outlined"
                  outlineColor={COLORS.border.light}
                  activeOutlineColor={COLORS.primary.main}
                  placeholder={t('auth.passwordPlaceholder')}
                  theme={{ colors: { text: COLORS.text.primary, placeholder: COLORS.text.tertiary, primary: COLORS.primary.main } }}
                  right={
                    <TextInput.Icon 
                      icon={secureText ? "eye" : "eye-off"} 
                      onPress={() => setSecureText(!secureText)}
                      color={COLORS.text.tertiary}
                    />
                  }
                />
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleLogin} 
              disabled={loading}
              style={styles.loginButton}
            >
              <LinearGradient
                colors={COLORS.primary.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.neutral.white} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
                    <Feather name="arrow-right" size={20} color={COLORS.neutral.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.demoSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.demoCredentials')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.credentialsContainer}>
                <View style={styles.credentialRow}>
                  <Feather name="mail" size={14} color={COLORS.text.tertiary} />
                  <Text style={styles.credentialText}>worker@healthsync.org</Text>
                </View>
                <View style={styles.credentialRow}>
                  <Feather name="lock" size={14} color={COLORS.text.tertiary} />
                  <Text style={styles.credentialText}>worker123456</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  headerGradient: {
    paddingTop: SPACING['5xl'],
    paddingBottom: SPACING['3xl'],
    paddingHorizontal: SPACING.xl,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: FONTS.size['3xl'],
    fontWeight: '700',
    color: COLORS.neutral.white,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONTS.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  formCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  formTitle: {
    fontSize: FONTS.size['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.tertiary,
    marginBottom: SPACING['2xl'],
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  loginButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  loginButtonText: {
    fontSize: FONTS.size.lg,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  demoSection: {
    marginTop: SPACING['2xl'],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border.light,
  },
  dividerText: {
    fontSize: FONTS.size.xs,
    color: COLORS.text.tertiary,
    marginHorizontal: SPACING.md,
  },
  credentialsContainer: {
    backgroundColor: COLORS.background.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  credentialText: {
    fontSize: FONTS.size.sm,
    color: COLORS.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default LoginScreen;