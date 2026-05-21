import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Colors, CornerRadius, useScaledTheme } from '@/constants/theme';

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Mar\u00e7o',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export type EventCalendarProps = {
  eventDates?: (Date | string)[];
  initialDate?: Date;
  onSelectDate?: (date: Date) => void;
  style?: StyleProp<ViewStyle>;
};

type CalendarDay = {
  date: Date;
  key: string;
  label: string;
  isCurrentMonth: boolean;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function clampDateToMonth(date: Date, monthDate: Date) {
  const lastDay = getDaysInMonth(monthDate);
  const day = Math.min(date.getDate(), lastDay);

  return new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
}

function getMondayWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getEventDateKey(date: Date | string) {
  if (date instanceof Date) {
    return getDateKey(date);
  }

  const dateOnly = date.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  return dateOnly ?? getDateKey(new Date(date));
}

function isSameDay(firstDate: Date, secondDate: Date) {
  return getDateKey(firstDate) === getDateKey(secondDate);
}

function getCalendarWeeks(monthDate: Date) {
  const firstDayOfMonth = startOfMonth(monthDate);
  const firstCalendarDay = addDays(firstDayOfMonth, -getMondayWeekdayIndex(firstDayOfMonth));
  const weeks: CalendarDay[][] = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: CalendarDay[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(firstCalendarDay, weekIndex * 7 + dayIndex);

      week.push({
        date,
        key: getDateKey(date),
        label: String(date.getDate()).padStart(2, '0'),
        isCurrentMonth: date.getMonth() === monthDate.getMonth(),
      });
    }

    weeks.push(week);
  }

  return weeks;
}

function formatCalendarTitle(date: Date) {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

export function EventCalendar({
  eventDates = [],
  initialDate = new Date(),
  onSelectDate,
  style,
}: EventCalendarProps) {
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const { Heading } = scaledTheme;
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(initialDate));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialDate));
  const [isFollowingToday, setIsFollowingToday] = useState(() => isSameDay(initialDate, new Date()));

  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => {
      const nextToday = startOfDay(new Date());

      setToday(nextToday);

      if (isFollowingToday) {
        setSelectedDate(nextToday);
        setVisibleMonth(startOfMonth(nextToday));
      }
    }, nextDay.getTime() - now.getTime() + 1000);

    return () => clearTimeout(timer);
  }, [isFollowingToday, today]);

  const eventDateKeys = useMemo(() => new Set(eventDates.map(getEventDateKey)), [eventDates]);
  const weeks = useMemo(() => getCalendarWeeks(visibleMonth), [visibleMonth]);

  const selectDate = (date: Date) => {
    const normalizedDate = startOfDay(date);

    setSelectedDate(normalizedDate);
    setVisibleMonth(startOfMonth(normalizedDate));
    setIsFollowingToday(isSameDay(normalizedDate, today));
    onSelectDate?.(normalizedDate);
  };

  const changeMonth = (months: number) => {
    const nextMonth = addMonths(visibleMonth, months);
    const nextSelectedDate = clampDateToMonth(selectedDate, nextMonth);

    setVisibleMonth(nextMonth);
    setSelectedDate(nextSelectedDate);
    setIsFollowingToday(false);
    onSelectDate?.(nextSelectedDate);
  };

  return (
    <View style={[styles.calendarCard, style]}>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarDate}>{formatCalendarTitle(selectedDate)}</Text>
        <View style={styles.calendarActions}>
          <TouchableOpacity
            accessibilityLabel="M\u00eas anterior"
            activeOpacity={0.7}
            hitSlop={8}
            onPress={() => changeMonth(-1)}
            style={styles.iconButton}>
            <MaterialIcons name="chevron-left" size={Heading.h2} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Pr\u00f3ximo m\u00eas"
            activeOpacity={0.7}
            hitSlop={8}
            onPress={() => changeMonth(1)}
            style={styles.iconButton}>
            <MaterialIcons name="chevron-right" size={Heading.h2} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEK_DAYS.map((day) => (
          <Text key={day} style={styles.weekText}>
            {day}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week.map((day) => day.key).join('-')} style={styles.daysRow}>
          {week.map((day) => {
            const isSelected = isSameDay(day.date, selectedDate);
            const isToday = isSameDay(day.date, today);
            const isEventDay = eventDateKeys.has(day.key);

            return (
              <TouchableOpacity
                key={day.key}
                activeOpacity={0.72}
                onPress={() => selectDate(day.date)}
                style={[
                  styles.dayCell,
                  !day.isCurrentMonth && styles.otherMonthDayCell,
                  isToday && styles.todayDayCell,
                  isEventDay && styles.eventDayCell,
                  isSelected && styles.selectedDayCell,
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.otherMonthDayText,
                    isEventDay && styles.eventDayText,
                    isSelected && styles.selectedDayText,
                  ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function createStyles({ Fonts, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    calendarCard: {
      borderRadius: CornerRadius.xl,
      backgroundColor: Colors.card,
      padding: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.md },
      shadowOpacity: 0.12,
      shadowRadius: CornerRadius.xl,
      elevation: Spacing.xs,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    calendarDate: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
    },
    calendarActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      width: scale(34),
      height: scale(34),
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    weekText: {
      width: scale(32),
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
      textAlign: 'center',
    },
    daysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs2,
    },
    dayCell: {
      width: scale(32),
      height: scale(26),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    todayDayCell: {
      borderColor: Colors.ocean[500],
    },
    otherMonthDayCell: {
      opacity: 0.38,
    },
    selectedDayCell: {
      backgroundColor: Colors.ocean[500],
      borderColor: Colors.ocean[500],
    },
    eventDayCell: {
      backgroundColor: Colors.orange[200],
    },
    dayText: {
      color: Colors.text,
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.minorSize,
    },
    otherMonthDayText: {
      color: Colors.neutral[500],
    },
    selectedDayText: {
      color: Colors.card,
    },
    eventDayText: {
      color: Colors.text,
    },
  });
}
