import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius} from '../../theme';

const MAPS_API_KEY = 'AIzaSyClv3tblk7FFbySthbSNiPurlhpKHUS-2g';

interface ActiveJobMapProps {
  pickupLocation: string;
  dropLocation: string;
}

const ActiveJobMap: React.FC<ActiveJobMapProps> = ({
  pickupLocation,
  dropLocation,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const pickup = encodeURIComponent(pickupLocation);
  const drop = encodeURIComponent(dropLocation);

  const mapUrl =
    'https://maps.googleapis.com/maps/api/staticmap' +
    '?size=640x320&scale=2' +
    '&style=feature:poi|visibility:off' +
    '&style=feature:transit|visibility:off' +
    `&markers=color:0xDFA622%7Clabel:P%7C${pickup}` +
    `&markers=color:0x18794E%7Clabel:D%7C${drop}` +
    `&path=color:0x102235CC%7Cweight:4%7C${pickup}%7C${drop}` +
    `&key=${MAPS_API_KEY}`;

  if (error) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderText}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.navy} size="small" />
        </View>
      )}
      <Image
        source={{uri: mapUrl}}
        style={[styles.map, loading && styles.hidden]}
        resizeMode="cover"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </View>
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
    height: '100%',
    width: '100%',
  },
  hidden: {
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#E8F1FA',
    borderRadius: radius.lg,
    gap: 6,
    height: 160,
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeholderIcon: {fontSize: 28},
  placeholderText: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ActiveJobMap;
