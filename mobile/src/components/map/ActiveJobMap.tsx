import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {colors, radius} from '../../theme';

interface Coords {
  lat: number;
  lon: number;
}

interface ActiveJobMapProps {
  pickupLocation: string;
  dropLocation: string;
  pickupCoords?: {latitude: number; longitude: number} | null;
  dropCoords?: {latitude: number; longitude: number} | null;
  currentCoords?: {latitude: number; longitude: number} | null;
}

async function geocode(address: string): Promise<Coords | null> {
  if (!address || address.trim() === '' || address === '[object Object]') {
    return null;
  }
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url, {
      headers: {'User-Agent': 'FlexiShiftDriverApp/1.0'},
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon)};
    }
    return null;
  } catch {
    return null;
  }
}

function openNativeMaps(pickup: string, drop: string) {
  const query = encodeURIComponent(`${pickup} to ${drop}`);
  Linking.openURL(`https://maps.google.com/maps?q=${query}`).catch(() =>
    Linking.openURL(`geo:0,0?q=${query}`),
  );
}

function openGoogleDirections(
  pickup: string,
  drop: string,
  pickupCoords?: {latitude: number; longitude: number} | null,
  dropCoords?: {latitude: number; longitude: number} | null,
  currentCoords?: {latitude: number; longitude: number} | null,
) {
  if (currentCoords && dropCoords) {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${currentCoords.latitude},${currentCoords.longitude}` +
      `&destination=${dropCoords.latitude},${dropCoords.longitude}` +
      `&travelmode=driving`;
    Linking.openURL(url).catch(() => openNativeMaps(pickup, drop));
    return;
  }

  if (pickupCoords && dropCoords) {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${pickupCoords.latitude},${pickupCoords.longitude}` +
      `&destination=${dropCoords.latitude},${dropCoords.longitude}` +
      `&travelmode=driving`;
    Linking.openURL(url).catch(() => openNativeMaps(pickup, drop));
    return;
  }

  openNativeMaps(pickup, drop);
}

const ActiveJobMap: React.FC<ActiveJobMapProps> = ({
  pickupLocation,
  dropLocation,
  pickupCoords: pickupCoordsProp = null,
  dropCoords: dropCoordsProp = null,
  currentCoords = null,
}) => {
  const mapRef = useRef<MapView>(null);
  const [pickupCoords, setPickupCoords] = useState<Coords | null>(null);
  const [dropCoords, setDropCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [noCoords, setNoCoords] = useState(false);
  const useNativeMap = !(Platform.OS === 'android' && __DEV__);

  useEffect(() => {
    let cancelled = false;

    if (pickupCoordsProp && dropCoordsProp) {
      setPickupCoords({lat: pickupCoordsProp.latitude, lon: pickupCoordsProp.longitude});
      setDropCoords({lat: dropCoordsProp.latitude, lon: dropCoordsProp.longitude});
      setLoading(false);
      setNoCoords(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setNoCoords(false);
    setPickupCoords(null);
    setDropCoords(null);

    const resolve = async () => {
      const [pc, dc] = await Promise.all([
        geocode(pickupLocation),
        geocode(dropLocation),
      ]);
      if (cancelled) {return;}
      if (!pc || !dc) {
        setNoCoords(true);
        setLoading(false);
        return;
      }
      setPickupCoords(pc);
      setDropCoords(dc);
      setLoading(false);
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [
    pickupLocation,
    dropLocation,
    pickupCoordsProp?.latitude,
    pickupCoordsProp?.longitude,
    dropCoordsProp?.latitude,
    dropCoordsProp?.longitude,
  ]);

  useEffect(() => {
    if (mapRef.current && pickupCoords && dropCoords) {
      const coords = [
        {latitude: pickupCoords.lat, longitude: pickupCoords.lon},
        {latitude: dropCoords.lat, longitude: dropCoords.lon},
      ];
      mapRef.current.fitToCoordinates(
        coords,
        {edgePadding: {top: 24, right: 24, bottom: 24, left: 24}, animated: false},
      );
    }
  }, [pickupCoords, dropCoords]);

  if (noCoords) {
    return (
      <Pressable
        style={styles.placeholder}
        onPress={() =>
          openGoogleDirections(pickupLocation, dropLocation, pickupCoordsProp, dropCoordsProp, currentCoords)
        }>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderTitle}>
          {pickupLocation || 'Pickup'} → {dropLocation || 'Drop-off'}
        </Text>
        <Text style={styles.openMapsLink}>Open in Maps ›</Text>
      </Pressable>
    );
  }

  if (!useNativeMap) {
    return (
      <Pressable
        style={styles.placeholder}
        onPress={() =>
          openGoogleDirections(pickupLocation, dropLocation, pickupCoordsProp, dropCoordsProp, currentCoords)
        }>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderTitle}>
          {pickupLocation || 'Pickup'} → {dropLocation || 'Drop-off'}
        </Text>
        <Text style={styles.placeholderBody}>
          Live map preview is disabled on the Android emulator.
        </Text>
        <Text style={styles.openMapsLink}>Open in Maps ›</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.wrapper}
      onPress={() =>
        openGoogleDirections(pickupLocation, dropLocation, pickupCoordsProp, dropCoordsProp, currentCoords)
      }>
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
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
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
            {pickupCoords && (
              <Marker
                coordinate={{
                  latitude: pickupCoords.lat,
                  longitude: pickupCoords.lon,
                }}
                title="Pickup"
                description={pickupLocation}
                pinColor="red"
              />
            )}
            {dropCoords && (
              <Marker
                coordinate={{
                  latitude: dropCoords.lat,
                  longitude: dropCoords.lon,
                }}
                title="Drop-off"
                description={dropLocation}
                pinColor="green"
              />
            )}
            {currentCoords && (
              <Marker
                coordinate={{
                  latitude: currentCoords.latitude,
                  longitude: currentCoords.longitude,
                }}
                title="Live Location"
                description="Current truck location"
              />
            )}
          </MapView>
          <View style={styles.tapOverlay} pointerEvents="none">
            <Text style={styles.tapLabel}>Tap to open in Maps</Text>
          </View>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    height: 160,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#E8F1FA',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#E8F1FA',
    borderRadius: radius.lg,
    height: 160,
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 6,
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
    lineHeight: 18,
    textAlign: 'center',
  },
  openMapsLink: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  tapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  tapLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ActiveJobMap;
