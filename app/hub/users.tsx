import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { onValue, ref, remove, update } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScaledTheme, withOpacity } from '@/constants/theme';
import { hasAdminAccess } from '@/src/access';
import { useAppData, type UserProfile } from '@/src/app-data';
import { DeleteConfirmModal } from '@/src/components';
import { auth, database } from '@/src/firebase';

type ManagedUser = UserProfile & {
  id: string;
};

type UserStatus = 'admin' | 'associated' | 'blocked' | 'visitor';

function normalizeUser(value: unknown, id: string): ManagedUser | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const user = value as Partial<Record<keyof UserProfile, unknown>>;

  return {
    birthday: typeof user.birthday === 'string' ? user.birthday.trim() : '',
    department: typeof user.department === 'string' ? user.department.trim() : '',
    id,
    name: typeof user.name === 'string' ? user.name.trim() : '',
    phone: typeof user.phone === 'string' ? user.phone.trim() : '',
    photoUrl: typeof user.photoUrl === 'string' ? user.photoUrl.trim() : '',
    since: typeof user.since === 'string' ? user.since.trim() : '',
    status: typeof user.status === 'string' ? user.status.trim() : '',
  };
}

function getManagedUsers(value: unknown) {
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([id, user]) => normalizeUser(user, id))
    .filter((user): user is ManagedUser => user !== null)
    .sort((firstUser, secondUser) => {
      const firstName = firstUser.name || firstUser.id;
      const secondName = secondUser.name || secondUser.id;

      return firstName.localeCompare(secondName, undefined, { sensitivity: 'base' });
    });
}

function getStatusLabel(status: string) {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === 'admin') {
    return 'Administrador';
  }

  if (normalizedStatus === 'associated') {
    return 'Associado';
  }

  if (normalizedStatus === 'blocked') {
    return 'Bloqueado';
  }

  return 'Visitante';
}

function getStatusTone(status: string) {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === 'admin') {
    return 'admin';
  }

  if (normalizedStatus === 'associated') {
    return 'associated';
  }

  if (normalizedStatus === 'blocked') {
    return 'blocked';
  }

  return 'visitor';
}

