import { View } from 'react-native';
import { CartoonMushroom } from './CartoonMushroom';
import { COLORS, BREAKPOINTS } from '@/constants/designTokens';

interface MushroomClusterProps {
  position?: 'left' | 'right';
}

export const MushroomCluster = ({ position = 'left' }: MushroomClusterProps) => {
  return (
    <View
      style={{
        position: 'absolute',
        [position]: BREAKPOINTS.isSmall ? -10 : -20,
        bottom: BREAKPOINTS.isSmall ? 10 : 20,
        opacity: 0.6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: BREAKPOINTS.isSmall ? 4 : 8 }}>
        <CartoonMushroom 
          size={BREAKPOINTS.isSmall ? 30 : 40} 
          capColor={COLORS.terracotta} 
          color={COLORS.sage} 
        />
        <CartoonMushroom 
          size={BREAKPOINTS.isSmall ? 35 : 50} 
          capColor={COLORS.coral} 
          color={COLORS.moss} 
          spots={false} 
        />
        <CartoonMushroom 
          size={BREAKPOINTS.isSmall ? 25 : 35} 
          capColor={COLORS.terracotta} 
          color={COLORS.sage} 
        />
      </View>
    </View>
  );
};
