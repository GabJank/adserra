import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { onValue, ref } from 'firebase/database';
import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useScaledTheme } from '@/constants/theme';
import { hasAdminAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';
import { database } from '@/src/firebase';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type MetricCard = {
  icon: MaterialIconName;
  label: string;
  tone: 'blue' | 'red';
  value: string;
};

type UserCounts = {
  associated: number;
  visitors: number;
};

type UserReport = {
  associatedSeries: number[];
  chartMax: number;
  counts: UserCounts;
  totalSeries: number[];
  visitorSeries: number[];
  xLabels: string[];
  yLabels: string[];
};

const emptyUserCounts: UserCounts = {
  associated: 0,
  visitors: 0,
};

function isAssociatedStatus(status: string) {
  return status === 'associated' || status === 'admin';
}

function parseSinceDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return new Date();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getMonthBuckets() {
  const now = new Date();

  return Array.from({ length: 8 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - 7 + index, 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      endDate,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(monthDate).replace('.', ''),
    };
  });
}

function getUserReport(value: unknown): UserReport {
  const monthBuckets = getMonthBuckets();
  const emptySeries = monthBuckets.map(() => 0);

  if (!value || typeof value !== 'object') {
    return {
      associatedSeries: emptySeries,
      chartMax: 4,
      counts: emptyUserCounts,
      totalSeries: emptySeries,
      visitorSeries: emptySeries,
      xLabels: monthBuckets.map((bucket) => bucket.label),
      yLabels: ['4', '3', '2', '1', '0'],
    };
  }

  const users = Object.values(value as Record<string, unknown>).map((userValue) => {
    const user = userValue && typeof userValue === 'object' ? (userValue as { since?: unknown; status?: unknown }) : null;
    const status = typeof user?.status === 'string' ? user.status.trim().toLowerCase() : '';

    return {
      associated: isAssociatedStatus(status),
      sinceDate: parseSinceDate(user?.since),
    };
  });

  const associatedSeries = monthBuckets.map((bucket) =>
    users.filter((user) => user.associated && user.sinceDate.getTime() <= bucket.endDate.getTime()).length
  );
  const visitorSeries = monthBuckets.map((bucket) =>
    users.filter((user) => !user.associated && user.sinceDate.getTime() <= bucket.endDate.getTime()).length
  );
  const totalSeries = associatedSeries.map((associatedCount, index) => associatedCount + visitorSeries[index]);
  const highestValue = Math.max(1, ...totalSeries, ...associatedSeries, ...visitorSeries);
  const chartMax = Math.max(4, Math.ceil(highestValue / 4) * 4);

  return {
    associatedSeries,
    chartMax,
    counts: {
      associated: associatedSeries.at(-1) ?? 0,
      visitors: visitorSeries.at(-1) ?? 0,
    },
    totalSeries,
    visitorSeries,
    xLabels: monthBuckets.map((bucket) => bucket.label),
    yLabels: Array.from({ length: 5 }, (_, index) => String(Math.round(chartMax - (chartMax / 4) * index))),
  };
}

function formatUpdateTime(date: Date | null) {
  if (!date) {
    return '--:--';
  }

  return `Hoje, ${new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`;
}

function getChartPoints(values: number[], chartWidth: number, chartHeight: number, chartMax: number) {
  const step = chartWidth / (values.length - 1);

  return values.map((value, index) => ({
    x: step * index,
    y: chartHeight - (value / chartMax) * chartHeight,
  }));
}

function LineSegments({
  chartMax,
  chartHeight,
  chartWidth,
  color,
  values,
}: {
  chartMax: number;
  chartHeight: number;
  chartWidth: number;
  color: string;
  values: number[];
}) {
  const scaledTheme = useScaledTheme();
  const { CornerRadius, scale } = scaledTheme;
  const lineThickness = scale(2);
  const dotSize = scale(4);
  const points = getChartPoints(values, chartWidth, chartHeight, chartMax);

  return (
    <>
      {points.slice(0, -1).map((point, index) => {
        const nextPoint = points[index + 1];
        const deltaX = nextPoint.x - point.x;
        const deltaY = nextPoint.y - point.y;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);

        return (
          <View
            key={`${color}-${index}`}
            style={{
              position: 'absolute',
              left: (point.x + nextPoint.x) / 2 - length / 2,
              top: (point.y + nextPoint.y) / 2 - lineThickness / 2,
              width: length,
              height: lineThickness,
              borderRadius: CornerRadius.full,
              backgroundColor: color,
              transform: [{ rotate: `${angle}rad` }],
            }}
          />
        );
      })}

      {points.map((point, index) => (
        <View
          key={`${color}-dot-${index}`}
          style={{
            position: 'absolute',
            left: point.x - dotSize / 2,
            top: point.y - dotSize / 2,
            width: dotSize,
            height: dotSize,
            borderRadius: CornerRadius.full,
            backgroundColor: color,
          }}
        />
      ))}
    </>
  );
}

