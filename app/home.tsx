import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, CornerRadius, Fonts, Heading, Spacing } from '@/constants/theme';
import { auth } from '@/src/firebase';

const calendarDays = [
  ['29', '30', '31', '01', '02', '03', '04'],
  ['05', '06', '07', '08', '09', '10', '11'],
  ['12', '13', '14', '15', '16', '17', '18'],
  ['19', '20', '21', '22', '23', '24', '25'],
  ['26', '27', '28', '29', '30', '01', '02'],
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const professorName = auth.currentUser?.displayName || 'Professor';

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={[styles.header, { minHeight: 58 + insets.top, paddingTop: insets.top }]}>
        <Image
          source={require('@/assets/svg/logo-adserra.svg')}
          style={styles.headerLogo}
          contentFit="contain"
          accessible
          accessibilityLabel="ADSerra"
        />
        <TouchableOpacity accessibilityLabel="Notificações" hitSlop={Spacing.lg}>
          <MaterialIcons name="notifications" size={Heading.h5} color={Colors.neutral[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.xl8 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <Text style={styles.greetingSmall}>Bom dia!</Text>
          <Text style={styles.greetingName}>{`{${professorName}}!`}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.9}>
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
            <MaterialIcons name="chevron-right" size={Heading.h2} color={Colors.card} style={styles.eventArrow} />
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionIconBox}>
              <MaterialIcons name="article" size={Heading.h5} color={Colors.neutral[800]} />
            </View>
            <Text style={styles.sectionTitle}>NOTÍCIAS</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.seeMore}>Ver mais</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.newsCard}>
          <View style={styles.newsImagePlaceholder}>
            <MaterialIcons name="image" size={Heading.h1} color={Colors.ocean[200]} />
          </View>
          <Text style={styles.newsTitle}>Lorem ipsum dolor sit amet, consectetur...</Text>
          <Text style={styles.newsDescription}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vitae risus sed tellus ultrices scelerisque eu at augue. Maecenas ex odio...
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionIconBox}>
              <MaterialIcons name="calendar-today" size={Heading.h5} color={Colors.neutral[800]} />
            </View>
            <Text style={styles.sectionTitle}>CALENDÁRIO DE EVENTOS</Text>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarDate}>22 de Abril, 2026</Text>
            <View style={styles.calendarActions}>
              <MaterialIcons name="chevron-left" size={Heading.h3} color={Colors.text} />
              <MaterialIcons name="chevron-right" size={Heading.h3} color={Colors.text} />
            </View>
          </View>

          <View style={styles.weekRow}>
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => (
              <Text key={day} style={styles.weekText}>{day}</Text>
            ))}
          </View>

          {calendarDays.map((week) => (
            <View key={week.join('-')} style={styles.daysRow}>
              {week.map((day) => {
                const isSelected = day === '22';
                const isEventDay = day === '23' || day === '30';

                return (
                  <View
                    key={`${week.join('-')}-${day}`}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedDayCell,
                      isEventDay && styles.eventDayCell,
                    ]}>
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText,
                        isEventDay && styles.eventDayText,
                      ]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, Spacing.xs) }]}>
        {[
          { icon: 'home', label: 'Home', active: true },
          { icon: 'photo-camera', label: '' },
          { icon: 'article', label: '' },
          { icon: 'calendar-today', label: '' },
          { icon: 'person', label: '' },
        ].map((item) => (
          <TouchableOpacity
            key={item.icon}
            activeOpacity={0.8}
            style={[styles.tabItem, item.active && styles.activeTabItem]}>
            <MaterialIcons
              name={item.icon as keyof typeof MaterialIcons.glyphMap}
              size={Heading.h4}
              color={item.active ? Colors.ocean[700] : Colors.neutral[500]}
            />
            {item.label ? <Text style={styles.tabLabel}>{item.label}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: Spacing.xs },
    shadowOpacity: 0.12,
    shadowRadius: CornerRadius.lg,
    elevation: Spacing.xs,
  },
  headerLogo: {
    width: 122,
    height: 32,
  },
  content: {
    padding: Spacing.xl2,
  },
  greeting: {
    marginBottom: Spacing.xl,
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
    minHeight: 175,
    borderRadius: CornerRadius.xl,
    backgroundColor: Colors.ocean[500],
    padding: Spacing.xl,
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
    marginBottom: Spacing.xl2,
  },
  eventIconBox: {
    width: 36,
    height: 36,
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
    marginBottom: Spacing.xl2,
  },
  eventDescription: {
    maxWidth: 220,
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
    minHeight: 54,
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
    width: 34,
    height: 34,
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
  newsImagePlaceholder: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CornerRadius.lg,
    backgroundColor: Colors.card,
    marginBottom: Spacing.lg,
  },
  newsTitle: {
    color: Colors.text,
    fontFamily: Fonts.manropeBold,
    fontSize: Fonts.bigSize,
    marginBottom: Spacing.lg,
  },
  newsDescription: {
    color: Colors.neutral[500],
    fontFamily: Fonts.inter,
    fontSize: Fonts.minorSize,
  },
  calendarCard: {
    borderRadius: CornerRadius.xl,
    backgroundColor: Colors.card,
    padding: Spacing.xl,
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
    marginBottom: Spacing.lg,
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
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  weekText: {
    width: 32,
    color: Colors.text,
    fontFamily: Fonts.interBold,
    fontSize: Fonts.minorSize,
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  dayCell: {
    width: 32,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CornerRadius.md,
  },
  selectedDayCell: {
    backgroundColor: Colors.ocean[500],
  },
  eventDayCell: {
    backgroundColor: Colors.royal.main,
  },
  dayText: {
    color: Colors.text,
    fontFamily: Fonts.interSemiBold,
    fontSize: Fonts.minorSize,
  },
  selectedDayText: {
    color: Colors.card,
  },
  eventDayText: {
    color: Colors.text,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.fieldBorder,
    paddingHorizontal: Spacing.xs,
  },
  tabItem: {
    width: 58,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CornerRadius.sm,
  },
  activeTabItem: {
    backgroundColor: Colors.ocean[200],
  },
  tabLabel: {
    color: Colors.ocean[700],
    fontFamily: Fonts.interSemiBold,
    fontSize: Fonts.minorSize,
    marginTop: Spacing.xs2,
  },
});
