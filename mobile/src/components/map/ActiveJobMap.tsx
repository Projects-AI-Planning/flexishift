import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {colors, radius} from '../../theme';
import {GOOGLE_MAPS_API_KEY} from '../../config/env';

interface ActiveJobMapProps {
  pickupLocation: string;
  dropLocation: string;
  pickupCoords?: {latitude: number; longitude: number} | null;
  dropCoords?: {latitude: number; longitude: number} | null;
  currentCoords?: {latitude: number; longitude: number} | null;
  liveMode?: boolean;
  stops?: Array<{address?: string; order?: number; litres?: number}>;
  onLocationUpdate?: (coords: {latitude: number; longitude: number}) => void;
  onRouteInfoUpdate?: (info: {distanceKm: number; durationMin: number}) => void;
  style?: object;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

interface Coords {
  lat: number;
  lon: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let result = 0, shift = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({latitude: lat / 1e5, longitude: lng / 1e5});
  }
  return points;
}

async function geocode(address: string): Promise<Coords | null> {
  if (!address || address.trim() === '' || address === '[object Object]') {
    return null;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      const loc = data.results[0].geometry.location;
      return {lat: loc.lat, lon: loc.lng};
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
  stops = [],
  onLocationUpdate,
  onRouteInfoUpdate,
  style,
}) => {
  const mapRef = useRef<MapView>(null);
  const initialFitDoneRef = useRef(false);
  const followingRef = useRef(false);

  const [pickupCoords, setPickupCoords] = useState<Coords | null>(null);
  const [dropCoords, setDropCoords] = useState<Coords | null>(null);
  const [stopCoords, setStopCoords] = useState<Coords[]>([]);
  const [loading, setLoading] = useState(true);
  const [noCoords, setNoCoords] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);

  // Live GPS position from device
  const [driverCoords, setDriverCoords] = useState<LatLng | null>(null);
  // Throttled origin for routing updates
  const [routeOrigin, setRouteOrigin] = useState<LatLng | null>(null);
  const lastRouteOriginRef = useRef<LatLng | null>(null);

  // Safety timeout for route loading
  useEffect(() => {
    if (!routeReady && !loading && !noCoords) {
      const timer = setTimeout(() => {
        if (!routeReady) {
          console.log('Map route timeout reached, forcing ready state');
          setRouteReady(true);
        }
      }, 8000); // 8 seconds safety
      return () => clearTimeout(timer);
    }
  }, [routeReady, loading, noCoords]);

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

  // ── Geocode intermediate stops ──────────────────────────────────────────────
  useEffect(() => {
    if (!stops || stops.length === 0) {
      setStopCoords([]);
      return;
    }
    let cancelled = false;
    const sorted = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    (async () => {
      const results = await Promise.all(
        sorted.map(s => (s.address ? geocode(s.address) : Promise.resolve(null))),
      );
      if (!cancelled) {
        setStopCoords(results.filter((c): c is Coords => c !== null));
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stops?.map(s => s.address))]);

  // ── GPS handler — fires whenever showsUserLocation updates ──────────────────
  const handleUserLocationChange = useCallback(
    (event: any) => {
      const coord = event?.nativeEvent?.coordinate;
      if (!coord?.latitude || !coord?.longitude) {return;}
      const coords: LatLng = {latitude: coord.latitude, longitude: coord.longitude};
      setDriverCoords(coords);
      onLocationUpdate?.(coords);

      // In live mode: camera continuously follows driver (Uber-style)
      if (liveMode && mapRef.current) {
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
        if (liveMode) {setRouteOrigin(coords);}
      }
    },
    [liveMode, onLocationUpdate],
  );

  // ── Fit map to show route — re-runs when currentCoords arrives ──────────────
  useEffect(() => {
    if (loading || !dropCoords || followingRef.current) {return;}
    const origin = driverCoords ?? currentCoords;
    const startPt = origin
      ? origin
      : pickupCoords
      ? {latitude: pickupCoords.lat, longitude: pickupCoords.lon}
      : null;
    if (!startPt || !mapRef.current) {return;}
    // Allow re-fit when a real position arrives for the first time
    if (initialFitDoneRef.current && !origin) {return;}
    initialFitDoneRef.current = true;
    mapRef.current.animateToRegion(
      ptsToRegion([startPt, {latitude: dropCoords.lat, longitude: dropCoords.lon}]),
      800,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoords, dropCoords, loading, currentCoords]);

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

  // ── Google Directions Routing & ETA Logic ───────────────────────────────────
  useEffect(() => {
    if (!directionsOrigin || !directionsDestination) {return;}

    setRouteReady(false);
    setRouteError(false);

    (async () => {
      try {
        const origin      = `${directionsOrigin.latitude},${directionsOrigin.longitude}`;
        const destination = `${directionsDestination.latitude},${directionsDestination.longitude}`;
        let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
        if (stopCoords.length > 0) {
          const wps = stopCoords.map(c => `${c.lat},${c.lon}`).join('|');
          url += `&waypoints=${encodeURIComponent(wps)}`;
        }
        const res  = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK' && data.routes?.length > 0) {
          const route  = data.routes[0];
          const coords = decodePolyline(route.overview_polyline.points);
          setRouteCoords(coords);
          setRouteReady(true);

          const legs       = route.legs as Array<{distance: {value: number}; duration: {value: number}}>;
          const totalDist  = legs.reduce((s, l) => s + l.distance.value, 0);
          const totalDur   = legs.reduce((s, l) => s + l.duration.value, 0);
          onRouteInfoUpdate?.({
            distanceKm: totalDist / 1000,
            durationMin: Math.round(totalDur / 60),
          });

          if (!followingRef.current && mapRef.current && coords.length >= 2) {
            mapRef.current.animateToRegion(ptsToRegion(coords), 800);
          }
        } else {
          throw new Error(`Google Directions error: ${data.status}`);
        }
      } catch (err) {
        console.warn('Google Directions error:', err);
        setRouteError(true);
        setRouteReady(true);
        const dist = haversine(
          directionsOrigin.latitude, directionsOrigin.longitude,
          directionsDestination.latitude, directionsDestination.longitude,
        );
        onRouteInfoUpdate?.({distanceKm: dist, durationMin: Math.round(dist * 1.5)});
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directionsOrigin?.latitude, directionsOrigin?.longitude, directionsDestination?.latitude, directionsDestination?.longitude, stopCoords, onRouteInfoUpdate]);

  // ── Render ──────────────────────────────────────────────────────────────────
  // In live mode (driver tracking) we ALWAYS show the map — even if pickup/drop
  // coordinates couldn't be resolved (shifts often have only a reporting location and
  // no drop). The map then just follows the driver's live GPS position.
  if (noCoords && !loading && !liveMode) {
    return (
      <View style={[styles.wrapper, liveMode && styles.wrapperLive, style]}>
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
    <View style={[styles.wrapper, liveMode && styles.wrapperLive, style]}>
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
            showsUserLocation
            showsMyLocationButton={false}
            showsTraffic={liveMode}
            onUserLocationChange={handleUserLocationChange}
            initialRegion={
              currentCoords
                ? {
                    latitude: currentCoords.latitude,
                    longitude: currentCoords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
                : pickupCoords
                ? {
                    latitude: pickupCoords.lat,
                    longitude: pickupCoords.lon,
                    latitudeDelta: 0.5,
                    longitudeDelta: 0.5,
                  }
                : {
                    // Fallback region (driver's GPS will recenter via showsUserLocation)
                    latitude: 20.5937,
                    longitude: 78.9629,
                    latitudeDelta: 30,
                    longitudeDelta: 30,
                  }
            }>

            {/* OSRM Polyline */}
            {routeReady && routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor="#1d6fd8"
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

            {/* Intermediate stop pins */}
            {stopCoords.map((sc, idx) => (
              <Marker
                key={`stop-${idx}`}
                coordinate={{latitude: sc.lat, longitude: sc.lon}}
                title={`Stop ${idx + 1}`}
                description={stops[idx]?.address ?? ''}>
                <View style={styles.pinStop}>
                  <Text style={styles.pinLabel}>{idx + 1}</Text>
                </View>
              </Marker>
            ))}

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
          {!routeReady && !loading && directionsOrigin && directionsDestination && (
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
  pinStop: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d97706',
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
