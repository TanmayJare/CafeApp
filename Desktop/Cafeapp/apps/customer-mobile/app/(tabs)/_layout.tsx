import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { C, F } from '../../lib/tokens';
import { useCartStore } from '../../stores/cart.store';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tab}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const count = useCartStore((s) => s.count);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.border, height: 60 },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="menu"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Menu" focused={focused} /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon emoji="🛒" label="Cart" focused={focused} />
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📦" label="Orders" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tab: { alignItems: 'center', paddingTop: 6 },
  emoji: { fontSize: 20 },
  label: { fontFamily: F.sans, fontSize: 10, color: C.ink3, marginTop: 2 },
  labelActive: { color: C.espresso, fontFamily: F.sansMd },
  badge: {
    position: 'absolute', top: -2, right: -6,
    backgroundColor: C.matcha, borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: F.mono, fontSize: 9, color: C.white },
});
