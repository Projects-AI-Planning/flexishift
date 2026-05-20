import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {colors, radius} from '../../theme';

interface ActiveJobMapProps {
  pickupLocation: string;
  dropLocation: string;
  pickupCoords?: {latitude: number; longitude: number} | null;
  dropCoords?: {latitude: number; longitude: number} | null;
  /** Server-polled live position (fallback when device GPS isn't available) */
  currentCoords?: {latitude: number; longitude: number} | null;
  /** True when the job is IN_TRANSIT — enables live GPS follow mode */
  liveMode?: boolean;
  /** Called with every GPS update so the parent can upload to the backend */
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
  // Live driver position from device GPS (via onUserLocationChange)
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
      if (!pc || !dc) { setNoCoords(true); setLoading(false); return; }
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

  // Initial fit to show full route when not yet following driver
  useEffect(() => {
    if (followingRef.current || !mapRef.current || loading) {return;}
    const pts: {latitude: number; longitude: number}[] = [];
    if (driverCoords ?? currentCoords) {pts.push((driverCoords ?? currentCoords)!);}
    if (dropCoords) {pts.push({latitude: dropCoords.lat, longitude: dropCoords.lon});}
    if (pickupCoords && pts.length === 0) {pts.push({latitude: pickupCoords.lat, longitude: pickupCoords.lon});}
    if (pts.length >= 2) {
      mapRef.current.fitToCoordinates(pts, {
        edgePadding: {top: 80, right: 48, bottom: 48, left: 48},
        animated: true,
      });
    }
  }, [pickupCoords, dropCoords, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called by MapView every time the device GPS position updates
  const handleUserLocationChange = useCallback(
    (event: any) => {
      const coord = event?.nativeEvent?.coordinate;
      if (!coord?.latitude || !coord?.longitude) {return;}

      const coords = {latitude: coord.latitude, longitude: coord.longitude};
      setDriverCoords(coords);
      onLocationUpdate?.(coords);

      // Animate camera to follow driver (Uber-style)
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

  // The position shown on the map: prefer live device GPS, then server-polled, then nothing
  const livePos = driverCoords ?? currentCoords ?? null;

  // Route line: live position → destination
  const routeCoords: {latitude: number; longitude: number}[] = [];
  if (livePos && dropCoords) {
    routeCoords.push(livePos);
    routeCoords.push({latitude: dropCoords.lat, longitude: dropCoords.lon});
  } else if (pickupCoords && dropCoords) {
    routeCoords.push({latitude: pickupCoords.lat, longitude: pickupCoords.lon});
    routeCoords.push({latitude: dropCoords.lat, longitude: dropCoords.lon});
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
            // showsUserLocation renders the blue dot AND fires onUserLocationChange
            showsUserLocation={liveMode}
            showsMyLocationButton={false}
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

            {/* Blue route line from driver's current position to destination */}
            {routeCoords.length >= 2 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#2563eb"
                strokeWidth={5}
                lineDashPattern={livePos ? undefined : [10, 5]}
              />
            )}

            {/* Pickup marker — hidden once driver is in motion */}
            {pickupCoords && !livePos && (
              <Marker
                coordinate={{latitude: pickupCoords.lat, longitude: pickupCoords.lon}}
                title="Pickup"
                description={pickupLocation}
                pinColor="red"
              />
            )}

            {/* Destination marker */}
            {dropCoords && (
              <Marker
                coordinate={{latitude: dropCoords.lat, longitude: dropCoords.lon}}
                title="Destination"
                description={dropLocation}
                pinColor="green"
              />
            )}

            {/* Server-polled position (shown only when device GPS hasn't fired yet) */}
            {currentCoords && !driverCoords && (
              <Marker
                coordinate={currentCoords}
                title="Driver"
                description="Last known location"
                pinColor="#1d4ed8"
              />
            )}
          </MapView>

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
    height: 320,
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
