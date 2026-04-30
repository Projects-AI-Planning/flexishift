import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, shadow, spacing} from '../../theme';

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
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev < 92 ? prev + 1 : 92));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapHeaderTitle}>{activeJob?.jobReference || 'Active Trip'}</Text>
          <Text style={styles.mapHeaderSubtitle}>
            {trackingEta?.estimatedArrival || 'ETA 14:30'}
          </Text>
        </View>
        <View style={styles.mapMock}>
          <View style={styles.routeLine} />
          <View style={styles.routeLineSecondary} />
          <View style={[styles.marker, styles.markerStart]} />
          <View style={[styles.marker, styles.markerTruck, {left: `${progress}%`}]} />
          <View style={[styles.marker, styles.markerEnd]} />
          <Text style={styles.remainingText}>
            {trackingEta?.distanceRemaining || '84 miles remaining'}
          </Text>
        </View>
        <View style={styles.zoomStack}>
          <Pressable style={styles.zoomBtn}>
            <Text style={styles.zoomText}>{'+'}</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn}>
            <Text style={styles.zoomText}>{'-'}</Text>
          </Pressable>
          <Pressable style={[styles.zoomBtn, styles.targetBtn]}>
            <Text style={styles.zoomText}>{'\u25CF'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {trackingEta?.estimatedArrival || '14:30'}
            </Text>
            <Text style={styles.metricLabel}>ETA</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {trackingEta?.distanceRemaining || '12.5 km'}
            </Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {trackingEta?.estimatedDuration || '25 min'}
            </Text>
            <Text style={styles.metricLabel}>Time Left</Text>
          </View>
        </View>

        <Card
          title={activeJob?.jobReference || 'Active Assignment'}
          subtitle={activeJob?.dropLocation || 'Destination tracking in progress'}
          variant="dark"
          rightLabel="LIVE">
          <Text style={styles.routeLabel}>Current route</Text>
          <Text style={styles.routeValue}>
            {activeJob?.pickupLocation || 'Mumbai'} {'\u2192'} {activeJob?.dropLocation || 'Pune Warehouse'}
          </Text>
          <View style={styles.progressTrack}>
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
    backgroundColor: colors.bg,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#DCE7F2',
  },
  mapHeader: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    zIndex: 2,
  },
  mapHeaderTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  mapHeaderSubtitle: {
    color: colors.inkSoft,
    fontSize: 14,
    marginTop: 4,
  },
  mapMock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  routeLine: {
    position: 'absolute',
    left: '10%',
    right: '14%',
    top: '50%',
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  routeLineSecondary: {
    position: 'absolute',
    left: '14%',
    right: '10%',
    top: '58%',
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.accent,
    opacity: 0.45,
  },
  marker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    top: '48%',
  },
  markerStart: {
    left: '10%',
    backgroundColor: colors.navy,
  },
  markerTruck: {
    backgroundColor: '#2563EB',
  },
  markerEnd: {
    right: '10%',
    backgroundColor: colors.success,
  },
  remainingText: {
    position: 'absolute',
    left: spacing.xl,
    bottom: spacing.xl,
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  zoomStack: {
    position: 'absolute',
    right: spacing.md,
    top: 90,
    gap: spacing.sm,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  targetBtn: {
    backgroundColor: '#8BC0EE',
  },
  zoomText: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D6DCE5',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  routeLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 4,
  },
  routeValue: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 999,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '800',
  },
  stopBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  stopBtnText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
  },
});

export default LiveTrackingScreen;
