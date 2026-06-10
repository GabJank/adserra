import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { onValue, ref, remove, update } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScaledTheme, withOpacity } from '@/constants/theme';
import { hasAdminAccess } from '@/src/access';
import { recordAdminAlert } from '@/src/alerts';
import { useAppData, type AssociationRequest, type UserProfile } from '@/src/app-data';
import { DeleteConfirmModal } from '@/src/components';
import { auth, database } from '@/src/firebase';

type ManagedUser = UserProfile & {
  id: string;
};

type UserStatus = 'admin' | 'associated' | 'blocked' | 'visitor';

function normalizeAssociationRequest(value: unknown): AssociationRequest | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const request = value as Partial<Record<keyof AssociationRequest, unknown>>;

  return {
    requestedAt: typeof request.requestedAt === 'string' ? request.requestedAt.trim() : '',
    respondedAt: typeof request.respondedAt === 'string' ? request.respondedAt.trim() : '',
    respondedBy: typeof request.respondedBy === 'string' ? request.respondedBy.trim() : '',
    status: typeof request.status === 'string' ? request.status.trim() : '',
  };
}

function getAssociationRequestStatus(user: ManagedUser) {
  return user.associationRequest?.status.trim().toLowerCase() ?? '';
}

function hasPendingAssociationRequest(user: ManagedUser) {
  return getAssociationRequestStatus(user) === 'pending';
}

function normalizeUser(value: unknown, id: string): ManagedUser | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const user = value as Partial<Record<keyof UserProfile, unknown>>;

  return {
    associationRequest: normalizeAssociationRequest(user.associationRequest),
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
      const firstPendingOrder = hasPendingAssociationRequest(firstUser) ? 0 : 1;
      const secondPendingOrder = hasPendingAssociationRequest(secondUser) ? 0 : 1;

      if (firstPendingOrder !== secondPendingOrder) {
        return firstPendingOrder - secondPendingOrder;
      }

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

  if (normalizedStatus === 'pending') {
    return 'pending';
  }

  return 'visitor';
}

