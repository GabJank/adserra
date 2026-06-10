import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScaledTheme } from '@/constants/theme';
import { hasAdminAccess } from '@/src/access';
import { getAdminAlerts, recordAdminAlert, type AdminAlert } from '@/src/alerts';
import { useAppData } from '@/src/app-data';
import { database } from '@/src/firebase';

type LogDetailRow = {
  label: string;
  value: string;
};

function formatExactDate(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getLogDetailRows(log: AdminAlert | null): LogDetailRow[] {
  if (!log) {
    return [];
  }

  return [
    { label: 'ID', value: log.id },
    { label: 'Data', value: formatExactDate(log.createdAt) },
    { label: 'Tempo', value: log.timeLabel },
    { label: 'Severidade', value: log.severity },
    { label: 'Origem', value: log.source },
    { label: 'Admin responsável', value: log.actorId },
    { label: 'Usuário afetado', value: log.targetId },
    { label: 'IP', value: log.ip },
    { label: 'Dispositivo', value: log.device },
    { label: 'Código do erro', value: log.errorCode },
    { label: 'Caminho', value: log.path },
  ].filter((row): row is LogDetailRow => typeof row.value === 'string' && row.value.trim().length > 0);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPdfDate(date: Date | null) {
  return (
    formatExactDate(date) ??
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date())
  );
}

function buildAuditHistoryHtml(logs: AdminAlert[]) {
  const generatedAt = formatPdfDate(new Date());
  const rows = logs.length
    ? logs
        .map((log) => {
          const detailRows = getLogDetailRows(log)
            .map(
              (row) => `
                <tr>
                  <td class="label">${escapeHtml(row.label)}</td>
                  <td>${escapeHtml(row.value)}</td>
                </tr>
              `
            )
            .join('');

          return `
            <section class="log-card">
              <h2>${escapeHtml(log.title)}</h2>
              <p>${escapeHtml(log.description)}</p>
              <table>${detailRows}</table>
            </section>
          `;
        })
        .join('')
    : '<section class="empty">Nenhum log cadastrado em alerts.</section>';

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            color: #111;
            font-family: Arial, sans-serif;
            padding: 32px;
          }
          header {
            border-bottom: 2px solid #1f5f9c;
            margin-bottom: 24px;
            padding-bottom: 16px;
          }
          h1 {
            font-size: 24px;
            margin: 0 0 8px;
          }
          .meta {
            color: #595959;
            font-size: 12px;
          }
          .log-card {
            border: 1px solid #d2dfeb;
            border-radius: 12px;
            margin-bottom: 16px;
            padding: 16px;
            page-break-inside: avoid;
          }
          h2 {
            color: #194c7d;
            font-size: 16px;
            margin: 0 0 8px;
          }
          p {
            color: #595959;
            font-size: 12px;
            line-height: 1.4;
            margin: 0 0 12px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          td {
            border-top: 1px solid #e2e2e2;
            font-size: 11px;
            padding: 7px 4px;
            vertical-align: top;
          }
          .label {
            color: #194c7d;
            font-weight: 700;
            width: 34%;
          }
          .empty {
            color: #595959;
            font-size: 14px;
            padding: 24px 0;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Histórico de Auditoria</h1>
          <div class="meta">ADSerra • Gerado em ${escapeHtml(generatedAt)} • ${logs.length} log(s)</div>
        </header>
        ${rows}
      </body>
    </html>
  `;
}

export default function SystemScreen() {
  const router = useRouter();
  const { userProfile } = useAppData();
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<AdminAlert[]>([]);
  const [selectedSecurityLog, setSelectedSecurityLog] = useState<AdminAlert | null>(null);
  const [showAllSecurityLogs, setShowAllSecurityLogs] = useState(false);
  const isAdmin = hasAdminAccess(userProfile?.status);
  const scaledTheme = useScaledTheme();
  const { Colors, Heading } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const visibleSecurityLogs = showAllSecurityLogs ? securityLogs : securityLogs.slice(0, 3);
  const selectedLogDetails = getLogDetailRows(selectedSecurityLog);

  useEffect(() => {
    if (!isAdmin || !database) {
      setSecurityLogs([]);
      return;
    }

    const alertsRef = ref(database, 'alerts');

    return onValue(
      alertsRef,
      (snapshot) => {
        setSecurityLogs(getAdminAlerts(snapshot.val()));
      },
      (error) => {
        console.error('Security logs listener failed:', error);
        setSecurityLogs([]);
      }
    );
  }, [isAdmin]);

  const handleForceRefresh = async () => {
    if (!database || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const alertsSnapshot = await get(ref(database, 'alerts'));

      setSecurityLogs(getAdminAlerts(alertsSnapshot.val()));
      await recordAdminAlert({
        description: 'Dados do sistema foram atualizados manualmente pela tela de configuração.',
        path: 'alerts',
        source: 'Sistema',
        title: 'Atualização manual executada',
      });
    } catch (error) {
      console.error('Failed to force refresh system data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportHistory = async () => {
    if (!database || isExportingHistory) {
      return;
    }

    setIsExportingHistory(true);

    try {
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert('Compartilhamento indisponível', 'Não foi possível abrir as opções de envio neste dispositivo.');
        return;
      }

      const alertsSnapshot = await get(ref(database, 'alerts'));
      const latestLogs = getAdminAlerts(alertsSnapshot.val());

      setSecurityLogs(latestLogs);

      const generatedPdf = await Print.printToFileAsync({
        html: buildAuditHistoryHtml(latestLogs),
      });
      const fileName = `historico-auditoria-${new Date().toISOString().slice(0, 10)}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: generatedPdf.uri,
        to: fileUri,
      });

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Enviar histórico de auditoria',
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });

      await recordAdminAlert({
        description: `Histórico de auditoria exportado em PDF com ${latestLogs.length} log(s).`,
        path: 'alerts',
        source: 'Sistema',
        title: 'Histórico exportado',
      });
    } catch (error) {
      console.error('Failed to export audit history:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF dos logs.');
    } finally {
      setIsExportingHistory(false);
    }
  };

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
    <View style={styles.screen}>
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
        {securityLogs.length > 3 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAllSecurityLogs((currentValue) => !currentValue)}
            style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>{showAllSecurityLogs ? 'Ver menos' : 'Ver mais'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.logList, !showAllSecurityLogs && styles.logListCompact]}>
        {visibleSecurityLogs.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.86}
            onPress={() => setSelectedSecurityLog(item)}
            style={styles.logCard}>
            <View style={styles.logAccent} />
            <View style={styles.logTextBlock}>
              <Text style={styles.logTitle}>{item.title}</Text>
              <Text style={styles.logDetail}>
                {item.description}
                {item.timeLabel ? `  •  ${item.timeLabel}` : ''}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={26} color={Colors.neutral[500]} />
          </TouchableOpacity>
        ))}

        {visibleSecurityLogs.length === 0 ? (
          <View style={styles.emptyLogCard}>
            <MaterialIcons name="info" size={22} color={Colors.ocean[600]} />
            <Text style={styles.emptyLogText}>Nenhum log cadastrado em alerts.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <MaterialIcons name="file-download" size={Heading.h5} color={Colors.ocean[600]} />
        </View>
        <Text style={styles.sectionTitle}>UTILIDADES</Text>
      </View>

      <View style={styles.utilityList}>
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={isExportingHistory}
          onPress={handleExportHistory}
          style={[styles.utilityCard, isExportingHistory && styles.utilityCardDisabled]}>
          <MaterialIcons name="file-download" size={22} color={Colors.ocean[600]} />
            <Text style={styles.utilityText}>
              {isExportingHistory ? 'Gerando PDF...' : 'Exportar histórico de auditoria'}
            </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={isRefreshing}
          onPress={handleForceRefresh}
          style={[styles.utilityCard, isRefreshing && styles.utilityCardDisabled]}>
          <MaterialIcons name="cloud-download" size={22} color={Colors.ocean[600]} />
            <Text style={styles.utilityText}>
              {isRefreshing ? 'Atualizando dados...' : 'Forçar atualização remota com a nuvem'}
            </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedSecurityLog(null)}
        transparent
        visible={Boolean(selectedSecurityLog)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailDialog}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedSecurityLog?.title}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedSecurityLog(null)}
                style={styles.closeButton}>
                <MaterialIcons name="close" size={20} color={Colors.ocean[600]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailDescription}>{selectedSecurityLog?.description}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll}>
              <View style={styles.detailList}>
                {selectedLogDetails.map((item) => (
                  <View key={item.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setSelectedSecurityLog(null)}
              style={styles.detailAction}>
              <Text style={styles.detailActionText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    logListCompact: {
      minHeight: scale(58) * 3 + Spacing.lg * 2,
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
    emptyLogCard: {
      minHeight: scale(52),
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
    emptyLogText: {
      flex: 1,
      color: Colors.neutral[500],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.mediumSize,
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
    utilityCardDisabled: {
      opacity: 0.68,
    },
    utilityTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    utilityText: {
      flex: 1,
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.mediumSize,
    },
    utilityHint: {
      color: Colors.neutral[500],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.minorSize,
      marginTop: Spacing.xs,
    },
    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
      paddingHorizontal: Spacing.xl2,
    },
    detailDialog: {
      width: '100%',
      maxWidth: scale(360),
      maxHeight: '78%',
      borderRadius: CornerRadius.xl3,
      backgroundColor: Colors.card,
      padding: Spacing.xl2,
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    detailTitle: {
      flex: 1,
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
    },
    closeButton: {
      width: scale(32),
      height: scale(32),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: Colors.ocean[100],
    },
    detailDescription: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.28),
      marginBottom: Spacing.lg,
    },
    detailScroll: {
      maxHeight: scale(260),
    },
    detailList: {
      gap: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    detailRow: {
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.neutral[100],
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    detailLabel: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
      marginBottom: Spacing.xs,
    },
    detailValue: {
      color: Colors.text,
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.mediumSize,
    },
    detailAction: {
      minHeight: scale(40),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[600],
      marginTop: Spacing.lg,
    },
    detailActionText: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
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
