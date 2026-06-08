import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ComponentProps, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useScaledTheme } from '@/constants/theme';
import { hasAdminAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type MetricCard = {
  icon: MaterialIconName;
  label: string;
  tone: 'blue' | 'red';
  value: string;
};

const metrics: MetricCard[] = [
  { icon: 'article', label: 'TOTAL DE DOWNLOADS', tone: 'blue', value: '1284' },
  { icon: 'update', label: 'ÚLTIMA ATUALIZAÇÃO', tone: 'blue', value: 'Hoje, 08:30' },
  { icon: 'groups', label: 'ASSOCIADOS EM DIA', tone: 'blue', value: '50' },
  { icon: 'groups', label: 'ASSOCIADOS PENDENTES', tone: 'red', value: '20' },
];

const xLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const yLabels = ['8000', '7000', '6000', '5000', '4000', '3000', '2000', '1000'];
const blueSeries = [500, 2900, 2600, 4000, 3500, 5900, 5700, 6800];
const amberSeries = [5200, 6100, 4500, 2700, 2900, 1800, 1500, 1200];
const tealSeries = [6200, 7600, 5200, 2600, 4500, 2400, 3400, 2200];

function getChartPoints(values: number[], chartWidth: number, chartHeight: number) {
  const maxValue = 8000;
  const step = chartWidth / (values.length - 1);

  return values.map((value, index) => ({
    x: step * index,
    y: chartHeight - (value / maxValue) * chartHeight,
  }));
}

function LineSegments({
  chartHeight,
  chartWidth,
  color,
  values,
}: {
  chartHeight: number;
  chartWidth: number;
  color: string;
  values: number[];
}) {
  const scaledTheme = useScaledTheme();
  const { CornerRadius, scale } = scaledTheme;
  const lineThickness = scale(2);
  const dotSize = scale(4);
  const points = getChartPoints(values, chartWidth, chartHeight);

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
  const scaledTheme = useScaledTheme();
  const { Colors, Heading, Spacing, scale } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const chartWidth = Math.max(
    scale(210),
    Math.floor(width - Spacing.xl * 2 - Spacing.lg * 2 - scale(26) - Spacing.xs)
  );
  const chartHeight = scale(142);
  const chartBandWidth = chartWidth / xLabels.length;

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
              {yLabels.map((label) => (
                <Text key={label} style={styles.axisLabel}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.chartAreaWrap}>
              <View style={[styles.chartArea, { width: chartWidth, height: chartHeight }]}>
                {xLabels.map((label, index) => (
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

                <LineSegments chartHeight={chartHeight} chartWidth={chartWidth} color={Colors.ocean[500]} values={blueSeries} />
                <LineSegments chartHeight={chartHeight} chartWidth={chartWidth} color="#E1A300" values={amberSeries} />
                <LineSegments chartHeight={chartHeight} chartWidth={chartWidth} color="#18B5BD" values={tealSeries} />
              </View>

              <View style={[styles.xAxis, { width: chartWidth }]}>
                {xLabels.map((label) => (
                  <Text key={label} style={styles.axisLabel}>
                    {label}
                  </Text>
                ))}
              </View>
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
