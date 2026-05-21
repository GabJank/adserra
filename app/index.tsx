import { Redirect } from 'expo-router';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { getRememberMePreference, setRememberMePreference } from '@/src/auth-storage';
import { auth } from '@/src/firebase';

export default function IndexScreen() {
  const [initialRoute, setInitialRoute] = useState<'/home' | '/login' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      //await setRememberMePreference(false); //<- Descomente esta linha para limpar a preferência de "Lembrar-me" a cada inicialização (útil para testes)
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
