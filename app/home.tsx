import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { get, onValue, ref } from 'firebase/database';

import { Colors, CornerRadius, useScaledTheme } from '@/constants/theme';
import { AppHeader, AppTabBar } from '@/src/components';
import { auth, database } from '@/src/firebase';

const calendarDays = [
  ['29', '30', '31', '01', '02', '03', '04'],
  ['05', '06', '07', '08', '09', '10', '11'],
  ['12', '13', '14', '15', '16', '17', '18'],
  ['19', '20', '21', '22', '23', '24', '25'],
  ['26', '27', '28', '29', '30', '01', '02'],
];

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Professor';
}

export default function HomeScreen() {
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const { Heading } = scaledTheme;
  const fallbackProfessorName = getFirstName(auth.currentUser?.displayName || 'Professor');
  const [professorName, setProfessorName] = useState(fallbackProfessorName);

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid || !database) {
      setProfessorName(fallbackProfessorName);
      return;
    }

    const professorNameRef = ref(database, `users/${uid}/name`);

    get(professorNameRef)
      .catch((error) => {
        console.error('Failed to fetch initial professor name:', error.code, error.message);
      });

    return onValue(
      professorNameRef,
      (snapshot) => {
        const name = snapshot.val();

        setProfessorName(typeof name === 'string' && name.trim() ? getFirstName(name) : fallbackProfessorName);
      },
      (error) => {
        const errorCode = 'code' in error ? error.code : 'unknown';

        console.error('Professor name listener failed:', errorCode, error.message);
        setProfessorName(fallbackProfessorName);
      }
    );
  }, [fallbackProfessorName]);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.greeting}>
          <Text style={styles.greetingSmall}>Bom dia,</Text>
          <Text style={styles.greetingName}>{`${professorName}!`}</Text>
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
          <TouchableOpacity>
            <Text style={styles.seeMore}>Ver mais</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.newsCard}>
          <View style={styles.newsImagePlaceholder}>
            <MaterialIcons name="image" size={Heading.h1} color={Colors.ocean[200]} />
          </View>
          <Text style={styles.newsTitle}>
            Lorem ipsum dolor sit amet, consectetur...
          </Text>
          <Text style={styles.newsDescription}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vitae risus sed tellus ultrices scelerisque eu at augue. Maecenas ex odio...
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

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarDate}>22 de Abril, 2026</Text>
            <View style={styles.calendarActions}>
              <TouchableOpacity>
                <MaterialIcons name="chevron-left" size={Heading.h2} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity>
                <MaterialIcons name="chevron-right" size={Heading.h2} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekRow}>
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
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
      </View>

      <AppTabBar activeTab="home" />
    </SafeAreaView>
  );
}

function createStyles({ Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
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
    },
    selectedDayCell: {
      backgroundColor: Colors.ocean[500],
    },
    eventDayCell: {
      backgroundColor: Colors.orange[200],
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
  });
}
