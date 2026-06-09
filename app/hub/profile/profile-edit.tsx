import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { updatePassword } from 'firebase/auth';
import { set, ref } from 'firebase/database';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors, useScaledTheme } from '@/constants/theme';
import { useAppData, type UserProfile } from '@/src/app-data';
import { auth, database } from '@/src/firebase';

type ProfileEditableField = 'phone' | 'department' | 'birthday';
type EditableField = ProfileEditableField | 'password' | 'status';

const fieldConfig: Record<
  EditableField,
  {
    keyboardType: 'default' | 'number-pad' | 'phone-pad';
    label: string;
    placeholder: string;
    title: string;
  }
> = {
  phone: {
    keyboardType: 'phone-pad',
    label: 'Telefone',
    placeholder: '+55 (54) 99999-9999',
    title: 'Alterar telefone',
  },
  department: {
    keyboardType: 'default',
    label: 'Departamento',
    placeholder: 'A preencher',
    title: 'Alterar departamento',
  },
  birthday: {
    keyboardType: 'number-pad',
    label: 'Aniversario',
    placeholder: 'DD/MM/AAAA',
    title: 'Alterar aniversario',
  },
  password: {
    keyboardType: 'default',
    label: 'Senha',
    placeholder: 'Nova senha',
    title: 'Alterar senha',
  },
  status: {
    keyboardType: 'default',
    label: 'Status da conta',
    placeholder: '',
    title: '',
  },
};

function getEditableField(field: unknown): EditableField {
  return field === 'phone' || field === 'department' || field === 'birthday' || field === 'password' || field === 'status'
    ? field
    : 'phone';
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).replace(/^55/, '').slice(0, 11);
  const areaCode = digits.slice(0, 2);
  const firstPart = digits.slice(2, 7);
  const secondPart = digits.slice(7, 11);

  if (!areaCode) {
    return '+55 ';
  }

  if (areaCode.length < 2) {
    return `+55 (${areaCode}`;
  }

  if (!firstPart) {
    return `+55 (${areaCode}) `;
  }

  if (!secondPart) {
    return `+55 (${areaCode}) ${firstPart}`;
  }

  return `+55 (${areaCode}) ${firstPart}-${secondPart}`;
}

function formatBirthday(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) {
    return day;
  }

  if (digits.length <= 4) {
    return `${day}/${month}`;
  }

  return `${day}/${month}/${year}`;
}

function formatFieldValue(field: EditableField, value: string) {
  if (field === 'phone') {
    return formatPhone(value);
  }

  if (field === 'birthday') {
    return formatBirthday(value);
  }

  return value;
}

function isProfileEditableField(field: EditableField): field is ProfileEditableField {
  return field === 'phone' || field === 'department' || field === 'birthday';
}

function getPasswordErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/requires-recent-login':
      return 'Por seguranca, entre novamente na conta antes de alterar a senha.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Sem conexao com a internet.';
    default:
      return 'Não foi possível alterar a senha.';
  }
}

