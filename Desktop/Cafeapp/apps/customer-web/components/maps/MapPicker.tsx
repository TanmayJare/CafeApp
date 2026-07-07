'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { api } from '@/lib/api';
import { MapPin, Navigation, Search, Info, Loader2 } from 'lucide-react';

// Setup Leaflet icon overrides to solve static packaging bugs
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// Custom markers using HTML & CSS (L.divIcon) to avoid asset loading bugs
const getCafeIcon = () => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `<div style="background-color: #3E2723; border: 2px solid #E8DCCB; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">☕</div>`,
    className: 'custom-cafe-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const getCustomerIcon = () => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `<div style="background-color: #B57A3C; border: 2px solid #FAF8F5; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(43,24,16,0.3); font-size: 15px;">📍</div>`,
    className: 'custom-customer-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number, addressLine?: string) => void;
  onAllowedChange: (allowed: boolean) => void;
}

export default function MapPicker({
  latitude,
  longitude,
  onChange,
  onAllowedChange,
}: MapPickerProps) {
  // Coords fallback: Default to Mumbai center
  const defaultLat = 19.076;
  const defaultLng = 72.8777;

  const [cafeCoords, setCafeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number>(7);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: latitude || defaultLat,
    lng: longitude || defaultLng,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial prop coordinates
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedCoords({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  // Click outside listener for search suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Validate chosen coordinates and get routing info
  const validateLocation = useCallback(
    async (lat: number, lng: number) => {
      setValidating(true);
      try {
        const response = await api.post('/address/validate', { lat, lng });
        const data = response.data;
        setValidationResult(data);
        onAllowedChange(data.allowed);

        if (data.cafeCoords) {
          setCafeCoords(data.cafeCoords);
        }
        if (data.deliveryRadiusKm) {
          setDeliveryRadiusKm(data.deliveryRadiusKm);
        }

        // Map route coordinates returned from ORS proxy (ORS uses [lng, lat] order)
        if (data.routeCoordinates && Array.isArray(data.routeCoordinates)) {
          const polyline: [number, number][] = data.routeCoordinates.map((c: number[]) => [
            c[1],
            c[0],
          ]);
          setRoutePolyline(polyline);
        } else {
          setRoutePolyline([]);
        }
      } catch (err) {
        console.error('Validation error:', err);
        onAllowedChange(false);
      } finally {
        setValidating(false);
      }
    },
    [onAllowedChange],
  );

  // Validate on mount or pin coordinate change
  useEffect(() => {
    validateLocation(selectedCoords.lat, selectedCoords.lng);
  }, [selectedCoords.lat, selectedCoords.lng, validateLocation]);

  // Handle autocomplete address search
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const response = await api.get(`/maps/geocode?text=${encodeURIComponent(text)}`);
      setSuggestions(response.data || []);
      setShowSuggestions(true);
    } catch (e) {
      console.error('Geocoding suggestions error:', e);
    } finally {
      setSearching(false);
    }
  };

  const selectSuggestion = (item: any) => {
    const coords = { lat: item.latitude, lng: item.longitude };
    setSelectedCoords(coords);
    onChange(coords.lat, coords.lng, item.name);
    setSearchQuery(item.name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedCoords(coords);
        onChange(coords.lat, coords.lng, 'My Current Location');
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to detect location. Please select manually on the map.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // Sub-component to pan map dynamically
  function MapUpdater({ coords }: { coords: { lat: number; lng: number } }) {
    const map = useMap();
    useEffect(() => {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }, [coords, map]);
    return null;
  }

  // Click map behavior
  function MapEvents() {
    useMapEvents({
      click(e) {
        const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
        setSelectedCoords(coords);
        onChange(coords.lat, coords.lng);
      },
    });
    return null;
  }

  // Marker drag behavior
  const markerEventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const coords = { lat: latLng.lat, lng: latLng.lng };
          setSelectedCoords(coords);
          onChange(coords.lat, coords.lng);
        }
      },
    }),
    [onChange],
  );

  const memoizedCafeIcon = useMemo(() => getCafeIcon(), []);
  const memoizedCustomerIcon = useMemo(() => getCustomerIcon(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Search Input Box ── */}
      <div ref={searchContainerRef} style={{ position: 'relative', zIndex: 1000 }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search address or landmark..."
            style={{
              width: '100%',
              padding: '13px 44px 13px 16px',
              borderRadius: 13,
              background: '#FFFFFF',
              border: '1.5px solid rgba(93,64,55,0.16)',
              fontSize: 14,
              color: '#2B1810',
              fontFamily: 'Inter,sans-serif',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(43,24,16,0.04)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {searching ? (
              <Loader2 size={16} className="animate-spin" color="#B57A3C" />
            ) : (
              <Search size={16} color="#B57A3C" />
            )}
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#FAF8F5',
              border: '1px solid rgba(93,64,55,0.15)',
              borderRadius: 12,
              marginTop: 4,
              padding: 0,
              listStyle: 'none',
              boxShadow: '0 8px 24px rgba(43,24,16,0.12)',
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {suggestions.map((item, index) => (
              <li
                key={index}
                onClick={() => selectSuggestion(item)}
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  color: '#2B1810',
                  cursor: 'pointer',
                  borderBottom:
                    index === suggestions.length - 1
                      ? 'none'
                      : '1px solid rgba(93,64,55,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'Inter,sans-serif',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <MapPin size={14} color="#9E7B6D" style={{ flexShrink: 0 }} />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Geolocation and Map Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(232,220,203,0.5)',
            border: '1px solid rgba(93,64,55,0.18)',
            borderRadius: 10,
            padding: '7px 12px',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#5D4037',
            transition: 'all 0.2s',
            fontFamily: 'Inter,sans-serif',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.85)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.5)';
          }}
        >
          <Navigation size={13} /> Use My Current Location
        </button>
      </div>

      {/* ── Leaflet Map Container ── */}
      <div style={{ height: 320, width: '100%', position: 'relative', zIndex: 1 }}>
        <MapContainer
          center={[selectedCoords.lat, selectedCoords.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater coords={selectedCoords} />
          <MapEvents />

          {/* Café Location Marker */}
          {cafeCoords && memoizedCafeIcon && (
            <Marker position={[cafeCoords.lat, cafeCoords.lng]} icon={memoizedCafeIcon}>
              <Circle
                center={[cafeCoords.lat, cafeCoords.lng]}
                radius={deliveryRadiusKm * 1000} // Circle radius in meters
                pathOptions={{
                  color: '#4F7A54',
                  fillColor: '#8A9A5B',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '4, 6',
                }}
              />
            </Marker>
          )}

          {/* User Chosen Delivery Destination Marker */}
          {memoizedCustomerIcon && (
            <Marker
              position={[selectedCoords.lat, selectedCoords.lng]}
              icon={memoizedCustomerIcon}
              draggable={true}
              eventHandlers={markerEventHandlers}
            />
          )}

          {/* Route path from Café to Customer Pin */}
          {routePolyline.length > 0 && (
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#B57A3C',
                weight: 4,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}
        </MapContainer>

        {validating && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(250,248,245,0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 10,
                background: '#FAF8F5',
                border: '1px solid rgba(93,64,55,0.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <Loader2 size={16} className="animate-spin" color="#B57A3C" />
              <span style={{ fontSize: 13, color: '#5D4037', fontWeight: 500 }}>
                Updating delivery route...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Route Information Widget ── */}
      {validationResult && (
        <div
          style={{
            background: validationResult.allowed
              ? 'rgba(79,122,84,0.08)'
              : 'rgba(169,68,66,0.08)',
            border: validationResult.allowed
              ? '1px solid rgba(79,122,84,0.22)'
              : '1px solid rgba(169,68,66,0.22)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <Info
            size={16}
            color={validationResult.allowed ? '#4F7A54' : '#A94442'}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: validationResult.allowed ? '#4F7A54' : '#A94442',
                marginBottom: 2,
              }}
            >
              {validationResult.allowed
                ? 'Delivery is available!'
                : 'Delivery Unavailable: Out of range'}
            </p>
            <p
              style={{
                fontSize: 12,
                color: validationResult.allowed ? '#5D4037' : '#9E7B6D',
                lineHeight: 1.5,
              }}
            >
              {validationResult.allowed ? (
                <>
                  Driving distance: <strong>{validationResult.distanceFromCafeKm} km</strong>{' '}
                  ({validationResult.estimatedTime})
                </>
              ) : (
                `Distance from café is ${validationResult.distanceFromCafeKm} km (Maximum range is ${deliveryRadiusKm} km)`
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
