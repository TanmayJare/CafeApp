/**
 * Address book — grouped by label (HOME / WORK / OTHER+CUSTOM) — 36C.1
 */
import { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { AddressCard } from '../../components/addresses/AddressCard';
import { C, F, R, S } from '../../lib/tokens';

type AddressLabel = 'HOME' | 'WORK' | 'OTHER' | 'CUSTOM';

const GROUPS: { label: AddressLabel | 'OTHER' | 'CUSTOM'; title: string; keys: AddressLabel[] }[] = [
  { label: 'HOME',  title: 'Home',  keys: ['HOME'] },
  { label: 'WORK',  title: 'Work',  keys: ['WORK'] },
  { label: 'OTHER', title: 'Other', keys: ['OTHER', 'CUSTOM'] },
];

export default function AddressesScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: addresses, isLoading, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/address').then((r) => r.data),
    staleTime: 0,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: (addresses ?? []).filter((a: any) => g.keys.includes(a.label)),
  })).filter((g) => g.items.length > 0);

  const handleSetDefault = (id: string) => {
    // Optimistic — flip isDefault locally
    qc.setQueryData(['addresses'], (old: any[] = []) =>
      old.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  };

  const handleDeleted = () => {
    refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved addresses</Text>
        <TouchableOpacity onPress={() => router.push('/addresses/new-choice')}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: S.xl, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={C.espresso} />}
      >
        {grouped.length === 0 && !isLoading ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48, marginBottom: S.xl }}>📍</Text>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySub}>Add a home, work, or custom address</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => router.push('/addresses/new-choice')}>
              <Text style={styles.addFirstBtnText}>Add address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map((g) => (
            <View key={g.label} style={{ marginBottom: S.xl }}>
              <Text style={styles.groupHeader}>{g.title}</Text>
              {g.items.map((addr: any) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  onEdit={() => router.push({ pathname: '/addresses/edit', params: { id: addr.id } })}
                  onDeleted={handleDeleted}
                  onSetDefault={() => handleSetDefault(addr.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
    flexDirection: 'row', alignItems: 'center',
  },
  back: { fontFamily: F.sansSb, fontSize: 22, color: C.white, marginRight: S.md },
  title: { fontFamily: F.serif, fontSize: 20, color: C.white, flex: 1 },
  addBtn: { fontFamily: F.sansMd, fontSize: 14, color: C.cream },
  groupHeader: { fontFamily: F.sansSb, fontSize: 12, color: C.ink3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: S.sm },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: F.serif, fontSize: 20, color: C.ink2, marginBottom: S.sm },
  emptySub: { fontFamily: F.sans, fontSize: 14, color: C.ink3, marginBottom: S.xl },
  addFirstBtn: { backgroundColor: C.espresso, borderRadius: R.lg, paddingHorizontal: S.xxl, paddingVertical: S.md },
  addFirstBtnText: { fontFamily: F.sansSb, fontSize: 15, color: C.white },
});
