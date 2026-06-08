import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, CornerRadius, useScaledTheme } from '@/constants/theme';
import { hasAdminAccess, hasAssociationAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';
import { EventCalendar, RestrictedAccessOverlay } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const router = useRouter();
  const { eventDates, firstNews, professorName, userProfile } = useAppData();
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const { Heading } = scaledTheme;
  const canAccessCalendar = hasAssociationAccess(userProfile?.status);
  const isAdmin = hasAdminAccess(userProfile?.status);
  const adminGreetingName = userProfile?.name ? professorName : 'Admin';

  const handleAdminAlertsPress = () => undefined;
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

            <Text style={styles.adminSummaryTitle}>Total de associados</Text>
            <Text style={styles.adminSummaryNumber}>450</Text>

            <View style={styles.adminSummaryTags}>
              <TouchableOpacity style={styles.adminSummaryTag}>
                <Text style={styles.adminSummaryTagText}>ATIVOS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminSummaryTag}>
                <Text style={styles.adminSummaryTagText}>PENDENTES</Text>
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

        <TouchableOpacity activeOpacity={0.86} style={styles.adminAlertCard}>
          <MaterialIcons name="warning" size={18} color="#B3261E" />
          <View style={styles.adminAlertTextBlock}>
            <View style={styles.adminAlertTopRow}>
              <Text style={styles.adminAlertTitle}>Pagamento Pendente</Text>
              <Text style={styles.adminAlertTime}>há 2 min</Text>
            </View>
            <Text style={styles.adminAlertDescription}>
              3 Associados estão com a anuidade atrasada há mais de 30 dias.
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
    adminSummaryTagText: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
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
