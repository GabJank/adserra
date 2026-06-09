import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, CornerRadius, useScaledTheme } from '@/constants/theme';
import { hasAdminAccess, hasAssociationAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';
import { EventCalendar, RestrictedAccessOverlay } from '@/src/components';
import { database } from '@/src/firebase';

type AdminSummaryMetric = 'associated' | 'visitors';

type AdminUserCounts = Record<AdminSummaryMetric, number>;

type AdminAlert = {
  createdAt: Date | null;
  description: string;
  id: string;
  timeLabel: string;
  title: string;
};

const emptyAdminUserCounts: AdminUserCounts = {
  associated: 0,
  visitors: 0,
};

function getAdminUserCounts(value: unknown): AdminUserCounts {
  if (!value || typeof value !== 'object') {
    return emptyAdminUserCounts;
  }

  return Object.values(value as Record<string, unknown>).reduce<AdminUserCounts>(
    (counts, userValue) => {
      const user = userValue && typeof userValue === 'object' ? (userValue as { status?: unknown }) : null;
      const status = typeof user?.status === 'string' ? user.status.trim().toLowerCase() : '';

      if (status === 'associated' || status === 'admin') {
        return { ...counts, associated: counts.associated + 1 };
      }

      return { ...counts, visitors: counts.visitors + 1 };
    },
    { ...emptyAdminUserCounts }
  );
}

function getStringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseAlertDate(value: unknown) {
  if (typeof value === 'number') {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAlertTime(date: Date | null, fallback: string | null) {
  if (!date) {
    return fallback ?? '';
  }

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return 'agora';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `há ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `há ${diffInHours} h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return `há ${diffInDays} d`;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function normalizeAlert(value: unknown, id: string): AdminAlert | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const alert = value as {
    createdAt?: unknown;
    description?: unknown;
    detail?: unknown;
    message?: unknown;
    time?: unknown;
    timestamp?: unknown;
    title?: unknown;
  };
  const createdAt = parseAlertDate(alert.createdAt ?? alert.timestamp ?? alert.time);
  const fallbackTime = getStringField(alert.time);
  const title = getStringField(alert.title) ?? 'Log de segurança';
  const description =
    getStringField(alert.description) ?? getStringField(alert.detail) ?? getStringField(alert.message) ?? '';

  if (!title && !description) {
    return null;
  }

  return {
    createdAt,
    description: description || 'Novo registro de segurança.',
    id,
    timeLabel: formatAlertTime(createdAt, fallbackTime),
    title,
  };
}

function getAdminAlerts(value: unknown) {
  const entries = Array.isArray(value)
    ? value.map((alert, index) => [String(index), alert] as const)
    : value && typeof value === 'object'
      ? Object.entries(value as Record<string, unknown>)
      : [];

  return entries
    .map(([id, alert]) => normalizeAlert(alert, id))
    .filter((alert): alert is AdminAlert => alert !== null)
    .sort((firstAlert, secondAlert) => {
      const firstTime = firstAlert.createdAt?.getTime() ?? 0;
      const secondTime = secondAlert.createdAt?.getTime() ?? 0;

      if (firstTime !== secondTime) {
        return secondTime - firstTime;
      }

      return secondAlert.id.localeCompare(firstAlert.id, undefined, { numeric: true });
    });
}

export default function HomeScreen() {
  const router = useRouter();
  const { eventDates, firstNews, professorName, userProfile } = useAppData();
  const [adminUserCounts, setAdminUserCounts] = useState<AdminUserCounts>(emptyAdminUserCounts);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [selectedSummaryMetric, setSelectedSummaryMetric] = useState<AdminSummaryMetric>('associated');
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const { Heading } = scaledTheme;
  const canAccessCalendar = hasAssociationAccess(userProfile?.status);
  const isAdmin = hasAdminAccess(userProfile?.status);
  const adminGreetingName = userProfile?.name ? professorName : 'Admin';
  const adminSummaryNumber = adminUserCounts[selectedSummaryMetric];
  const adminSummaryTitle = selectedSummaryMetric === 'associated' ? 'Total de associados' : 'Total de visitantes';
  const latestAdminAlert = adminAlerts[0] ?? null;

  useEffect(() => {
    if (!isAdmin || !database) {
      setAdminUserCounts(emptyAdminUserCounts);
      return;
    }

    const usersRef = ref(database, 'users');

    return onValue(
      usersRef,
      (snapshot) => {
        setAdminUserCounts(getAdminUserCounts(snapshot.val()));
      },
      (error) => {
        console.error('Users count listener failed:', error);
        setAdminUserCounts(emptyAdminUserCounts);
      }
    );
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !database) {
      setAdminAlerts([]);
      return;
    }

    const alertsRef = ref(database, 'alerts');

    return onValue(
      alertsRef,
      (snapshot) => {
        setAdminAlerts(getAdminAlerts(snapshot.val()));
      },
      (error) => {
        console.error('Alerts listener failed:', error);
        setAdminAlerts([]);
      }
    );
  }, [isAdmin]);

  const handleAdminAlertsPress = () => router.push('/hub/system');
  const handleAdminReportsPress = () => router.push('/hub/reports');
  const handleAdminNewEventPress = () => router.push('/hub/event-edit');
  const handleAdminSystemPress = () => router.push('/hub/system');

  if (isAdmin) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.adminScroll}
        contentContainerStyle={styles.adminContent}>
        <View style={styles.adminGreeting}>
          <Text style={styles.greetingSmall}>Bom dia!</Text>
          <Text style={styles.greetingName}>{`${adminGreetingName}!`}</Text>
        </View>

        <View>
          <LinearGradient
            colors={Colors.buttonGradient}
            style={styles.adminSummaryCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <View style={styles.adminSummaryHeader}>
              <View style={styles.adminSummaryIconBox}>
                <MaterialIcons name="groups" size={18} color={Colors.card} />
              </View>
              <Text style={styles.adminSummaryEyebrow}>ASSOCIADOS</Text>
            </View>

            <Text style={styles.adminSummaryTitle}>{adminSummaryTitle}</Text>
            <Text style={styles.adminSummaryNumber}>{adminSummaryNumber}</Text>

            <View style={styles.adminSummaryTags}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setSelectedSummaryMetric('associated')}
                style={[
                  styles.adminSummaryTag,
                  selectedSummaryMetric === 'associated' && styles.adminSummaryTagActive,
                ]}>
                <Text
                  style={[
                    styles.adminSummaryTagText,
                    selectedSummaryMetric === 'associated' && styles.adminSummaryTagTextActive,
                  ]}>
                  ASSOCIADOS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setSelectedSummaryMetric('visitors')}
                style={[
                  styles.adminSummaryTag,
                  selectedSummaryMetric === 'visitors' && styles.adminSummaryTagActive,
                ]}>
                <Text
                  style={[
                    styles.adminSummaryTagText,
                    selectedSummaryMetric === 'visitors' && styles.adminSummaryTagTextActive,
                  ]}>
                  VISITANTES
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.adminSectionHeader}>
          <View style={styles.adminSectionTitleWrap}>
            <View style={styles.adminSectionIconBox}>
              <MaterialIcons name="warning" size={18} color={Colors.text} />
            </View>
            <Text style={styles.sectionTitle}>ALERTAS DO SISTEMA</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={handleAdminAlertsPress}>
            <Text style={styles.seeMore}>Ver mais</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.86} onPress={handleAdminAlertsPress} style={styles.adminAlertCard}>
          <MaterialIcons name={latestAdminAlert ? 'warning' : 'info'} size={18} color={latestAdminAlert ? '#B3261E' : Colors.ocean[600]} />
          <View style={styles.adminAlertTextBlock}>
            <View style={styles.adminAlertTopRow}>
              <Text style={[styles.adminAlertTitle, !latestAdminAlert && styles.adminAlertTitleInfo]} numberOfLines={1}>
                {latestAdminAlert?.title ?? 'Nenhum alerta registrado'}
              </Text>
              {latestAdminAlert?.timeLabel ? (
                <Text style={styles.adminAlertTime}>{latestAdminAlert.timeLabel}</Text>
              ) : null}
            </View>
            <Text style={styles.adminAlertDescription} numberOfLines={2}>
              {latestAdminAlert?.description ?? 'Os logs de segurança cadastrados em alerts aparecem aqui.'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={28} color={Colors.neutral[500]} />
        </TouchableOpacity>

        <View style={styles.adminSectionHeader}>
          <View style={styles.adminSectionTitleWrap}>
            <View style={styles.adminSectionIconBox}>
              <MaterialIcons name="schedule" size={18} color={Colors.text} />
            </View>
            <Text style={styles.sectionTitle}>ACESSO RÁPIDO</Text>
          </View>
        </View>

        <View style={styles.adminQuickGrid}>
          <TouchableOpacity activeOpacity={0.86} onPress={handleAdminReportsPress} style={styles.adminQuickCard}>
            <MaterialIcons name="description" size={20} color={Colors.ocean[500]} />
            <Text style={styles.adminQuickText}>RELATÓRIOS</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.86} onPress={handleAdminNewEventPress} style={styles.adminQuickCard}>
            <MaterialIcons name="photo-camera" size={20} color={Colors.ocean[500]} />
            <Text style={styles.adminQuickText}>NOVO EVENTO</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.86} onPress={handleAdminSystemPress} style={styles.adminQuickCard}>
            <MaterialIcons name="settings" size={20} color={Colors.ocean[500]} />
            <Text style={styles.adminQuickText}>SISTEMA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.greetingSmall}>Bom dia,</Text>
        <Text style={styles.greetingName}>{`${professorName}!`}</Text>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => router.replace('/hub/events')}>
        <View style={styles.eventCard}>
          <View style={styles.eventTopRow}>
            <View style={styles.eventIconBox}>
              <MaterialIcons name="photo-camera" size={Heading.h5} color={Colors.ocean[100]} />
            </View>
            <Text style={styles.eventEyebrow}>EVENTOS</Text>
          </View>
          <Text style={styles.eventTitle}>Acesse todos os eventos</Text>
          <Text style={styles.eventDescription}>
            Veja todos os registros e prêmios oferecidos aos professores
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={Heading.h2}
            color={Colors.card}
            style={styles.eventArrow}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionIconBox}>
            <MaterialIcons name="article" size={Heading.h5} color={Colors.neutral[800]} />
          </View>
          <Text style={styles.sectionTitle}>NOTÍCIAS</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.replace('/hub/news')}>
          <Text style={styles.seeMore}>Ver mais</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.newsCard}>
        {firstNews?.photoUrl ? (
          <Image source={{ uri: firstNews.photoUrl }} style={styles.newsImage} contentFit="cover" />
        ) : (
          <View style={styles.newsImagePlaceholder}>
            <MaterialIcons name="image" size={Heading.h1} color={Colors.ocean[200]} />
          </View>
        )}
        <Text style={styles.newsTitle} numberOfLines={1}>
          {firstNews?.title || 'Nenhuma noticia cadastrada'}
        </Text>
        <Text style={styles.newsDescription} numberOfLines={2}>
          {firstNews?.description || 'Cadastre uma noticia no Realtime Database para exibir aqui.'}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionIconBox}>
            <MaterialIcons name="calendar-today" size={Heading.h5} color={Colors.neutral[800]} />
          </View>
          <Text style={styles.sectionTitle}>
            CALENDÁRIO DE EVENTOS
          </Text>
        </View>
      </View>

      <View style={styles.calendarLockWrap}>
        <View
          importantForAccessibility={canAccessCalendar ? 'auto' : 'no-hide-descendants'}
          pointerEvents={canAccessCalendar ? 'auto' : 'none'}>
          <EventCalendar eventDates={canAccessCalendar ? eventDates : []} />
        </View>

        {!canAccessCalendar ? (
          <RestrictedAccessOverlay
            message="CALENDÁRIO DE EVENTOS PERMITIDOS SOMENTE A ASSOCIADOS"
            variant="compact"
          />
        ) : null}
      </View>
    </View>
  );
}

