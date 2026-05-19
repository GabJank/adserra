import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { type ReactNode, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScaledTheme } from '@/constants/theme';

export type AppHeaderProps = {
  rightContent?: ReactNode;
  onNotificationsPress?: () => void;
  showNotifications?: boolean;
};

export function AppHeader({
  rightContent,
  onNotificationsPress,
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
      <Image
        source={require('@/assets/svg/logo-adserra.svg')}
        style={styles.logo}
        contentFit="contain"
        accessible
        accessibilityLabel="ADSerra"
      />

      {rightContent ??
        (showNotifications ? (
          <TouchableOpacity
            accessibilityLabel="Notificações"
            activeOpacity={0.8}
            hitSlop={Spacing.lg}
            onPress={onNotificationsPress}>
            <MaterialIcons name="notifications" size={Heading.h5} color={Colors.neutral[500]} />
          </TouchableOpacity>
        ) : null)}
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
    logo: {
      width: scale(112),
      height: scale(30),
    },
  });
}
