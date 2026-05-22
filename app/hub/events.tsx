import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, useScaledTheme, withOpacity } from '@/constants/theme';
import { useAppData } from '@/src/app-data';
import { type EventItem } from '@/src/events';

type FilterKey = 'all' | 'future-events' | 'future-prizes' | 'realized-events' | 'realized-prizes';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos os eventos e prêmios' },
  { key: 'future-events', label: 'Eventos futuros' },
  { key: 'future-prizes', label: 'Prêmios futuros' },
  { key: 'realized-prizes', label: 'Prêmios entregues' },
  { key: 'realized-events', label: 'Eventos realizados' },
];

function isPrize(item: EventItem) {
  return item.type === 'prize';
}

function isUpcoming(item: EventItem) {
  if (!item.when || item.finished) {
    return false;
  }

  const dateOnly = item.when.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const date = new Date(dateOnly ?? item.when);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() >= new Date().setHours(0, 0, 0, 0);
}

function formatEventDate(when: string | null) {
  if (!when) {
    return 'Data a definir';
  }

  const dateOnly = when.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const date = new Date(dateOnly ?? when);

  if (Number.isNaN(date.getTime())) {
    return 'Data a definir';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatEventTime(time: string | null) {
  if (!time) {
    return null;
  }

  const trimmedTime = time.trim();
  const date = new Date(trimmedTime);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  const hourMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})/);

  if (hourMatch) {
    return `${hourMatch[1].padStart(2, '0')}:${hourMatch[2]}`;
  }

  return trimmedTime;
}

