'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '@/lib/api';

// Custom html/css icons using L.divIcon
const getCafeIcon = () => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `<div style="background-color: #3E2723; border: 2px solid #E8DCCB; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 15px;">☕</div>`,
    className: 'custom-cafe-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

const getCustomerIcon = () => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `<div style="background-color: #B57A3C; border: 2px solid #FAF8F5; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 14px;">📍</div>`,
    className: 'custom-customer-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const getRiderIcon = () => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `<div style="background-color: #4F7A54; border: 2px solid #FAF8F5; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(79,122,84,0.4); font-size: 17px; animation: bounce 1.1s infinite alternate;">🛵</div>`,
    className: 'custom-rider-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface OrderTrackingMapProps {
  cafeLat: number;
  cafeLng: number;
  customerLat: number;
  customerLng: number;
  riderLat: number | null;
  riderLng: number | null;
}

export default function OrderTrackingMap({
  cafeLat,
  cafeLng,
  customerLat,
  customerLng,
  riderLat,
  riderLng,
}: OrderTrackingMapProps) {
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);

  // Fetch route coordinates on mount
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await api.post('/maps/route', {
          startLat: cafeLat,
          startLng: cafeLng,
          endLat: customerLat,
          endLng: customerLng,
        });
        if (response.data?.coordinates) {
          const polyline: [number, number][] = response.data.coordinates.map((c: number[]) => [
            c[1],
            c[0],
          ]);
          setRoutePolyline(polyline);
        }
      } catch (e) {
        console.error('Failed to load tracking route:', e);
      }
    };
    fetchRoute();
  }, [cafeLat, cafeLng, customerLat, customerLng]);

  // Map panner on rider coordinates update
  function MapUpdater({ coords }: { coords: { lat: number; lng: number } | null }) {
    const map = useMap();
    useEffect(() => {
      if (coords) {
        map.panTo([coords.lat, coords.lng]);
      }
    }, [coords, map]);
    return null;
  }

  // Set initial viewport bounds containing both café and destination
  function MapBoundsSetter() {
    const map = useMap();
    useEffect(() => {
      const bounds = L.latLngBounds([
        [cafeLat, cafeLng],
        [customerLat, customerLng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }, [map]);
    return null;
  }

  const memoizedCafeIcon = useMemo(() => getCafeIcon(), []);
  const memoizedCustomerIcon = useMemo(() => getCustomerIcon(), []);
  const memoizedRiderIcon = useMemo(() => getRiderIcon(), []);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: 20, overflow: 'hidden' }}>
      <MapContainer
        center={[cafeLat, cafeLng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsSetter />
        {riderLat && riderLng && (
          <MapUpdater coords={{ lat: riderLat, lng: riderLng }} />
        )}

        {/* Café Marker */}
        {memoizedCafeIcon && (
          <Marker position={[cafeLat, cafeLng]} icon={memoizedCafeIcon} />
        )}

        {/* Customer Marker */}
        {memoizedCustomerIcon && (
          <Marker position={[customerLat, customerLng]} icon={memoizedCustomerIcon} />
        )}

        {/* Live Rider Marker */}
        {riderLat && riderLng && memoizedRiderIcon && (
          <Marker position={[riderLat, riderLng]} icon={memoizedRiderIcon} />
        )}

        {/* Road Routing Polyline */}
        {routePolyline.length > 0 && (
          <Polyline
            positions={routePolyline}
            pathOptions={{
              color: '#B57A3C',
              weight: 4,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}
      </MapContainer>
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
