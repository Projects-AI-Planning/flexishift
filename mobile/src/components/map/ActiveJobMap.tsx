import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {colors, radius} from '../../theme';
import {driverApi} from '../../api/driverApi';

interface ActiveJobMapProps {
  pickupLocation: string;
  dropLocation: string;
  pickupCoords?: {latitude: number; longitude: number} | null;
  dropCoords?: {latitude: number; longitude: number} | null;
  currentCoords?: {latitude: number; longitude: number} | null;
  liveMode?: boolean;
  onLocationUpdate?: (coords: {latitude: number; longitude: number}) => void;
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

async function fetchRoadRoute(
  origin: Coords,
  destination: Coords,
): Promise<{latitude: number; longitude: number}[] | null> {
  try {
    const data = await driverApi.maps.getRoute(
      origin.lat, origin.lon, destination.lat, destination.lon,
    );
    return data.coordinates ?? null;
  } catch {
    return null;
  }
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
  const [pickupCoords, setPickupCoords] = useState<Coords | null>(null);
  const [dropCoords, setDropCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [noCoords, setNoCoords] = useState(false);
  const [roadRoute, setRoadRoute] = useState<{latitude: number; longitude: number}[] | null>(null);
  const [driverCoords, setDriverCoords] = useState<{latitude: number; longitude: number} | null>(null);
  const followingRef = useRef(false);

  // Resolve pickup/drop coords from props or geocode
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

  // Fetch road route whenever pickup/drop coords are resolved
  useEffect(() => {
    if (!pickupCoords || !dropCoords) {return;}
    let cancelled = false;
    setRoadRoute(null);
    (async () => {
      const route = await fetchRoadRoute(pickupCoords, dropCoords);
      if (!cancelled) {setRoadRoute(route);}
    })();
    return () => { cancelled = true; };
  }, [pickupCoords, dropCoords]);

  // Re-fetch road route from current driver position to destination while live
  useEffect(() => {
    if (!liveMode || !driverCoords || !dropCoords) {return;}
    let cancelled = false;
    const origin: Coords = {lat: driverCoords.latitude, lon: driverCoords.longitude};
    (async () => {
      const route = await fetchRoadRoute(origin, dropCoords);
      if (!cancelled && route) {setRoadRoute(route);}
    })();
    return () => { cancelled = true; };
    // Re-fetch every ~10 location updates to avoid hammering the API
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropCoords, liveMode]);

  // Fit map to show full route
  useEffect(() => {
    if (followingRef.current || !mapRef.current || loading) {return;}
    const pts: {latitude: number; longitude: number}[] = [];
    if (driverCoords ?? currentCoords) {pts.push((driverCoords ?? currentCoords)!);}
    if (dropCoords) {pts.push({latitude: dropCoords.lat, longitude: dropCoords.lon});}
    if (pickupCoords && pts.length === 0) {pts.push({latitude: pickupCoords.lat, longitude: pickupCoords.lon});}
    if (pts.length >= 2) {
      mapRef.current.fitToCoordinates(pts, {
        edgePadding: {top: 80, right: 48, bottom: 80, left: 48},
        animated: true,
      });
    }
  }, [pickupCoords, dropCoords, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit map to road route once fetched
  useEffect(() => {
    if (!roadRoute || roadRoute.length < 2 || !mapRef.current || followingRef.current) {return;}
    mapRef.current.fitToCoordinates(roadRoute, {
      edgePadding: {top: 80, right: 48, bottom: 80, left: 48},
      animated: true,
    });
  }, [roadRoute]);

  const handleUserLocationChange = useCallback(
    (event: any) => {
      const coord = event?.nativeEvent?.coordinate;
      if (!coord?.latitude || !coord?.longitude) {return;}
      const coords = {latitude: coord.latitude, longitude: coord.longitude};
      setDriverCoords(coords);
      onLocationUpdate?.(coords);

      if (mapRef.current) {
        followingRef.current = true;
        mapRef.current.animateCamera(
          {center: coords, zoom: 16, heading: coord.heading ?? 0},
          {duration: 800},
        );
      }
    },
    [onLocationUpdate],
  );

  const livePos = driverCoords ?? currentCoords ?? null;

  // Straight-line fallback used only while road route is loading
  const straightLine: {latitude: number; longitude: number}[] = [];
  if (!roadRoute) {
    if (livePos && dropCoords) {
      straightLine.push(livePos);
      straightLine.push({latitude: dropCoords.lat, longitude: dropCoords.lon});
    } else if (pickupCoords && dropCoords) {
      straightLine.push({latitude: pickupCoords.lat, longitude: pickupCoords.lon});
      straightLine.push({latitude: dropCoords.lat, longitude: dropCoords.lon});
    }
  }

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

            {/* Road route polyline — replaces straight line once fetched */}
            {roadRoute && roadRoute.length >= 2 && (
              <Polyline
                coordinates={roadRoute}
                strokeColor="#1d6fd8"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Dashed straight line shown only while road route is loading */}
            {!roadRoute && straightLine.length >= 2 && (
              <Polyline
                coordinates={straightLine}
                strokeColor="#93c5fd"
                strokeWidth={3}
                lineDashPattern={[8, 6]}
              />
            )}

            {/* Pickup marker — A pin, hidden once driver is moving */}
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

            {/* Destination marker — B pin */}
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

            {/* Server-polled driver position (shown only before device GPS fires) */}
            {currentCoords && !driverCoords && (
              <Marker
                coordinate={currentCoords}
                title="Driver"
                description="Last known location">
                <View style={styles.driverPin}>
                  <Text style={styles.driverPinIcon}>🚛</Text>
                </View>
              </Marker>
            )}
          </MapView>

          {/* Route loading indicator */}
          {!roadRoute && !loading && (
            <View style={styles.routeLoadingBadge} pointerEvents="none">
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.routeLoadingText}>Loading route…</Text>
            </View>
          )}

          {/* LIVE badge */}
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
    height: 220,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#E8F1FA',
  },
  wrapperLive: {
    height: 340,
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
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
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
