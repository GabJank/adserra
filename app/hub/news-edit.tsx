import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { push, ref, set } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, useScaledTheme } from '@/constants/theme';
import { hasAdminAccess } from '@/src/access';
import { useAppData } from '@/src/app-data';
import { database } from '@/src/firebase';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewsEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const newsId = getSingleParam(id);
  const { news, userProfile } = useAppData();
  const existingNews = useMemo(() => news.find((item) => item.id === newsId) ?? null, [news, newsId]);
  const isAdmin = hasAdminAccess(userProfile?.status);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('ADSerra');
  const [url, setUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  useEffect(() => {
    if (!existingNews) {
      return;
    }

    setTitle(existingNews.title);
    setSource(existingNews.source || 'ADSerra');
    setUrl(existingNews.url ?? '');
    setPhotoUrl(existingNews.photoUrl ?? '');
    setDescription(existingNews.description);
  }, [existingNews]);

  const handleSave = async () => {
    if (!isAdmin) {
      Alert.alert('Acesso restrito', 'Somente administradores podem salvar notícias.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Dados incompletos', 'Preencha pelo menos o título da notícia.');
      return;
    }

    if (!database) {
      Alert.alert('Erro', 'Não foi possível acessar o banco de dados.');
      return;
    }

    setIsSaving(true);

    try {
      const newsRef = newsId ? ref(database, `news/${newsId}`) : push(ref(database, 'news'));
      const trimmedPhotoUrl = photoUrl.trim();
      const trimmedUrl = url.trim();

      await set(newsRef, {
        description: description.trim(),
        photos: trimmedPhotoUrl ? [trimmedPhotoUrl] : [],
        source: source.trim() || 'ADSerra',
        title: title.trim(),
        url: trimmedUrl || null,
      });

      router.back();
    } catch (error) {
      console.error('Failed to save news:', error);
      Alert.alert('Erro', 'Não foi possível salvar a notícia.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.restrictedState}>
        <MaterialIcons name="lock" size={42} color={Colors.ocean[300]} />
        <Text style={styles.restrictedTitle}>Acesso restrito</Text>
        <Text style={styles.restrictedDescription}>Somente administradores podem criar ou alterar notícias.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{newsId ? 'Alterar notícia ou novidade' : 'Nova notícia ou novidade'}</Text>
        <Text style={styles.subtitle}>Crie e arquive comunicados e atualizações personalizados para a ADSerra.</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Título*:</Text>
          <TextInput
            onChangeText={setTitle}
            placeholder="Coloque um título..."
            placeholderTextColor={Colors.neutral[500]}
            style={styles.inputBox}
            value={title}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Fonte:</Text>
          <TextInput
            onChangeText={setSource}
            placeholder="ADSerra"
            placeholderTextColor={Colors.neutral[500]}
            style={styles.inputBox}
            value={source}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Link:</Text>
          <View style={styles.iconInputBox}>
            <TextInput
              autoCapitalize="none"
              keyboardType="url"
              onChangeText={setUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.neutral[500]}
              style={styles.iconInput}
              value={url}
            />
            <MaterialIcons name="link" size={18} color={Colors.neutral[500]} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Foto:</Text>
          <View style={styles.photoBox}>
            {photoUrl.trim() ? (
              <Image source={{ uri: photoUrl.trim() }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={28} color={Colors.ocean[600]} />
                <Text style={styles.photoHint}>Cole a URL da foto abaixo</Text>
              </>
            )}
          </View>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPhotoUrl}
            placeholder="https://..."
            placeholderTextColor={Colors.neutral[500]}
            style={[styles.inputBox, styles.photoUrlInput]}
            value={photoUrl}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Descrição:</Text>
          <View style={styles.editorBox}>
            <View style={styles.editorToolbar}>
              <MaterialIcons name="format-bold" size={18} color={Colors.text} />
              <MaterialIcons name="format-italic" size={18} color={Colors.text} />
              <MaterialIcons name="link" size={18} color={Colors.text} />
            </View>
            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder="Descreva o conteúdo..."
              placeholderTextColor={Colors.neutral[500]}
              style={styles.descriptionInput}
              textAlignVertical="top"
              value={description}
            />
          </View>
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity activeOpacity={0.86} disabled={isSaving} onPress={handleSave} style={styles.publishButton}>
            <Text style={styles.publishText}>{isSaving ? 'Salvando...' : newsId ? 'Salvar' : 'Publicar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.86} disabled={isSaving} onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Heading, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.xl,
      paddingBottom: Spacing.xl6,
    },
    title: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Heading.h5,
      lineHeight: Math.round(Heading.h5 * 1.18),
      marginBottom: Spacing.lg,
    },
    subtitle: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
      lineHeight: Math.round(Fonts.mediumSize * 1.2),
      marginBottom: Spacing.xl,
    },
    fieldGroup: {
      marginBottom: Spacing.lg,
    },
    label: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.bigSize,
      marginBottom: Spacing.sm,
    },
    inputBox: {
      minHeight: scale(44),
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
      color: Colors.text,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    iconInputBox: {
      minHeight: scale(44),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.lg,
    },
    iconInput: {
      flex: 1,
      color: Colors.text,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      paddingVertical: Spacing.md,
    },
    photoBox: {
      minHeight: scale(126),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
      gap: Spacing.md,
    },
    photoPreview: {
      width: '100%',
      height: scale(126),
    },
    photoHint: {
      color: Colors.text,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
    },
    photoUrlInput: {
      marginTop: Spacing.sm,
    },
    editorBox: {
      minHeight: scale(136),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
    },
    editorToolbar: {
      minHeight: scale(34),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      backgroundColor: Colors.neutral[100],
      paddingHorizontal: Spacing.lg,
    },
    descriptionInput: {
      minHeight: scale(96),
      color: Colors.text,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      padding: Spacing.lg,
    },
    formActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.lg,
      marginTop: Spacing.md,
    },
    publishButton: {
      minWidth: scale(120),
      minHeight: scale(42),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[600],
    },
    publishText: {
      color: Colors.card,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.subtitle,
    },
    cancelButton: {
      minWidth: scale(120),
      minHeight: scale(42),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.neutral[100],
    },
    cancelText: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.subtitle,
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
