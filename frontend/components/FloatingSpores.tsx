import { View, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { COLORS, RESPONSIVE } from '@/constants/designTokens';

const { height, width } = RESPONSIVE;

interface FloatingSporeProps {
  delay: number;
  x: number;
  duration: number;
}

const FloatingSpore = ({ delay, x, duration }: FloatingSporeProps) => {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(animY, {
            toValue: -height,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: duration * 0.1,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.9,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(animX, {
            toValue: Math.random() * 40 - 20,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(animY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        bottom: 0,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.sage,
        opacity: opacity,
        transform: [{ translateY: animY }, { translateX: animX }],
      }}
    />
  );
};

export const FloatingSpores = () => {
  const spores = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 300,
    x: Math.random() * width,
    duration: 3000 + Math.random() * 2000,
  }));

  return (
    <View style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
      {spores.map((spore) => (
        <FloatingSpore 
          key={spore.id} 
          delay={spore.delay} 
          x={spore.x} 
          duration={spore.duration} 
        />
      ))}
    </View>
  );
};
