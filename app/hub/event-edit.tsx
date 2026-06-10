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

type EventCategory = 'event' | 'prize';

const maxPhotoCount = 3;

const categories: { label: string; value: EventCategory }[] = [
  { label: 'Evento', value: 'event' },
  { label: 'Prêmio', value: 'prize' },
];

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
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

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  const hourDigits = digits.slice(0, 2);
  const minuteDigits = digits.slice(2, 4);

  if (digits.length <= 2) {
    if (digits.length < 2) {
      return hourDigits;
    }

    return String(Math.min(Number(hourDigits), 23)).padStart(2, '0');
  }

  const hour = String(Math.min(Number(hourDigits), 23)).padStart(2, '0');
  const minute =
    minuteDigits.length === 1
      ? String(Math.min(Number(minuteDigits), 5))
      : String(Math.min(Number(minuteDigits), 59)).padStart(2, '0');

  return `${hour}:${minute}`;
}

function toDateInput(when: string | null | undefined) {
  const dateOnly = when?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  if (!dateOnly) {
    return '';
  }

  const [year, month, day] = dateOnly.split('-');

  return `${day}/${month}/${year}`;
}

function toTimeInput(time: string | null | undefined) {
  const trimmedTime = time?.trim();

  if (!trimmedTime) {
    return '';
  }

  const date = new Date(trimmedTime);

  if (!Number.isNaN(date.getTime())) {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${hour}:${minute}`;
  }

  const hourMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})/);

  if (hourMatch) {
    return `${hourMatch[1].padStart(2, '0')}:${hourMatch[2]}`;
  }

  return formatTimeInput(trimmedTime);
}

function getTodayDateInput() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
}

function toEventDate(value: string) {
  const [day, month, year] = value.split('/');

  if (!day || !month || !year || year.length !== 4) {
    return null;
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function toEventTime(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const timeMatch = trimmedValue.match(/^(\d{1,2}):(\d{2})$/);

  if (!timeMatch) {
    return undefined;
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (hour > 23 || minute > 59) {
    return undefined;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function EventEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = getSingleParam(id);
  const { events, userProfile } = useAppData();
  const existingEvent = useMemo(() => events.find((item) => item.id === eventId) ?? null, [eventId, events]);
  const isAdmin = hasAdminAccess(userProfile?.status);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('event');
  const [date, setDate] = useState(() => getTodayDateInput());
  const [endTime, setEndTime] = useState('');
  const [startTime, setStartTime] = useState('');
  const [where, setWhere] = useState('');
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
    if (!existingEvent) {
      return;
    }

    setTitle(existingEvent.title);
    setCategory(existingEvent.type === 'prize' ? 'prize' : 'event');
    setDate(toDateInput(existingEvent.when));
    setEndTime(toTimeInput(existingEvent.ends));
    setStartTime(toTimeInput(existingEvent.starts));
    setWhere(existingEvent.where ?? '');
    setPhotoUrls(
      existingEvent.photos.length > 0
        ? existingEvent.photos.slice(0, maxPhotoCount)
        : [existingEvent.photoUrl].filter((photoUrl): photoUrl is string => Boolean(photoUrl)).slice(0, maxPhotoCount)
    );
    setDescription(existingEvent.description);
  }, [existingEvent]);

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
            collection: 'events',
            contentId: eventId,
            mimeType: asset.mimeType,
            uri: asset.uri,
          })
        )
      );

      setPhotoUrls((currentPhotoUrls) => [...currentPhotoUrls, ...uploadedPhotoUrls].slice(0, maxPhotoCount));
    } catch (error) {
      console.error('Failed to upload event photo:', error);
      Alert.alert(
        'Upload bloqueado',
        error instanceof Error && error.message === 'supabase-storage-rls'
          ? 'O Supabase bloqueou o envio por policy do Storage. Libere upload para events/ no bucket usado.'
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
    const eventDate = toEventDate(date);
    const eventEndTime = toEventTime(endTime);
    const eventStartTime = toEventTime(startTime);

    if (!isAdmin) {
      Alert.alert('Acesso restrito', 'Somente administradores podem salvar eventos.');
      return;
    }

    if (!title.trim() || !eventDate) {
      Alert.alert('Dados incompletos', 'Preencha pelo menos título e data do evento.');
      return;
    }

    if (category === 'event' && ((startTime.trim() && !eventStartTime) || (endTime.trim() && !eventEndTime))) {
      Alert.alert('Horário inválido', 'Use o formato HH:mm, por exemplo 17:00.');
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
      const eventRef = eventId ? ref(database, `events/${eventId}`) : push(ref(database, 'events'));
      const savedEventId = eventRef.key ?? eventId ?? '';
      const savedPhotoUrls = photoUrls.map((photoUrl) => photoUrl.trim()).filter(Boolean).slice(0, maxPhotoCount);
      const trimmedTitle = title.trim();

      await set(eventRef, {
        description: description.trim(),
        ends: category === 'event' ? eventEndTime : null,
        finished: existingEvent?.finished ?? false,
        photos: savedPhotoUrls,
        starts: category === 'event' ? eventStartTime : null,
        title: trimmedTitle,
        type: category,
        when: eventDate,
        where: where.trim(),
      });

      await recordAdminAlert({
        description: `${category === 'prize' ? 'Prêmio' : 'Evento'} "${trimmedTitle}" foi ${
          eventId ? 'atualizado' : 'criado'
        }.`,
        path: savedEventId ? `events/${savedEventId}` : 'events',
        source: 'Eventos',
        targetId: savedEventId,
        title: eventId ? 'Evento atualizado' : 'Evento criado',
      });

      router.back();
    } catch (error) {
      console.error('Failed to save event:', error);
      Alert.alert('Erro', 'Não foi possível salvar o evento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.restrictedState}>
        <MaterialIcons name="lock" size={42} color={Colors.ocean[300]} />
        <Text style={styles.restrictedTitle}>Acesso restrito</Text>
        <Text style={styles.restrictedDescription}>Somente administradores podem criar ou alterar eventos.</Text>
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
        <Text style={styles.title}>
          {eventId ? 'Alterar evento, prêmio ou notificação' : 'Novo evento, prêmio ou notificação'}
        </Text>
        <Text style={styles.subtitle}>Crie e arquive conteúdos personalizados para a ADSerra.</Text>

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
          <Text style={styles.label}>Categoria*:</Text>
          <View style={styles.segmentedControl}>
            {categories.map((item) => {
              const isSelected = item.value === category;

              return (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.84}
                  onPress={() => setCategory(item.value)}
                  style={[styles.segmentButton, isSelected && styles.segmentButtonActive]}>
                  <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Data*:</Text>
          <View style={styles.iconInputBox}>
            <TextInput
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={(nextValue) => setDate(formatDateInput(nextValue))}
              placeholder={getTodayDateInput()}
              placeholderTextColor={Colors.neutral[500]}
              style={styles.iconInput}
              value={date}
            />
            <MaterialIcons name="calendar-today" size={18} color={Colors.neutral[500]} />
          </View>
        </View>

        {category === 'event' ? (
          <View style={styles.timeFieldRow}>
            <View style={styles.timeField}>
              <Text style={styles.label}>Início:</Text>
              <View style={styles.iconInputBox}>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={(nextValue) => setStartTime(formatTimeInput(nextValue))}
                  placeholder="17:00"
                  placeholderTextColor={Colors.neutral[500]}
                  style={styles.iconInput}
                  value={startTime}
                />
                <MaterialIcons name="schedule" size={18} color={Colors.neutral[500]} />
              </View>
            </View>

            <View style={styles.timeField}>
              <Text style={styles.label}>Fim:</Text>
              <View style={styles.iconInputBox}>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={(nextValue) => setEndTime(formatTimeInput(nextValue))}
                  placeholder="20:00"
                  placeholderTextColor={Colors.neutral[500]}
                  style={styles.iconInput}
                  value={endTime}
                />
                <MaterialIcons name="schedule" size={18} color={Colors.neutral[500]} />
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Local:</Text>
          <TextInput
            onChangeText={setWhere}
            placeholder="Coloque um local..."
            placeholderTextColor={Colors.neutral[500]}
            style={styles.inputBox}
            value={where}
          />
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
            <Text style={styles.publishText}>{isSaving ? 'Salvando...' : eventId ? 'Salvar' : 'Publicar'}</Text>
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
    timeFieldRow: {
      flexDirection: 'row',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    timeField: {
      flex: 1,
    },
    segmentedControl: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
      padding: Spacing.xs,
      gap: Spacing.xs,
    },
    segmentButton: {
      flex: 1,
      minHeight: scale(34),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.sm,
    },
    segmentButtonActive: {
      backgroundColor: Colors.ocean[600],
    },
    segmentText: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.mediumSize,
    },
    segmentTextActive: {
      color: Colors.card,
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
