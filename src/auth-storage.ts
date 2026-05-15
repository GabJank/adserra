import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBER_ME_KEY = '@adserra/remember-me';

export async function setRememberMePreference(rememberMe: boolean) {
  try {
    await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  } catch {
    // Expo Go/dev clients can briefly report storage as unavailable after native deps change.
  }
}

export async function getRememberMePreference() {
  try {
    return (await AsyncStorage.getItem(REMEMBER_ME_KEY)) === 'true';
  } catch {
    return false;
  }
}
