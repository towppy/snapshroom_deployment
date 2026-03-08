import { View, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CartoonMushroom } from './CartoonMushroom';
import { MachineLearningIcon } from './MachineLearningIcon';
import { COLORS, BREAKPOINTS } from '@/constants/designTokens';

const iconStyles = {
  iconWrapper: {
    position: 'relative' as const,
    width: BREAKPOINTS.isSmall ? 60 : 80,
    height: BREAKPOINTS.isSmall ? 60 : 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: BREAKPOINTS.isSmall ? 60 : 80,
    height: BREAKPOINTS.isSmall ? 60 : 80,
    borderRadius: BREAKPOINTS.isSmall ? 30 : 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export const SafetyIcon = () => {
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.spring(checkAnim, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(checkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    ).start();
  }, []);

  return (
    <View style={iconStyles.iconWrapper}>
      <View style={[iconStyles.iconContainer, { backgroundColor: `${COLORS.forest}20` }]}>
        <Ionicons 
          name="shield-checkmark" 
          size={BREAKPOINTS.isSmall ? 30 : 40} 
          color={COLORS.forest} 
        />
      </View>

      {/* Animated checkmark */}
      <Animated.View
        style={{
          position: 'absolute',
          opacity: checkAnim,
          transform: [
            {
              scale: checkAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1.3, 1],
              }),
            },
          ],
        }}
      >
        <Ionicons 
          name="checkmark-circle" 
          size={BREAKPOINTS.isSmall ? 20 : 28} 
          color={COLORS.success} 
        />
      </Animated.View>

      {/* Decorative mushroom */}
      <View style={{ position: 'absolute', bottom: -10, left: -10 }}>
        <CartoonMushroom 
          size={BREAKPOINTS.isSmall ? 20 : 30} 
          capColor={COLORS.terracotta} 
          color={COLORS.moss} 
          spots={false} 
        />
      </View>
    </View>
  );
};

export const SpeciesIcon = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={iconStyles.iconWrapper}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <View style={[iconStyles.iconContainer, { backgroundColor: `${COLORS.moss}20` }]}>
          <Ionicons 
            name="library" 
            size={BREAKPOINTS.isSmall ? 30 : 40} 
            color={COLORS.forest} 
          />
        </View>
      </Animated.View>

      {/* Decorative mushrooms */}
      <View style={{ position: 'absolute', top: -10, right: -10 }}>
        <CartoonMushroom 
          size={BREAKPOINTS.isSmall ? 18 : 25} 
          capColor={COLORS.coral} 
          color={COLORS.sage} 
        />
      </View>
      <View style={{ position: 'absolute', bottom: -10, right: -10 }}>
        <CartoonMushroom 
          size={BREAKPOINTS.isSmall ? 18 : 25} 
          capColor={COLORS.terracotta} 
          color={COLORS.moss} 
          spots={false} 
        />
      </View>
    </View>
  );
};

export const FeatureIcons = {
  SafetyIcon,
  SpeciesIcon,
  MachineLearningIcon,
};
