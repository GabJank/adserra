import * as FileSystem from 'expo-file-system/legacy';

import { auth } from '@/src/firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const profileBucket = process.env.EXPO_PUBLIC_SUPABASE_PROFILE_BUCKET || 'photos';

type UploadProfilePhotoParams = {
  mimeType?: string | null;
  uid: string;
  uri: string;
};

type UploadContentPhotoParams = {
  collection: 'events' | 'news';
  contentId?: string | null;
  mimeType?: string | null;
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

function getSafePathPart(value: string | null | undefined, fallback: string) {
  const safeValue = value?.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  return safeValue || fallback;
}

function getPublicStorageUrl(normalizedSupabaseUrl: string, bucket: string, objectPath: string) {
  return `${normalizedSupabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}?v=${Date.now()}`;
}

async function uploadStorageObject({
  bucket,
  mimeType,
  objectPath,
  uri,
}: {
  bucket: string;
  mimeType?: string | null;
  objectPath: string;
  uri: string;
}) {
  const normalizedSupabaseUrl = getNormalizedSupabaseUrl();
  const normalizedAnonKey = supabaseAnonKey?.trim();

  if (!normalizedSupabaseUrl || !normalizedAnonKey) {
    throw new Error('missing-supabase-config');
  }

  const contentType = mimeType || 'image/jpeg';
  const uploadUrl = `${normalizedSupabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
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
    if (uploadResponse.status === 403 && uploadResponse.body.includes('row-level security policy')) {
      throw new Error('supabase-storage-rls');
    }

    throw new Error(uploadResponse.body || `supabase-upload-${uploadResponse.status}`);
  }

  return getPublicStorageUrl(normalizedSupabaseUrl, bucket, objectPath);
}

export async function uploadProfilePhoto({ mimeType, uid, uri }: UploadProfilePhotoParams) {
  const contentType = mimeType || 'image/jpeg';
  const extension = getFileExtension(contentType);
  const objectPath = `icon-profiles/${uid}/profile.${extension}`;

  return uploadStorageObject({ bucket: profileBucket, mimeType: contentType, objectPath, uri });
}

export async function uploadContentPhoto({ collection, contentId, mimeType, uri }: UploadContentPhotoParams) {
  const contentType = mimeType || 'image/jpeg';
  const extension = getFileExtension(contentType);
  const ownerId = getSafePathPart(auth.currentUser?.uid, 'admin');
  const safeContentId = getSafePathPart(contentId, `draft-${Date.now()}`);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const objectPath = `${collection}/${ownerId}/${safeContentId}/${fileName}`;

  return uploadStorageObject({ bucket: profileBucket, mimeType: contentType, objectPath, uri });
}
