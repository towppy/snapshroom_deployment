import { View, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { COLORS } from '@/constants/designTokens';

interface CartoonMushroomProps {
  size?: number;
  color?: string;
  capColor?: string;
  spots?: boolean;
  style?: any;
}

export const CartoonMushroom = ({
  size = 60,
  color = COLORS.sage,
  capColor = COLORS.coral,
  spots = true,
  style = {},
}: CartoonMushroomProps) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size * 1.2,
          justifyContent: 'flex-end',
          alignItems: 'center',
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -8],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {/* Mushroom Cap */}
      <View
        style={{
          width: size * 0.85,
          height: size * 0.6,
          backgroundColor: capColor,
          borderRadius: size * 0.5,
          borderBottomLeftRadius: size * 0.3,
          borderBottomRightRadius: size * 0.3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          overflow: 'visible',
        }}
      >
        {/* Cap spots */}
        {spots && (
          <>
            <View
              style={{
                position: 'absolute',
                width: size * 0.15,
                height: size * 0.15,
                borderRadius: size * 0.075,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                top: '25%',
                left: '20%',
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.12,
                height: size * 0.12,
                borderRadius: size * 0.06,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                top: '40%',
                right: '25%',
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.1,
                height: size * 0.1,
                borderRadius: size * 0.05,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                top: '15%',
                right: '35%',
              }}
            />
          </>
        )}

        {/* Cute face */}
        <View style={{ position: 'absolute', bottom: '15%', left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: size * 0.12 }}>
            {/* Eyes */}
            <View
              style={{
                width: size * 0.08,
                height: size * 0.08,
                borderRadius: size * 0.04,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
              }}
            />
            <View
              style={{
                width: size * 0.08,
                height: size * 0.08,
                borderRadius: size * 0.04,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
              }}
            />
          </View>
          {/* Smile */}
          <View
            style={{
              width: size * 0.15,
              height: size * 0.06,
              borderBottomLeftRadius: size * 0.075,
              borderBottomRightRadius: size * 0.075,
              borderWidth: 1.5,
              borderColor: 'rgba(0, 0, 0, 0.5)',
              borderTopWidth: 0,
              marginTop: size * 0.05,
            }}
          />
        </View>
      </View>

      {/* Mushroom Stem */}
      <View
        style={{
          width: size * 0.35,
          height: size * 0.7,
          backgroundColor: color,
          borderRadius: size * 0.2,
          marginTop: -size * 0.1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        {/* Stem texture */}
        <View
          style={{
            position: 'absolute',
            width: '80%',
            height: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            top: '30%',
            left: '10%',
            borderRadius: 1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: '70%',
            height: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            top: '50%',
            left: '15%',
            borderRadius: 1,
          }}
        />
      </View>

      {/* Shadow */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: size * 0.5,
          height: size * 0.08,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: size * 0.25,
          transform: [{ scaleY: 0.3 }],
        }}
      />
    </Animated.View>
  );
};
