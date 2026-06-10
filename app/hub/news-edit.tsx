import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { push, ref, set } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
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
import { recordAdminAlert } from '@/src/alerts';
import { useAppData } from '@/src/app-data';
import { PhotoUploadGrid, RichDescriptionEditor } from '@/src/components';
import { database } from '@/src/firebase';
import { hasSupabaseStorageConfig, uploadContentPhoto } from '@/src/supabase-storage';

const maxPhotoCount = 3;

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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const isDescriptionFocusedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scaledTheme = useScaledTheme();
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  const scrollDescriptionIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 260);
  }, []);

  useEffect(() => {
    if (!existingNews) {
      return;
    }

    setTitle(existingNews.title);
    setSource(existingNews.source || 'ADSerra');
    setUrl(existingNews.url ?? '');
    setPhotoUrls(
      existingNews.photos.length > 0
        ? existingNews.photos.slice(0, maxPhotoCount)
        : [existingNews.photoUrl].filter((photoUrl): photoUrl is string => Boolean(photoUrl)).slice(0, maxPhotoCount)
    );
    setDescription(existingNews.description);
  }, [existingNews]);

  useEffect(() => {
    const keyboardSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (isDescriptionFocusedRef.current) {
          scrollDescriptionIntoView();
        }
      }
    );

    return () => keyboardSubscription.remove();
  }, [scrollDescriptionIntoView]);

  const handleDescriptionFocus = () => {
    isDescriptionFocusedRef.current = true;
    scrollDescriptionIntoView();
  };

  const handleDescriptionBlur = () => {
    isDescriptionFocusedRef.current = false;
  };

  const handlePhotoUpload = async () => {
    if (isUploadingPhoto) {
      return;
    }

    const remainingPhotoSlots = maxPhotoCount - photoUrls.length;

    if (remainingPhotoSlots <= 0) {
      Alert.alert('Limite atingido', `Você pode adicionar no máximo ${maxPhotoCount} fotos.`);
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
      Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher uma imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: remainingPhotoSlots === 1,
      allowsMultipleSelection: remainingPhotoSlots > 1,
      mediaTypes: ['images'],
      quality: 0.86,
      selectionLimit: remainingPhotoSlots,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const uploadedPhotoUrls = await Promise.all(
        result.assets.slice(0, remainingPhotoSlots).map((asset) =>
          uploadContentPhoto({
            collection: 'news',
            contentId: newsId,
            mimeType: asset.mimeType,
            uri: asset.uri,
          })
        )
      );

      setPhotoUrls((currentPhotoUrls) => [...currentPhotoUrls, ...uploadedPhotoUrls].slice(0, maxPhotoCount));
    } catch (error) {
      console.error('Failed to upload news photo:', error);
      Alert.alert(
        'Upload bloqueado',
        error instanceof Error && error.message === 'supabase-storage-rls'
          ? 'O Supabase bloqueou o envio por policy do Storage. Libere upload para news/ no bucket usado.'
          : 'Não foi possível enviar a foto.'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (photoIndex: number) => {
    setPhotoUrls((currentPhotoUrls) => currentPhotoUrls.filter((_, index) => index !== photoIndex));
  };

  const handleSave = async () => {
    if (!isAdmin) {
      Alert.alert('Acesso restrito', 'Somente administradores podem salvar notícias.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Dados incompletos', 'Preencha pelo menos o título da notícia.');
      return;
    }

    if (isUploadingPhoto) {
      Alert.alert('Aguarde', 'A foto ainda está sendo enviada.');
      return;
    }

    if (!database) {
      Alert.alert('Erro', 'Não foi possível acessar o banco de dados.');
      return;
    }

    setIsSaving(true);

    try {
      const newsRef = newsId ? ref(database, `news/${newsId}`) : push(ref(database, 'news'));
      const savedNewsId = newsRef.key ?? newsId ?? '';
      const savedPhotoUrls = photoUrls.map((photoUrl) => photoUrl.trim()).filter(Boolean).slice(0, maxPhotoCount);
      const trimmedTitle = title.trim();
      const trimmedUrl = url.trim();

      await set(newsRef, {
        description: description.trim(),
        photos: savedPhotoUrls,
        source: source.trim() || 'ADSerra',
        title: trimmedTitle,
        url: trimmedUrl || null,
      });

      await recordAdminAlert({
        description: `Notícia "${trimmedTitle}" foi ${newsId ? 'atualizada' : 'criada'}.`,
        path: savedNewsId ? `news/${savedNewsId}` : 'news',
        source: 'Notícias',
        targetId: savedNewsId,
        title: newsId ? 'Notícia atualizada' : 'Notícia criada',
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
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
          <PhotoUploadGrid
            isUploading={isUploadingPhoto}
            maxPhotos={maxPhotoCount}
            onAddPhoto={handlePhotoUpload}
            onRemovePhoto={handleRemovePhoto}
            photos={photoUrls}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Descrição:</Text>
          <RichDescriptionEditor
            onBlur={handleDescriptionBlur}
            onChangeText={setDescription}
            onFocus={handleDescriptionFocus}
            value={description}
          />
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