function createStyles({ Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    adminScroll: {
      flex: 1,
    },
    adminContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    adminGreeting: {
      marginBottom: Spacing.lg,
    },
    adminSummaryCard: {
      minHeight: scale(150),
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.ocean[600],
      padding: Spacing.xl,
      marginBottom: Spacing.xl2,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.md },
      shadowOpacity: 0.22,
      shadowRadius: CornerRadius.xl3,
      elevation: Spacing.xs,
    },
    adminSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    adminSummaryIconBox: {
      width: scale(34),
      height: scale(34),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[300],
    },
    adminSummaryEyebrow: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    adminSummaryTitle: {
      color: Colors.card,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.subtitle,
      marginBottom: Spacing.md,
    },
    adminSummaryNumber: {
      color: Colors.card,
      fontFamily: Fonts.manropeBold,
      fontSize: Heading.h3,
      marginBottom: Spacing.md,
    },
    adminSummaryTags: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    adminSummaryTag: {
      minHeight: scale(22),
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: Colors.ocean[300],
      paddingHorizontal: Spacing.md,
    },
    adminSummaryTagActive: {
      backgroundColor: Colors.card,
    },
    adminSummaryTagText: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    adminSummaryTagTextActive: {
      color: Colors.ocean[600],
    },
    adminSectionHeader: {
      minHeight: scale(36),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    adminSectionTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    adminSectionIconBox: {
      width: scale(30),
      height: scale(30),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
    },
    adminAlertCard: {
      minHeight: scale(112),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: '#B3261E',
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      marginBottom: Spacing.xl,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.06,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    adminAlertTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: Spacing.md,
    },
    adminAlertTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    adminAlertTitle: {
      flex: 1,
      color: '#B3261E',
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
    },
    adminAlertTitleInfo: {
      color: Colors.ocean[600],
    },
    adminAlertTime: {
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
    },
    adminAlertDescription: {
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.24),
    },
    adminQuickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    adminQuickCard: {
      width: '48%',
      minHeight: scale(76),
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.neutral[100],
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.12,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    adminQuickText: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.minorSize,
    },
    content: {
      flex: 1,
      justifyContent: 'space-around',
      padding: Spacing.xl,
    },
    greeting: {
      marginBottom: Spacing.lg,
    },
    greetingSmall: {
      color: Colors.text,
      fontFamily: Fonts.interMedium,
      fontSize: Fonts.subtitle,
    },
    greetingName: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Heading.h3,
    },
    eventCard: {
      minHeight: scale(145),
      borderRadius: CornerRadius.xl,
      backgroundColor: Colors.ocean[500],
      padding: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.md },
      shadowOpacity: 0.18,
      shadowRadius: CornerRadius.xl,
      elevation: Spacing.xs,
    },
    eventTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    eventIconBox: {
      width: scale(36),
      height: scale(36),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[400],
    },
    eventEyebrow: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    eventTitle: {
      color: Colors.card,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.title,
      marginBottom: Spacing.lg,
    },
    eventDescription: {
      maxWidth: scale(220),
      color: Colors.card,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
    },
    eventArrow: {
      position: 'absolute',
      right: Spacing.lg,
      bottom: Spacing.lg,
    },
    sectionHeader: {
      minHeight: scale(44),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    sectionIconBox: {
      width: scale(34),
      height: scale(34),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
    },
    sectionTitle: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    seeMore: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    newsCard: {
      marginBottom: Spacing.xl2,
    },
    newsImage: {
      height: scale(78),
      borderRadius: CornerRadius.lg,
      backgroundColor: Colors.card,
      marginBottom: Spacing.md,
    },
    newsImagePlaceholder: {
      height: scale(78),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.lg,
      backgroundColor: Colors.card,
      marginBottom: Spacing.md,
    },
    newsTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      marginBottom: Spacing.md,
    },
    newsDescription: {
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.minorSize,
    },
    calendarLockWrap: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: CornerRadius.xl,
    },
  });
}