export default function ReportsScreen() {
  const { width } = useWindowDimensions();
  const { userProfile } = useAppData();
  const isAdmin = hasAdminAccess(userProfile?.status);
  const [userReport, setUserReport] = useState<UserReport>(() => getUserReport(null));
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const scaledTheme = useScaledTheme();
  const { Colors, Heading, Spacing, scale } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const chartWidth = Math.max(
    scale(210),
    Math.floor(width - Spacing.xl * 2 - Spacing.lg * 2 - scale(26) - Spacing.xs)
  );
  const chartHeight = scale(142);
  const chartBandWidth = chartWidth / userReport.xLabels.length;
  const metrics = useMemo<MetricCard[]>(
    () => [
      { icon: 'article', label: 'TOTAL DE DOWNLOADS', tone: 'blue', value: '0' },
      { icon: 'update', label: 'ÚLTIMA ATUALIZAÇÃO', tone: 'blue', value: formatUpdateTime(lastUpdatedAt) },
      { icon: 'groups', label: 'ASSOCIADOS', tone: 'blue', value: String(userReport.counts.associated) },
      { icon: 'groups', label: 'VISITANTES', tone: 'red', value: String(userReport.counts.visitors) },
    ],
    [lastUpdatedAt, userReport.counts.associated, userReport.counts.visitors]
  );

  useEffect(() => {
    if (!isAdmin || !database) {
      setUserReport(getUserReport(null));
      setLastUpdatedAt(null);
      return;
    }

    const usersRef = ref(database, 'users');

    return onValue(
      usersRef,
      (snapshot) => {
        setUserReport(getUserReport(snapshot.val()));
        setLastUpdatedAt(new Date());
      },
      (error) => {
        console.error('Users report listener failed:', error);
        setUserReport(getUserReport(null));
        setLastUpdatedAt(null);
      }
    );
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <View style={styles.restrictedState}>
        <MaterialIcons name="lock" size={42} color={Colors.ocean[300]} />
        <Text style={styles.restrictedTitle}>Acesso restrito</Text>
        <Text style={styles.restrictedDescription}>Somente administradores podem acessar relatórios.</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.pageIntro}>
        <Text style={styles.title}>Relatórios{'\n'}Administrativos</Text>
        <Text style={styles.subtitle}>Verifique todos os dados relevantes em relação aos associados.</Text>
      </View>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => {
          const isRed = metric.tone === 'red';
          const accentColor = isRed ? '#B3261E' : Colors.ocean[600];

          return (
            <View key={metric.label} style={styles.metricCard}>
              <MaterialIcons name={metric.icon} size={22} color={accentColor} />
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={[styles.metricValue, isRed && styles.metricValueDanger]}>{metric.value}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBox}>
            <MaterialIcons name="groups" size={Heading.h5} color={Colors.ocean[600]} />
          </View>
          <Text style={styles.sectionTitle}>GRÁFICO DE USUÁRIOS</Text>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartBody}>
            <View style={[styles.yAxis, { height: chartHeight }]}>
              {userReport.yLabels.map((label) => (
                <Text key={label} style={styles.axisLabel}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.chartAreaWrap}>
              <View style={[styles.chartArea, { width: chartWidth, height: chartHeight }]}>
                {userReport.xLabels.map((label, index) => (
                  <View
                    key={label}
                    style={[
                      styles.chartBand,
                      {
                        left: index * chartBandWidth,
                        width: chartBandWidth,
                        backgroundColor: index % 2 === 0 ? Colors.fullWhite : Colors.neutral[100],
                      },
                    ]}
                  />
                ))}

                <LineSegments
                  chartHeight={chartHeight}
                  chartMax={userReport.chartMax}
                  chartWidth={chartWidth}
                  color={Colors.ocean[500]}
                  values={userReport.totalSeries}
                />
                <LineSegments
                  chartHeight={chartHeight}
                  chartMax={userReport.chartMax}
                  chartWidth={chartWidth}
                  color="#18B5BD"
                  values={userReport.associatedSeries}
                />
                <LineSegments
                  chartHeight={chartHeight}
                  chartMax={userReport.chartMax}
                  chartWidth={chartWidth}
                  color="#B3261E"
                  values={userReport.visitorSeries}
                />
              </View>

              <View style={[styles.xAxis, { width: chartWidth }]}>
                {userReport.xLabels.map((label) => (
                  <Text key={label} style={styles.axisLabel}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.ocean[500] }]} />
              <Text style={styles.legendText}>Total</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#18B5BD' }]} />
              <Text style={styles.legendText}>Associados</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#B3261E' }]} />
              <Text style={styles.legendText}>Visitantes</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      padding: Spacing.xl,
      paddingBottom: Spacing.xl6,
    },
    pageIntro: {
      gap: Spacing.lg,
      marginBottom: Spacing.xl2,
    },
    title: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Heading.h6,
      lineHeight: Math.round(Heading.h5 * 1.12),
      marginBottom: Spacing.md,
    },
    subtitle: {
      maxWidth: scale(250),
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.18),
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.lg,
      marginBottom: Spacing.xl2,
    },
    metricCard: {
      width: '47.6%',
      minHeight: scale(104),
      justifyContent: 'space-between',
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.neutral[100],
      padding: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.1,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    metricLabel: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
      lineHeight: Math.round(Fonts.minorSize * 1.16),
    },
    metricValue: {
      color: Colors.ocean[500],
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.title,
    },
    metricValueDanger: {
      color: '#B3261E',
    },
    chartSection: {
      gap: Spacing.lg,
    },
    sectionHeader: {
      minHeight: scale(34),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    sectionIconBox: {
      width: scale(32),
      height: scale(32),
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
    chartCard: {
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.card,
      padding: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    chartBody: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    chartLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.lg,
      marginTop: Spacing.lg,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    legendDot: {
      width: scale(8),
      height: scale(8),
      borderRadius: CornerRadius.full,
    },
    legendText: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    yAxis: {
      width: scale(26),
      justifyContent: 'space-between',
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.xs,
    },
    chartAreaWrap: {
      flex: 1,
      minWidth: 0,
    },
    chartArea: {
      overflow: 'hidden',
      borderRadius: CornerRadius.xs,
      backgroundColor: Colors.card,
    },
    chartBand: {
      position: 'absolute',
      top: 0,
      bottom: 0,
    },
    xAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: Spacing.xs,
    },
    axisLabel: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interBold,
      fontSize: scale(5),
    },
    restrictedState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    restrictedTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    restrictedDescription: {
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      textAlign: 'center',
    },
  });
}
