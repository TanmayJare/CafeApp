import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator, RefreshControl,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { useCartStore } from '../../stores/cart.store';
import { useSocket } from '../../hooks/useSocket';
import { SpecialCard } from '../../components/home/SpecialCard';
import { C, F, R, S } from '../../lib/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { count, total } = useCartStore();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const { data: categories, refetch: refetchCat } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/menu/categories').then((r) => r.data),
  });

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['menu-items', selectedCat],
    queryFn: () => api.get('/menu/items', { params: selectedCat ? { categoryId: selectedCat } : {} }).then((r) => r.data),
  });

  // 36C.7 — default address for location pill (uses the same ['addresses'] cache)
  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/address').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const defaultAddress = useMemo(() => {
    if (!addresses?.length) return null;
    return (addresses as any[]).find((a) => a.isDefault) ?? addresses[0];
  }, [addresses]);

  const locationLabel = useMemo(() => {
    if (!defaultAddress) return null;
    if (defaultAddress.type === 'SOCIETY') {
      const parts: string[] = [];
      if (defaultAddress.tower) parts.push(defaultAddress.tower);
      if (defaultAddress.flatNumber) parts.push(`Flat ${defaultAddress.flatNumber}`);
      return parts.join(', ') || defaultAddress.societyName || 'Society';
    }
    return defaultAddress.addressLine?.split(',')[0] ?? 'Saved address';
  }, [defaultAddress]);

  const { data: specials, refetch: refetchSpecials } = useQuery({
    queryKey: ['specials'],
    queryFn: () => api.get('/menu/daily-specials').then((r) => r.data),
  });

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: () => api.get('/banners').then((r) => r.data).catch(() => []),
  });

  // 34C.3 — invalidate specials cache when staff pushes a change
  useSocket({
    'menu:specials_updated': () => {
      qc.invalidateQueries({ queryKey: ['specials'] });
    },
  });

  // 34C.5 — pull-to-refresh fallback
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCat(), refetchItems(), refetchSpecials()]);
    setRefreshing(false);
  }, [refetchCat, refetchItems, refetchSpecials]);

  // 35D.3 — add unlinked special directly to cart at discountedPrice
  const addToCartMut = useMutation({
    mutationFn: ({ menuItemId, qty }: { menuItemId: string; qty: number }) =>
      api.post('/cart/items', { menuItemId, quantity: qty }),
    onSuccess: async () => {
      const res = await api.get('/cart/summary');
      useCartStore.getState().setCart(res.data.itemCount, res.data.subtotal);
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const handleSpecialTap = (special: any) => {
    if (special.linkedMenuItemId) {
      // Navigate to product detail with discounted price hint
      router.push(`/product/${special.linkedMenuItemId}`);
    } else {
      // No link — add directly to cart using linked price; show alert if no menuItemId at all
      Alert.alert(
        special.title,
        `Add to cart at ₹${special.discountedPrice}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to cart',
            onPress: () => {
              // If no linkedMenuItemId we can't add (no menuItem FK) — navigate to menu instead
              router.push('/(tabs)/menu');
            },
          },
        ],
      );
    }
  };

  const filtered = (items ?? []).filter(
    (it: any) =>
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      (it.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.espresso} />
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.brand}>CaféConnect</Text>
          <TouchableOpacity
            onPress={() => router.push('/addresses')}
            style={styles.locRow}
            activeOpacity={0.7}
          >
            <Text style={styles.locPin}>📍</Text>
            <Text style={styles.loc} numberOfLines={1}>
              {locationLabel ?? (user?.name ?? 'Add address')}
            </Text>
            <Text style={styles.locChevron}>›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
          <Text style={{ fontSize: 22 }}>📦</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.espresso} />}
      >
        {/* 35D.1 — Today's Specials at very top, above hero */}
        {(specials?.length ?? 0) > 0 && (
          <View style={styles.specialsSection}>
            <Text style={styles.specialsHeader}>Today's Specials</Text>
            <FlashList
              data={specials ?? []}
              keyExtractor={(s: any) => s.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}
              renderItem={({ item }: { item: any }) => (
                <SpecialCard special={item} onPress={() => handleSpecialTap(item)} />
              )}
            />
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.freePill}>
            <Text style={styles.freePillText}>🎉 Free delivery in your society</Text>
          </View>
          <Text style={styles.heroHeading}>What are you craving today?</Text>
          <Text style={styles.heroSub}>Delivered in 20–35 min</Text>
          <View style={styles.searchBar}>
            <Text style={{ marginRight: 8, fontSize: 16 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search coffee, food, snacks…"
              placeholderTextColor={C.ink3}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, !selectedCat && styles.chipActive]}
            onPress={() => setSelectedCat(null)}
          >
            <Text style={[styles.chipText, !selectedCat && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {(categories ?? []).map((cat: any) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, selectedCat === cat.id && styles.chipActive]}
              onPress={() => setSelectedCat(cat.id)}
            >
              <Text style={[styles.chipText, selectedCat === cat.id && styles.chipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{selectedCat ? '' : 'All Items'}</Text>
          {itemsLoading ? (
            <ActivityIndicator color={C.espresso} style={{ marginTop: 20 }} />
          ) : (
            filtered.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, !item.isAvailable && { opacity: 0.5 }]}
                onPress={() => router.push(`/product/${item.id}`)}
                disabled={!item.isAvailable}
              >
                <View style={styles.itemThumb}>
                  {item.imageUrl
                    ? <Image source={item.imageUrl} style={{ width: 64, height: 64, borderRadius: R.md }} contentFit="cover" />
                    : <Text style={{ fontSize: 28 }}>☕</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                  {!item.isAvailable && <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.redText }}>Currently unavailable</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, !item.isAvailable && styles.addBtnDisabled]}
                    onPress={() => router.push(`/product/${item.id}`)}
                    disabled={!item.isAvailable}
                  >
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: count > 0 ? 100 : 20 }} />
      </ScrollView>

      {/* Floating cart pill */}
      {count > 0 && (
        <TouchableOpacity style={styles.cartPill} onPress={() => router.push('/(tabs)/cart')}>
          <View style={styles.cartPillCount}>
            <Text style={styles.cartPillCountText}>{count}</Text>
          </View>
          <Text style={styles.cartPillLabel}>View cart</Text>
          <Text style={styles.cartPillTotal}>₹{total}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.md,
  },
  brand: { fontFamily: F.serif, fontSize: 20, color: C.white },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 3 },
  locPin: { fontSize: 11 },
  loc: { fontFamily: F.sans, fontSize: 12, color: C.cream, flexShrink: 1 },
  locChevron: { fontFamily: F.sansMd, fontSize: 13, color: C.cream, opacity: 0.7 },
  hero: { backgroundColor: C.espresso, padding: S.xl, paddingBottom: S.xxl },
  freePill: {
    backgroundColor: C.matcha, alignSelf: 'flex-start',
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: S.xs, marginBottom: S.md,
  },
  freePillText: { fontFamily: F.sansMd, fontSize: 12, color: C.white },
  heroHeading: { fontFamily: F.serif, fontSize: 22, color: C.white, marginBottom: S.xs },
  heroSub: { fontFamily: F.sans, fontSize: 13, color: C.cream, marginBottom: S.lg },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm,
  },
  searchInput: { flex: 1, fontFamily: F.sans, fontSize: 14, color: C.ink },
  chips: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.sm },
  chip: {
    backgroundColor: C.white, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 7, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.espresso, borderColor: C.espresso },
  chipText: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2 },
  chipTextActive: { color: C.white },
  section: { paddingHorizontal: S.lg, marginBottom: S.md },
  sectionTitle: { fontFamily: F.serif, fontSize: 18, color: C.ink, marginBottom: S.md },
  specialsSection: { backgroundColor: C.espresso, paddingTop: S.lg, paddingBottom: S.md },
  specialsHeader: { fontFamily: F.serif, fontSize: 16, color: C.white, paddingHorizontal: S.lg, marginBottom: S.md },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: R.lg, padding: S.md, marginBottom: S.sm, gap: S.md,
  },
  itemThumb: {
    width: 64, height: 64, backgroundColor: C.cream, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center',
  },
  itemName: { fontFamily: F.sansSb, fontSize: 14, color: C.ink },
  itemDesc: { fontFamily: F.sans, fontSize: 12, color: C.ink3, marginTop: 2 },
  itemPrice: { fontFamily: F.mono, fontSize: 14, color: C.espresso, marginBottom: S.xs },
  addBtn: {
    width: 32, height: 32, borderRadius: R.sm,
    backgroundColor: C.espresso, alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: C.border },
  addBtnText: { color: C.white, fontSize: 20, lineHeight: 28 },
  cartPill: {
    position: 'absolute', bottom: 70, left: S.xl, right: S.xl,
    backgroundColor: C.espresso, borderRadius: R.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, gap: S.md,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  cartPillCount: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: R.sm,
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
  },
  cartPillCountText: { fontFamily: F.mono, fontSize: 13, color: C.white },
  cartPillLabel: { fontFamily: F.sansMd, fontSize: 14, color: C.white, flex: 1 },
  cartPillTotal: { fontFamily: F.mono, fontSize: 14, color: C.white },
});