function getAdminId() {
  return auth.currentUser?.uid ?? 'admin';
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
      const now = new Date().toISOString();
      await update(ref(database, `users/${user.id}`), {
        ...(status === 'associated'
          ? {
              associationRequest: {
                requestedAt: user.associationRequest?.requestedAt ?? '',
                respondedAt: now,
                respondedBy: getAdminId(),
                status: 'approved',
              },
            }
          : {}),
        since: status === 'associated' ? now : user.since || now,
        status,
      });

      await recordAdminAlert({
        description: `${user.name || user.id} teve o status alterado para ${getStatusLabel(status)}.`,
        path: `users/${user.id}/status`,
        severity: status === 'blocked' ? 'warning' : 'info',
        source: 'Usuários',
        targetId: user.id,
        title: 'Usuário atualizado',
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o usuário.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const acceptAssociationRequest = async (user: ManagedUser) => {
    if (!database || updatingUserId) {
      return;
    }

    if (user.id === currentUserId) {
      Alert.alert('Ação bloqueada', 'Você não pode alterar permissões da própria conta por aqui.');
      return;
    }

    setUpdatingUserId(user.id);

    try {
      const now = new Date().toISOString();

      await update(ref(database, `users/${user.id}`), {
        associationRequest: {
          requestedAt: user.associationRequest?.requestedAt ?? '',
          respondedAt: now,
          respondedBy: getAdminId(),
          status: 'approved',
        },
        since: now,
        status: 'associated',
      });

      await recordAdminAlert({
        description: `${user.name || user.id} teve a solicitação de associação aprovada.`,
        path: `users/${user.id}/associationRequest`,
        source: 'Usuários',
        targetId: user.id,
        title: 'Associação aprovada',
      });
    } catch (error) {
      console.error('Failed to accept association request:', error);
      Alert.alert('Erro', 'Não foi possível aceitar a solicitação.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const denyAssociationRequest = async (user: ManagedUser) => {
    if (!database || updatingUserId) {
      return;
    }

    if (user.id === currentUserId) {
      Alert.alert('Ação bloqueada', 'Você não pode alterar permissões da própria conta por aqui.');
      return;
    }

    setUpdatingUserId(user.id);

    try {
      const now = new Date().toISOString();

      await update(ref(database, `users/${user.id}`), {
        associationRequest: {
          requestedAt: user.associationRequest?.requestedAt ?? '',
          respondedAt: now,
          respondedBy: getAdminId(),
          status: 'denied',
        },
        status: user.status || 'visitor',
      });

      await recordAdminAlert({
        description: `${user.name || user.id} teve a solicitação de associação recusada.`,
        path: `users/${user.id}/associationRequest`,
        severity: 'warning',
        source: 'Usuários',
        targetId: user.id,
        title: 'Associação recusada',
      });
    } catch (error) {
      console.error('Failed to deny association request:', error);
      Alert.alert('Erro', 'Não foi possível recusar a solicitação.');
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

    const userToDelete = pendingDeleteUser;
    const userId = userToDelete.id;

    setPendingDeleteUser(null);
    setUpdatingUserId(userId);

    try {
      await remove(ref(database, `users/${userId}`));

      await recordAdminAlert({
        description: `${userToDelete.name || userId} foi removido do sistema.`,
        path: `users/${userId}`,
        severity: 'warning',
        source: 'Usuários',
        targetId: userId,
        title: 'Usuário deletado',
      });
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
            const associationStatus = getAssociationRequestStatus(user);
            const isAssociationPending = associationStatus === 'pending';
            const isAssociationDenied = associationStatus === 'denied';
            const normalizedStatus = user.status.trim().toLowerCase();
            const statusTone = isAssociationPending ? 'pending' : getStatusTone(user.status);
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
                      statusTone === 'pending' && styles.statusChipPending,
                    ]}>
                    <Text
                      style={[
                        styles.statusChipText,
                        statusTone === 'admin' && styles.statusChipTextAdmin,
                        statusTone === 'blocked' && styles.statusChipBlockedText,
                        statusTone === 'pending' && styles.statusChipPendingText,
                      ]}>
                      {isCurrentUser ? 'Você' : isAssociationPending ? 'Pendente' : getStatusLabel(user.status)}
                    </Text>
                  </View>
                </View>

                {isAssociationPending ? (
                  <View style={styles.pendingRequestBox}>
                    <MaterialIcons name="pending-actions" size={18} color={Colors.ocean[600]} />
                    <Text style={styles.pendingRequestText}>Solicitação de associação aguardando análise.</Text>
                  </View>
                ) : null}

                {isAssociationDenied ? (
                  <View style={styles.pendingRequestBox}>
                    <MaterialIcons name="block" size={18} color="#B3261E" />
                    <Text style={styles.pendingRequestText}>Solicitação recusada. O usuário não pode pedir novamente.</Text>
                  </View>
                ) : null}

                <View style={styles.actionGrid}>
                  {isAssociationPending ? (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        disabled={isCurrentUser || isUpdating}
                        onPress={() => acceptAssociationRequest(user)}
                        style={[
                          styles.actionButton,
                          styles.actionButtonBlue,
                          (isCurrentUser || isUpdating) && styles.actionButtonDisabled,
                        ]}>
                        <MaterialIcons name="check-circle" size={16} color={Colors.ocean[600]} />
                        <Text style={styles.actionText}>Aceitar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.82}
                        disabled={isCurrentUser || isUpdating}
                        onPress={() => denyAssociationRequest(user)}
                        style={[
                          styles.actionButton,
                          styles.actionButtonWarning,
                          (isCurrentUser || isUpdating) && styles.actionButtonDisabled,
                        ]}>
                        <MaterialIcons name="cancel" size={16} color="#B3261E" />
                        <Text style={[styles.actionText, styles.actionTextDanger]}>Recusar</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

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
    statusChipPending: {
      backgroundColor: withOpacity(Colors.orange[500], 0.16),
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
    statusChipPendingText: {
      color: Colors.orange[500],
    },
    pendingRequestBox: {
      minHeight: scale(34),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[100],
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.md,
    },
    pendingRequestText: {
      flex: 1,
      color: Colors.neutral[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
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