function formatEventTimeRange(when: string | null, starts: string | null, ends: string | null) {
  const startTime = formatEventTime(starts);
  const endTime = formatEventTime(ends);

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  if (startTime) {
    return startTime;
  }

  if (endTime) {
    return `Ate ${endTime}`;
  }

  if (!when) {
    return 'Horário a definir';
  }

  const hasExplicitTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when);

  if (!hasExplicitTime) {
    return 'Horário a definir';
  }

  const startDate = new Date(when);

  if (Number.isNaN(startDate.getTime())) {
    return 'Horário a definir';
  }

  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 3);

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatter.format(startDate)} — ${formatter.format(endDate)}`;
}

function getVisibleEvents(events: EventItem[], activeFilter: FilterKey) {
  switch (activeFilter) {
    case 'future-events':
      return events.filter((item) => item.type === 'event' && isUpcoming(item));
    case 'future-prizes':
      return events.filter((item) => isPrize(item) && isUpcoming(item));
    case 'realized-events':
      return events.filter((item) => item.type === 'event' && !isUpcoming(item));
    case 'realized-prizes':
      return events.filter((item) => isPrize(item) && !isUpcoming(item));
    default:
      return events;
  }
}

export default function EventsScreen() {
  const router = useRouter();
  const { events, isEventsLoaded } = useAppData();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const visibleEvents = useMemo(() => getVisibleEvents(events, activeFilter), [activeFilter, events]);
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  const renderEventList = () => {
    if (visibleEvents.length > 0) {
      return (
        <View style={styles.eventList}>
          {visibleEvents.map((item) => {
            const prize = isPrize(item);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/hub/detail', params: { id: item.id, type: 'event' } })}
                style={styles.eventCard}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.eventImage} contentFit="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="image" size={64} color={Colors.ocean[200]} />
                  </View>
                )}

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <View style={[styles.tag, prize ? styles.prizeTag : styles.timeTag]}>
                      <Text style={[styles.tagText, prize ? styles.prizeTagText : styles.timeTagText]}>
                        {prize ? 'Prêmio' : 'Horário'}
                      </Text>
                    </View>

                    {!prize ? (
                      <Text style={styles.timeText}>{formatEventTimeRange(item.when, item.starts, item.ends)}</Text>
                    ) : null}
                  </View>

                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {item.title || 'Evento sem titulo'}
                  </Text>

                  <View style={styles.detailRow}>
                    <MaterialIcons name="event" size={16} color={Colors.neutral[500]} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {formatEventDate(item.when)}
                    </Text>
                  </View>

                  {item.where ? (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="place" size={18} color={Colors.neutral[500]} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {item.where}
                      </Text>
                    </View>
                  ) : null}

                  <MaterialIcons name="chevron-right" size={36} color={Colors.neutral[500]} style={styles.cardArrow} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <MaterialIcons name="calendar-today" size={42} color={Colors.ocean[300]} />
        <Text style={styles.emptyTitle}>{isEventsLoaded ? 'Nenhum evento encontrado' : 'Carregando eventos'}</Text>
        <Text style={styles.emptyDescription}>
          {isEventsLoaded
            ? 'Quando houver eventos neste filtro, eles aparecem aqui.'
            : 'Buscando eventos cadastrados no Realtime Database.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.pageIntro}>
        <Text style={styles.title}>Calendário{'\n'}Institucional</Text>
        <Text style={styles.subtitle} numberOfLines={2}>Eventos e prêmios da ADSerra, atuais e futuros.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterScroll}>
        {filters.map((filter) => {
          const isActive = filter.key === activeFilter;

          return (
            <TouchableOpacity
              key={filter.key}
              activeOpacity={0.85}
              onPress={() => setActiveFilter(filter.key)}
              style={[styles.filterChip, isActive && styles.activeFilterChip]}>
              <Text style={[styles.filterText, isActive && styles.activeFilterText]}>{filter.label}</Text>
              {isActive ? <MaterialIcons name="explore" size={12} color={Colors.card} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.cardScroll}>
        {renderEventList()}
      </ScrollView>
    </View>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      padding: Spacing.xl,
    },
    pageIntro: {
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    title: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Heading.h3,
      lineHeight: Math.round(Heading.h3 * 1.2),
    },
    subtitle: {
      minHeight: Math.round(Fonts.mediumSize * 1.18) * 2,
      maxWidth: scale(330),
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.18),
    },
    filterScroll: {
      width: '100%',
      flexGrow: 0,
      marginBottom: Spacing.xl2,
    },
    filterList: {
      gap: Spacing.md,
    },
    cardScroll: {
      flex: 1,
      marginHorizontal: -Spacing.xl,
    },
    scrollContent: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl9,
    },
    filterChip: {
      minHeight: scale(28),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderRadius: CornerRadius.full,
      backgroundColor: withOpacity(Colors.neutral[500], 0.28),
      paddingHorizontal: Spacing.lg,
    },
    activeFilterChip: {
      backgroundColor: Colors.ocean[600],
    },
    filterText: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    activeFilterText: {
      color: Colors.card,
    },
    eventList: {
      gap: Spacing.xl2,
    },
    eventCard: {
      overflow: 'hidden',
      height: scale(250),
      borderRadius: CornerRadius.xl3,
      backgroundColor: Colors.card,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    eventImage: {
      width: '100%',
      height: '50%',
      backgroundColor: Colors.neutral[100],
    },
    imagePlaceholder: {
      width: '100%',
      height: '50%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withOpacity(Colors.neutral[100], 0.7),
    },
    cardBody: {
      flex: 1,
      padding: Spacing.md,
      paddingRight: Spacing.xl5,
      paddingLeft: Spacing.lg,
    },
    metaRow: {
      minHeight: scale(22),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.xs,
    },
    tag: {
      minHeight: scale(20),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      paddingHorizontal: Spacing.md,
    },
    timeTag: {
      backgroundColor: Colors.ocean[100],
    },
    prizeTag: {
      backgroundColor: '#E8E2AA',
    },
    tagText: {
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
    },
    timeTagText: {
      color: Colors.ocean[600],
    },
    prizeTagText: {
      color: Colors.orange[500],
    },
    timeText: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
    },
    eventTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.subtitle,
      marginBottom: Spacing.md,
    },
    detailRow: {
      minHeight: scale(24),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.none,
    },
    detailText: {
      flex: 1,
      color: Colors.neutral[500],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
    },
    cardArrow: {
      position: 'absolute',
      right: Spacing.md,
      bottom: Spacing.md,
    },
    emptyCard: {
      alignItems: 'center',
      borderRadius: CornerRadius.xl3,
      backgroundColor: Colors.card,
      padding: Spacing.xl3,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    emptyTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    emptyDescription: {
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.minorSize,
      lineHeight: Math.round(Fonts.minorSize * 1.28),
      textAlign: 'center',
    },
  });
}
