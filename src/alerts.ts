import { push, ref, set } from 'firebase/database';
import { Platform } from 'react-native';

import { auth, database } from '@/src/firebase';

export type AdminAlert = {
  actorId: string | null;
  createdAt: Date | null;
  description: string;
  device: string | null;
  errorCode: string | null;
  id: string;
  ip: string | null;
  path: string | null;
  severity: string | null;
  source: string | null;
  targetId: string | null;
  timeLabel: string;
  title: string;
};

type RecordAdminAlertInput = {
  description: string;
  errorCode?: string | null;
  path?: string | null;
  severity?: string;
  source?: string;
  targetId?: string | null;
  title: string;
};

function optionalString(value: string | null | undefined) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function recordAdminAlert({
  description,
  errorCode,
  path,
  severity = 'info',
  source = 'Sistema',
  targetId,
  title,
}: RecordAdminAlertInput) {
  if (!database) {
    return false;
  }

  try {
    const alertRef = push(ref(database, 'alerts'));

    await set(alertRef, {
      actorId: auth.currentUser?.uid ?? null,
      createdAt: new Date().toISOString(),
      description,
      device: Platform.OS,
      errorCode: optionalString(errorCode),
      path: optionalString(path),
      severity,
      source,
      targetId: optionalString(targetId),
      title,
    });

    return true;
  } catch (error) {
    console.error('Failed to record admin alert:', error);

    return false;
  }
}

function getStringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseAlertDate(value: unknown) {
  if (typeof value === 'number') {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAlertTime(date: Date | null, fallback: string | null) {
  if (!date) {
    return fallback ?? '';
  }

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return 'agora';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `há ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `há ${diffInHours} h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return `há ${diffInDays} d`;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function normalizeAlert(value: unknown, id: string): AdminAlert | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const alert = value as {
    createdAt?: unknown;
    description?: unknown;
    actorId?: unknown;
    adminId?: unknown;
    detail?: unknown;
    device?: unknown;
    errorCode?: unknown;
    ip?: unknown;
    message?: unknown;
    path?: unknown;
    severity?: unknown;
    source?: unknown;
    targetId?: unknown;
    time?: unknown;
    timestamp?: unknown;
    title?: unknown;
    type?: unknown;
    userId?: unknown;
  };
  const createdAt = parseAlertDate(alert.createdAt ?? alert.timestamp ?? alert.time);
  const fallbackTime = getStringField(alert.time);
  const title = getStringField(alert.title) ?? 'Log de segurança';
  const description =
    getStringField(alert.description) ?? getStringField(alert.detail) ?? getStringField(alert.message) ?? '';

  if (!title && !description) {
    return null;
  }

  return {
    actorId: getStringField(alert.actorId) ?? getStringField(alert.adminId),
    createdAt,
    description: description || 'Novo registro de segurança.',
    device: getStringField(alert.device),
    errorCode: getStringField(alert.errorCode),
    id,
    ip: getStringField(alert.ip),
    path: getStringField(alert.path),
    severity: getStringField(alert.severity) ?? getStringField(alert.type),
    source: getStringField(alert.source),
    targetId: getStringField(alert.targetId) ?? getStringField(alert.userId),
    timeLabel: formatAlertTime(createdAt, fallbackTime),
    title,
  };
}

export function getAdminAlerts(value: unknown) {
  const entries = Array.isArray(value)
    ? value.map((alert, index) => [String(index), alert] as const)
    : value && typeof value === 'object'
      ? Object.entries(value as Record<string, unknown>)
      : [];

  return entries
    .map(([id, alert]) => normalizeAlert(alert, id))
    .filter((alert): alert is AdminAlert => alert !== null)
    .sort((firstAlert, secondAlert) => {
      const firstTime = firstAlert.createdAt?.getTime() ?? 0;
      const secondTime = secondAlert.createdAt?.getTime() ?? 0;

      if (firstTime !== secondTime) {
        return secondTime - firstTime;
      }

      return secondAlert.id.localeCompare(firstAlert.id, undefined, { numeric: true });
    });
}
