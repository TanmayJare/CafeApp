/**
 * AddressCard — Zomato/Swiggy-style address card with ⋮ context menu (36C.2–36C.3)
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { C, F, R, S } from '../../lib/tokens';
import api from '../../lib/api';

type AddressLabel = 'HOME' | 'WORK' | 'OTHER' | 'CUSTOM';

interface Address {
  id: string;
  type: string;
  label: AddressLabel;
  customLabel?: string | null;
  nickname?: string | null;
  isDefault: boolean;
  societyName?: string | null;
  tower?: string | null;
  wing?: string | null;
  floor?: string | null;
  flatNumber?: string | null;
  addressLine?: string | null;
  landmark?: string | null;
  pincode?: string | null;
}

interface Props {
  address: Address;
  onEdit: () => void;
  onDeleted: () => void;
  onSetDefault: () => void;
}

const LABEL_EMOJI: Record<AddressLabel, string> = {
  HOME: '🏠',
  WORK: '💼',
  OTHER: '📍',
  CUSTOM: '📍',
};

function formatAddress(addr: Address): string {
  if (addr.type === 'SOCIETY') {
    const parts = [];
    if (addr.flatNumber) parts.push(`Flat ${addr.flatNumber}`);
    if (addr.floor) parts.push(`Floor ${addr.floor}`);
    if (addr.wing) parts.push(`${addr.wing}-Wing`);
    if (addr.tower) parts.push(addr.tower);
    if (addr.societyName) parts.push(addr.societyName);
    return parts.join(', ') || 'Society address';
  }
  const parts = [];
  if (addr.addressLine) parts.push(addr.addressLine);
  if (addr.landmark) parts.push(addr.landmark);
  if (addr.pincode) parts.push(addr.pincode);
  return parts.join(', ') || 'External address';
}

function getDisplayName(addr: Address): string {
  if (addr.nickname) return addr.nickname;
  if (addr.label === 'CUSTOM' && addr.customLabel) return addr.customLabel;
  return addr.label.charAt(0) + addr.label.slice(1).toLowerCase();
}

export function AddressCard({ address, onEdit, onDeleted, onSetDefault }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetDefault = async () => {
    setMenuOpen(false);
    setLoading(true);
    // Optimistic
    onSetDefault();
    try {
      await api.patch(`/address/${address.id}/set-default`);
    } catch {}
    setLoading(false);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    Alert.alert(
      'Delete address',
      'Are you sure you want to remove this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/address/${address.id}`);
              onDeleted();
            } catch {}
          },
        },
      ],
    );
  };

  const emoji = LABEL_EMOJI[address.label];

  return (
    <View style={styles.card}>
      {/* Label icon chip */}
      <View style={styles.iconChip}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>

      {/* Text content */}
      <View style={styles.textCol}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{getDisplayName(address)}</Text>
          {address.isDefault && (
            <View style={styles.defaultPill}>
              <Text style={styles.defaultPillText}>Default</Text>
            </View>
          )}
          {loading && <ActivityIndicator size="small" color={C.matcha} style={{ marginLeft: S.xs }} />}
        </View>
        <Text style={styles.addr} numberOfLines={2}>{formatAddress(address)}</Text>
      </View>

      {/* Context menu button */}
      <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.moreBtn}>
        <Text style={styles.moreBtnText}>⋮</Text>
      </TouchableOpacity>

      {/* Context menu modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} activeOpacity={1}>
          <View style={styles.menu}>
            <Text style={styles.menuHeader} numberOfLines={1}>{getDisplayName(address)}</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); onEdit(); }}>
              <Text style={styles.menuRowText}>✏️  Edit</Text>
            </TouchableOpacity>
            {!address.isDefault && (
              <TouchableOpacity style={styles.menuRow} onPress={handleSetDefault}>
                <Text style={styles.menuRowText}>⭐  Set as default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.menuRow, styles.menuRowDanger]} onPress={handleDelete}>
              <Text style={[styles.menuRowText, styles.menuRowDangerText]}>🗑  Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.white, borderRadius: R.lg, padding: S.lg, marginBottom: S.sm,
  },
  iconChip: {
    width: 44, height: 44, borderRadius: R.md, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  textCol: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs, marginBottom: 3 },
  name: { fontFamily: F.sansSb, fontSize: 14, color: C.ink },
  defaultPill: {
    backgroundColor: C.matchaLight, borderRadius: R.pill,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  defaultPillText: { fontFamily: F.sansSb, fontSize: 10, color: C.matcha },
  addr: { fontFamily: F.sans, fontSize: 12, color: C.ink3 },
  moreBtn: { paddingHorizontal: S.sm, paddingVertical: S.xs },
  moreBtnText: { fontSize: 20, color: C.ink3, lineHeight: 24 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  menu: {
    backgroundColor: C.white, borderRadius: R.lg, overflow: 'hidden',
    width: 240, paddingVertical: S.sm,
  },
  menuHeader: {
    fontFamily: F.sansSb, fontSize: 13, color: C.ink3,
    paddingHorizontal: S.lg, paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  menuRow: { paddingHorizontal: S.lg, paddingVertical: S.md },
  menuRowText: { fontFamily: F.sansMd, fontSize: 15, color: C.ink },
  menuRowDanger: { borderTopWidth: 1, borderTopColor: C.border },
  menuRowDangerText: { color: C.redText },
});
