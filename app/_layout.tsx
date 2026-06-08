import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts as useManropeFonts,
} from '@expo-google-fonts/manrope';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { AppDataProvider } from '@/src/app-data';
import { AppHeader, AppTabBar, type AppTabKey } from '@/src/components';

function getActiveTab(pathname: string): AppTabKey | null {
  if (pathname.startsWith('/hub/home')) {
    return 'home';
  }

  if (pathname.startsWith('/hub/events')) {
    return 'events';
  }

  if (pathname.startsWith('/hub/news') && !pathname.startsWith('/hub/news-edit')) {
    return 'news';
  }

  if (pathname.startsWith('/hub/calendar')) {
    return 'calendar';
  }

  if (pathname === '/hub/profile/profile') {
    return 'profile';
  }

  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const isProfileEdit = pathname.startsWith('/hub/profile/profile-edit');
  const isDetailScreen = pathname.startsWith('/hub/detail');
  const isEventEdit = pathname.startsWith('/hub/event-edit');
  const isNewsEdit = pathname.startsWith('/hub/news-edit');
  const isReports = pathname.startsWith('/hub/reports');
  const isSystem = pathname.startsWith('/hub/system');
  const isUsers = pathname.startsWith('/hub/users');
  const showBackHeader = isProfileEdit || isDetailScreen || isEventEdit || isNewsEdit || isReports || isSystem || isUsers;
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [manropeLoaded] = useManropeFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!interLoaded || !manropeLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={Colors.backgroundGradient} style={styles.root} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <AppDataProvider>
        <View style={styles.root}>
          {activeTab ? <AppHeader /> : null}
          {showBackHeader ? (
            <AppHeader onBackPress={() => router.back()} showBack showNotifications={false} />
          ) : null}

          <View style={styles.stack}>
            <Stack
              screenOptions={{
                animation: 'none',
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </View>

          {activeTab ? <AppTabBar activeTab={activeTab} /> : null}
          <StatusBar style="dark" translucent backgroundColor="transparent" />
        </View>
      </AppDataProvider>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stack: {
    flex: 1,
  },
});
