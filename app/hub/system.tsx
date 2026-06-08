import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { type ComponentProps, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScaledTheme } from '@/constants/theme';
import { hasAdminAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type LogItem = {
  detail: string;
  title: string;
};

type UtilityItem = {
  icon: MaterialIconName;
  title: string;
};

const logs: LogItem[] = [
  { title: 'Tentativa Falha de Login', detail: 'IP: 192.168.1.104  •  2m ago' },
  { title: 'Usuário atualizado', detail: 'Admin_01  •  15m ago' },
  { title: 'Evento_01 atualizado', detail: 'Evento_01  •  30m ago' },
];

const utilities: UtilityItem[] = [
  { icon: 'file-download', title: 'Exportar histórico de auditoria' },
  { icon: 'cloud-download', title: 'Forçar atualização remota com a nuvem' },
];

export default function SystemScreen() {
  const router = useRouter();
  const { userProfile } = useAppData();
  const isAdmin = hasAdminAccess(userProfile?.status);
  const scaledTheme = useScaledTheme();
  const { Colors, Heading } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  if (!isAdmin) {
    return (
      <View style={styles.restrictedState}>
        <MaterialIcons name="lock" size={42} color={Colors.ocean[300]} />
        <Text style={styles.restrictedTitle}>Acesso restrito</Text>
        <Text style={styles.restrictedDescription}>Somente administradores podem acessar configurações do sistema.</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.pageIntro}>
        <Text style={styles.title}>Configuração do{'\n'}Sistema</Text>
        <Text style={styles.subtitle}>
          Controle, exclua e dê permissões a usuários do sistema, além de ver logs e erros.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <MaterialIcons name="security" size={Heading.h5} color={Colors.ocean[600]} />
        </View>
        <Text style={styles.sectionTitle}>PERMISSÕES DO SISTEMA</Text>
      </View>

      <View style={styles.permissionCard}>
        <Text style={styles.permissionDescription}>
          Permita usuários de sua escolha a terem poderes administrativos ou bloqueie de usar a plataforma.
        </Text>
        <TouchableOpacity activeOpacity={0.86} onPress={() => router.push('/hub/users')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Editar usuários</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <MaterialIcons name="terminal" size={Heading.h5} color={Colors.ocean[600]} />
        </View>
        <Text style={styles.sectionTitle}>LOGS DE SEGURANÇA</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={() => undefined} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>Ver mais</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logList}>
        {logs.map((item) => (
          <TouchableOpacity key={item.title} activeOpacity={0.86} onPress={() => undefined} style={styles.logCard}>
            <View style={styles.logAccent} />
            <View style={styles.logTextBlock}>
              <Text style={styles.logTitle}>{item.title}</Text>
              <Text style={styles.logDetail}>{item.detail}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={26} color={Colors.neutral[500]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <MaterialIcons name="file-download" size={Heading.h5} color={Colors.ocean[600]} />
        </View>
        <Text style={styles.sectionTitle}>UTILIDADES</Text>
      </View>

      <View style={styles.utilityList}>
        {utilities.map((item) => (
          <TouchableOpacity key={item.title} activeOpacity={0.86} onPress={() => undefined} style={styles.utilityCard}>
            <MaterialIcons name={item.icon} size={22} color={Colors.ocean[600]} />
            <Text style={styles.utilityText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
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
      marginBottom: Spacing.xl2,
    },
    title: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Heading.h6,
      lineHeight: Math.round(Heading.h6 * 1.14),
      marginBottom: Spacing.lg,
    },
    subtitle: {
      maxWidth: scale(310),
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.2),
    },
    sectionHeader: {
      minHeight: scale(36),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
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
      flex: 1,
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    sectionAction: {
      minHeight: scale(28),
      justifyContent: 'center',
      paddingHorizontal: Spacing.xs,
    },
    sectionActionText: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    permissionCard: {
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.card,
      padding: Spacing.lg,
      marginBottom: Spacing.xl2,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    permissionDescription: {
      color: Colors.neutral[500],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.18),
      marginBottom: Spacing.xl,
    },
    primaryButton: {
      minHeight: scale(44),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[500],
    },
    primaryButtonText: {
      color: Colors.ocean[100],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
    logList: {
      gap: Spacing.lg,
      marginBottom: Spacing.xl2,
    },
    logCard: {
      minHeight: scale(58),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      borderRadius: CornerRadius.lg,
      backgroundColor: Colors.card,
      paddingRight: Spacing.md,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    logAccent: {
      alignSelf: 'stretch',
      width: scale(6),
      borderTopLeftRadius: CornerRadius.lg,
      borderBottomLeftRadius: CornerRadius.lg,
      backgroundColor: Colors.ocean[500],
      marginVertical: Spacing.sm,
      marginLeft: Spacing.sm,
    },
    logTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: Spacing.xs,
    },
    logTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.mediumSize,
    },
    logDetail: {
      color: Colors.neutral[500],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.minorSize,
    },
    utilityList: {
      gap: Spacing.lg,
    },
    utilityCard: {
      minHeight: scale(44),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      borderRadius: CornerRadius.lg,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    utilityText: {
      flex: 1,
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.mediumSize,
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
