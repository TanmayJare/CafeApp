/**
 * Society address form — extended with Label + Nickname — 36C.5
 * Replaces the old addresses/new.tsx for society flow
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
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

export default function NewSocietyScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [label, setLabel] = useState<LabelKey>('HOME');
  const [customLabel, setCustomLabel] = useState('');
  const [nickname, setNickname] = useState('');
  const [tower, setTower] = useState('');
  const [wing, setWing] = useState('');
  const [floor, setFloor] = useState('');
  const [flat, setFlat] = useState('');
  const [error, setError] = useState('');

  const { data: towers } = useQuery({
    queryKey: ['society-towers'],
    queryFn: () => api.get('/address/society-options').then((r: any) => r.data).catch(() => []),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      return api.post('/address', {
        type: 'SOCIETY',
        label,
        customLabel: label === 'CUSTOM' ? customLabel.trim() : undefined,
        nickname: nickname.trim() || undefined,
        tower,
        wing,
        floor,
        flatNumber: flat,
        societyName: 'Sunshine Residency',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      router.back();
    },
    onError: (e: any) => {
      setError(e.response?.data?.message ?? 'Failed to save address');
    },
  });

  const isValid = tower && wing && floor && flat && (label !== 'CUSTOM' || customLabel.trim());

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Society address</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 120 }}>

        {/* Label chips */}
        <Text style={fs.lbl}>Label</Text>
        <View style={styles.labelRow}>
          {LABELS.map((l) => (
            <TouchableOpacity
              key={l.key}
              style={[styles.chip, label === l.key && styles.chipActive]}
              onPress={() => setLabel(l.key)}
            >
              <Text style={styles.chipText}>{l.emoji} {l.text}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, label === 'CUSTOM' && styles.chipActive]}
            onPress={() => setLabel('CUSTOM')}
          >
            <Text style={styles.chipText}>✏️ Custom</Text>
          </TouchableOpacity>
        </View>

        {label === 'CUSTOM' && (
          <Field
            label="Custom label"
            placeholder="e.g. Parents' home"
            value={customLabel}
            onChangeText={setCustomLabel}
          />
        )}

        {/* Nickname */}
        <Field
          label="Nickname (optional)"
          placeholder="e.g. Dad's flat"
          value={nickname}
          onChangeText={setNickname}
        />

        {/* Tower */}
        <Text style={fs.lbl}>Tower *</Text>
        {(towers?.length ?? 0) > 0 ? (
          <View style={styles.labelRow}>
            {(towers ?? []).map((t: any) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, tower === t.name && styles.chipActive]}
                onPress={() => setTower(t.name)}
              >
                <Text style={styles.chipText}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Field placeholder="e.g. Tower A" value={tower} onChangeText={setTower} />
        )}

        <Field label="Wing *" placeholder="e.g. A" value={wing} onChangeText={setWing} />
        <Field label="Floor *" placeholder="e.g. 5" value={floor} onChangeText={setFloor} keyboardType="numeric" />
        <Field label="Flat Number *" placeholder="e.g. 501" value={flat} onChangeText={setFlat} />

        {error ? (
          <View style={styles.errCard}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.cta, (!isValid || saveMut.isPending) && styles.ctaDis]}
          onPress={() => saveMut.mutate()}
          disabled={!isValid || saveMut.isPending}
        >
          {saveMut.isPending
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.ctaTxt}>Save Address</Text>}
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
