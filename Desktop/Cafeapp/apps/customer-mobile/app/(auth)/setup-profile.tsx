import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { C, F, R, S } from '../../lib/tokens';

export default function SetupProfileScreen() {
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setError(''); setLoading(true);
    try {
      await api.patch('/users/me', { name: name.trim(), phone: phone.trim() || undefined });
      updateUser({ name: name.trim(), phone: phone.trim() || null });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to save profile');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.heading}>Almost there!</Text>
        <Text style={styles.sub}>Tell us your name so we can personalise your orders.</Text>

        <Text style={styles.label}>Full name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={C.ink3}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="+91 98765 43210"
          placeholderTextColor={C.ink3}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.btnText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.espresso, justifyContent: 'flex-end' },
  card: {
    backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
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
  error: { fontFamily: F.sans, fontSize: 13, color: C.redText, marginBottom: S.md },
  btn: {
    backgroundColor: C.espresso, borderRadius: R.lg,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: F.sansSb, fontSize: 15, color: C.white },
});
