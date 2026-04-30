import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Dimensions,
} from 'react-native';
import Card from '../../components/common/Card';

interface LiveTrackingScreenProps {
  activeJob: any;
  trackingEta: any;
  onUpdateLocation: (location: any) => void;
  onStopTracking: () => void;
}

const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({
  activeJob,
  trackingEta,
  onUpdateLocation,
  onStopTracking,
}) => {
  const [progress, setProgress] = useState(0);

  // Mock progress simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev < 100 ? prev + 0.1 : 100));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mockMap}>
          {/* Stylized Map Elements */}
          <View style={[styles.routePath, {width: `${progress}%`}]} />
          <View style={styles.markerStart}>
            <Text style={styles.markerIcon}>🏠</Text>
          </View>
          <View style={[styles.markerTruck, {left: `${progress}%`}]}>
            <Text style={styles.truckIcon}>🚛</Text>
          </View>
          <View style={styles.markerEnd}>
            <Text style={styles.markerIcon}>📍</Text>
          </View>
          
          <Text style={styles.mapHint}>Map View (Integration Pending Library)</Text>
        </View>

        {/* Floating Controls */}
        <View style={styles.floatingControls}>
          <Pressable style={styles.controlBtn}>
            <Text style={styles.controlIcon}>➕</Text>
          </Pressable>
          <Pressable style={styles.controlBtn}>
            <Text style={styles.controlIcon}>➖</Text>
          </Pressable>
          <Pressable style={[styles.controlBtn, styles.locationBtn]}>
            <Text style={styles.controlIcon}>🎯</Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom Information Sheet */}
      <View style={styles.infoSheet}>
        <View style={styles.handle} />
        
        <View style={styles.etaRow}>
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>{trackingEta?.estimatedArrival || '14:30'}</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>{trackingEta?.distanceRemaining || '12.5 km'}</Text>
            <Text style={styles.etaLabel}>Distance</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>{trackingEta?.estimatedDuration || '25 min'}</Text>
            <Text style={styles.etaLabel}>Time Left</Text>
          </View>
        </View>

        <Card title={activeJob?.jobReference || 'Active Trip'} variant="dark">
          <Text style={styles.locationText}>
            Current: <Text style={styles.locationHighlight}>Mumbai - Pune Expressway</Text>
          </Text>
          <Text style={styles.destinationText}>
            Dest: {activeJob?.dropLocation || 'Pune Warehouse'}
          </Text>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progress}%`}]} />
          </View>
          
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Share Status</Text>
            </Pressable>
            <Pressable onPress={onStopTracking} style={styles.stopBtn}>
              <Text style={styles.stopBtnText}>Finish Trip</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102235',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E4DED0',
  },
  mockMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapHint: {
    color: '#8A94A0',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 100,
  },
  routePath: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#DFA622',
    left: '10%',
    top: '50%',
  },
  markerStart: {
    position: 'absolute',
    left: '10%',
    top: '48%',
  },
  markerEnd: {
    position: 'absolute',
    right: '10%',
    top: '48%',
  },
  markerTruck: {
    position: 'absolute',
    top: '46%',
    marginLeft: -10,
  },
  markerIcon: {
    fontSize: 24,
  },
  truckIcon: {
    fontSize: 28,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    top: 60,
    gap: 12,
  },
  controlBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  locationBtn: {
    marginTop: 12,
    backgroundColor: '#DFA622',
  },
  controlIcon: {
    fontSize: 20,
    color: '#102235',
  },
  infoSheet: {
    backgroundColor: '#F4F1E8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E4DED0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  etaItem: {
    flex: 1,
    alignItems: 'center',
  },
  etaValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102235',
  },
  etaLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5B6671',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  etaDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E4DED0',
  },
  locationText: {
    fontSize: 14,
    color: '#C4CDD6',
    marginBottom: 4,
  },
  locationHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  destinationText: {
    fontSize: 13,
    color: '#5B6671',
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DFA622',
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  stopBtn: {
    flex: 1,
    backgroundColor: '#DFA622',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  stopBtnText: {
    color: '#102235',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default LiveTrackingScreen;
