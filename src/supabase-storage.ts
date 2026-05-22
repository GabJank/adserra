import * as FileSystem from 'expo-file-system/legacy';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const profileBucket = process.env.EXPO_PUBLIC_SUPABASE_PROFILE_BUCKET || 'photos';

type UploadProfilePhotoParams = {
  mimeType?: string | null;
  uid: string;
  uri: string;
};

function getFileExtension(mimeType?: string | null) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'jpg';
  }
}

function getNormalizedSupabaseUrl() {
  const trimmedUrl = supabaseUrl?.trim().replace(/\/+$/, '');

  if (!trimmedUrl || !/^https?:\/\//.test(trimmedUrl)) {
    return null;
  }

  return trimmedUrl;
}

export function hasSupabaseStorageConfig() {
  return Boolean(getNormalizedSupabaseUrl() && supabaseAnonKey?.trim());
}

export async function uploadProfilePhoto({ mimeType, uid, uri }: UploadProfilePhotoParams) {
  const normalizedSupabaseUrl = getNormalizedSupabaseUrl();
  const normalizedAnonKey = supabaseAnonKey?.trim();

  if (!normalizedSupabaseUrl || !normalizedAnonKey) {
    throw new Error('missing-supabase-config');
  }

  const contentType = mimeType || 'image/jpeg';
  const extension = getFileExtension(contentType);
  const objectPath = `icon-profiles/${uid}/profile.${extension}`;
  const uploadUrl = `${normalizedSupabaseUrl}/storage/v1/object/${profileBucket}/${objectPath}`;
  const uploadResponse = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      apikey: normalizedAnonKey,
      Authorization: `Bearer ${normalizedAnonKey}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
  });

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw new Error(uploadResponse.body || `supabase-upload-${uploadResponse.status}`);
  }

  return `${normalizedSupabaseUrl}/storage/v1/object/public/${profileBucket}/${objectPath}?v=${Date.now()}`;
}
