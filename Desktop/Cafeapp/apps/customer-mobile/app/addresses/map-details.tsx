/**
 * Map address details — Phase 37B.9 / 37B.10
 * Collects building/flat/floor + label after map pin confirmation.
 * Shows a non-interactive mini-map thumbnail of the chosen location.
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function MapDetailsScreen() {
  const { lat, lng, zoneType, deliveryFee } = useLocalSearchParams<{
    lat: string; lng: string; zoneType: string; deliveryFee: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();

  const latitude = parseFloat(lat ?? '0');
  const longitude = parseFloat(lng ?? '0');

  const [label, setLabel] = useState<LabelKey>('HOME');
  const [customLabel, setCustomLabel] = useState('');
  const [nickname, setNickname] = useState('');
  const [line1, setLine1] = useState('');
  const [landmark, setLandmark] = useState('');
  const [error, setError] = useState('');

  const saveMut = useMutation({
    mutationFn: () =>
      api.post('/address', {
        type: 'EXTERNAL',
        label,
        customLabel: label === 'CUSTOM' ? customLabel.trim() : undefined,
        nickname: nickname.trim() || undefined,
        addressLine: line1.trim(),
        landmark: landmark.trim() || undefined,
        latitude,
        longitude,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      router.dismissAll();
      router.push('/addresses');
    },
    onError: (e: any) => {
      setError(e.response?.data?.message ?? 'Failed to save address');
    },
  });

  const isValid = line1.trim() && (label !== 'CUSTOM' || customLabel.trim());

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add details</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 120 }}>

        {/* Mini map thumbnail */}
        <View style={styles.mapThumb}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
            <Marker coordinate={{ latitude, longitude }} />
          </MapView>
          {/* Delivery badge overlay */}
          <View style={[styles.deliveryBadge, { backgroundColor: zoneType === 'PRIMARY' ? C.matchaLight : C.blueBg }]}>
            <Text style={{ fontFamily: F.sansSb, fontSize: 11, color: zoneType === 'PRIMARY' ? C.matcha : C.blueText }}>
              {zoneType === 'PRIMARY' ? 'Free delivery' : `₹${deliveryFee} delivery fee`}
            </Text>
          </View>
        </View>

        {/* Label chips */}
        <Text style={fs.lbl}>Label</Text>
        <View style={styles.labelRow}>
          {LABELS.map((l) => (
            <TouchableOpacity
              key={l.key}
              style={[styles.chip, label === l.key && styles.chipActive]}
              onPress={() => setLabel(l.key)}
            >
              <Text style={[styles.chipText, label === l.key && { color: C.white }]}>{l.emoji} {l.text}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, label === 'CUSTOM' && styles.chipActive]}
            onPress={() => setLabel('CUSTOM')}
          >
            <Text style={[styles.chipText, label === 'CUSTOM' && { color: C.white }]}>✏️ Custom</Text>
          </TouchableOpacity>
        </View>
        {label === 'CUSTOM' && (
          <Field label="Custom label" placeholder="e.g. Parents' home" value={customLabel} onChangeText={setCustomLabel} />
        )}

        <Field label="Nickname (optional)" placeholder="e.g. Dad's flat" value={nickname} onChangeText={setNickname} />
        <Field label="Building / Flat / Floor *" placeholder="e.g. B-104, Tower B" value={line1} onChangeText={setLine1} />
        <Field label="Landmark (optional)" placeholder="Near bus stop, gate 2…" value={landmark} onChangeText={setLandmark} />

        {error ? (
          <View style={{ backgroundColor: C.redBg, borderRadius: R.md, padding: S.md }}>
            <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.redText }}>{error}</Text>
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
            : <Text style={styles.ctaTxt}>Save address</Text>}
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
  mapThumb: {
    height: 130, borderRadius: R.lg, overflow: 'hidden',
    marginBottom: S.xl, position: 'relative',
  },
  deliveryBadge: {
    position: 'absolute', bottom: 8, right: 8,
    borderRadius: R.pill, paddingHorizontal: S.sm, paddingVertical: 3,
  },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  chip: {
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.espresso, borderColor: C.espresso },
  chipText: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2 },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: { backgroundColor: C.espresso, borderRadius: R.pill, paddingVertical: 16, alignItems: 'center' },
  ctaDis: { opacity: 0.45 },
  ctaTxt: { fontFamily: F.sansSb, fontSize: 16, color: C.white },
});
