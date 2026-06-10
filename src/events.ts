export type EventItem = {
  description: string;
  ends: string | null;
  finished: boolean;
  id: string;
  photoUrl: string | null;
  photos: string[];
  starts: string | null;
  title: string;
  type: string;
  when: string | null;
  where: string | null;
};

function normalizeEventItem(value: unknown, id: string): EventItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as {
    description?: unknown;
    ends?: unknown;
    finished?: unknown;
    photos?: unknown;
    starts?: unknown;
    title?: unknown;
    type?: unknown;
    when?: unknown;
    where?: unknown;
  };
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const type = typeof item.type === 'string' && item.type.trim() ? item.type.trim() : 'event';
  const when = typeof item.when === 'string' && item.when.trim() ? item.when.trim() : null;
  const starts = typeof item.starts === 'string' && item.starts.trim() ? item.starts.trim() : null;
  const ends = typeof item.ends === 'string' && item.ends.trim() ? item.ends.trim() : null;
  const where = typeof item.where === 'string' && item.where.trim() ? item.where.trim() : null;
  const photos = Array.isArray(item.photos)
    ? item.photos.filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0)
    : [];

  if (!title && !description && !when && photos.length === 0) {
    return null;
  }

  return {
    description,
    ends,
    finished: item.finished === true,
    id,
    photoUrl: photos[0] ?? null,
    photos,
    starts,
    title,
    type,
    when,
    where,
  };
}

function getEventTypeOrder(type: string) {
  return type === 'event' ? 0 : type === 'prize' ? 1 : 2;
}

export function parseEventDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1);

  if (dateOnly) {
    const [year, month, day] = dateOnly.map(Number);
    const localDate = new Date(year, month - 1, day);

    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventTimestamp(item: EventItem) {
  if (!item.when) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = parseEventDate(item.when)?.getTime();

  return typeof timestamp === 'number' ? timestamp : Number.MAX_SAFE_INTEGER;
}

export function getEventDateKey(item: EventItem) {
  if (!item.when) {
    return null;
  }

  const dateOnly = item.when.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  if (dateOnly) {
    return dateOnly;
  }

  const date = new Date(item.when);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getEventItems(value: unknown): EventItem[] {
  const items = Array.isArray(value)
    ? value.map((item, index) => normalizeEventItem(item, String(index)))
    : value && typeof value === 'object'
      ? Object.entries(value as Record<string, unknown>).map(([key, item]) => normalizeEventItem(item, key))
      : [];

  return items
    .filter((item): item is EventItem => item !== null)
    .sort((firstItem, secondItem) => {
      const dateOrder = getEventTimestamp(firstItem) - getEventTimestamp(secondItem);

      if (dateOrder !== 0) {
        return dateOrder;
      }

      const typeOrder = getEventTypeOrder(firstItem.type) - getEventTypeOrder(secondItem.type);

      if (typeOrder !== 0) {
        return typeOrder;
      }

      return firstItem.id.localeCompare(secondItem.id, undefined, { numeric: true });
    });
}
