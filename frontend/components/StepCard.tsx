import { View, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { ThemedText } from './themed-text';
import { CartoonMushroom } from './CartoonMushroom';
import { COLORS, BREAKPOINTS } from '@/constants/designTokens';

interface StepCardProps {
  step: {
    number: string;
    title: string;
    description: string;
  };
  index: number;
  styles: any;
}

export const StepCard = ({ step, index, styles }: StepCardProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 300;

    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(delay + 1000),
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getStepEmoji = (stepNumber: string) => {
    switch (stepNumber) {
      case '1':
        return '📸';
      case '2':
        return '🔬';
      case '3':
        return '📚';
      default:
        return '🍄';
    }
  };

  const getCapColor = (stepNumber: string) => {
    switch (stepNumber) {
      case '1':
        return COLORS.coral;
      case '2':
        return COLORS.terracotta;
      case '3':
        return COLORS.sage;
      default:
        return COLORS.moss;
    }
  };

  return (
    <Animated.View
      style={[
        styles.stepCard,
        {
          opacity: scaleAnim,
          transform: [
            { scale: scaleAnim },
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.stepMushroomContainer}>
        <CartoonMushroom 
          size={BREAKPOINTS.isSmall ? 70 : 100} 
          capColor={getCapColor(step.number)} 
          color={COLORS.moss} 
        />
      </View>

      <View style={styles.stepContent}>
        <View style={styles.stepNumberBadge}>
          <ThemedText style={styles.stepNumberText}>{step.number}</ThemedText>
        </View>
        <ThemedText style={styles.stepEmoji}>{getStepEmoji(step.number)}</ThemedText>
        <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
        <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
      </View>
    </Animated.View>
  );
};
