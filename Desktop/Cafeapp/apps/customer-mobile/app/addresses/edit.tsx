/**
 * Edit address screen — 36C.6
 * Reuses the society form in edit mode; pre-fills all fields; dirty check on back.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { C, F, R, S } from '../../lib/tokens';

type LabelKey = 'HOME' | 'WORK' | 'OTHER' | 'CUSTOM';

const LABELS: { key: LabelKey; emoji: string; text: string }[] = [
  { key: 'HOME', emoji: '🏠', text: 'Home' },
  { key: 'WORK', emoji: '💼', text: 'Work' },
  { key: 'OTHER', emoji: '📍', text: 'Other' },
];

function Field({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: S.lg }}>
      {label ? <Text style={fs.lbl}>{label}</Text> : null}
      <TextInput style={fs.input} placeholderTextColor={C.ink3} {...props} />
    </View>
  );
}

const fs = StyleSheet.create({
  lbl: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2, marginBottom: S.xs },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    fontFamily: F.sans, fontSize: 15, color: C.ink, backgroundColor: C.white,
  },
});

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: address } = useQuery({
    queryKey: ['address', id],
    queryFn: () => api.get(`/address/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const [label, setLabel] = useState<LabelKey>('HOME');
  const [customLabel, setCustomLabel] = useState('');
  const [nickname, setNickname] = useState('');
  const [tower, setTower] = useState('');
  const [wing, setWing] = useState('');
  const [floor, setFloor] = useState('');
  const [flat, setFlat] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (address) {
      setLabel((address.label as LabelKey) ?? 'HOME');
      setCustomLabel(address.customLabel ?? '');
      setNickname(address.nickname ?? '');
      setTower(address.tower ?? '');
      setWing(address.wing ?? '');
      setFloor(address.floor ?? '');
      setFlat(address.flatNumber ?? '');
      setAddressLine(address.addressLine ?? '');
      setLandmark(address.landmark ?? '');
    }
  }, [address]);

  const track = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  const handleBack = () => {
    if (dirty) {
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const saveMut = useMutation({
    mutationFn: () =>
      api.patch(`/address/${id}`, {
        label,
        customLabel: label === 'CUSTOM' ? customLabel.trim() : undefined,
        nickname: nickname.trim() || undefined,
        ...(address?.type === 'SOCIETY'
          ? { tower, wing, floor, flatNumber: flat }
          : { addressLine, landmark }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      qc.invalidateQueries({ queryKey: ['address', id] });
      router.back();
    },
    onError: (e: any) => {
      setError(e.response?.data?.message ?? 'Failed to save');
    },
  });

  if (!address) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.cream }}>
      <ActivityIndicator color={C.espresso} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit address</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 120 }}>

        {/* Label */}
        <Text style={fs.lbl}>Label</Text>
        <View style={styles.labelRow}>
          {LABELS.map((l) => (
            <TouchableOpacity
              key={l.key}
              style={[styles.chip, label === l.key && styles.chipActive]}
              onPress={() => { setLabel(l.key); setDirty(true); }}
            >
              <Text style={styles.chipText}>{l.emoji} {l.text}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, label === 'CUSTOM' && styles.chipActive]}
            onPress={() => { setLabel('CUSTOM'); setDirty(true); }}
          >
            <Text style={styles.chipText}>✏️ Custom</Text>
          </TouchableOpacity>
        </View>

        {label === 'CUSTOM' && (
          <Field label="Custom label" placeholder="e.g. Parents' home" value={customLabel} onChangeText={track(setCustomLabel)} />
        )}

        <Field label="Nickname (optional)" placeholder="e.g. Dad's flat" value={nickname} onChangeText={track(setNickname)} />

        {address.type === 'SOCIETY' ? (
          <>
            <Field label="Tower" placeholder="e.g. Tower A" value={tower} onChangeText={track(setTower)} />
            <Field label="Wing" placeholder="e.g. A" value={wing} onChangeText={track(setWing)} />
            <Field label="Floor" placeholder="e.g. 5" value={floor} onChangeText={track(setFloor)} keyboardType="numeric" />
            <Field label="Flat Number" placeholder="e.g. 501" value={flat} onChangeText={track(setFlat)} />
          </>
        ) : (
          <>
            <Field label="Address line" placeholder="Street, area, landmark" value={addressLine} onChangeText={track(setAddressLine)} />
            <Field label="Landmark" placeholder="Near bus stop, etc." value={landmark} onChangeText={track(setLandmark)} />
          </>
        )}

        {error ? (
          <View style={styles.errCard}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.cta, saveMut.isPending && styles.ctaDis]}
          onPress={() => saveMut.mutate()}
          disabled={saveMut.isPending}
        >
          {saveMut.isPending
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.ctaTxt}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
    flexDirection: 'row', alignItems: 'center', gap: S.md,
  },
  back: { fontFamily: F.sansSb, fontSize: 22, color: C.white },
  title: { fontFamily: F.serif, fontSize: 20, color: C.white },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  chip: {
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.espresso, borderColor: C.espresso },
  chipText: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2 },
  errCard: { backgroundColor: C.redBg, borderRadius: R.md, padding: S.md },
  errText: { fontFamily: F.sans, fontSize: 13, color: C.redText },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: { backgroundColor: C.espresso, borderRadius: R.pill, paddingVertical: 16, alignItems: 'center' },
  ctaDis: { opacity: 0.45 },
  ctaTxt: { fontFamily: F.sansSb, fontSize: 16, color: C.white },
});
