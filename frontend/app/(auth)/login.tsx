import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isWideScreen = width >= 768;

export default function LoginScreen() {
  const SNAPSHROOM_EMAIL = 'snapshroom.official@gmail.com';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deactivatedModalVisible, setDeactivatedModalVisible] = useState(false);
  const [deactivatedReason, setDeactivatedReason] = useState('');

  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const { showToast } = useToast();

  const passwordInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleLogin = async () => {
    clearError();

    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email', 'error');
      return;
    }

    if (!password) {
      showToast('Password is required', 'error');
      return;
    }

    try {
      await login({ email, password });
      showToast('Login successful!', 'success');
      router.replace('/');
    } catch (err: any) {
      const code: string = err?.code || '';
      if (code === 'email_not_verified') {
        showToast(
          err.message || 'Please verify your email before logging in. Check your inbox for the verification link.',
          'error',
          5000
        );
      } else if (code === 'account_disabled') {
        setDeactivatedReason(err?.deactivation_reason || '');
        setDeactivatedModalVisible(true);
      } else {
        showToast(err.message || 'Login failed. Please try again.', 'error');
      }
    }
  };

  const handleGuestLogin = () => {
    router.replace('/');
  };

  const navigateToSignUp = () => {
    router.push('/(auth)/register');
  };

  /* ─── Deactivation Modal ─────────────────────────────────────────────────── */
  const DeactivatedModal = () => (
    <Modal
      visible={deactivatedModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setDeactivatedModalVisible(false)}
    >
      <View style={styles.deactOverlay}>
        <View style={styles.deactCard}>
          {/* Header */}
          <View style={styles.deactHeader}>
            <Ionicons name="ban" size={32} color="#FFFFFF" />
            <Text style={styles.deactHeaderTitle}>Account Deactivated</Text>
          </View>

          {/* Body */}
          <View style={styles.deactBody}>
            <Text style={styles.deactBodyText}>
              Your account has been deactivated by an administrator.
            </Text>

            {/* Reason block */}
            {deactivatedReason ? (
              <View style={styles.deactReasonBox}>
                <Text style={styles.deactReasonLabel}>REASON</Text>
                <Text style={styles.deactReasonText}>{deactivatedReason}</Text>
              </View>
            ) : null}

            {/* Contact block */}
            <View style={styles.deactContactBox}>
              <Ionicons name="mail-outline" size={16} color="#3A6BC9" style={{ marginRight: 6 }} />
              <Text style={styles.deactContactText}>
                For assistance, contact us at{' '}
                <Text style={styles.deactContactEmail}>{SNAPSHROOM_EMAIL}</Text>
              </Text>
            </View>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.deactCloseBtn}
            onPress={() => setDeactivatedModalVisible(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.deactCloseBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ─── WEB LAYOUT ─────────────────────────────────────────────────────────────
  if (isWideScreen) {
    return (
      <>
      <DeactivatedModal />
      <View style={styles.webRoot}>
        {/* Left hero panel */}
        <LinearGradient colors={['#3A5A28', '#5A8040', '#7BA05B']} style={styles.webHero}>
          <View style={styles.webHeroInner}>
            <LinearGradient colors={['#7BA05B', '#5A8040']} style={styles.webHeroIconGradient}>
              <Ionicons name="leaf" size={48} color="#FFFFFF" />
            </LinearGradient>
            <ThemedText style={styles.webHeroTitle}>SnapShroom</ThemedText>
            <ThemedText style={styles.webHeroSubtitle}>
              Sign in to continue your mushroom journey
            </ThemedText>
          </View>
        </LinearGradient>

        {/* Right form panel */}
        <ScrollView
          contentContainerStyle={styles.webFormScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.webCard}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#7BA05B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA897"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#7BA05B" style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA897"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#7BA05B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <ThemedText style={styles.forgotPasswordText}>Forgot Password?</ThemedText>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isLoading ? ['#B5C9A7', '#A3B895'] : ['#7BA05B', '#5A8040']}
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <ThemedText style={styles.submitButtonText}>Sign In</ThemedText>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Guest Login */}
            <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
              <Ionicons name="person-outline" size={20} color="#7BA05B" />
              <ThemedText style={styles.guestText}>Continue as Guest</ThemedText>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <ThemedText style={styles.signupText}>Don't have an account? </ThemedText>
              <TouchableOpacity onPress={navigateToSignUp}>
                <ThemedText style={styles.signupLink}>Sign Up</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
      </>
    );
  }

  // ─── MOBILE LAYOUT (original — completely untouched) ────────────────────────
  return (
    <>
    <DeactivatedModal />
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#7BA05B', '#5A8040']}
              style={styles.iconGradient}
            >
              <Ionicons name="leaf" size={isSmallScreen ? 40 : 48} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <ThemedText style={styles.title}>Welcome Back</ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign in to continue your mushroom journey
          </ThemedText>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#7BA05B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA897"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#7BA05B" style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9CA897"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#7BA05B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword}>
            <ThemedText style={styles.forgotPasswordText}>Forgot Password?</ThemedText>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isLoading ? ['#B5C9A7', '#A3B895'] : ['#7BA05B', '#5A8040']}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <ThemedText style={styles.submitButtonText}>
                    Sign In
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Guest Login */}
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
            <Ionicons name="person-outline" size={20} color="#7BA05B" />
            <ThemedText style={styles.guestText}>Continue as Guest</ThemedText>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <ThemedText style={styles.signupText}>Don't have an account? </ThemedText>
            <TouchableOpacity onPress={navigateToSignUp}>
              <ThemedText style={styles.signupLink}>Sign Up</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  // ── MOBILE (original, not changed at all) ─────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#F8FAF6',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: isSmallScreen ? 80 : 96,
    height: isSmallScreen ? 80 : 96,
    borderRadius: isSmallScreen ? 40 : 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: '700',
    color: '#1E2B1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#5F6B59',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2B1A',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EDE0',
    paddingHorizontal: 12,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E2B1A',
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#7BA05B',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5EDE0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#9CA897',
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5EDE0',
    gap: 10,
    marginBottom: 12,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A4D33',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  guestText: {
    fontSize: 15,
    color: '#7BA05B',
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  signupText: {
    fontSize: 15,
    color: '#5F6B59',
  },
  signupLink: {
    fontSize: 15,
    color: '#7BA05B',
    fontWeight: '600',
  },

  // ── Deactivated Account Modal ─────────────────────────────────────────────
  deactOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deactCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  deactHeader: {
    backgroundColor: '#C94040',
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    flexDirection: 'row',
  },
  deactHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  deactBody: {
    padding: 24,
  },
  deactBodyText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    marginBottom: 16,
  },
  deactReasonBox: {
    backgroundColor: '#FFF3F3',
    borderLeftWidth: 3,
    borderLeftColor: '#C94040',
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  deactReasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C94040',
    letterSpacing: 0.08,
    marginBottom: 4,
  },
  deactReasonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    lineHeight: 20,
  },
  deactContactBox: {
    backgroundColor: '#EEF3FF',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deactContactText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
    lineHeight: 19,
  },
  deactContactEmail: {
    color: '#3A6BC9',
    fontWeight: '600',
  },
  deactCloseBtn: {
    backgroundColor: '#C94040',
    paddingVertical: 16,
    alignItems: 'center',
  },
  deactCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── WEB ONLY ──────────────────────────────────────────────────────────────
  webRoot: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100vh' as any,
    backgroundColor: '#F0F4ED',
  },
  webHero: {
    width: '45%',
    minHeight: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  webHeroInner: {
    alignItems: 'center',
  },
  webHeroIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webHeroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  webHeroSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 26,
    textAlign: 'center',
  },
  webFormScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    shadowColor: '#3A5A28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E8F0E3',
  },
});