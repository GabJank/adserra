import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { type ReactNode, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScaledTheme } from '@/constants/theme';

export type AppHeaderProps = {
  onBackPress?: () => void;
  rightContent?: ReactNode;
  onNotificationsPress?: () => void;
  showBack?: boolean;
  showNotifications?: boolean;
};

export function AppHeader({
  onBackPress,
  rightContent,
  onNotificationsPress,
  showBack = false,
  showNotifications = true,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const { Colors, Heading, Spacing, scale } = scaledTheme;

  return (
    <View
      style={[
        styles.header,
        {
          minHeight: scale(52) + insets.top,
          paddingTop: insets.top,
        },
      ]}>
      <View style={styles.leftGroup}>
        {showBack ? (
          <TouchableOpacity
            accessibilityLabel="Voltar"
            activeOpacity={0.8}
            disabled={!showBack}
            hitSlop={Spacing.lg}
            onPress={onBackPress}
            style={[styles.backButton, !showBack && styles.hiddenButton]}>
            <MaterialIcons name="arrow-back" size={Heading.h5} color={Colors.neutral[500]} />
          </TouchableOpacity>)
          :
          null}
        <Image
          source={require('@/assets/svg/logo-adserra.svg')}
          style={styles.logo}
          contentFit="contain"
          accessible
          accessibilityLabel="ADSerra"
        />
      </View>

      {rightContent ??
        (showNotifications ? (
          <TouchableOpacity
            accessibilityLabel="Notificações"
            activeOpacity={0.8}
            hitSlop={Spacing.lg}
            onPress={onNotificationsPress}>
            <MaterialIcons name="notifications" size={Heading.h5} color={Colors.neutral[500]} />
          </TouchableOpacity>
        ) : (
          <View style={styles.rightSpacer} />
        ))}
    </View>
  );
}

function createStyles({ Colors, CornerRadius, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.xl,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.xs },
      shadowOpacity: 0.12,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: scale(28),
      height: scale(28),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.xs,
    },
    hiddenButton: {
      opacity: 0,
    },
    logo: {
      width: scale(112),
      height: scale(30),
    },
    rightSpacer: {
      width: scale(28),
      height: scale(28),
    },
  });
}
