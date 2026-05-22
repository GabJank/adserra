export type NewsItem = {
  description: string;
  id: string;
  photoUrl: string | null;
  photos: string[];
  source: string;
  title: string;
  url: string | null;
};

function normalizeNewsItem(value: unknown, id: string): NewsItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as {
    description?: unknown;
    link?: unknown;
    photos?: unknown;
    source?: unknown;
    title?: unknown;
    url?: unknown;
  };
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const photos = Array.isArray(item.photos)
    ? item.photos.filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0)
    : [];
  const url = typeof item.url === 'string' && item.url.trim()
    ? item.url.trim()
    : typeof item.link === 'string' && item.link.trim()
      ? item.link.trim()
      : null;
  const source = typeof item.source === 'string' && item.source.trim() ? item.source.trim() : 'ADSerra';

  if (!title && !description && photos.length === 0) {
    return null;
  }

  return {
    description,
    id,
    photoUrl: photos[0] ?? null,
    photos,
    source,
    title,
    url,
  };
}

export function getNewsItems(value: unknown): NewsItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => normalizeNewsItem(item, String(index)))
      .filter((item): item is NewsItem => item !== null);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey, undefined, { numeric: true }))
      .map(([key, item]) => normalizeNewsItem(item, key))
      .filter((item): item is NewsItem => item !== null);
  }

  return [];
}

export function getFirstNews(value: unknown): NewsItem | null {
  return getNewsItems(value)[0] ?? null;
}
