import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, useScaledTheme, withOpacity } from '@/constants/theme';
import { useAppData } from '@/src/app-data';
import { type NewsItem } from '@/src/news';

type NewsFilterKey = 'all' | 'fsg' | 'faculdades' | 'adserra' | 'brasil' | 'serra' | 'educacao';

const filters: { key: NewsFilterKey; label: string; terms: string[] }[] = [
  { key: 'all', label: 'Todas as notícias', terms: [] },
  { key: 'fsg', label: 'FSG', terms: ['fsg', 'serra gaucha'] },
  { key: 'faculdades', label: 'Faculdades', terms: ['faculdade', 'faculdades', 'universidade'] },
  { key: 'adserra', label: 'ADSerra', terms: ['adserra', 'ads'] },
  { key: 'brasil', label: 'Brasil', terms: ['brasil'] },
  { key: 'serra', label: 'Serra', terms: ['serra', 'caxias'] },
  { key: 'educacao', label: 'Educação', terms: ['educacao', 'educacional', 'ensino'] },
];

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getNewsSearchText(item: NewsItem) {
  return normalizeSearchText([item.source, item.title, item.description, item.url].filter(Boolean).join(' '));
}

function getVisibleNews(news: NewsItem[], activeFilter: NewsFilterKey) {
  const selectedFilter = filters.find((filter) => filter.key === activeFilter);

  if (!selectedFilter || selectedFilter.key === 'all') {
    return news;
  }

  return news.filter((item) => {
    const searchText = getNewsSearchText(item);

    return selectedFilter.terms.some((term) => searchText.includes(term));
  });
}

export default function NewsScreen() {
  const router = useRouter();
  const { isNewsLoaded, news } = useAppData();
  const [activeFilter, setActiveFilter] = useState<NewsFilterKey>('all');
  const visibleNews = useMemo(() => getVisibleNews(news, activeFilter), [activeFilter, news]);
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  const renderNewsList = () => {
    if (visibleNews.length > 0) {
      return (
        <View style={styles.newsList}>
          {visibleNews.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.86}
              onPress={() => router.push({ pathname: '/hub/detail', params: { id: item.id, type: 'news' } })}
              style={styles.newsCard}>
              <View style={styles.cardLayout}>
                <View style={styles.sourceBadge}>
                  <Image
                    source={require('@/assets/images/ads.png')}
                    style={styles.sourceLogo}
                    contentFit="contain"
                  />
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.sourceName} numberOfLines={1}>
                    {item.url ?? item.source}
                  </Text>
                  <Text style={styles.description} numberOfLines={4}>
                    {item.description || 'Sem descrição cadastrada.'}
                  </Text>

                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.newsImage} contentFit="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialIcons name="image" size={52} color={Colors.ocean[200]} />
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <Text style={styles.newsTitle} numberOfLines={1}>
                      {item.title || 'Notícia sem titulo'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={30} color={Colors.neutral[500]} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <MaterialIcons name="article" size={42} color={Colors.ocean[300]} />
        <Text style={styles.emptyTitle}>
          {isNewsLoaded
            ? news.length > 0
              ? 'Nenhuma notícia neste filtro'
              : 'Nenhuma notícia cadastrada'
            : 'Carregando notícias'}
        </Text>
        <Text style={styles.emptyDescription}>
          {isNewsLoaded
            ? news.length > 0
              ? 'Escolha outro filtro para ver mais atualizações.'
              : 'Quando uma notícia for adicionada, ela aparece aqui automaticamente.'
            : 'Buscando atualizações cadastradas.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.pageIntro}>
        <Text style={styles.title}>Notícias e{'\n'}Novidades</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          Atualizações institucionais e anúncios acadêmicos da Serra Gaúcha e relacionados.
        </Text>
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
        {renderNewsList()}
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
    newsList: {
      gap: Spacing.xl2,
    },
    newsCard: {
      minHeight: scale(250),
      borderRadius: CornerRadius.xl3,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.xl,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    cardLayout: {
      flexDirection: 'row',
      gap: Spacing.lg,
    },
    sourceBadge: {
      width: scale(44),
      height: scale(44),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
    },
    sourceLogo: {
      width: scale(31),
      height: scale(32),
    },
    cardContent: {
      flex: 1,
      minWidth: 0,
    },
    sourceName: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
      marginBottom: Spacing.xs,
      textDecorationLine: 'underline',
    },
    description: {
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.minorSize,
      lineHeight: Math.round(Fonts.minorSize * 1.22),
    },
    newsImage: {
      width: '100%',
      height: scale(96),
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.neutral[100],
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
    },
    imagePlaceholder: {
      width: '100%',
      height: scale(96),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: withOpacity(Colors.neutral[100], 0.7),
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
    },
    cardFooter: {
      minHeight: scale(32),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    newsTitle: {
      flex: 1,
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
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
