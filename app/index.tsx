import { Redirect } from 'expo-router';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { getRememberMePreference } from '@/src/auth-storage';
import { auth } from '@/src/firebase';

export default function IndexScreen() {
  const [initialRoute, setInitialRoute] = useState<'/home' | '/login' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      const rememberMe = await getRememberMePreference();

      if (user && rememberMe) {
        setInitialRoute('/home');
        return;
      }

      if (user && !rememberMe) {
        await signOut(auth);
      }

      setInitialRoute('/login');
    });

    return unsubscribe;
  }, []);

  if (!initialRoute) {
    return null;
  }

  return <Redirect href={initialRoute} />;
}
