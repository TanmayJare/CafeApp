import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/staff-login', { email, password });
      if (res.data.user.role !== 'RIDER' && res.data.user.role !== 'SUPER_ADMIN') {
        setError('Rider portal only. Use the staff-web for staff accounts.');
        return;
      }
      await login(res.data.accessToken, res.data.user, res.data.refreshToken);
      router.replace('/active');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.brand}>CaféConnect</Text>
      <Text style={s.sub}>Rider Portal</Text>

      <View style={s.card}>
        <TextInput
          style={s.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#8A7D74"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#8A7D74"
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C0F08', alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand: { fontFamily: 'Inter_600SemiBold', fontSize: 26, color: '#FBF6EE', marginBottom: 4 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8A7D74', marginBottom: 40 },
  card: { width: '100%', backgroundColor: '#FBF6EE', borderRadius: 20, padding: 24, gap: 14 },
  input: {
    borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 12, padding: 14,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#1A1410', backgroundColor: '#fff',
  },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#991B1B' },
  btn: { backgroundColor: '#1C0F08', borderRadius: 28, padding: 16, alignItems: 'center' },
  btnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
