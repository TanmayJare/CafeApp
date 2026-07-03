import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { C, F, R, S } from '../../lib/tokens';

type AddressType = 'SOCIETY' | 'EXTERNAL';

export default function NewAddressScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [type, setType] = useState<AddressType>('SOCIETY');
  const [label, setLabel] = useState('Home');
  const [tower, setTower] = useState('');
  const [wing, setWing] = useState('');
  const [floor, setFloor] = useState('');
  const [flat, setFlat] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [validationError, setValidationError] = useState('');

  const { data: towers } = useQuery({
    queryKey: ['society-towers'],
    queryFn: () => api.get('/address/society-options').then((r: any) => r.data).catch(() => []),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const body =
        type === 'SOCIETY'
          ? { type, label, tower, wing, floor, flatNumber: flat, societyName: 'Sunshine Residency' }
          : { type, label, addressLine: addrLine, pincode, city: 'Pune' };
      return api.post('/address', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      router.back();
    },
    onError: (e: any) => {
      setValidationError(e.response?.data?.message ?? 'Failed to save address');
    },
  });

  const isValid =
    type === 'SOCIETY'
      ? tower && wing && floor && flat
      : addrLine && pincode;

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Address</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 100 }}>
        {/* Type toggle */}
        <View style={styles.toggle}>
          {(['SOCIETY', 'EXTERNAL'] as AddressType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, type === t && styles.toggleBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.toggleText, type === t && styles.toggleTextActive]}>
                {t === 'SOCIETY' ? 'Society' : 'External'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Label */}
        <Text style={styles.label}>Label</Text>
        <View style={styles.labelRow}>
          {['Home', 'Work', 'Other'].map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.labelChip, label === l && styles.labelChipActive]}
              onPress={() => setLabel(l)}
            >
              <Text style={[styles.labelChipText, label === l && { color: C.white }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'SOCIETY' ? (
          <>
            <Text style={styles.label}>Tower</Text>
            {(towers?.length ?? 0) > 0 ? (
              <View style={styles.rowWrap}>
                {towers.map((t: any) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.optChip, tower === t.name && styles.optChipActive]}
                    onPress={() => setTower(t.name)}
                  >
                    <Text style={[styles.optChipText, tower === t.name && { color: C.white }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Field placeholder="e.g. Tower A" value={tower} onChangeText={setTower} />
            )}
            <Text style={styles.label}>Wing</Text>
            <Field placeholder="e.g. A" value={wing} onChangeText={setWing} />
            <Text style={styles.label}>Floor</Text>
            <Field placeholder="e.g. 5" value={floor} onChangeText={setFloor} keyboardType="numeric" />
            <Text style={styles.label}>Flat Number</Text>
            <Field placeholder="e.g. 501" value={flat} onChangeText={setFlat} />
          </>
        ) : (
          <>
            <Text style={styles.label}>Address Line</Text>
            <Field placeholder="Street, area, landmark" value={addrLine} onChangeText={setAddrLine} />
            <Text style={styles.label}>Pincode</Text>
            <Field placeholder="411001" value={pincode} onChangeText={setPincode} keyboardType="numeric" />
          </>
        )}

        {validationError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.cta, (!isValid || saveMut.isPending) && styles.ctaDisabled]}
          onPress={() => saveMut.mutate()}
          disabled={!isValid || saveMut.isPending}
        >
          {saveMut.isPending
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.ctaText}>Save Address</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ placeholder, value, onChangeText, keyboardType }: any) {
  return (
    <TextInput
      style={{
        borderWidth: 1, borderColor: C.border, borderRadius: R.md,
        paddingHorizontal: S.lg, paddingVertical: S.md,
        fontFamily: F.sans, fontSize: 15, color: C.ink, backgroundColor: C.white,
        marginBottom: S.lg,
      }}
      placeholder={placeholder}
      placeholderTextColor={C.ink3}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
  },
  back: { fontFamily: F.sansSb, fontSize: 20, color: C.white },
  title: { fontFamily: F.serif, fontSize: 20, color: C.white },
  toggle: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md,
    padding: 3, marginBottom: S.xl,
  },
  toggleBtn: { flex: 1, paddingVertical: S.sm, alignItems: 'center', borderRadius: R.sm - 1 },
  toggleBtnActive: { backgroundColor: C.white },
  toggleText: { fontFamily: F.sansMd, fontSize: 14, color: C.ink3 },
  toggleTextActive: { color: C.ink, fontFamily: F.sansSb },
  label: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2, marginBottom: S.xs },
  labelRow: { flexDirection: 'row', gap: S.sm, marginBottom: S.lg },
  labelChip: {
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 7,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  labelChipActive: { backgroundColor: C.espresso, borderColor: C.espresso },
  labelChipText: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  optChip: {
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 7,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  optChipActive: { backgroundColor: C.espresso, borderColor: C.espresso },
  optChipText: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2 },
  errorCard: { backgroundColor: C.redBg, borderRadius: R.md, padding: S.md },
  errorText: { fontFamily: F.sans, fontSize: 13, color: C.redText },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: { backgroundColor: C.espresso, borderRadius: R.pill, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { fontFamily: F.sansSb, fontSize: 16, color: C.white },
});
