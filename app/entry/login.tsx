import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, CornerRadius, Fonts, Spacing } from '@/constants/theme';
import { setRememberMePreference } from '@/src/auth-storage';
import { auth } from '@/src/firebase';

export default function LoginScreen() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Credenciais incompletas', 'Informe e-mail e senha para entrar.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await setRememberMePreference(rememberMe);
      router.replace('/hub/home');
    } catch (error) {
      if (error instanceof FirebaseError) {
        Alert.alert('Erro ao entrar', getLoginErrorMessage(error.code));
      } else {
        Alert.alert('Erro ao entrar', 'Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert('Informe seu e-mail', 'Digite seu e-mail no campo acima para receber o link de recuperação.');
      return;
    }

    setIsResettingPassword(true);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        'E-mail enviado',
        'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
      );
    } catch (error) {
      if (error instanceof FirebaseError) {
        Alert.alert('Não foi possível enviar', getPasswordResetErrorMessage(error.code));
      } else {
        Alert.alert('Não foi possível enviar', 'Tente novamente em alguns instantes.');
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}>
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <Image
            source={require('@/assets/svg/logo-adserra.svg')}
            style={styles.logo}
            contentFit="contain"
            accessible
            accessibilityLabel="ADSerra"
          />
        </View>

        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Insira suas credenciais:</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>E-mail:</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="email" size={Fonts.title} color={Colors.inputIcon} />
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="example@email.com.br"
              placeholderTextColor={Colors.placeholderText}
              style={styles.input}
              value={email}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Senha:</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="lock" size={Fonts.title} color={Colors.inputIcon} />
            <TextInput
              autoCapitalize="none"
              placeholder="****************"
              placeholderTextColor={Colors.placeholderText}
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              style={styles.input}
              value={password}
            />
            <TouchableOpacity
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              hitSlop={10}
              onPress={() => setShowPassword((value) => !value)}>
              <MaterialIcons
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={Fonts.title}
                color={Colors.inputIcon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
            onPress={() => setRememberMe((value) => !value)}
            style={styles.rememberRow}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <MaterialIcons name="check" size={Fonts.bigSize} color={Colors.card} />}
            </View>
            <Text style={styles.optionText}>Lembrar de mim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            disabled={isResettingPassword}
            onPress={handleForgotPassword}>
            <Text style={[styles.link, isResettingPassword && styles.linkDisabled]}>
              {isResettingPassword ? 'Enviando...' : 'Esqueceu sua senha?'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={handleLogin}>
          <LinearGradient
            colors={Colors.buttonGradient}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <Text style={styles.submitText}>{isSubmitting ? 'ENTRANDO...' : 'ENTRAR'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Não faz parte? </Text>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={() => router.push('/entry/register')}>
            <Text style={styles.registerLink}>Solicitar registro</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl2,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    minHeight: 570,
    justifyContent: 'center',
    borderRadius: CornerRadius.xl3,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.xl4,
    paddingVertical: Spacing.xl5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: Spacing.xl },
    shadowOpacity: 0.08,
    shadowRadius: CornerRadius.xl5,
    elevation: Spacing.xs,
  },
  logoRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl4,
  },
  logo: {
    width: 170,
    height: 38,
  },
  title: {
    color: Colors.linkText,
    fontFamily: Fonts.manropeBold,
    fontSize: Fonts.title,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.mutedText,
    fontFamily: Fonts.inter,
    fontSize: Fonts.mediumSize,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl2,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    color: Colors.labelText,
    fontFamily: Fonts.inter,
    fontSize: Fonts.mediumSize,
    marginBottom: Spacing.sm,
  },
  inputBox: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.fieldBorder,
    borderRadius: CornerRadius.md,
    backgroundColor: Colors.fieldBackground,
    paddingHorizontal: Spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 54,
    color: Colors.text,
    fontFamily: Fonts.inter,
    fontSize: Fonts.minorSize,
    paddingVertical: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    marginBottom: Spacing.xl3,
  },
  rememberRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.checkboxBorder,
    borderRadius: CornerRadius.xs,
    backgroundColor: Colors.card,
    marginRight: Spacing.sm,
  },
  checkboxChecked: {
    borderColor: Colors.tint,
    backgroundColor: Colors.tint,
  },
  optionText: {
    color: Colors.mutedText,
    fontFamily: Fonts.inter,
    fontSize: Fonts.mediumSize,
  },
  link: {
    color: Colors.linkText,
    fontFamily: Fonts.interSemiBold,
    fontSize: Fonts.minorSize,
    textDecorationLine: 'underline',
  },
  linkDisabled: {
    opacity: 0.6,
  },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CornerRadius.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: Colors.card,
    fontFamily: Fonts.manropeBold,
    fontSize: Fonts.bigSize,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl6,
  },
  registerText: {
    color: Colors.subtleText,
    fontFamily: Fonts.inter,
    fontSize: Fonts.mediumSize,
  },
  registerLink: {
    color: Colors.secondaryLinkText,
    fontFamily: Fonts.inter,
    fontSize: Fonts.mediumSize,
    textDecorationLine: 'underline',
  },
});

function getLoginErrorMessage(code: string) {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-disabled':
      return 'Este usuário foi desativado.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha inválidos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.';
    default:
      return 'Não foi possível entrar. Tente novamente.';
  }
}

function getPasswordResetErrorMessage(code: string) {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-disabled':
      return 'Este usuário foi desativado.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.';
    default:
      return 'Não foi possível enviar o e-mail de recuperação.';
  }
}
