import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, CornerRadius, Fonts, Spacing } from '@/constants/theme';
import { auth, database } from '@/src/firebase';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Dados incompletos', 'Preencha nome, e-mail, senha e confirmação de senha.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Senha inválida', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Senhas diferentes', 'Confirme a senha corretamente.');
      return;
    }

    if (!database) {
      Alert.alert('Banco indisponível', 'Não foi possível acessar o Realtime Database.');
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const { user } = credential;

      await updateProfile(user, { displayName: trimmedName });
      await set(ref(database, `users/${user.uid}`), {
        birthday: '',
        department: '',
        name: trimmedName,
        phone: '',
        since: new Date().toISOString(),
      });
      await sendEmailVerification(user);
      await signOut(auth);
      setIsRegistered(true);
    } catch (error) {
      if (error instanceof FirebaseError) {
        Alert.alert('Não foi possível registrar', getRegisterErrorMessage(error.code));
      } else {
        Alert.alert('Não foi possível registrar', 'Tente novamente em alguns instantes.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.replace('/entry/login');
  };

  if (isRegistered) {
    return (
      <View style={styles.centerView}>
        <View style={styles.card}>
          <TouchableOpacity accessibilityRole="button" hitSlop={12} onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={Fonts.title} color={Colors.neutral[500]} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Image
              source={require('@/assets/svg/logo-adserra.svg')}
              style={styles.logo}
              contentFit="contain"
              accessible
              accessibilityLabel="ADSerra"
            />
          </View>

          <View style={styles.successContent}>
            <View style={styles.successTextBlock}>
              <Text style={styles.title}>Registro realizado!</Text>
              <Text style={styles.subtitle}>Verifique seu e-mail para ativar sua conta.</Text>
            </View>

            <View style={styles.successIconWrap}>
              <MaterialIcons name="check" size={60} color={Colors.ocean[600]} />
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={handleBack} style={styles.fullWidthButton}>
              <LinearGradient
                colors={Colors.buttonGradient}
                style={styles.submitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.submitText}>VOLTAR</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.formScroll}
        contentContainerStyle={styles.formScrollContent}>
        <View style={styles.card}>
          <TouchableOpacity accessibilityRole="button" hitSlop={12} onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={Fonts.title} color={Colors.neutral[500]} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Image
              source={require('@/assets/svg/logo-adserra.svg')}
              style={styles.logo}
              contentFit="contain"
              accessible
              accessibilityLabel="ADSerra"
            />
          </View>

          <Text style={styles.title}>Registro</Text>
          <Text style={styles.subtitle}>Insira suas credenciais:</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome:</Text>
            <View style={styles.inputBox}>
              <MaterialIcons name="person" size={Fonts.title} color={Colors.inputIcon} />
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                onChangeText={setName}
                placeholder="Nome"
                placeholderTextColor={Colors.placeholderText}
                style={styles.input}
                value={name}
              />
            </View>
          </View>

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
                onChangeText={setPassword}
                placeholder="****************"
                placeholderTextColor={Colors.placeholderText}
                secureTextEntry={!showPassword}
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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirmar senha:</Text>
            <View style={styles.inputBox}>
              <MaterialIcons name="lock" size={Fonts.title} color={Colors.inputIcon} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setConfirmPassword}
                placeholder="****************"
                placeholderTextColor={Colors.placeholderText}
                secureTextEntry={!showConfirmPassword}
                style={styles.input}
                value={confirmPassword}
              />
              <TouchableOpacity
                accessibilityLabel={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                hitSlop={10}
                onPress={() => setShowConfirmPassword((value) => !value)}>
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                  size={Fonts.title}
                  color={Colors.inputIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.85} disabled={isSubmitting} onPress={handleRegister}>
            <LinearGradient
              colors={Colors.buttonGradient}
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Text style={styles.submitText}>{isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl2,
  },
  keyboardView: {
    flex: 1,
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl2,
    paddingVertical: Spacing.xl2,
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    minHeight: 570,
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
  backButton: {
    position: 'absolute',
    left: Spacing.xl3,
    top: Spacing.xl3,
    zIndex: 1,
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
    minHeight: 48,
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
    color: Colors.text,
    fontFamily: Fonts.inter,
    fontSize: Fonts.minorSize,
    paddingVertical: 0,
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
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successTextBlock: {
    alignItems: 'center',
  },
  successIconWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.ocean[600],
    borderRadius: CornerRadius.full,
  },
  fullWidthButton: {
    width: '100%',
  },
});

function getRegisterErrorMessage(code: string) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.';
    case 'PERMISSION_DENIED':
      return 'Sem permissão para salvar o usuário no Realtime Database.';
    default:
      return 'Não foi possível concluir o registro.';
  }
}
