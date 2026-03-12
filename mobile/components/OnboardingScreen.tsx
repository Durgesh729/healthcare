import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAppTranslation } from '../services/i18n';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { t } = useAppTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const slides = [
    {
      id: '1',
      title: t('onboarding.offlineTitle'),
      description: t('onboarding.offlineDesc'),
      iconName: 'cloud-off',
      iconType: 'feather',
      color: COLORS.primary.main,
    },
    {
      id: '2',
      title: t('onboarding.voiceTitle'),
      description: t('onboarding.voiceDesc'),
      iconName: 'mic',
      iconType: 'materialCommunity',
      color: COLORS.accent.purple,
    },
    {
      id: '3',
      title: t('onboarding.bilingualTitle'),
      description: t('onboarding.bilingualDesc'),
      iconName: 'globe',
      iconType: 'feather',
      color: COLORS.secondary.main,
    },
    {
      id: '4',
      title: t('onboarding.alertsTitle'),
      description: t('onboarding.alertsDesc'),
      iconName: 'bell',
      iconType: 'feather',
      color: COLORS.accent.orange,
    },
    {
      id: '5',
      title: t('onboarding.monitoringTitle'),
      description: t('onboarding.monitoringDesc'),
      iconName: 'trending-up',
      iconType: 'feather',
      color: COLORS.accent.pink,
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSkip();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
  };

  const renderIcon = (item: typeof slides[0]) => {
    const iconSize = 80;
    const iconColor = COLORS.neutral.white;
    
    if (item.iconType === 'feather') {
      return <Feather name={item.iconName as any} size={iconSize} color={iconColor} />;
    }
    return <MaterialCommunityIcons name={item.iconName as any} size={iconSize} color={iconColor} />;
  };

  const renderItem = ({ item }: { item: typeof slides[0] }) => (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          {renderIcon(item)}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { width: dotWidth, opacity: dotOpacity },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.primary} />
      
      <View style={styles.header}>
        <Text style={styles.logoText}>HealthSync</Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <LinearGradient
            colors={COLORS.primary.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.continue')}
            </Text>
            <Feather name="arrow-right" size={20} color={COLORS.neutral.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['4xl'],
    paddingBottom: SPACING.lg,
  },
  logoText: {
    fontSize: FONTS.size['2xl'],
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  skipText: {
    fontSize: FONTS.size.base,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  slide: {
    width,
    height: height * 0.55,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
    ...SHADOWS.xl,
  },
  title: {
    fontSize: FONTS.size['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  description: {
    fontSize: FONTS.size.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.xl,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary.main,
    marginHorizontal: SPACING.xs,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['4xl'],
  },
  nextButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  nextText: {
    fontSize: FONTS.size.lg,
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
