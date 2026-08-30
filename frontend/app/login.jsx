import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import {
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  useAuthRequest,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import SahaiHeader from '../components/SahaiHeader';
import Backdrop from '../components/Backdrop';
import { useBreakpoint } from '../utils/layout';
import { useReveal } from '../utils/motion';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import PrimaryButton from '../components/PrimaryButton';
import ErrorNotice from '../components/ErrorNotice';
import Colors from '../constants/Colors';
import Config from '../constants/Config';
import { Spacing, Radius, Typography, FontSize, Motion } from '../constants/Theme';
import { useAuth } from '../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

/**
 * Login and Register, one route, two modes.
 *
 * member_id IS the username. There is no separate username field, because the
 * backend has no such concept -- inventing one would mean the label on screen
 * and the field on the wire disagreed.
 *
 * The setup key appears ONLY when registering as a treasurer. It is the shared
 * secret that stops any visitor granting themselves read access to the whole
 * group's finances. It is not a password, not an API key, and a member never
 * needs to see it -- so it is not rendered until the role makes it relevant.
 */
export default function LoginScreen() {
  const { signIn, signUp, signInWithAccessToken, signedIn, notice, clearNotice } = useAuth();
  const { isDesktop, maxWidth } = useBreakpoint();

  const [mode, setMode] = useState('login'); // login | register
  const [memberId, setMemberId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [setupKey, setSetupKey] = useState('');

  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const oidcEnabled = Config.AUTH_MODE === 'oidc';
  // Keycloak exposes these standard endpoints for every realm. Constructing
  // them avoids an eager discovery fetch crashing the screen when Docker or
  // Keycloak is temporarily stopped.
  const discovery = useMemo(() => ({
    authorizationEndpoint: `${Config.KEYCLOAK_ISSUER}/protocol/openid-connect/auth`,
    tokenEndpoint: `${Config.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
    revocationEndpoint: `${Config.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`,
  }), []);
  // Return to this screen so the same AuthSession instance can exchange the
  // authorization code with its PKCE verifier.
  const redirectUri = makeRedirectUri({ scheme: 'sahai', path: 'login' });
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: Config.KEYCLOAK_CLIENT_ID,
      responseType: ResponseType.Code,
      usePKCE: true,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      extraParams: { prompt: 'login' },
    },
    discovery
  );

  const registering = mode === 'register';

  // Already signed in (or just signed in): there is nothing to do here.
  useEffect(() => {
    if (signedIn) router.replace('/(tabs)/home');
  }, [signedIn]);

  useEffect(() => {
    if (!oidcEnabled || response?.type !== 'success' || !request?.codeVerifier || !discovery) return;
    let active = true;
    setBusy(true);
    setFailure(null);
    exchangeCodeAsync(
      {
        clientId: Config.KEYCLOAK_CLIENT_ID,
        code: response.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      discovery
    )
      .then(async (tokens) => {
        if (!active) return;
        await signInWithAccessToken(tokens.accessToken);
        router.replace('/(tabs)/home');
      })
      .catch((error) => active && setFailure(error))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [response, request, discovery, oidcEnabled, redirectUri, signInWithAccessToken]);

  const switchMode = (next) => {
    setMode(next);
    setErrors({});
    setFailure(null);
    clearNotice();
  };

  const validate = () => {
    const found = {};
    if (!memberId.trim()) found.memberId = 'Member ID is required.';
    if (!password) found.password = 'Password is required.';
    else if (registering && password.length < 4) {
      found.password = 'Password must be at least 4 characters.';
    }
    if (registering && !name.trim()) found.name = 'Name is required.';
    if (registering && role === 'treasurer' && !setupKey.trim()) {
      found.setupKey = 'A setup key is required for a treasurer account.';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    if (busy || !validate()) return;

    setBusy(true);
    setFailure(null);
    clearNotice();

    try {
      if (registering) {
        await signUp({ memberId, name, password, role, setupKey });
      } else {
        await signIn({ memberId, password });
      }
      router.replace('/(tabs)/home');
    } catch (error) {
      // 403 on register means the setup key was wrong; the backend's own
      // sentence says so more precisely than anything written here would.
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SahaiHeader title={registering ? 'Create Account' : 'Log In'} subtitle="SahAI" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, isDesktop && styles.shellDesktop]}>
            {isDesktop && (
              <View style={styles.brandPane}>
                <Backdrop variant="field" height={420} />
                <Text style={styles.brandEyebrow}>SahAI</Text>
                <Text style={styles.brandTitle}>From Field{'\n'}to Fund</Text>
                <Text style={styles.brandBody}>
                  Better crop decisions. Clearer group finances.
                </Text>
              </View>
            )}

            <View style={[styles.inner, { maxWidth: isDesktop ? 420 : '100%' }]}>
            <View style={styles.intro}>
              <Text style={styles.title}>
                {registering ? 'Join your group' : 'Welcome back'}
              </Text>
              <Text style={styles.subtitle}>
                {registering
                  ? 'Create your account to track savings and request loans.'
                  : 'Log in to see your savings, loans and group records.'}
              </Text>
            </View>

            {/* Mode switch ------------------------------------------- */}
            <View style={styles.switcher}>
              {[
                { key: 'login', label: 'Log in' },
                { key: 'register', label: 'Register' },
              ].map((tab) => {
                const active = mode === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => switchMode(tab.key)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.switchTab, active && styles.switchTabActive]}
                  >
                    <Text style={[styles.switchText, active && styles.switchTextActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!!notice && (
              <ErrorNotice message={notice} error={{ kind: 'invalid' }} />
            )}
            {!!failure && <ErrorNotice error={failure} />}

            {oidcEnabled ? (
              <PrimaryButton
                label="Sign in with organization account"
                loading={busy}
                loadingLabel="Opening secure sign-in..."
                disabled={!request || !discovery}
                onPress={() => promptAsync()}
              />
            ) : <View style={styles.form}>
              <InputField
                label="Member ID"
                value={memberId}
                onChangeText={(text) => {
                  setMemberId(text);
                  setErrors((prev) => ({ ...prev, memberId: undefined }));
                }}
                placeholder="e.g. lakshmi"
                error={errors.memberId}
                helper="This is the ID your treasurer gave you."
                required
                autoCapitalize="none"
                editable={!busy}
              />

              {registering && (
                <InputField
                  label="Your Name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Lakshmi"
                  error={errors.name}
                  required
                  autoCapitalize="words"
                  editable={!busy}
                />
              )}

              <InputField
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Your PIN or password"
                error={errors.password}
                required
                secureTextEntry
                autoCapitalize="none"
                editable={!busy}
              />

              {registering && (
                <SelectField
                  label="Register as"
                  value={role}
                  onChange={(next) => {
                    setRole(next);
                    setErrors((prev) => ({ ...prev, setupKey: undefined }));
                  }}
                  options={[
                    { value: 'member', label: 'Member' },
                    { value: 'treasurer', label: 'Treasurer' },
                  ]}
                  disabled={busy}
                  required
                />
              )}

              {/* Only a treasurer registration needs this, so it only exists
                  then -- a member should never be asked for a key. */}
              {registering && role === 'treasurer' && (
                <View style={styles.setupBlock}>
                  <InputField
                    label="Setup Key"
                    value={setupKey}
                    onChangeText={(text) => {
                      setSetupKey(text);
                      setErrors((prev) => ({ ...prev, setupKey: undefined }));
                    }}
                    placeholder="Provided by whoever runs the server"
                    error={errors.setupKey}
                    required
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!busy}
                  />
                  <View style={styles.hintRow}>
                    <Ionicons name="information-circle" size={16} color={Colors.info} />
                    <Text style={styles.hintText}>
                      A treasurer can see every member&apos;s finances, so the account
                      cannot be created without this key.
                    </Text>
                  </View>
                </View>
              )}
            </View>}

            {!oidcEnabled && <PrimaryButton
              label={registering ? 'Create account' : 'Log in'}
                            loading={busy}
              loadingLabel={registering ? 'Creating account...' : 'Signing you in...'}
              onPress={submit}
            />}

            <View style={styles.publicNote}>
              <Ionicons name="leaf" size={16} color={Colors.secondary} />
              <Text style={styles.publicNoteText}>
                Crop Advisor and Fertilizer Advice work without an account.
              </Text>
            </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.section,
    flexGrow: 1,
    justifyContent: 'center',
  },
  shell: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  shellDesktop: {
    maxWidth: 980,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.section,
  },
  brandPane: {
    flex: 1,
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  brandEyebrow: { ...Typography.sectionLabel, color: Colors.accent },
  brandTitle: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -1.4,
  },
  brandBody: { ...Typography.bodySmall, lineHeight: 22, maxWidth: 300 },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  title: { ...Typography.title },
  subtitle: { ...Typography.bodySmall, lineHeight: 21 },
  switcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchTab: {
    paddingVertical: Spacing.md,
    paddingRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  switchTabActive: {
    borderBottomColor: Colors.secondary,
  },
  switchText: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  switchTextActive: { color: Colors.primary },
  form: { gap: Spacing.lg },
  setupBlock: { gap: Spacing.sm },
  hintRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: Colors.infoSoft,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  hintText: {
    ...Typography.caption,
    color: Colors.info,
    flex: 1,
    lineHeight: 17,
  },
  publicNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  publicNoteText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 17,
  },
});
