import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, useScaledTheme } from '@/constants/theme';
import { hasAssociationAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';
import { EventCalendar, RestrictedAccessOverlay } from '@/src/components';
import { getEventDateKey, type EventItem } from '@/src/events';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
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

function formatEventTimeRange(item: EventItem) {
  const startTime = formatEventTime(item.starts);
  const endTime = formatEventTime(item.ends);

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  if (startTime) {
    return startTime;
  }

  if (endTime) {
    return `Ate ${endTime}`;
  }

  return 'Horário a definir';
}

function getEventBadgeDate(item: EventItem) {
  const dateKey = getEventDateKey(item);
  const date = dateKey ? parseDateKey(dateKey) : new Date();

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTHS[date.getMonth()] ?? '---',
  };
}

function getEventsForDate(events: EventItem[], dateKey: string) {
  return events.filter((item) => getEventDateKey(item) === dateKey);
}

export default function CalendarScreen() {
  const { eventDates, events, isEventsLoaded, userProfile } = useAppData();
  const hasSyncedInitialDate = useRef(false);
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));
  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const dayEvents = useMemo(() => getEventsForDate(events, selectedDateKey), [events, selectedDateKey]);
  const canAccessCalendar = hasAssociationAccess(userProfile?.status);
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  useEffect(() => {
    if (hasSyncedInitialDate.current || !eventDates[0]) {
      return;
    }

    hasSyncedInitialDate.current = true;
    setSelectedDateKey(eventDates[0]);
  }, [eventDates]);

  return (
    <View style={styles.screen}>
      <View
        importantForAccessibility={canAccessCalendar ? 'auto' : 'no-hide-descendants'}
        pointerEvents={canAccessCalendar ? 'auto' : 'none'}
        style={styles.content}>
      <Text style={styles.title}>Calendário</Text>

      <EventCalendar
        eventDates={canAccessCalendar ? eventDates : []}
        onSelectDate={(date) => setSelectedDateKey(getDateKey(date))}
        selectedDate={selectedDate}
        style={styles.calendar}
      />

      <Text style={styles.sectionTitle}>Eventos do dia</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.cardScroll}>
        {dayEvents.length > 0 && canAccessCalendar ? (
          <View style={styles.eventList}>
            {dayEvents.map((item) => {
              const badgeDate = getEventBadgeDate(item);

              return (
                <View key={item.id} style={styles.eventCard}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateMonth}>{badgeDate.month}</Text>
                    <Text style={styles.dateDay}>{badgeDate.day}</Text>
                  </View>

                  <View style={styles.eventContent}>
                    <View style={styles.metaRow}>
                      <View style={styles.timeTag}>
                        <Text style={styles.timeTagText}>Horário</Text>
                      </View>
                      <Text style={styles.timeText}>{formatEventTimeRange(item)}</Text>
                    </View>

                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {item.title || 'Evento sem titulo'}
                    </Text>

                    <View style={styles.detailRow}>
                      <MaterialIcons name="place" size={18} color={Colors.neutral[500]} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {item.where || 'Local a definir'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="calendar-today" size={42} color={Colors.ocean[300]} />
            <Text style={styles.emptyTitle}>{isEventsLoaded ? 'Nenhum evento neste dia' : 'Carregando eventos'}</Text>
            <Text style={styles.emptyDescription}>
              {isEventsLoaded
                ? 'Selecione uma data marcada no calendário para ver os eventos cadastrados.'
                : 'Buscando eventos cadastrados no Realtime Database.'}
            </Text>
          </View>
        )}
      </ScrollView>
      </View>

      {!canAccessCalendar ? <RestrictedAccessOverlay message="CALENDÁRIO PERMITIDO SOMENTE A ASSOCIADOS" /> : null}
    </View>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl3,
    },
    title: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Heading.h5,
      marginBottom: Spacing.lg,
    },
    calendar: {
      marginBottom: Spacing.xl3,
    },
    sectionTitle: {
      color: Colors.ocean[600],
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.title,
      marginBottom: Spacing.lg,
    },
    cardScroll: {
      flex: 1,
      marginHorizontal: -Spacing.xl,
    },
    scrollContent: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl9,
    },
    eventList: {
      gap: Spacing.xl2,
    },
    eventCard: {
      minHeight: scale(112),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      borderRadius: CornerRadius.xl3,
      backgroundColor: Colors.card,
      padding: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    dateBadge: {
      width: scale(56),
      minHeight: scale(78),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[100],
      gap: Spacing.sm,
    },
    dateMonth: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    dateDay: {
      color: Colors.ocean[600],
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.title,
    },
    eventContent: {
      flex: 1,
      minWidth: 0,
    },
    metaRow: {
      minHeight: scale(22),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
    },
    timeTag: {
      minHeight: scale(20),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: Colors.ocean[100],
      paddingHorizontal: Spacing.md,
    },
    timeTagText: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    timeText: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    eventTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      lineHeight: Math.round(Fonts.bigSize * 1.2),
      marginBottom: Spacing.sm,
    },
    detailRow: {
      minHeight: scale(22),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    detailText: {
      flex: 1,
      color: Colors.neutral[500],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
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
