import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { C, F, R, S } from '../../lib/tokens';

/* ─── Edit profile sheet ─────────────────────────────────────────────────── */
function EditSheet({
  visible, name, phone, onClose, onSaved,
}: {
  visible: boolean; name: string; phone: string;
  onClose: () => void; onSaved: (n: string, p: string) => void;
}) {
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/me', { name: n.trim(), phone: p.trim() || undefined });
      onSaved(n.trim(), p.trim());
    } catch {}
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Edit profile</Text>
          <Text style={modal.lbl}>Name</Text>
          <TextInput style={modal.input} value={n} onChangeText={setN} placeholder="Your name" placeholderTextColor={C.ink3} />
          <Text style={modal.lbl}>Phone</Text>
          <TextInput style={modal.input} value={p} onChangeText={setP} placeholder="+91 98765 43210" placeholderTextColor={C.ink3} keyboardType="phone-pad" />
          <View style={{ flexDirection: 'row', gap: S.md, marginTop: S.xl }}>
            <TouchableOpacity style={modal.cancel} onPress={onClose}>
              <Text style={modal.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.save} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={C.white} /> : <Text style={modal.saveTxt}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderRadius: 20, padding: S.xxl, paddingBottom: 36 },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: S.xl },
  title: { fontFamily: F.serif, fontSize: 20, color: C.ink, marginBottom: S.xl },
  lbl: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2, marginBottom: S.xs },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    fontFamily: F.sans, fontSize: 15, color: C.ink, backgroundColor: C.surface,
    marginBottom: S.lg,
  },
  cancel: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, alignItems: 'center', paddingVertical: 14 },
  cancelTxt: { fontFamily: F.sansMd, fontSize: 15, color: C.ink2 },
  save: { flex: 2, backgroundColor: C.espresso, borderRadius: R.lg, alignItems: 'center', paddingVertical: 14 },
  saveTxt: { fontFamily: F.sansSb, fontSize: 15, color: C.white },
});

/* ─── Profile screen ─────────────────────────────────────────────────────── */
export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [editOpen, setEditOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/address').then((r) => r.data),
  });

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const initials = (profile?.name ?? user?.name ?? '')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ||
    (profile?.email ?? user?.email ?? 'U')[0].toUpperCase();

  const addressCount = addresses?.length ?? 0;

  const SECTION_ROWS = [
    {
      label: 'My Addresses',
      emoji: '📍',
      badge: addressCount > 0 ? String(addressCount) : null,
      onPress: () => router.push('/addresses'),
    },
    { label: 'Order History', emoji: '📦', badge: null, onPress: () => router.push('/(tabs)/orders') },
    { label: 'Payment Methods', emoji: '💳', badge: 'Soon', onPress: () => {} },
    { label: 'Help & Support', emoji: '💬', badge: null, onPress: () => Alert.alert('Help', 'Contact: help@cafeconnect.com') },
    { label: 'About', emoji: 'ℹ️', badge: null, onPress: () => Alert.alert('CaféConnect', 'Version 3.0.0') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => setEditOpen(true)}>
          <Text style={styles.editBtn}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 40 }}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{profile?.name ?? user?.name ?? 'Guest'}</Text>
            <Text style={styles.userEmail}>{profile?.email ?? user?.email}</Text>
            {(profile?.phone ?? user?.phone) ? (
              <Text style={styles.userPhone}>{profile?.phone ?? user?.phone}</Text>
            ) : null}
          </View>
        </View>

        {/* Sections */}
        <View style={styles.menuCard}>
          {SECTION_ROWS.map((row, i) => (
            <View key={row.label}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity style={styles.menuItem} onPress={row.onPress}>
                <Text style={{ fontSize: 20, marginRight: S.md }}>{row.emoji}</Text>
                <Text style={styles.menuItemLabel}>{row.label}</Text>
                {row.badge && (
                  <View style={[styles.badge, row.badge === 'Soon' && styles.badgeMuted]}>
                    <Text style={[styles.badgeText, row.badge === 'Soon' && styles.badgeTextMuted]}>
                      {row.badge}
                    </Text>
                  </View>
                )}
                <Text style={{ color: C.ink3, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditSheet
        visible={editOpen}
        name={profile?.name ?? user?.name ?? ''}
        phone={profile?.phone ?? user?.phone ?? ''}
        onClose={() => setEditOpen(false)}
        onSaved={(name, phone) => {
          updateUser({ name, phone });
          qc.invalidateQueries({ queryKey: ['me'] });
          setEditOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontFamily: F.serif, fontSize: 22, color: C.white },
  editBtn: { fontFamily: F.sansMd, fontSize: 14, color: C.cream, opacity: 0.8 },
  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: S.lg,
    backgroundColor: C.white, borderRadius: R.lg, padding: S.xl, marginBottom: S.lg,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.espresso,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontFamily: F.sansSb, fontSize: 22, color: C.white },
  userName: { fontFamily: F.serif, fontSize: 20, color: C.ink },
  userEmail: { fontFamily: F.sans, fontSize: 13, color: C.ink3, marginTop: 2 },
  userPhone: { fontFamily: F.sans, fontSize: 13, color: C.ink3, marginTop: 2 },
  menuCard: { backgroundColor: C.white, borderRadius: R.lg, overflow: 'hidden', marginBottom: S.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: S.lg },
  menuItemLabel: { fontFamily: F.sansMd, fontSize: 15, color: C.ink, flex: 1 },
  divider: { height: 1, backgroundColor: C.border, marginLeft: S.xl + S.xxl },
  badge: {
    backgroundColor: C.espresso, borderRadius: R.pill,
    paddingHorizontal: S.sm, paddingVertical: 2, marginRight: S.sm,
  },
  badgeMuted: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  badgeText: { fontFamily: F.sansSb, fontSize: 11, color: C.white },
  badgeTextMuted: { color: C.ink3 },
  logoutBtn: {
    borderRadius: R.lg, borderWidth: 1, borderColor: '#FCA5A5',
    padding: S.lg, alignItems: 'center', backgroundColor: C.white,
  },
  logoutText: { fontFamily: F.sansMd, fontSize: 15, color: C.redText },
});
