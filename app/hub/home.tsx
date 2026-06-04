import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, CornerRadius, useScaledTheme } from '@/constants/theme';
import { hasAssociationAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';
import { EventCalendar, RestrictedAccessOverlay } from '@/src/components';

export default function HomeScreen() {
  const router = useRouter();
  const { eventDates, firstNews, professorName, userProfile } = useAppData();
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const { Heading } = scaledTheme;
  const canAccessCalendar = hasAssociationAccess(userProfile?.status);

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
    content: {
      flex: 1,
      justifyContent: 'space-around',
      padding: Spacing.xl,
      paddingBottom: Spacing.xl8,
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