function formatStatusTitle(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'admin') {
    return 'Administrador';
  }

  if (normalizedStatus === 'associated') {
    return 'Associado';
  }

  if (normalizedStatus === 'visitor') {
    return 'Visitante';
  }

  if (normalizedStatus === 'blocked') {
    return 'Bloqueado';
  }

  if (!status) {
    return 'Não associado';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function hasVerifiedStatus(status: string) {
  const normalizedStatus = status.toLowerCase();

  return normalizedStatus === 'admin' || normalizedStatus === 'associated';
}

function parseSinceDate(since: string) {
  if (!since) {
    return null;
  }

  const dateOnly = since.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const date = new Date(dateOnly ?? since);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatSinceDuration(since: string) {
  const sinceDate = parseSinceDate(since);

  if (!sinceDate) {
    return 'Data a definir';
  }

  const now = new Date();
  const monthDiff = (now.getFullYear() - sinceDate.getFullYear()) * 12 + now.getMonth() - sinceDate.getMonth();
  const adjustedMonthDiff = now.getDate() < sinceDate.getDate() ? monthDiff - 1 : monthDiff;

  if (adjustedMonthDiff >= 12) {
    const years = Math.floor(adjustedMonthDiff / 12);

    return years === 1 ? '1 ano' : `${years} anos`;
  }

  if (adjustedMonthDiff >= 1) {
    return adjustedMonthDiff === 1 ? '1 mes' : `${adjustedMonthDiff} meses`;
  }

  const dayDiff = Math.max(0, Math.floor((now.getTime() - sinceDate.getTime()) / 86400000));

  if (dayDiff >= 1) {
    return dayDiff === 1 ? '1 dia' : `${dayDiff} dias`;
  }

  return 'Hoje';
}

async function submitAssociationRequest() {
  return Promise.resolve();
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { field } = useLocalSearchParams<{ field?: string }>();
  const editableField = getEditableField(field);
  const config = fieldConfig[editableField];
  const { userProfile } = useAppData();
  const accountStatus = userProfile?.status || '';
  const hasAccountStatus = Boolean(accountStatus.trim());
  const statusTitle = hasAccountStatus ? `${formatStatusTitle(accountStatus)} há` : formatStatusTitle(accountStatus);
  const statusValue = hasAccountStatus ? formatSinceDuration(userProfile?.since || '') : 'Aguardando aprovação';
  const showStatusCheck = hasVerifiedStatus(accountStatus);
  const canRequestAssociation = editableField === 'status' && !showStatusCheck;
  const [value, setValue] = useState(() =>
    isProfileEditableField(editableField) ? formatFieldValue(editableField, userProfile?.[editableField] ?? '') : ''
  );
  const [confirmValue, setConfirmValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAssociationConfirmVisible, setIsAssociationConfirmVisible] = useState(false);
  const [isAssociationRequestRegistered, setIsAssociationRequestRegistered] = useState(false);
  const [isSubmittingAssociationRequest, setIsSubmittingAssociationRequest] = useState(false);
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid;

    if (!uid || !currentUser) {
      Alert.alert('Erro', 'Não foi possível localizar sua conta.');
      return;
    }

    setIsSaving(true);

    try {
      if (editableField === 'password') {
        if (value.length < 6) {
          Alert.alert('Senha inválida', 'A senha precisa ter pelo menos 6 caracteres.');
          return;
        }

        if (value !== confirmValue) {
          Alert.alert('Senhas diferentes', 'Confirme a nova senha corretamente.');
          return;
        }

        await updatePassword(currentUser, value);
        router.back();
        return;
      }

      if (!database) {
        Alert.alert('Erro', 'Não foi possível acessar o banco de dados.');
        return;
      }

      const profileField: keyof UserProfile = editableField;

      await set(ref(database, `users/${uid}/${profileField}`), value.trim());
      router.back();
    } catch (error) {
      console.error('Failed to update profile field:', error);
      Alert.alert('Erro', editableField === 'password' ? getPasswordErrorMessage(error) : 'Não foi possível salvar a alteração.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssociationRequest = async () => {
    setIsAssociationConfirmVisible(false);
    setIsSubmittingAssociationRequest(true);

    try {
      await submitAssociationRequest();
      setIsAssociationRequestRegistered(true);
    } catch (error) {
      console.error('Failed to submit association request:', error);
      Alert.alert('Erro', 'Não foi possível registrar a solicitação.');
    } finally {
      setIsSubmittingAssociationRequest(false);
    }
  };

  if (editableField === 'status' && isAssociationRequestRegistered) {
    return (
      <View style={styles.successContent}>
        <Text style={styles.successTitle}>Assinatura Registrada!</Text>
        <View style={styles.successIconWrap}>
          <MaterialIcons name="check" size={72} color={Colors.ocean[600]} />
        </View>
        <Text style={styles.successDescription}>
          Aguarde até 24 horas para o retorno da assinatura. Verifique sua caixa de e-mail para prosseguir.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{config.label}</Text>
        </View>

        <View style={[styles.card, editableField === 'status' && styles.statusCard]}>

         {config.title && (
            <Text style={styles.cardTitle}>{config.title}</Text>
          )}
          {editableField === 'password' ? (
            <>
              <View style={[styles.inputRow, styles.stackedInputRow]}>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setValue}
                  placeholder="Nova senha"
                  placeholderTextColor={Colors.neutral[500]}
                  secureTextEntry
                  style={styles.input}
                  value={value}
                />
                <MaterialIcons name="lock" size={18} color={Colors.neutral[500]} />
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setConfirmValue}
                  placeholder="Confirmar senha"
                  placeholderTextColor={Colors.neutral[500]}
                  secureTextEntry
                  style={styles.input}
                  value={confirmValue}
                />
                <MaterialIcons name="lock" size={18} color={Colors.neutral[500]} />
              </View>
            </>
          ) : editableField === 'status' ? (
            <View style={styles.statusRow}>
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle}>{statusTitle}</Text>
                <Text style={styles.statusValue}>{statusValue}</Text>
              </View>
              {showStatusCheck ? <MaterialIcons name="check-circle" size={22} color={Colors.ocean[600]} /> : null}
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                autoCapitalize="none"
                keyboardType={config.keyboardType}
                maxLength={editableField === 'phone' ? 19 : editableField === 'birthday' ? 10 : undefined}
                onChangeText={(nextValue) => setValue(formatFieldValue(editableField, nextValue))}
                placeholder={config.placeholder}
                placeholderTextColor={Colors.neutral[500]}
                style={styles.input}
                value={value}
              />
              <MaterialIcons name="edit" size={18} color={Colors.neutral[500]} />
            </View>
          )}
        </View>

        {canRequestAssociation ? (
          <TouchableOpacity
            disabled={isSubmittingAssociationRequest}
            onPress={() => setIsAssociationConfirmVisible(true)}
            style={[styles.card, styles.statusCard, styles.associationCard]}>
            <View style={styles.statusRow}>
              <View style={styles.statusTextBlock}>
                <View style={styles.associationTitleRow}>
                  <MaterialIcons name="business-center" size={24} color={Colors.ocean[600]} />
                  <Text style={styles.statusTitle}>Associar-se?</Text>
                </View>
                <Text style={styles.statusValue}>
                  Aproveite os inúmeros prêmios e eventos da ADSerra
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={32} color={Colors.neutral[500]} />
            </View>
          </TouchableOpacity>
        ) : null}

        {editableField !== 'status' ? (
          <TouchableOpacity activeOpacity={0.86} disabled={isSaving} onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveText}>{isSaving ? 'Salvando...' : 'Salvar alteracao'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsAssociationConfirmVisible(false)}
        transparent
        visible={isAssociationConfirmVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Tem certeza?</Text>
            <Text style={styles.confirmDescription}>
              Após assinar a ADSerra, terá cobranças recorrentes.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSubmittingAssociationRequest}
                onPress={() => setIsAssociationConfirmVisible(false)}
                style={styles.confirmButton}>
                <Text style={styles.confirmNoText}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSubmittingAssociationRequest}
                onPress={handleAssociationRequest}
                style={styles.confirmButton}>
                <Text style={styles.confirmYesText}>{isSubmittingAssociationRequest ? 'Enviando...' : 'Sim'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flex: 1,
      padding: Spacing.xl,
    },
    chip: {
      alignSelf: 'flex-start',
      minHeight: scale(18),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: Colors.ocean[100],
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.lg,
    },
    chipText: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    card: {
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.card,
      padding: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.06,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    statusCard: {
      minHeight: scale(90),
      justifyContent: 'center',
      borderLeftWidth: 2,
      borderColor: Colors.ocean[600],
      borderRadius: CornerRadius.xl5,
      padding: Spacing.xl2,
    },
    cardTitle: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
      marginBottom: Spacing.xl,
    },
    inputRow: {
      minHeight: scale(30),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.ocean[100],
    },
    stackedInputRow: {
      marginBottom: Spacing.lg,
    },
    input: {
      flex: 1,
      color: Colors.neutral[600],
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      padding: 0,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.lg,
    },
    statusTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: Spacing.xl2,
    },
    statusTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.subtitle,
    },
    statusValue: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
    associationCard: {
      marginTop: Spacing.lg,
    },
    associationTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    saveButton: {
      minHeight: scale(48),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.ocean[600],
      marginTop: Spacing.xl,
    },
    saveText: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
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
      color: Colors.orange[500],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
    successContent: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: Spacing.xl3,
      paddingTop: Spacing.xl3,
    },
    successTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.subtitle,
      marginBottom: Spacing.xl6,
      textAlign: 'center',
    },
    successIconWrap: {
      width: scale(112),
      height: scale(112),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: Colors.ocean[600],
      borderRadius: CornerRadius.full,
      marginBottom: Spacing.xl5,
    },
    successDescription: {
      maxWidth: scale(320),
      color: Colors.neutral[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.subtitle,
      lineHeight: Math.round(Fonts.subtitle * 1.24),
      textAlign: 'center',
    },
  });
}
