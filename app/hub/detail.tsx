import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, useScaledTheme, withOpacity } from '@/constants/theme';
import { useAppData } from '@/src/app-data';
import { RichDescriptionText } from '@/src/components';
import { parseEventDate, type EventItem } from '@/src/events';
import { type NewsItem } from '@/src/news';

type DetailKind = 'event' | 'news';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPrize(item: EventItem) {
  return item.type === 'prize';
}

function formatEventDate(when: string | null) {
  if (!when) {
    return 'Data a definir';
  }

  const date = parseEventDate(when);

  if (!date) {
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

  if (!when || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) {
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

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

export default function DetailScreen() {
  const { id, type } = useLocalSearchParams<{ id?: string; type?: DetailKind }>();
  const itemId = getSingleParam(id);
  const detailKind = getSingleParam(type);
  const { events, news } = useAppData();
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const detailItem = useMemo(() => {
    if (detailKind === 'event') {
      return events.find((item) => item.id === itemId) ?? null;
    }

    if (detailKind === 'news') {
      return news.find((item) => item.id === itemId) ?? null;
    }

    return null;
  }, [detailKind, events, itemId, news]);

  if (!detailItem) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="search-off" size={42} color={Colors.ocean[300]} />
        <Text style={styles.emptyTitle}>Conteúdo não encontrado</Text>
        <Text style={styles.emptyDescription}>Volte e tente abrir o item novamente.</Text>
      </View>
    );
  }

  if (detailKind === 'event') {
    const event = detailItem as EventItem;
    const prize = isPrize(event);
    const photos = event.photos.length > 0 ? event.photos : [event.photoUrl].filter(Boolean);

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topMetaRow}>
          <View style={[styles.tag, prize ? styles.prizeTag : styles.timeTag]}>
            <Text style={[styles.tagText, prize ? styles.prizeTagText : styles.timeTagText]}>
              {prize ? 'Prêmio' : 'Horário'}
            </Text>
          </View>

          {!prize ? (
            <Text style={styles.metaStrong}>{formatEventTimeRange(event.when, event.starts, event.ends)}</Text>
          ) : null}
        </View>

        <Text style={styles.title}>{event.title || 'Evento sem titulo'}</Text>
        <RichDescriptionText style={styles.description} value={event.description} />

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <MaterialIcons name="event" size={16} color={Colors.neutral[500]} />
            <Text style={styles.metaText}>{formatEventDate(event.when)}</Text>
          </View>

          {event.where ? (
            <View style={styles.metaRow}>
              <MaterialIcons name="place" size={18} color={Colors.neutral[500]} />
              <Text style={styles.metaText}>{event.where}</Text>
            </View>
          ) : null}
        </View>

        <PhotoList photos={photos} />
      </ScrollView>
    );
  }

  const newsItem = detailItem as NewsItem;
  const photos = newsItem.photos.length > 0 ? newsItem.photos : [newsItem.photoUrl].filter(Boolean);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topMetaRow}>
        <View style={styles.timeTag}>
          <Text style={styles.timeTagText}>{newsItem.source || 'Notícia'}</Text>
        </View>
      </View>

      <Text style={styles.title}>{newsItem.title || 'Notícia sem titulo'}</Text>
      <RichDescriptionText style={styles.description} value={newsItem.description} />

      {newsItem.url ? (
        <TouchableOpacity activeOpacity={0.8} onPress={() => Linking.openURL(newsItem.url || '')} style={styles.linkRow}>
          <MaterialIcons name="open-in-new" size={17} color={Colors.ocean[600]} />
          <Text style={styles.linkText} numberOfLines={1}>
            {newsItem.url}
          </Text>
        </TouchableOpacity>
      ) : null}

      <PhotoList photos={photos} />
    </ScrollView>
  );
}

function PhotoList({ photos }: { photos: (string | null)[] }) {
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const visiblePhotos = photos.filter((photo): photo is string => Boolean(photo));
  const photoItems = visiblePhotos.length > 0 ? visiblePhotos : [null];

  return (
    <View style={styles.photoList}>
      {photoItems.map((photo, index) => (
        <View key={photo ?? `placeholder-${index}`}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoCard} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialIcons name="image" size={72} color={Colors.ocean[200]} />
            </View>
          )}
          <Text style={styles.photoLabel}>Foto {index + 1}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    scrollContent: {
      padding: Spacing.xl,
      paddingBottom: Spacing.xl6,
    },
    topMetaRow: {
      minHeight: scale(24),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    tag: {
      minHeight: scale(20),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      paddingHorizontal: Spacing.md,
    },
    timeTag: {
      minHeight: scale(20),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: Colors.ocean[100],
      paddingHorizontal: Spacing.md,
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
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
    },
    prizeTagText: {
      color: Colors.orange[500],
    },
    metaStrong: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.mediumSize,
    },
    title: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      lineHeight: Math.round(Fonts.bigSize * 1.36),
      marginBottom: Spacing.lg,
    },
    description: {
      maxWidth: scale(320),
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.25),
      marginBottom: Spacing.xl,
    },
    metaList: {
      gap: Spacing.md,
      marginBottom: Spacing.xl2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    metaText: {
      flex: 1,
      color: Colors.neutral[500],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
    },
    linkRow: {
      minHeight: scale(30),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.xl2,
    },
    linkText: {
      flex: 1,
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
      textDecorationLine: 'underline',
    },
    photoList: {
      gap: Spacing.xs,
    },
    photoCard: {
      width: '100%',
      height: scale(172),
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.neutral[100],
    },
    photoPlaceholder: {
      width: '100%',
      height: scale(172),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.xl2,
      backgroundColor: withOpacity(Colors.neutral[100], 0.72),
    },
    photoLabel: {
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.minorSize,
      marginTop: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
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
      fontSize: Fonts.mediumSize,
      textAlign: 'center',
    },
  });
}
