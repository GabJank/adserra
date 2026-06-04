import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useScaledTheme, withOpacity } from '@/constants/theme';

export type RestrictedAccessOverlayProps = {
  message: string;
  variant?: 'screen' | 'compact';
};

export function RestrictedAccessOverlay({ message, variant = 'screen' }: RestrictedAccessOverlayProps) {
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const isCompact = variant === 'compact';

  return (
    <View accessibilityLabel={message} accessible style={styles.overlay}>
      <MaterialIcons name="lock" size={isCompact ? scaledTheme.scale(46) : scaledTheme.scale(96)} color={scaledTheme.Colors.card} />
      <Text style={[styles.message, isCompact && styles.compactMessage]}>{message}</Text>
    </View>
  );
}

function createStyles({ Colors, Fonts, Spacing }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withOpacity(Colors.fullBlack, 0.76),
      paddingHorizontal: Spacing.xl2,
    },
    message: {
      maxWidth: 280,
      color: Colors.card,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      lineHeight: Math.round(Fonts.bigSize * 1.24),
      textAlign: 'center',
    },
    compactMessage: {
      maxWidth: 260,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.2),
    },
  });
}
