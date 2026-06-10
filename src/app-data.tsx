import { onAuthStateChanged, type User } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { getEventDateKey, getEventItems, type EventItem } from '@/src/events';
import { auth, database } from '@/src/firebase';
import { getNewsItems, type NewsItem } from '@/src/news';

export type AssociationRequest = {
  requestedAt: string;
  respondedAt: string;
  respondedBy: string;
  status: string;
};

export type UserProfile = {
  associationRequest: AssociationRequest | null;
  birthday: string;
  department: string;
  name: string;
  photoUrl: string;
  phone: string;
  since: string;
  status: string;
};

type AppDataContextValue = {
  authEmail: string;
  eventDates: string[];
  events: EventItem[];
  firstNews: NewsItem | null;
  isEventsLoaded: boolean;
  isNewsLoaded: boolean;
  news: NewsItem[];
  professorName: string;
  userProfile: UserProfile | null;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Professor';
}

function getProfessorFallback(user: User | null) {
  return getFirstName(user?.displayName || 'Professor');
}

function normalizeProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const profile = value as Partial<Record<keyof UserProfile, unknown>>;
  const associationRequest =
    profile.associationRequest && typeof profile.associationRequest === 'object'
      ? (profile.associationRequest as Partial<Record<keyof AssociationRequest, unknown>>)
      : null;

  return {
    associationRequest: associationRequest
      ? {
          requestedAt: typeof associationRequest.requestedAt === 'string' ? associationRequest.requestedAt.trim() : '',
          respondedAt: typeof associationRequest.respondedAt === 'string' ? associationRequest.respondedAt.trim() : '',
          respondedBy: typeof associationRequest.respondedBy === 'string' ? associationRequest.respondedBy.trim() : '',
          status: typeof associationRequest.status === 'string' ? associationRequest.status.trim() : '',
        }
      : null,
    birthday: typeof profile.birthday === 'string' ? profile.birthday.trim() : '',
    department: typeof profile.department === 'string' ? profile.department.trim() : '',
    name: typeof profile.name === 'string' ? profile.name.trim() : '',
    photoUrl: typeof profile.photoUrl === 'string' ? profile.photoUrl.trim() : '',
    phone: typeof profile.phone === 'string' ? profile.phone.replace(/^"+|"+$/g, '').trim() : '',
    since: typeof profile.since === 'string' ? profile.since.trim() : '',
    status: typeof profile.status === 'string' ? profile.status.trim() : '',
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [professorName, setProfessorName] = useState(() => getProfessorFallback(auth.currentUser));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isEventsLoaded, setIsEventsLoaded] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isNewsLoaded, setIsNewsLoaded] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const fallbackName = getProfessorFallback(user);

    if (!user || !database) {
      setUserProfile(null);
      setProfessorName(fallbackName);
      return;
    }

    const userProfileRef = ref(database, `users/${user.uid}`);

    return onValue(
      userProfileRef,
      (snapshot) => {
        const profile = normalizeProfile(snapshot.val());

        setUserProfile(profile);
        setProfessorName(profile?.name ? getFirstName(profile.name) : fallbackName);
      },
      (error) => {
        const errorCode = 'code' in error ? error.code : 'unknown';

        console.error('User profile listener failed:', errorCode, error.message);
        setUserProfile(null);
        setProfessorName(fallbackName);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!database) {
      setNews([]);
      setIsNewsLoaded(true);
      return;
    }

    if (!user) {
      setNews([]);
      setIsNewsLoaded(false);
      return;
    }

    setIsNewsLoaded(false);

    const newsRef = ref(database, 'news');

    return onValue(
      newsRef,
      (snapshot) => {
        setNews(getNewsItems(snapshot.val()));
        setIsNewsLoaded(true);
      },
      (error) => {
        const errorCode = 'code' in error ? error.code : 'unknown';

        console.error('News listener failed:', errorCode, error.message);
        setNews([]);
        setIsNewsLoaded(true);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!database) {
      setEvents([]);
      setIsEventsLoaded(true);
      return;
    }

    if (!user) {
      setEvents([]);
      setIsEventsLoaded(false);
      return;
    }

    setIsEventsLoaded(false);

    const eventsRef = ref(database, 'events');

    return onValue(
      eventsRef,
      (snapshot) => {
        setEvents(getEventItems(snapshot.val()));
        setIsEventsLoaded(true);
      },
      (error) => {
        const errorCode = 'code' in error ? error.code : 'unknown';

        console.error('Events listener failed:', errorCode, error.message);
        setEvents([]);
        setIsEventsLoaded(true);
      }
    );
  }, [user]);

  const value = useMemo(
    () => ({
      authEmail: user?.email ?? '',
      eventDates: events
        .map(getEventDateKey)
        .filter((dateKey): dateKey is string => dateKey !== null),
      events,
      firstNews: news[0] ?? null,
      isEventsLoaded,
      isNewsLoaded,
      news,
      professorName,
      userProfile,
    }),
    [events, isEventsLoaded, isNewsLoaded, news, professorName, user, userProfile]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);

  if (!value) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }

  return value;
}
