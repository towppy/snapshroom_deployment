import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isWideScreen = width >= 768;

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Focus states
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const { signup, isLoading, error, clearError } = useAuth();
  const { showToast } = useToast();

  // Refs for input navigation
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // ---------- VALIDATION ----------
  const validateForm = () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Enter a valid email');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    if (password.trim() !== confirmPassword.trim()) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  // ---------- SUBMIT ----------
  const handleRegister = async () => {
    if (isLoading) return;
    if (!validateForm()) return;

    clearError();

    try {
      await signup({
        email: email.trim(),
        password: password.trim(),
        confirmPassword: confirmPassword.trim(),
        username: username.trim(),
        name: username.trim(),
      });

      showToast('Account created successfully!', 'success');

      Alert.alert('Success', 'Account created successfully', [
        {
          text: 'Continue',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.startsWith('Account created!')) {
        // Registration succeeded but email verification required
        clearError();
        showToast('Account created!', 'success');
        Alert.alert(
          'Verify Your Email',
          msg.replace('Account created! ', ''),
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      }
      // other errors already shown via AuthContext error state
    }
  };

  const handleUsernameFocus = () => {
    setUsernameFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 200);
  };

  const handleEmailFocus = () => {
    setEmailFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 50, animated: true });
    }, 200);
  };

  const handlePasswordFocus = () => {
    setPasswordFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 100, animated: true });
    }, 200);
  };

  const handleConfirmPasswordFocus = () => {
    setConfirmPasswordFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 150, animated: true });
    }, 200);
  };

  // ─── WEB LAYOUT (form left, hero right) ─────────────────────────────────────
  if (isWideScreen) {
    return (
      <View style={styles.webRoot}>
        {/* Left form panel */}
        <ScrollView
          contentContainerStyle={styles.webFormScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.webCard}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Create Account</ThemedText>
              <ThemedText style={styles.cardSubtitle}>
                Fill in the details below to get started
              </ThemedText>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                </View>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Username</ThemedText>
              <View style={[styles.inputContainer, usernameFocused && styles.inputContainerFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person" size={20} color={usernameFocused ? '#7BA05B' : '#6B7C61'} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username"
                  placeholderTextColor="#9CA897"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={handleUsernameFocus}
                  onBlur={() => setUsernameFocused(false)}
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Email Address</ThemedText>
              <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="mail" size={20} color={emailFocused ? '#7BA05B' : '#6B7C61'} />
                </View>
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#9CA897"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={handleEmailFocus}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed" size={20} color={passwordFocused ? '#7BA05B' : '#6B7C61'} />
                </View>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Create a password (min. 6 chars)"
                  placeholderTextColor="#9CA897"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={handlePasswordFocus}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7C61" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Confirm Password</ThemedText>
              <View style={[styles.inputContainer, confirmPasswordFocused && styles.inputContainerFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed" size={20} color={confirmPasswordFocused ? '#7BA05B' : '#6B7C61'} />
                </View>
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9CA897"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={handleConfirmPasswordFocus}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={password.length >= 6 ? '#22C55E' : '#9CA897'}
                />
                <ThemedText style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
                  At least 6 characters
                </ThemedText>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={password && confirmPassword && password === confirmPassword ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={password && confirmPassword && password === confirmPassword ? '#22C55E' : '#9CA897'}
                />
                <ThemedText
                  style={[
                    styles.requirementText,
                    password && confirmPassword && password === confirmPassword && styles.requirementMet,
                  ]}
                >
                  Passwords match
                </ThemedText>
              </View>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.submitButton, (isLoading) && styles.submitButtonDisabled]}
              onPress={handleRegister}
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
                    <ThemedText style={styles.submitButtonText}>Create Account</ThemedText>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signinContainer}>
              <ThemedText style={styles.signinText}>Already have an account? </ThemedText>
              <TouchableOpacity
                onPress={() => { clearError(); router.push('/(auth)/login'); }}
                disabled={isLoading}
              >
                <ThemedText style={styles.signinLink}>Sign in</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.webFooter}>
              <ThemedText style={styles.footerText}>
                By creating an account, you agree to our{' '}
                <ThemedText style={styles.footerLink}>Terms of Service</ThemedText>
                {' '}and{' '}
                <ThemedText style={styles.footerLink}>Privacy Policy</ThemedText>
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        {/* Right hero panel */}
        <LinearGradient colors={['#3A5A28', '#5A8040', '#7BA05B']} style={styles.webHero}>
          <View style={styles.webHeroInner}>
            <LinearGradient colors={['#7BA05B', '#5A8040']} style={styles.webHeroIconGradient}>
              <Ionicons name="leaf" size={48} color="#FFFFFF" />
            </LinearGradient>
            <ThemedText style={styles.webHeroTitle}>SnapShroom</ThemedText>
            <ThemedText style={styles.webHeroSubtitle}>
              Create your account to start identifying mushrooms
            </ThemedText>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ─── MOBILE LAYOUT (original — completely untouched) ────────────────────────
  return (
    <View style={styles.container}>
      {/* Background with Gradient */}
      <LinearGradient
        colors={['#F8FAF6', '#E8F0E3', '#F8FAF6']}
        style={styles.backgroundGradient}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        {/* Logo & Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#7BA05B', '#5A8040']}
              style={styles.logoGradient}
            >
              <Ionicons name="leaf" size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <ThemedText style={styles.title}>Join SnapShroom</ThemedText>
          <ThemedText style={styles.subtitle}>
            Create your account to start identifying mushrooms
          </ThemedText>
        </View>

        {/* Register Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Create Account</ThemedText>
            <ThemedText style={styles.cardSubtitle}>
              Fill in the details below to get started
            </ThemedText>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
              </View>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Username</ThemedText>
            <View
              style={[
                styles.inputContainer,
                usernameFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="person"
                  size={20}
                  color={usernameFocused ? '#7BA05B' : '#6B7C61'}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor="#9CA897"
                value={username}
                onChangeText={setUsername}
                onFocus={handleUsernameFocus}
                onBlur={() => setUsernameFocused(false)}
                editable={!isLoading}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailInputRef.current?.focus()}
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Email Address</ThemedText>
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="mail"
                  size={20}
                  color={emailFocused ? '#7BA05B' : '#6B7C61'}
                />
              </View>
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor="#9CA897"
                value={email}
                onChangeText={setEmail}
                onFocus={handleEmailFocus}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Password</ThemedText>
            <View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={passwordFocused ? '#7BA05B' : '#6B7C61'}
                />
              </View>
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Create a password (min. 6 chars)"
                placeholderTextColor="#9CA897"
                value={password}
                onChangeText={setPassword}
                onFocus={handlePasswordFocus}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6B7C61"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Confirm Password</ThemedText>
            <View
              style={[
                styles.inputContainer,
                confirmPasswordFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={confirmPasswordFocused ? '#7BA05B' : '#6B7C61'}
                />
              </View>
              <TextInput
                ref={confirmPasswordInputRef}
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor="#9CA897"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={handleConfirmPasswordFocus}
                onBlur={() => setConfirmPasswordFocused(false)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <View style={styles.requirementRow}>
              <Ionicons
                name={
                  password.length >= 6
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={16}
                color={password.length >= 6 ? '#22C55E' : '#9CA897'}
              />
              <ThemedText
                style={[
                  styles.requirementText,
                  password.length >= 6 && styles.requirementMet,
                ]}
              >
                At least 6 characters
              </ThemedText>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons
                name={
                  password &&
                  confirmPassword &&
                  password === confirmPassword
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={16}
                color={
                  password &&
                  confirmPassword &&
                  password === confirmPassword
                    ? '#22C55E'
                    : '#9CA897'
                }
              />
              <ThemedText
                style={[
                  styles.requirementText,
                  password &&
                    confirmPassword &&
                    password === confirmPassword &&
                    styles.requirementMet,
                ]}
              >
                Passwords match
              </ThemedText>
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isLoading) && styles.submitButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isLoading
                  ? ['#B5C9A7', '#A3B895']
                  : ['#7BA05B', '#5A8040']
              }
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <ThemedText style={styles.submitButtonText}>
                    Create Account
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signinContainer}>
            <ThemedText style={styles.signinText}>
              Already have an account?{' '}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                clearError();
                router.push('/(auth)/login');
              }}
              disabled={isLoading}
            >
              <ThemedText style={styles.signinLink}>Sign in</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            By creating an account, you agree to our{' '}
            <ThemedText style={styles.footerLink}>
              Terms of Service
            </ThemedText>
            {' '}and{' '}
            <ThemedText style={styles.footerLink}>Privacy Policy</ThemedText>
          </ThemedText>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ================= STYLES =================

const styles = StyleSheet.create({
  // ── MOBILE (original, not changed at all) ─────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#F8FAF6',
  },
  scrollView: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(123, 160, 91, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(90, 128, 64, 0.06)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 30 : 40,
    marginTop: isSmallScreen ? 10 : 0,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#7BA05B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGradient: {
    width: isSmallScreen ? 76 : 88,
    height: isSmallScreen ? 76 : 88,
    borderRadius: isSmallScreen ? 38 : 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: isSmallScreen ? 30 : 36,
    fontWeight: '900',
    color: '#3A4D33',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : 15,
    color: '#6B7C61',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: isSmallScreen ? 18 : 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: isSmallScreen ? 20 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.1)',
    marginBottom: 20,
  },
  cardHeader: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: isSmallScreen ? 22 : 24,
    fontWeight: '800',
    color: '#3A4D33',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#6B7C61',
    lineHeight: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5EDE0',
    gap: 10,
    marginBottom: 20,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A4D33',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  errorIconContainer: {
    marginRight: 10,
    marginTop: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A4D33',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF6',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5EDE0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerFocused: {
    borderColor: '#7BA05B',
    backgroundColor: '#FFFFFF',
    shadowColor: '#7BA05B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#3A4D33',
    fontWeight: '500',
    padding: 0,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  requirementsContainer: {
    backgroundColor: '#F8FAF6',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#9CA897',
    fontWeight: '500',
  },
  requirementMet: {
    color: '#22C55E',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#7BA05B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
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
    letterSpacing: 0.3,
  },
  signinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signinText: {
    fontSize: 14,
    color: '#6B7C61',
  },
  signinLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7BA05B',
  },
  footer: {
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA897',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontWeight: '600',
    color: '#7BA05B',
  },

  // ── WEB ONLY ──────────────────────────────────────────────────────────────
  webRoot: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100vh' as any,
    backgroundColor: '#F0F4ED',
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
  webFooter: {
    marginTop: 24,
  },
});