export default function UsersScreen() {
  const { userProfile } = useAppData();
  const isAdmin = hasAdminAccess(userProfile?.status);
  const currentUserId = auth.currentUser?.uid ?? '';
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<ManagedUser | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const scaledTheme = useScaledTheme();
  const { Colors } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  useEffect(() => {
    if (!isAdmin || !database) {
      setUsers([]);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);

    const usersRef = ref(database, 'users');

    return onValue(
      usersRef,
      (snapshot) => {
        setUsers(getManagedUsers(snapshot.val()));
        setIsLoaded(true);
      },
      (error) => {
        console.error('Users listener failed:', error);
        Alert.alert('Erro', 'Não foi possível carregar os usuários.');
        setUsers([]);
        setIsLoaded(true);
      }
    );
  }, [isAdmin]);

  const updateUserStatus = async (user: ManagedUser, status: UserStatus) => {
    if (!database || updatingUserId) {
      return;
    }

    if (user.id === currentUserId) {
      Alert.alert('Ação bloqueada', 'Você não pode alterar permissões da própria conta por aqui.');
      return;
    }

    setUpdatingUserId(user.id);

    try {
      await update(ref(database, `users/${user.id}`), {
        since: user.since || new Date().toISOString(),
        status,
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o usuário.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const deleteUser = async () => {
    if (!database || !pendingDeleteUser || updatingUserId) {
      return;
    }

    if (pendingDeleteUser.id === currentUserId) {
      setPendingDeleteUser(null);
      Alert.alert('Ação bloqueada', 'Você não pode deletar a própria conta por aqui.');
      return;
    }

    const userId = pendingDeleteUser.id;

    setPendingDeleteUser(null);
    setUpdatingUserId(userId);

    try {
      await remove(ref(database, `users/${userId}`));
    } catch (error) {
      console.error('Failed to delete user:', error);
      Alert.alert('Erro', 'Não foi possível deletar o usuário.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.restrictedState}>
        <MaterialIcons name="lock" size={42} color={Colors.ocean[300]} />
        <Text style={styles.restrictedTitle}>Acesso restrito</Text>
        <Text style={styles.restrictedDescription}>Somente administradores podem editar usuários.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.pageIntro}>
          <Text style={styles.title}>Editar{'\n'}Usuários</Text>
          <Text style={styles.subtitle}>Gerencie acesso, associação e permissões administrativas.</Text>
        </View>

        <View style={styles.userList}>
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            const normalizedStatus = user.status.trim().toLowerCase();
            const statusTone = getStatusTone(user.status);
            const isUpdating = updatingUserId === user.id;

            return (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userTopRow}>
                  <View style={styles.userAvatar}>
                    <MaterialIcons name="person" size={24} color={Colors.ocean[600]} />
                  </View>
                  <View style={styles.userTextBlock}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.name || 'Usuário sem nome'}
                    </Text>
                    <Text style={styles.userMeta} numberOfLines={1}>
                      {user.department || "Sem departamento informado"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusChip,
                      statusTone === 'admin' && styles.statusChipAdmin,
                      statusTone === 'associated' && styles.statusChipAssociated,
                      statusTone === 'blocked' && styles.statusChipBlocked,
                    ]}>
                    <Text
                      style={[
                        styles.statusChipText,
                        statusTone === 'admin' && styles.statusChipTextAdmin,
                        statusTone === 'blocked' && styles.statusChipBlockedText,
                      ]}>
                      {isCurrentUser ? 'Você' : getStatusLabel(user.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    disabled={isCurrentUser || normalizedStatus === 'associated' || isUpdating}
                    onPress={() => updateUserStatus(user, 'associated')}
                    style={[
                      styles.actionButton,
                      styles.actionButtonBlue,
                      (isCurrentUser || normalizedStatus === 'associated' || isUpdating) && styles.actionButtonDisabled,
                    ]}>
                    <MaterialIcons name="verified-user" size={16} color={Colors.ocean[600]} />
                    <Text style={styles.actionText}>Associado</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    disabled={isCurrentUser || normalizedStatus === 'visitor' || !normalizedStatus || isUpdating}
                    onPress={() => updateUserStatus(user, 'visitor')}
                    style={[
                      styles.actionButton,
                      styles.actionButtonBlue,
                      (isCurrentUser || normalizedStatus === 'visitor' || !normalizedStatus || isUpdating) &&
                        styles.actionButtonDisabled,
                    ]}>
                    <MaterialIcons name="person-outline" size={16} color={Colors.ocean[600]} />
                    <Text style={styles.actionText}>Visitante</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    disabled={isCurrentUser || normalizedStatus === 'admin' || isUpdating}
                    onPress={() => updateUserStatus(user, 'admin')}
                    style={[
                      styles.actionButton,
                      styles.actionButtonBlue,
                      (isCurrentUser || normalizedStatus === 'admin' || isUpdating) && styles.actionButtonDisabled,
                    ]}>
                    <MaterialIcons name="admin-panel-settings" size={16} color={Colors.ocean[600]} />
                    <Text style={styles.actionText}>Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    disabled={isCurrentUser || normalizedStatus === 'blocked' || isUpdating}
                    onPress={() => updateUserStatus(user, 'blocked')}
                    style={[
                      styles.actionButton,
                      styles.actionButtonWarning,
                      (isCurrentUser || normalizedStatus === 'blocked' || isUpdating) && styles.actionButtonDisabled,
                    ]}>
                    <MaterialIcons name="block" size={16} color="#B3261E" />
                    <Text style={[styles.actionText, styles.actionTextDanger]}>Bloquear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    disabled={isCurrentUser || isUpdating}
                    onPress={() => setPendingDeleteUser(user)}
                    style={[
                      styles.actionButton,
                      styles.actionButtonWarning,
                      (isCurrentUser || isUpdating) && styles.actionButtonDisabled,
                    ]}>
                    <MaterialIcons name="delete" size={16} color="#B3261E" />
                    <Text style={[styles.actionText, styles.actionTextDanger]}>Deletar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {isLoaded && users.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="group-off" size={40} color={Colors.ocean[300]} />
            <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
          </View>
        ) : null}

        {!isLoaded ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="groups" size={40} color={Colors.ocean[300]} />
            <Text style={styles.emptyTitle}>Carregando usuários</Text>
          </View>
        ) : null}
      </ScrollView>

      <DeleteConfirmModal
        message="Ao deletar o usuário, o registro dele será removido do sistema."
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={deleteUser}
        visible={Boolean(pendingDeleteUser)}
      />
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
    userList: {
      gap: Spacing.lg,
    },
    userCard: {
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.card,
      padding: Spacing.lg,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    userTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    userAvatar: {
      width: scale(38),
      height: scale(38),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: Colors.ocean[100],
    },
    userTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    userName: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.bigSize,
      marginBottom: Spacing.xs,
    },
    userMeta: {
      color: Colors.neutral[500],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.minorSize,
    },
    statusChip: {
      minHeight: scale(24),
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: Colors.neutral[100],
      paddingHorizontal: Spacing.md,
    },
    statusChipAdmin: {
      backgroundColor: Colors.ocean[600],
    },
    statusChipAssociated: {
      backgroundColor: Colors.ocean[100],
    },
    statusChipBlocked: {
      backgroundColor: withOpacity('#B3261E', 0.14),
    },
    statusChipText: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    statusChipTextAdmin: {
      color: Colors.fullWhite,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    statusChipBlockedText: {
      color: '#B3261E',
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    actionButton: {
      width: '47.8%',
      minHeight: scale(34),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      borderWidth: 1,
      borderRadius: CornerRadius.full,
      paddingHorizontal: Spacing.md,
    },
    actionButtonBlue: {
      borderColor: Colors.ocean[600],
      backgroundColor: Colors.card,
    },
    actionButtonWarning: {
      borderColor: '#B3261E',
      backgroundColor: Colors.card,
    },
    actionButtonDisabled: {
      opacity: 0.42,
    },
    actionText: {
      color: Colors.text,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    actionTextDanger: {
      color: '#B3261E',
    },
    emptyCard: {
      alignItems: 'center',
      borderRadius: CornerRadius.xl2,
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
