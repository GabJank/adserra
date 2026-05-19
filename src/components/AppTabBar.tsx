import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScaledTheme } from '@/constants/theme';

export type AppTabKey = 'home' | 'camera' | 'news' | 'calendar' | 'profile';

export type AppTabItem = {
  key: AppTabKey;
  icon: keyof typeof MaterialIcons.glyphMap;
  label?: string;
  href?: Href;
};

export type AppTabBarProps = {
  activeTab: AppTabKey;
  items?: AppTabItem[];
  onTabPress?: (item: AppTabItem) => void;
};

const defaultItems: AppTabItem[] = [
  { key: 'home', icon: 'home', label: 'Home', href: '/home' },
  { key: 'camera', icon: 'photo-camera' },
  { key: 'news', icon: 'article' },
  { key: 'calendar', icon: 'calendar-today' },
  { key: 'profile', icon: 'person' },
];

export function AppTabBar({ activeTab, items = defaultItems, onTabPress }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const { Colors, Heading, Spacing } = scaledTheme;

  const handlePress = (item: AppTabItem) => {
    if (item.key === activeTab) {
      return;
    }

    if (onTabPress) {
      onTabPress(item);
      return;
    }

    if (item.href) {
      router.replace(item.href);
    }
  };

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, Spacing.xs),
        },
      ]}>
      {items.map((item) => {
        const isActive = item.key === activeTab;

        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            onPress={() => handlePress(item)}
            style={[styles.tabItem, isActive && styles.activeTabItem]}>
            <MaterialIcons
              name={item.icon}
              size={Heading.h5}
              color={isActive ? Colors.ocean[700] : Colors.neutral[500]}
            />
            {item.label ? <Text style={styles.tabLabel}>{item.label}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    tabBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: scale(56),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: Colors.card,
      padding: Spacing.xs,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.xs },
      shadowOpacity: 0.2,
      elevation: Spacing.xl3,
    },
    tabItem: {
      width: scale(54),
      height: scale(48),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.sm,
    },
    activeTabItem: {
      backgroundColor: Colors.ocean[200],
    },
    tabLabel: {
      color: Colors.ocean[700],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.minorSize,
      marginTop: 0,
    },
  });
}
