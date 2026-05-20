import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import MapViewDirections, {MapDirectionsResponse} from 'react-native-maps-directions';
import {colors, radius} from '../../theme';
import {GOOGLE_MAPS_API_KEY} from '../../config/env';

interface ActiveJobMapProps {
  pickupLocation: string;
  dropLocation: string;
  pickupCoords?: {latitude: number; longitude: number} | null;
  dropCoords?: {latitude: number; longitude: number} | null;
  currentCoords?: {latitude: number; longitude: number} | null;
  liveMode?: boolean;
  onLocationUpdate?: (coords: {latitude: number; longitude: number}) => void;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

interface Coords {
  lat: number;
  lon: number;
}

async function geocode(address: string): Promise<Coords | null> {
  if (!address || address.trim() === '' || address === '[object Object]') {
    return null;
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {headers: {'User-Agent': 'FlexiShiftDriverApp/1.0'}},
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon)};
    }
    return null;
  } catch {
    return null;
  }
}

function ptsToRegion(pts: LatLng[]) {
  const lats = pts.map(p => p.latitude);
  const lons = pts.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.02),
    longitudeDelta: Math.max((maxLon - minLon) * 1.5, 0.02),
  };
}

const ActiveJobMap: React.FC<ActiveJobMapProps> = ({
  pickupLocation,
  dropLocation,
  pickupCoords: pickupCoordsProp = null,
  dropCoords: dropCoordsProp = null,
  currentCoords = null,
  liveMode = false,
  onLocationUpdate,
}) => {
  const mapRef = useRef<MapView>(null);
  const initialFitDoneRef = useRef(false);
  const followingRef = useRef(false);

  const [pickupCoords, setPickupCoords] = useState<Coords | null>(null);
  const [dropCoords, setDropCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [noCoords, setNoCoords] = useState(false);
  const [routeReady, setRouteReady] = useState(false);

  // Live GPS position from device
  const [driverCoords, setDriverCoords] = useState<LatLng | null>(null);
  // Throttled origin for MapViewDirections — only changes when driver moves > ~50 m
  const [routeOrigin, setRouteOrigin] = useState<LatLng | null>(null);
  const lastRouteOriginRef = useRef<LatLng | null>(null);

  // ── Resolve pickup/drop coords ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (pickupCoordsProp && dropCoordsProp) {
      setPickupCoords({lat: pickupCoordsProp.latitude, lon: pickupCoordsProp.longitude});
      setDropCoords({lat: dropCoordsProp.latitude, lon: dropCoordsProp.longitude});
      setLoading(false);
      setNoCoords(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setNoCoords(false);
    (async () => {
      const [pc, dc] = await Promise.all([geocode(pickupLocation), geocode(dropLocation)]);
      if (cancelled) {return;}
      if (!pc || !dc) {setNoCoords(true); setLoading(false); return;}
      setPickupCoords(pc);
      setDropCoords(dc);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [
    pickupLocation, dropLocation,
    pickupCoordsProp?.latitude, pickupCoordsProp?.longitude,
    dropCoordsProp?.latitude, dropCoordsProp?.longitude,
  ]);

  // ── GPS handler (MapView fires this when showsUserLocation is true) ─────────
  const handleUserLocationChange = useCallback(
    (event: any) => {
      const coord = event?.nativeEvent?.coordinate;
      if (!coord?.latitude || !coord?.longitude) {return;}
      const coords: LatLng = {latitude: coord.latitude, longitude: coord.longitude};
      setDriverCoords(coords);
      onLocationUpdate?.(coords);

      // Camera follows driver (Uber-style)
      if (mapRef.current) {
        followingRef.current = true;
        mapRef.current.animateCamera(
          {center: coords, zoom: 16, heading: coord.heading ?? 0},
          {duration: 700},
        );
      }

      // Update route origin only when moved > ~50 m (0.0005 deg ≈ 55 m)
      const prev = lastRouteOriginRef.current;
      if (
        !prev ||
        Math.abs(coord.latitude - prev.latitude) > 0.0005 ||
        Math.abs(coord.longitude - prev.longitude) > 0.0005
      ) {
        lastRouteOriginRef.current = coords;
        setRouteOrigin(coords);
      }
    },
    [onLocationUpdate],
  );

  // ── Fit map to show full route once coords are ready ────────────────────────
  useEffect(() => {
    if (loading || !dropCoords || initialFitDoneRef.current || followingRef.current) {return;}
    const origin = driverCoords ?? currentCoords;
    const startPt = origin
      ? origin
      : pickupCoords
      ? {latitude: pickupCoords.lat, longitude: pickupCoords.lon}
      : null;
    if (!startPt || !mapRef.current) {return;}
    initialFitDoneRef.current = true;
    mapRef.current.animateToRegion(
      ptsToRegion([startPt, {latitude: dropCoords.lat, longitude: dropCoords.lon}]),
      800,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoords, dropCoords, loading]);

  // ── Sync routeOrigin from server-polled coords before GPS kicks in ──────────
  useEffect(() => {
    if (driverCoords || !liveMode) {return;}
    if (!currentCoords || lastRouteOriginRef.current) {return;}
    lastRouteOriginRef.current = currentCoords;
    setRouteOrigin(currentCoords);
  }, [currentCoords, driverCoords, liveMode]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const livePos = driverCoords ?? currentCoords ?? null;

  const directionsOrigin: LatLng | null = liveMode
    ? (routeOrigin ?? (pickupCoords ? {latitude: pickupCoords.lat, longitude: pickupCoords.lon} : null))
    : pickupCoords
    ? {latitude: pickupCoords.lat, longitude: pickupCoords.lon}
    : null;

  const directionsDestination: LatLng | null = dropCoords
    ? {latitude: dropCoords.lat, longitude: dropCoords.lon}
    : null;

  const handleDirectionsReady = useCallback(
    (result: MapDirectionsResponse) => {
      setRouteReady(true);
      if (!followingRef.current && mapRef.current && result.coordinates.length >= 2) {
        mapRef.current.animateToRegion(ptsToRegion(result.coordinates), 800);
      }
    },
    [],
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  if (noCoords && !loading) {
    return (
      <View style={[styles.wrapper, liveMode && styles.wrapperLive]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🗺️</Text>
          <Text style={styles.placeholderTitle}>
            {pickupLocation || 'Pickup'} → {dropLocation || 'Drop-off'}
          </Text>
          <Text style={styles.placeholderBody}>Could not resolve coordinates.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, liveMode && styles.wrapperLive]}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.navy} size="small" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            scrollEnabled
            zoomEnabled
            rotateEnabled
            pitchEnabled={false}
            toolbarEnabled={false}
            showsUserLocation={liveMode}
            showsMyLocationButton={false}
            showsTraffic={liveMode}
            onUserLocationChange={liveMode ? handleUserLocationChange : undefined}
            initialRegion={
              pickupCoords
                ? {
                    latitude: pickupCoords.lat,
                    longitude: pickupCoords.lon,
                    latitudeDelta: 0.5,
                    longitudeDelta: 0.5,
                  }
                : undefined
            }>

            {/* Google Maps road route via Directions API */}
            {directionsOrigin && directionsDestination && (
              <MapViewDirections
                origin={directionsOrigin}
                destination={directionsDestination}
                apikey={GOOGLE_MAPS_API_KEY}
                mode="DRIVING"
                strokeWidth={5}
                strokeColor="#1d6fd8"
                precision="high"
                resetOnChange={false}
                onReady={handleDirectionsReady}
                onError={(err: string) => console.warn('Directions API error:', err)}
              />
            )}

            {/* Pickup pin — hidden once driver is moving */}
            {pickupCoords && !livePos && (
              <Marker
                coordinate={{latitude: pickupCoords.lat, longitude: pickupCoords.lon}}
                title="Pickup"
                description={pickupLocation}>
                <View style={styles.pinA}>
                  <Text style={styles.pinLabel}>A</Text>
                </View>
              </Marker>
            )}

            {/* Destination pin */}
            {dropCoords && (
              <Marker
                coordinate={{latitude: dropCoords.lat, longitude: dropCoords.lon}}
                title="Destination"
                description={dropLocation}>
                <View style={styles.pinB}>
                  <Text style={styles.pinLabel}>B</Text>
                </View>
              </Marker>
            )}

            {/* Live truck marker — driver's current position */}
            {livePos && (
              <Marker
                coordinate={livePos}
                anchor={{x: 0.5, y: 0.5}}
                title="You"
                description="Your current location">
                <View style={styles.driverPin}>
                  <Text style={styles.driverPinIcon}>🚛</Text>
                </View>
              </Marker>
            )}
          </MapView>

          {/* Route loading indicator */}
          {!routeReady && !loading && (
            <View style={styles.routeLoadingBadge} pointerEvents="none">
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.routeLoadingText}>Loading route…</Text>
            </View>
          )}

          {/* GPS status badge */}
          {liveMode && (
            <View style={styles.liveBadge} pointerEvents="none">
              <View style={[styles.liveDot, driverCoords && styles.liveDotActive]} />
              <Text style={styles.liveBadgeText}>
                {driverCoords ? 'GPS LIVE' : 'WAITING FOR GPS'}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    height: 240,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#E8F1FA',
  },
  wrapperLive: {
    height: 400,
  },
  map: {flex: 1},
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {color: colors.inkSoft, fontSize: 12, fontWeight: '600'},
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  placeholderIcon: {fontSize: 28},
  placeholderTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholderBody: {
    color: colors.inkSoft,
    fontSize: 12,
    textAlign: 'center',
  },
  pinA: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  pinB: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  pinLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  driverPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1d6fd8',
    elevation: 4,
  },
  driverPinIcon: {fontSize: 22},
  routeLoadingBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  routeLoadingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
  },
  liveDotActive: {
    backgroundColor: '#22c55e',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default ActiveJobMap;
