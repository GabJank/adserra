import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScaledTheme } from '@/constants/theme';

export type DeleteConfirmModalProps = {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  visible: boolean;
};

export function DeleteConfirmModal({
  message,
  onCancel,
  onConfirm,
  title = 'Tem certeza?',
  visible,
}: DeleteConfirmModalProps) {
  const styles = createStyles(useScaledTheme());

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmDescription}>{message}</Text>

          <View style={styles.confirmActions}>
            <TouchableOpacity activeOpacity={0.8} onPress={onCancel} style={styles.confirmButton}>
              <Text style={styles.confirmNoText}>Não</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={onConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmYesText}>Sim</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
      paddingHorizontal: Spacing.xl2,
    },
    confirmDialog: {
      width: '100%',
      maxWidth: scale(360),
      borderRadius: CornerRadius.xl3,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.xl3,
      paddingTop: Spacing.xl3,
      paddingBottom: Spacing.lg,
    },
    confirmTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      marginBottom: Spacing.xl2,
      textAlign: 'center',
    },
    confirmDescription: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.28),
      marginBottom: Spacing.xl3,
      textAlign: 'center',
    },
    confirmActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.xl2,
    },
    confirmButton: {
      minHeight: scale(32),
      justifyContent: 'center',
      paddingHorizontal: Spacing.xs,
    },
    confirmNoText: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
    confirmYesText: {
      color: '#B3261E',
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
  });
}
