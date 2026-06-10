import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScaledTheme } from '@/constants/theme';

export type PhotoUploadGridProps = {
  isUploading?: boolean;
  maxPhotos?: number;
  onAddPhoto: () => void;
  onRemovePhoto: (photoIndex: number) => void;
  photos: string[];
};

export function PhotoUploadGrid({
  isUploading = false,
  maxPhotos = 3,
  onAddPhoto,
  onRemovePhoto,
  photos,
}: PhotoUploadGridProps) {
  const scaledTheme = useScaledTheme();
  const { Colors } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const canAddPhoto = photos.length < maxPhotos;

  return (
    <View>
      <View style={styles.photoGrid}>
        {photos.map((photoUrl, index) => (
          <View key={`${photoUrl}-${index}`} style={styles.photoTile}>
            <Image source={{ uri: photoUrl }} style={styles.photoPreview} contentFit="cover" />
            <View style={styles.photoIndexBadge}>
              <Text style={styles.photoIndexText}>{index + 1}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              disabled={isUploading}
              onPress={() => onRemovePhoto(index)}
              style={[styles.removeButton, isUploading && styles.disabledAction]}>
              <MaterialIcons name="close" size={18} color={Colors.card} />
            </TouchableOpacity>
          </View>
        ))}

        {canAddPhoto ? (
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={isUploading}
            onPress={onAddPhoto}
            style={[
              styles.addPhotoTile,
              photos.length === 0 && styles.addPhotoTileLarge,
              isUploading && styles.disabledAction,
            ]}>
            <MaterialIcons name={isUploading ? 'hourglass-empty' : 'cloud-upload'} size={28} color={Colors.ocean[600]} />
            <Text style={styles.photoHint}>{isUploading ? 'Enviando foto...' : 'Adicionar da galeria'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.photoLimitText}>
        {photos.length}/{maxPhotos} fotos
      </Text>
    </View>
  );
}

function createStyles({ Colors, CornerRadius, Fonts, Spacing, scale }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    photoTile: {
      width: '31%',
      aspectRatio: 1,
      overflow: 'hidden',
      position: 'relative',
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
    },
    photoPreview: {
      width: '100%',
      height: '100%',
      backgroundColor: Colors.neutral[100],
    },
    photoIndexBadge: {
      position: 'absolute',
      left: Spacing.xs,
      top: Spacing.xs,
      minWidth: scale(22),
      height: scale(22),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      paddingHorizontal: Spacing.xs,
    },
    photoIndexText: {
      color: Colors.card,
      fontFamily: Fonts.interBold,
      fontSize: Fonts.minorSize,
    },
    removeButton: {
      position: 'absolute',
      right: Spacing.xs,
      top: Spacing.xs,
      width: scale(24),
      height: scale(24),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CornerRadius.full,
      backgroundColor: 'rgba(0, 0, 0, 0.58)',
    },
    addPhotoTile: {
      width: '31%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: CornerRadius.md,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.sm,
    },
    addPhotoTileLarge: {
      width: '100%',
      minHeight: scale(126),
      aspectRatio: undefined,
    },
    disabledAction: {
      opacity: 0.72,
    },
    photoHint: {
      color: Colors.text,
      fontFamily: Fonts.inter,
      fontSize: Fonts.mediumSize,
      textAlign: 'center',
    },
    photoLimitText: {
      color: Colors.neutral[500],
      fontFamily: Fonts.interSemiBold,
      fontSize: Fonts.minorSize,
      marginTop: Spacing.sm,
    },
  });
}
