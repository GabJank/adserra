import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputSelectionChangeEventData,
  TouchableOpacity,
  type NativeSyntheticEvent,
  View,
} from 'react-native';

import { useScaledTheme } from '@/constants/theme';

export type RichDescriptionEditorProps = {
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  value: string;
};

type TextSelection = {
  end: number;
  start: number;
};

function normalizeUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function clampSelection(selection: TextSelection, length: number) {
  const start = Math.min(Math.max(selection.start, 0), length);
  const end = Math.min(Math.max(selection.end, 0), length);

  return {
    end: Math.max(start, end),
    start,
  };
}

export function RichDescriptionEditor({
  onBlur,
  onChangeText,
  onFocus,
  placeholder = 'Descreva o conteúdo...',
  value,
}: RichDescriptionEditorProps) {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<TextSelection>({ end: 0, start: 0 });
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const scaledTheme = useScaledTheme();
  const { Colors } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);

  useEffect(() => {
    setSelection((currentSelection) => clampSelection(currentSelection, value.length));
  }, [value.length]);

  const focusInput = () => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const replaceSelection = (replacement: string, nextSelection: TextSelection) => {
    const safeSelection = clampSelection(selection, value.length);
    const nextValue = `${value.slice(0, safeSelection.start)}${replacement}${value.slice(safeSelection.end)}`;

    onChangeText(nextValue);
    setSelection(nextSelection);
    focusInput();
  };

  const wrapSelection = (prefix: string, suffix: string, fallbackText: string) => {
    const safeSelection = clampSelection(selection, value.length);
    const selectedText = value.slice(safeSelection.start, safeSelection.end);
    const innerText = selectedText || fallbackText;
    const replacement = `${prefix}${innerText}${suffix}`;
    const nextSelection = selectedText
      ? { start: safeSelection.start + replacement.length, end: safeSelection.start + replacement.length }
      : {
          start: safeSelection.start + prefix.length,
          end: safeSelection.start + prefix.length + fallbackText.length,
        };

    replaceSelection(replacement, nextSelection);
  };

  const openLinkModal = () => {
    const safeSelection = clampSelection(selection, value.length);
    const selectedText = value.slice(safeSelection.start, safeSelection.end);

    setLinkLabel(selectedText);
    setLinkUrl('');
    setIsLinkModalVisible(true);
  };

  const closeLinkModal = () => {
    setIsLinkModalVisible(false);
    setLinkLabel('');
    setLinkUrl('');
    focusInput();
  };

  const insertLink = () => {
    const normalizedUrl = normalizeUrl(linkUrl);

    if (!normalizedUrl) {
      Alert.alert('Link incompleto', 'Informe uma URL para criar o hiperlink.');
      return;
    }

    const label = linkLabel.trim() || normalizedUrl;
    const safeSelection = clampSelection(selection, value.length);
    const replacement = `[${label}](${normalizedUrl})`;
    const nextCursor = safeSelection.start + replacement.length;

    setIsLinkModalVisible(false);
    setLinkLabel('');
    setLinkUrl('');
    replaceSelection(replacement, { end: nextCursor, start: nextCursor });
  };

  const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelection(event.nativeEvent.selection);
  };

  return (
    <>
      <View style={styles.editorBox}>
        <View style={styles.editorToolbar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => wrapSelection('**', '**', 'texto em negrito')}
            style={styles.toolButton}>
            <MaterialIcons name="format-bold" size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => wrapSelection('_', '_', 'texto em itálico')}
            style={styles.toolButton}>
            <MaterialIcons name="format-italic" size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={openLinkModal} style={styles.toolButton}>
            <MaterialIcons name="link" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <TextInput
          ref={inputRef}
          multiline
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onSelectionChange={handleSelectionChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.neutral[500]}
          selection={selection}
          style={styles.descriptionInput}
          textAlignVertical="top"
          value={value}
        />
      </View>

      <Modal animationType="fade" onRequestClose={closeLinkModal} transparent visible={isLinkModalVisible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}>
          <View style={styles.linkDialog}>
            <Text style={styles.linkTitle}>Inserir link</Text>

            <Text style={styles.linkLabel}>Texto</Text>
            <TextInput
              onChangeText={setLinkLabel}
              placeholder="Texto do link"
              placeholderTextColor={Colors.neutral[500]}
              style={styles.linkInput}
              value={linkLabel}
            />

            <Text style={styles.linkLabel}>URL</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="url"
              onChangeText={setLinkUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.neutral[500]}
              style={styles.linkInput}
              value={linkUrl}
            />

            <View style={styles.linkActions}>
              <TouchableOpacity activeOpacity={0.84} onPress={closeLinkModal} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.84} onPress={insertLink} style={styles.confirmButton}>
                <Text style={styles.confirmText}>Inserir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
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
      paddingHorizontal: Spacing.md,
    },
    toolButton: {
      width: scale(30),
      height: scale(30),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.sm,
    },
    descriptionInput: {
      minHeight: scale(96),
      color: Colors.text,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      padding: Spacing.lg,
    },
    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
      paddingHorizontal: Spacing.xl,
    },
    linkDialog: {
      width: '100%',
      maxWidth: scale(340),
      borderRadius: CornerRadius.xl3,
      backgroundColor: Colors.card,
      padding: Spacing.xl2,
    },
    linkTitle: {
      color: Colors.text,
      fontFamily: Fonts.manropeBold,
      fontSize: Fonts.subtitle,
      marginBottom: Spacing.xl,
      textAlign: 'center',
    },
    linkLabel: {
      color: Colors.neutral[600],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.mediumSize,
      marginBottom: Spacing.sm,
    },
    linkInput: {
      minHeight: scale(42),
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
      color: Colors.text,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    linkActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.md,
      marginTop: Spacing.sm,
    },
    cancelButton: {
      minHeight: scale(36),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      paddingHorizontal: Spacing.xl,
    },
    confirmButton: {
      minHeight: scale(36),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.ocean[600],
      paddingHorizontal: Spacing.xl,
    },
    cancelText: {
      color: Colors.ocean[600],
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
    confirmText: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.bigSize,
    },
  });
}
