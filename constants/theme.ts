import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export const withOpacity = (hex: string, opacity: number) => {
  const cleanHex = hex.replace('#', '');

  const red = parseInt(cleanHex.slice(0, 2), 16);
  const green = parseInt(cleanHex.slice(2, 4), 16);
  const blue = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};


export const Palette = {
  ocean: {
    100: '#D2DFEB',
    200: '#A5BFD7',
    300: '#799FC4',
    400: '#4C7FB0',
    500: '#1F5F9C',
    600: '#194C7D',
    700: '#13395E',
    800: '#0C263E',
    900: '#06131F',
  },
  royal: {
    100: '#d1dbe4',
    200: '#a2b7ca',
    300: '#7492af',
    400: '#456e95',
    500: '#174A7A',
    600: '#123b62',
    700: '#0e2c49',
    800: '#091e31',
    900: '#050f18',
  },
  orange: {
    100: '#e8dccc',
    200: '#d0b899',
    300: '#b99566',
    400: '#a17133',
    500: '#8A4E00',
    600: '#6e3e00',
    700: '#532f00',
    800: '#371f00',
    900: '#1c1000',
  },
  neutral: {
    100: '#e2e2e2',
    200: '#c5c5c5',
    300: '#a9a9a9',
    400: '#8c8c8c',
    500: '#6F6F6F',
    600: '#595959',
    700: '#434343',
    800: '#2c2c2c',
    900: '#161616',
  },
  fullBlack: '#000000',
  fullWhite: '#FFFFFF',
};

export const Colors = {
  ocean: Palette.ocean,
  royal: Palette.royal,
  orange: Palette.orange,
  neutral: Palette.neutral,
  fullBlack: Palette.fullBlack,
  fullWhite: Palette.fullWhite,
  text: Palette.fullBlack,
  background: Palette.ocean[100],
  card: Palette.fullWhite,
  tint: Palette.ocean[500],
  icon: Palette.neutral[600],
  inputIcon: Palette.neutral[600],
  placeholderText: Palette.neutral[600],
  mutedText: Palette.neutral[500],
  subtleText: Palette.neutral[400],
  labelText: Palette.neutral[600],
  linkText: Palette.ocean[600],
  secondaryLinkText: Palette.neutral[600],
  errorText: Palette.orange[500],
  fieldBorder: Palette.neutral[200],
  fieldBackground: Palette.neutral[100],
  checkboxBorder: Palette.neutral[200],
  shadow: Palette.ocean[800],
  tabIconDefault: Palette.neutral[600],
  tabIconSelected: Palette.ocean[500],
  backgroundGradient: [withOpacity(Palette.ocean[500], 0.1), withOpacity(Palette.royal[500], 0.2)] as const,
  buttonGradient: [Palette.ocean[500], Palette.ocean[700]] as const,
};

export const Fonts = {
  inter: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
  manrope: 'Manrope_400Regular',
  manropeMedium: 'Manrope_500Medium',
  manropeSemiBold: 'Manrope_600SemiBold',
  manropeBold: 'Manrope_700Bold',
  title: 18,
  subtitle: 16,
  bigSize: 14,
  mediumSize: 12,
  minorSize: 10,
};

export const Heading = {
  h1: 55,
  h2: 36,
  h3: 24,
  h4: 24,
  h5: 22,
  h6: 20,
  h7: 48,
};

export const CornerRadius = {
  none: 0,
  xs2: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xl2: 16,
  xl3: 20,
  xl4: 24,
  xl5: 28,
  full: 9999
};

export const Spacing = {
  none: 0,
  xs2: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xl2: 20,
  xl3: 24,
  xl4: 32,
  xl5: 40,
  xl6: 48,
  xl7: 64,
  xl8: 80,
  xl9: 96,
  xl10: 128,
  xl11: 160,
  xl12: 198,
};

const ResponsiveScale = {
  baseWidth: 412,
  baseHeight: 892,
  minUiScale: 0.84,
  maxUiScale: 1,
  minTextScale: 0.92,
} as const;

const scaleNumberRecord = <T extends Record<string, number>>(
  source: T,
  scaleValue: (value: number) => number
) => Object.fromEntries(Object.entries(source).map(([key, value]) => [key, scaleValue(value)])) as T;

export function useScaledTheme() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const uiScale = Math.min(
      ResponsiveScale.maxUiScale,
      Math.max(
        ResponsiveScale.minUiScale,
        Math.min(width / ResponsiveScale.baseWidth, height / ResponsiveScale.baseHeight)
      )
    );
    const textScale = Math.max(uiScale, ResponsiveScale.minTextScale);
    const scale = (value: number) => Math.round(value * uiScale);
    const scaleText = (value: number) => Math.round(value * textScale);

    return {
      Colors,
      CornerRadius,
      Spacing: scaleNumberRecord(Spacing, scale),
      Heading: scaleNumberRecord(Heading, scaleText),
      Fonts: {
        ...Fonts,
        title: scaleText(Fonts.title),
        subtitle: scaleText(Fonts.subtitle),
        bigSize: scaleText(Fonts.bigSize),
        mediumSize: scaleText(Fonts.mediumSize),
        minorSize: scaleText(Fonts.minorSize),
      },
      scale,
      scaleText,
      uiScale,
      textScale,
    };
  }, [height, width]);
}
