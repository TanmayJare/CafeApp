import { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useCartStore } from '../../stores/cart.store';
import { C, F, R, S } from '../../lib/tokens';

export default function MenuScreen() {
  const router = useRouter();
  const { count, total } = useCartStore();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const { data: categories, refetch: refetchCat } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/menu/categories').then((r) => r.data),
  });

  const { data: items, isLoading, refetch: refetchItems } = useQuery({
    queryKey: ['menu-items', selectedCat],
    queryFn: () => api.get('/menu/items', { params: selectedCat ? { categoryId: selectedCat } : {} }).then((r) => r.data),
  });

  // 34C.5 — pull-to-refresh fallback
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCat(), refetchItems()]);
    setRefreshing(false);
  }, [refetchCat, refetchItems]);

  const filtered = (items ?? []).filter((it: any) =>
    it.name.toLowerCase().includes(search.toLowerCase()) ||
    (it.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <View style={styles.searchRow}>
          <Text style={{ marginRight: 6 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search…"
            placeholderTextColor={C.ink3}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Category chips */}
      <View>
        <FlashList
          data={[{ id: null, name: 'All' }, ...(categories ?? [])] as any[]}
          horizontal
          keyExtractor={(it) => it.id ?? 'all'}
          contentContainerStyle={{ paddingHorizontal: S.lg, paddingVertical: S.md }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = selectedCat === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCat(item.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={C.espresso} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(it: any) => it.id}
          contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: count > 0 ? 110 : 20 }}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[styles.itemRow, !item.isAvailable && { opacity: 0.5 }]}
              onPress={() => router.push(`/product/${item.id}`)}
              disabled={!item.isAvailable}
            >
              <View style={styles.thumb}>
                {item.imageUrl
                  ? <Image source={item.imageUrl} style={{ width: 64, height: 64, borderRadius: R.md }} contentFit="cover" />
                  : <Text style={{ fontSize: 28 }}>☕</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.catLabel}>{item.category?.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.price}>₹{item.price}</Text>
                {!item.isAvailable
                  ? <Text style={styles.unavailable}>Unavailable</Text>
                  : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => router.push(`/product/${item.id}`)}
                    >
                      <Text style={styles.addBtnText}>+</Text>
                    </TouchableOpacity>
                  )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {count > 0 && (
        <TouchableOpacity style={styles.cartPill} onPress={() => router.push('/(tabs)/cart')}>
          <View style={styles.countBox}><Text style={styles.countText}>{count}</Text></View>
          <Text style={styles.pillLabel}>View cart</Text>
          <Text style={styles.pillTotal}>₹{total}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: { backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg },
  title: { fontFamily: F.serif, fontSize: 22, color: C.white, marginBottom: S.sm },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm,
  },
  searchInput: { flex: 1, fontFamily: F.sans, fontSize: 14, color: C.ink },
  chip: {
    marginRight: S.sm, backgroundColor: C.white, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 7, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.espresso, borderColor: C.espresso },
  chipText: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2 },
  chipTextActive: { color: C.white },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: R.lg, padding: S.md, marginBottom: S.sm, gap: S.md,
  },
  thumb: {
    width: 64, height: 64, backgroundColor: C.cream, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center',
  },
  itemName: { fontFamily: F.sansSb, fontSize: 14, color: C.ink },
  itemDesc: { fontFamily: F.sans, fontSize: 12, color: C.ink3, marginTop: 2 },
  catLabel: { fontFamily: F.sans, fontSize: 11, color: C.matcha, marginTop: 2 },
  price: { fontFamily: F.mono, fontSize: 14, color: C.espresso, marginBottom: S.xs },
  unavailable: { fontFamily: F.sans, fontSize: 11, color: C.redText },
  addBtn: {
    width: 30, height: 30, borderRadius: R.sm, backgroundColor: C.espresso,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: C.white, fontSize: 18, lineHeight: 26 },
  cartPill: {
    position: 'absolute', bottom: 14, left: S.xl, right: S.xl,
    backgroundColor: C.espresso, borderRadius: R.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, gap: S.md,
    elevation: 8,
  },
  countBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: R.sm,
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
  },
  countText: { fontFamily: F.mono, fontSize: 13, color: C.white },
  pillLabel: { fontFamily: F.sansMd, fontSize: 14, color: C.white, flex: 1 },
  pillTotal: { fontFamily: F.mono, fontSize: 14, color: C.white },
});
