import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
export const BREAKPOINTS = {
  isTiny: width < 320,
  isVerySmall: width < 360,
  isSmallToMedium: width >= 360 && width < 420,
  isSmall: width < 768,
  isTablet: width >= 768,
  isLargePhone: width >= 400,
};

// Colors
export const COLORS = {
  sage: '#9CAF88',
  moss: '#7D9B6E',
  forest: '#5F7C52',
  olive: '#4A6244',
  cream: '#FAF8F3',
  sand: '#F5F1E8',
  terracotta: '#E89B7C',
  coral: '#F4A896',
  charcoal: '#3F4941',
  stone: '#8B9388',
  cloud: '#E8EBE6',
  white: '#FFFFFF',
  success: '#81C995',
  warning: '#F4B860',
  danger: '#E88B7C',
};

// Responsive spacing system
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// Responsive font sizes
export const FONT_SIZES = {
  tiny: BREAKPOINTS.isSmall ? 8 : 10,
  xxs: BREAKPOINTS.isSmall ? 9 : 11,
  xs: BREAKPOINTS.isSmall ? 10 : 12,
  sm: BREAKPOINTS.isSmall ? 11 : 13,
  base: BREAKPOINTS.isSmall ? 12 : 14,
  md: BREAKPOINTS.isSmall ? 13 : 15,
  lg: BREAKPOINTS.isSmall ? 14 : 16,
  xl: BREAKPOINTS.isSmall ? 15 : 17,
  xxl: BREAKPOINTS.isSmall ? 16 : 18,
  xxxl: BREAKPOINTS.isSmall ? 18 : 20,
  displayXs: BREAKPOINTS.isSmall ? 20 : 24,
  displaySm: BREAKPOINTS.isSmall ? 22 : 26,
  displayMd: BREAKPOINTS.isSmall ? 24 : 28,
  displayLg: BREAKPOINTS.isSmall ? 28 : 32,
  displayXl: BREAKPOINTS.isSmall ? 32 : 40,
};

// Responsive dimensions
export const RESPONSIVE = {
  width,
  height,
  statusBarHeight: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 44,
};

// Hero carousel images
export const HERO_SLIDES = [
  { uri: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Copelandia_cyanescens.jpg' },
  { uri: 'https://images.unsplash.com/photo-1528518290605-1fcc8dcca204?q=80&w=1200&auto=format&fit=crop' },
  { uri: 'https://cdn.wallpapersafari.com/72/31/UXdKZD.jpg' },
  { uri: 'https://wallpaperaccess.com/full/85562.jpg' },
];

// Shadow styles
export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

export default {
  BREAKPOINTS,
  COLORS,
  SPACING,
  FONT_SIZES,
  RESPONSIVE,
  HERO_SLIDES,
  SHADOWS,
};
