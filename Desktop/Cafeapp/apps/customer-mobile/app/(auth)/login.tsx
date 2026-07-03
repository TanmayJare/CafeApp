import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { C, F, R, S } from '../../lib/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cafeStatus, setCafeStatus] = useState<{ isOpen: boolean; closingTime: string } | null>(null);

  useEffect(() => {
    api.get('/cafe/config').then((r: any) => {
      setCafeStatus({ isOpen: r.data.isOpen, closingTime: r.data.closingTime });
    }).catch(() => {/* silently ignore — pill stays hidden */});
  }, []);

  const sendOtp = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Enter a valid email address'); return;
    }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setStep('otp');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, code: otp });
      const { accessToken, refreshToken, user } = res.data;
      await login(accessToken, user, refreshToken);
      if (!user.name) {
        router.replace('/(auth)/setup-profile');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Invalid or expired OTP');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.brandMark}>
          <Text style={styles.brandEmoji}>☕</Text>
        </View>
        <Text style={styles.brandName}>CaféConnect</Text>
        {cafeStatus !== null && (
          <View style={[styles.openPill, !cafeStatus.isOpen && styles.closedPill]}>
            <Text style={styles.openPillText}>
              {cafeStatus.isOpen
                ? `Open · Closes ${cafeStatus.closingTime}`
                : 'Currently Closed'}
            </Text>
          </View>
        )}
      </View>

      {/* Card */}
      <View style={styles.card}>
        {step === 'email' ? (
          <>
            <Text style={styles.heading}>Sign in</Text>
            <Text style={styles.sub}>We'll send a 6-digit code to your email</Text>

            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={C.ink3}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, (!email || loading) && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={!email || loading}
            >
              {loading
                ? <ActivityIndicator color={C.white} />
                : <Text style={styles.btnText}>Send verification code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Enter code</Text>
            <Text style={styles.sub}>Sent to <Text style={{ fontFamily: F.sansMd }}>{email}</Text></Text>

            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor={C.ink3}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="numeric"
              maxLength={6}
              autoComplete="one-time-code"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, (otp.length !== 6 || loading) && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={otp.length !== 6 || loading}
            >
              {loading
                ? <ActivityIndicator color={C.white} />
                : <Text style={styles.btnText}>Verify & Sign in</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep('email'); setOtp(''); setError(''); }}>
              <Text style={styles.back}>← Use a different email</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.espresso },
  hero: { flex: 0.42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xxl },
  brandMark: {
    width: 64, height: 64, backgroundColor: C.cream,
    borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', marginBottom: S.md,
  },
  brandEmoji: { fontSize: 32 },
  brandName: { fontFamily: F.serif, fontSize: 26, color: C.white, marginBottom: S.md },
  openPill: {
    backgroundColor: C.matcha, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: S.xs,
  },
  closedPill: {
    backgroundColor: '#c0392b',
  },
  openPillText: { fontFamily: F.sansMd, fontSize: 12, color: C.white },
  card: {
    flex: 0.58, backgroundColor: C.white,
    borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    paddingHorizontal: S.xxl, paddingTop: S.xxl, paddingBottom: S.xxxl,
  },
  heading: { fontFamily: F.serif, fontSize: 22, color: C.ink, marginBottom: S.xs },
  sub: { fontFamily: F.sans, fontSize: 14, color: C.ink3, marginBottom: S.xl },
  label: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2, marginBottom: S.xs },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    fontFamily: F.sans, fontSize: 15, color: C.ink, marginBottom: S.lg,
  },
  otpInput: { textAlign: 'center', letterSpacing: 12, fontSize: 24, fontFamily: F.mono },
  error: { fontFamily: F.sans, fontSize: 13, color: C.redText, marginBottom: S.md },
  btn: {
    backgroundColor: C.espresso, borderRadius: R.lg,
    paddingVertical: 16, alignItems: 'center', marginBottom: S.md,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: F.sansSb, fontSize: 15, color: C.white },
  back: { fontFamily: F.sans, fontSize: 13, color: C.ink3, textAlign: 'center', marginTop: S.xs },
});
