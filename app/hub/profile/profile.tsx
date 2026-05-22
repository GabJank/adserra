import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, useScaledTheme } from '@/constants/theme';
import { setRememberMePreference } from '@/src/auth-storage';
import { useAppData } from '@/src/app-data';
import { auth, database } from '@/src/firebase';
import { hasSupabaseStorageConfig, uploadProfilePhoto } from '@/src/supabase-storage';

type ProfileRow = {
  field?: 'phone' | 'department' | 'birthday' | 'password' | 'status';
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value?: string;
  showStatusCheck?: boolean;
};

function formatAccountStatus(status: string) {
  if (!status) {
    return 'Não Associado';
  }

  if (status.toLowerCase() === 'admin') {
    return 'Admin';
  }

  if (status.toLowerCase() === 'associated') {
    return 'Associado';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function hasVerifiedStatus(status: string) {
  const normalizedStatus = status.toLowerCase();

  return normalizedStatus === 'admin' || normalizedStatus === 'associated';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { authEmail, professorName, userProfile } = useAppData();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const profileName = userProfile?.name || professorName;
  const profileEmail = authEmail || '{professor}@fsg.edu.br';
  const accountStatus = userProfile?.status || '';
  const rows: ProfileRow[] = [
    {
      field: 'phone',
      icon: 'phone',
      title: 'Telefone',
      value: userProfile?.phone || 'A preencher',
    },
    {
      field: 'department',
      icon: 'business',
      title: 'Departamento',
      value: userProfile?.department || 'A preencher',
    },
    {
      field: 'birthday',
      icon: 'cake',
      title: 'Aniversário',
      value: userProfile?.birthday || 'A preencher',
    },
    {
      field: 'status',
      icon: 'verified-user',
      title: 'Status da conta',
      value: formatAccountStatus(accountStatus),
      showStatusCheck: hasVerifiedStatus(accountStatus),
    },
    {
      field: 'password',
      icon: 'lock',
      title: 'Alterar senha',
    },
    {
      icon: 'settings',
      title: 'Configurações',
    },
  ];

  const handleLogout = async () => {
    await setRememberMePreference(false);
    await signOut(auth);
    router.replace('/entry/login');
  };

  const handleAvatarPress = async () => {
    const uid = auth.currentUser?.uid;

    if (!uid || !auth.currentUser) {
      Alert.alert('Erro', 'Não foi possível localizar sua conta.');
      return;
    }

    if (!database) {
      Alert.alert('Erro', 'Não foi possível acessar o banco de dados.');
      return;
    }

    if (!hasSupabaseStorageConfig()) {
      Alert.alert(
        'Supabase não configurado',
        'Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.local.'
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso às fotos para alterar sua foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const asset = result.assets[0];
      const photoUrl = await uploadProfilePhoto({
        mimeType: asset.mimeType,
        uid,
        uri: asset.uri,
      });

      await set(ref(database, `users/${uid}/photoUrl`), photoUrl);
      await updateProfile(auth.currentUser, { photoURL: photoUrl });
    } catch (error) {
      console.error('Failed to update profile photo:', error);
      Alert.alert('Erro', 'Não foi possível atualizar sua foto de perfil.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <View style={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {userProfile?.photoUrl ? (
              <Image source={{ uri: userProfile.photoUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <MaterialIcons name="person" size={74} color={Colors.neutral[400]} />
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isUploadingPhoto}
            onPress={handleAvatarPress}
            style={[styles.editAvatarButton, isUploadingPhoto && styles.editAvatarButtonDisabled]}>
            <MaterialIcons name={isUploadingPhoto ? 'hourglass-empty' : 'edit'} size={22} color={Colors.card} />
          </TouchableOpacity>
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {profileName}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {profileEmail}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Informações adicionais</Text>

      <View style={styles.rowList}>
        {rows.map((item) => (
          <TouchableOpacity
            key={item.title}
            activeOpacity={0.86}
            onPress={() => {
              if (item.field) {
                router.push({ pathname: '/hub/profile/profile-edit', params: { field: item.field } });
              }
            }}
            style={styles.infoRow}>
            <MaterialIcons name={item.icon} size={20} color={Colors.ocean[600]} />

            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.value ? (
                <Text style={styles.rowValue} numberOfLines={1}>
                  {item.value}
                </Text>
              ) : null}
            </View>

            {item.showStatusCheck ? (
              <MaterialIcons name="check-circle" size={22} color={Colors.ocean[600]} style={styles.statusIcon} />
            ) : null}
            <MaterialIcons name="chevron-right" size={34} color={Colors.neutral[500]} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.86} onPress={handleLogout} style={styles.logoutButton}>
        <MaterialIcons name="logout" size={20} color={Colors.card} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    content: {
      flex: 1,
      padding: Spacing.xl,
      gap: Spacing.xl,
    },
    profileHeader: {
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    avatarWrap: {
      width: scale(100),
      height: scale(100),
      marginBottom: Spacing.md,
      overflow: 'hidden',
      borderRadius: CornerRadius.xl,
      backgroundColor: Colors.neutral[100],
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.08,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    avatar: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.neutral[100],
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    editAvatarButton: {
      position: 'absolute',
      right: -Spacing.none,
      bottom: -Spacing.none,
      width: scale(34),
      height: scale(34),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[600],
    },
    editAvatarButtonDisabled: {
      opacity: 0.72,
    },
    name: {
      maxWidth: '86%',
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.title,
      marginBottom: Spacing.xs,
      textAlign: 'center',
    },
    email: {
      maxWidth: '86%',
      color: Colors.neutral[500],
      fontFamily: Fonts.inter,
      fontSize: Fonts.bigSize,
      textAlign: 'center',
    },
    sectionTitle: {
      color: Colors.ocean[600],
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.title,
      marginBottom: Spacing.md,
    },
    rowList: {
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    infoRow: {
      minHeight: scale(48),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.06,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    rowTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: Spacing.xs,
    },
    rowTitle: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
    },
    rowValue: {
      color: Colors.neutral[500],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.mediumSize,
    },
    statusIcon: {
      marginRight: -Spacing.xs,
    },
    logoutButton: {
      minHeight: scale(46),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      borderRadius: CornerRadius.xl2,
      backgroundColor: Colors.ocean[600],
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: Spacing.sm },
      shadowOpacity: 0.06,
      shadowRadius: CornerRadius.lg,
      elevation: Spacing.xs,
    },
    logoutText: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
  });
}
