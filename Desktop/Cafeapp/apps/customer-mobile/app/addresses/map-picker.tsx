/**
 * Map-based address picker — Phase 37B (full implementation)
 * OSM tiles via UrlTile, floating pin, zone enforcement, current location.
 */
import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Region, UrlTile, Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import api from '../../lib/api';
import { C, F, R, S } from '../../lib/tokens';

// Café default centre (fallback)
const CAFE_LAT = 19.0760;
const CAFE_LNG = 72.8777;
const DELTA = 0.01;

interface ZoneResult {
  zoneType: 'PRIMARY' | 'SECONDARY' | 'OUT_OF_ZONE';
  distanceFromCafeKm: number;
  distanceFromUserKm?: number;
  deliveryFee: number;
  estimatedTime: string;
  societyMatch?: { id: string; name: string } | null;
}

export default function MapPickerScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>({
    latitude: CAFE_LAT, longitude: CAFE_LNG,
    latitudeDelta: DELTA, longitudeDelta: DELTA,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [zoneResult, setZoneResult] = useState<ZoneResult | null>(null);
  const [zoneError, setZoneError] = useState('');
  const validateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Validate location after pan ends ────────────────────────────────────

  const validate = useCallback(async (lat: number, lng: number) => {
    setValidating(true);
    setZoneError('');
    try {
      const params: any = { lat, lng };
      if (userLocation) {
        params.userLat = userLocation.latitude;
        params.userLng = userLocation.longitude;
      }
      const res = await api.post('/address/validate', params);
      setZoneResult(res.data);
    } catch {
      setZoneError('Could not check delivery zone. Try again.');
    } finally {
      setValidating(false);
    }
  }, [userLocation]);

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(() => validate(r.latitude, r.longitude), 500);
  };

  // ─── Current location ─────────────────────────────────────────────────────

  const handleUseLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude, accuracy: acc } = pos.coords;
      setUserLocation({ latitude, longitude });
      setAccuracy(acc ?? null);
      const newRegion = { latitude, longitude, latitudeDelta: DELTA, longitudeDelta: DELTA };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 600);
      validate(latitude, longitude);
    } catch {
      Alert.alert('Error', 'Could not get your location. Ensure GPS is enabled.');
    }
  };

  // ─── Confirm location ─────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!zoneResult || zoneResult.zoneType === 'OUT_OF_ZONE') return;
    router.push({
      pathname: '/addresses/map-details',
      params: {
        lat: String(region.latitude),
        lng: String(region.longitude),
        zoneType: zoneResult.zoneType,
        deliveryFee: String(zoneResult.deliveryFee),
      },
    });
  };

  // ─── Derived UI state ─────────────────────────────────────────────────────

  const canConfirm = !validating && !!zoneResult && zoneResult.zoneType !== 'OUT_OF_ZONE';

  const distanceFromUser = zoneResult?.distanceFromUserKm ?? null;
  const userDistanceWarning =
    distanceFromUser !== null && distanceFromUser > 0.5
      ? { color: distanceFromUser > 2 ? C.redText : C.amberText, bg: distanceFromUser > 2 ? C.redBg : C.amberBg, text: `Selected location is ${distanceFromUser.toFixed(1)}km from your current position — is this correct?` }
      : null;

  return (
    <View style={{ flex: 1 }}>
      {/* ─── Map ─────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        rotateEnabled={false}
      >
        {/* OSM tiles — no Google Maps key needed */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {/* Blue dot — user's actual device location */}
        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.blueDot} />
          </Marker>
        )}
      </MapView>

      {/* ─── Floating pin (absolute over map centre) ─────────────────────── */}
      {/* pointerEvents="none" as prop is deprecated in newer RN — use style prop */}
      <View style={[styles.pinContainer, { pointerEvents: 'none' } as any]}>
        <Text style={styles.pinEmoji}>📍</Text>
      </View>

      {/* ─── Top bar ─────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={styles.topBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Set delivery location</Text>
        <TouchableOpacity onPress={handleUseLocation} style={styles.topBtn}>
          <Text style={styles.topBtnText}>⊕</Text>
        </TouchableOpacity>
      </View>

      {/* Accuracy indicator */}
      {accuracy !== null && (
        <View style={[styles.accuracyPill, { backgroundColor: accuracy <= 10 ? C.matchaLight : C.amberBg }]}>
          <Text style={{ fontFamily: F.sansMd, fontSize: 11, color: accuracy <= 10 ? C.matcha : C.amberText }}>
            Location accuracy: ±{Math.round(accuracy)}m
          </Text>
        </View>
      )}

      {/* ─── Bottom sheet ─────────────────────────────────────────────────── */}
      <View style={styles.sheet}>

        {/* Validating */}
        {validating && (
          <View style={styles.sheetRow}>
            <ActivityIndicator color={C.espresso} size="small" />
            <Text style={styles.sheetHint}>Checking delivery zone…</Text>
          </View>
        )}

        {/* Error */}
        {zoneError ? (
          <View style={[styles.zoneBadge, { backgroundColor: C.redBg }]}>
            <Text style={{ fontFamily: F.sansMd, fontSize: 13, color: C.redText }}>{zoneError}</Text>
          </View>
        ) : null}

        {/* Zone result */}
        {!validating && zoneResult && (
          <>
            {/* Zone badge */}
            {zoneResult.zoneType === 'PRIMARY' && (
              <View style={[styles.zoneBadge, { backgroundColor: C.matchaLight }]}>
                <Text style={{ fontFamily: F.sansSb, fontSize: 14, color: C.matcha, marginBottom: 2 }}>Society — Free delivery</Text>
                <Text style={[styles.sheetHint, { color: C.matcha }]}>Within the complex · {zoneResult.estimatedTime}</Text>
              </View>
            )}
            {zoneResult.zoneType === 'SECONDARY' && (
              <View style={[styles.zoneBadge, { backgroundColor: C.blueBg }]}>
                <Text style={{ fontFamily: F.sansSb, fontSize: 14, color: C.blueText, marginBottom: 2 }}>7km radius — ₹{zoneResult.deliveryFee} delivery fee</Text>
                <Text style={[styles.sheetHint, { color: C.blueText }]}>{zoneResult.distanceFromCafeKm.toFixed(1)}km from café · {zoneResult.estimatedTime}</Text>
              </View>
            )}
            {zoneResult.zoneType === 'OUT_OF_ZONE' && (
              <View style={[styles.zoneBadge, { backgroundColor: C.redBg }]}>
                <Text style={{ fontFamily: F.sansSb, fontSize: 14, color: C.redText, marginBottom: 2 }}>Outside delivery area</Text>
                <Text style={[styles.sheetHint, { color: C.redText }]}>{zoneResult.distanceFromCafeKm.toFixed(1)}km from café (max 7km)</Text>
              </View>
            )}

            {/* Society hint */}
            {zoneResult.societyMatch && (
              <View style={[styles.zoneBadge, { backgroundColor: C.matchaLight, marginTop: S.sm }]}>
                <Text style={{ fontFamily: F.sansMd, fontSize: 13, color: C.matcha }}>
                  Looks like you're inside {zoneResult.societyMatch.name}. Want to use the society form for a more accurate address?
                </Text>
                <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.sm }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: C.matcha, borderRadius: R.md, paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => router.replace('/addresses/new-society')}
                  >
                    <Text style={{ fontFamily: F.sansSb, fontSize: 12, color: C.white }}>Use Society Form</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, borderWidth: 1, borderColor: C.matcha, borderRadius: R.md, paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => setZoneResult({ ...zoneResult, societyMatch: null })}
                  >
                    <Text style={{ fontFamily: F.sansSb, fontSize: 12, color: C.matcha }}>Keep map location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Distance-from-user warning */}
            {userDistanceWarning && (
              <View style={[styles.zoneBadge, { backgroundColor: userDistanceWarning.bg, marginTop: S.sm }]}>
                <Text style={{ fontFamily: F.sansMd, fontSize: 12, color: userDistanceWarning.color }}>{userDistanceWarning.text}</Text>
              </View>
            )}
          </>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, !canConfirm && styles.ctaDis]}
          onPress={handleConfirm}
          disabled={!canConfirm}
        >
          <Text style={styles.ctaTxt}>
            {zoneResult?.zoneType === 'OUT_OF_ZONE' ? 'Out of delivery range' : 'Confirm this location'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.md, paddingTop: 52, paddingBottom: S.md,
    backgroundColor: 'rgba(28,15,8,0.85)',
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
  },
  topBtnText: { fontSize: 20, color: C.espresso },
  topTitle: { fontFamily: F.serif, fontSize: 17, color: C.white, flex: 1, textAlign: 'center' },

  accuracyPill: {
    position: 'absolute', top: 112, alignSelf: 'center',
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 4,
  },

  // Floating pin — sits at the exact visual centre of the map
  pinContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 220,
    alignItems: 'center', justifyContent: 'center',
  },
  pinEmoji: { fontSize: 40, marginBottom: -8 }, // offset for pin tail

  // Blue user-location dot (used as Marker child)
  blueDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#2563EB',
    borderWidth: 2.5, borderColor: C.white,
    shadowColor: '#2563EB', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    padding: S.xl, paddingBottom: 36, minHeight: 220,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: -4 },
    elevation: 12, gap: S.sm,
  },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  sheetHint: { fontFamily: F.sans, fontSize: 13, color: C.ink3 },
  zoneBadge: { borderRadius: R.lg, padding: S.md },
  cta: {
    marginTop: S.sm,
    backgroundColor: C.espresso, borderRadius: R.pill, paddingVertical: 16, alignItems: 'center',
  },
  ctaDis: { opacity: 0.4 },
  ctaTxt: { fontFamily: F.sansSb, fontSize: 16, color: C.white },
});
