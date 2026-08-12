import React, {useState} from 'react';
import {
  Dimensions,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ActiveJobMap from '../../components/map/ActiveJobMap';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

interface LiveTrackingScreenProps {
  activeJob: any;
  trackingEta: any;
  trackingLiveLocation?: {
    lastUpdatedAt?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  complianceStatus: any;
  onUpdateLocation: (location: any) => void;
  onStopTracking: () => void;
  onReportIncident: () => void;
}

type ComplianceStep = 'load_code' | 'handover' | 'in_transit' | 'delivery' | 'done';

function resolveStep(complianceStatus: any, activeJob: any): ComplianceStep {
  const status = String(complianceStatus?.currentStep ?? activeJob?.currentComplianceStep ?? '').toLowerCase();
  if (!status || status === 'load_code') return 'load_code';
  if (status === 'handover' || status === 'vehicle_handover') return 'handover';
  if (status === 'in_transit') return 'in_transit';
  if (status === 'delivery' || status === 'deliver') return 'delivery';
  if (status === 'completed' || status === 'done') return 'done';
  if (complianceStatus?.step1_handover_completed) return 'in_transit';
  if (complianceStatus?.load_code_verified) return 'handover';
  const jobStatus = String(complianceStatus?.job_status ?? activeJob?.status ?? '').toLowerCase();
  if (jobStatus === 'in_transit') return 'in_transit';
  if (jobStatus === 'delivery_submitted' || jobStatus === 'completed') return 'done';
  return 'load_code';
}

function formatEta(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDistance(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  return raw;
}

function formatDuration(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  const mins = Math.max(0, Math.round(num));
  const hours = Math.floor(mins / 60);
  const remain = mins % 60;
  if (hours && remain) return `${hours}h ${remain}m`;
  if (hours) return `${hours}h`;
  return `${remain}m`;
}

const STEP_LABELS = [
  {id: 'pickup', label: 'Pickup'},
  {id: 'in_transit', label: 'In Transit'},
  {id: 'delivery', label: 'Delivery'},
];

function resolveDisplayStep(step: ComplianceStep): string {
  if (step === 'in_transit') return 'in_transit';
  if (step === 'delivery' || step === 'done') return 'delivery';
  return 'pickup';
}

const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({
  activeJob,
  trackingEta,
  trackingLiveLocation,
  complianceStatus,
  onUpdateLocation,
  onStopTracking,
  onReportIncident,
}) => {
  const [realtimeInfo, setRealtimeInfo] = useState<{distanceKm: number; durationMin: number} | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const currentStep = resolveStep(complianceStatus, activeJob);
  const displayStep = resolveDisplayStep(currentStep);
  const isInTransit = currentStep === 'in_transit' || currentStep === 'delivery';

  const etaValue = realtimeInfo
    ? new Date(Date.now() + realtimeInfo.durationMin * 60000).toISOString()
    : trackingEta?.estimatedArrival ?? activeJob?.eta ?? activeJob?.originalEta;

  const distanceValue = realtimeInfo
    ? `${realtimeInfo.distanceKm.toFixed(1)} km`
    : trackingEta?.distanceRemaining ??
      activeJob?.distanceRemaining ??
      activeJob?.distanceKm ??
      activeJob?.distance;

  const durationValue = realtimeInfo
    ? realtimeInfo.durationMin
    : trackingEta?.estimatedDuration ??
      activeJob?.estimatedDuration ??
      activeJob?.durationMin ??
      activeJob?.timeLeft;

  const etaLabel = formatEta(etaValue);
  const distanceLabel = formatDistance(distanceValue);
  const durationLabel = formatDuration(durationValue);

  const pickupCoords =
    activeJob?.pickupLat != null && activeJob?.pickupLng != null
      ? {latitude: Number(activeJob.pickupLat), longitude: Number(activeJob.pickupLng)}
      : null;
  const dropCoords =
    activeJob?.dropLat != null && activeJob?.dropLng != null
      ? {latitude: Number(activeJob.dropLat), longitude: Number(activeJob.dropLng)}
      : null;

  const liveCoords =
    trackingLiveLocation?.latitude != null && trackingLiveLocation?.longitude != null
      ? {latitude: Number(trackingLiveLocation.latitude), longitude: Number(trackingLiveLocation.longitude)}
      : activeJob?.currentLocation?.latitude != null && activeJob?.currentLocation?.longitude != null
      ? {latitude: Number(activeJob.currentLocation.latitude), longitude: Number(activeJob.currentLocation.longitude)}
      : null;

  const mapProps = {
    pickupLocation: String(activeJob?.pickupLocation ?? 'Pickup'),
    dropLocation: String(activeJob?.dropLocation ?? 'Drop-off'),
    pickupCoords,
    dropCoords,
    currentCoords: liveCoords,
    liveMode: isInTransit,
    stops: Array.isArray((activeJob as any)?.stops) ? (activeJob as any).stops : [],
    onLocationUpdate: isInTransit ? onUpdateLocation : undefined,
    onRouteInfoUpdate: isInTransit ? setRealtimeInfo : undefined,
  };

  if (!activeJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🛻</Text>
          <Text style={styles.emptyTitle}>No Active Trip</Text>
          <Text style={styles.emptyText}>
            Accept a job and complete compliance to start live tracking.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (currentStep === 'load_code' || currentStep === 'handover') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Route Locked</Text>
          <Text style={styles.emptyText}>
            Complete the vehicle handover to unlock the route and begin live tracking.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fullscreen map modal */}
      <Modal
        visible={mapFullscreen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setMapFullscreen(false)}>
        <View style={styles.fullscreenContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <ActiveJobMap {...mapProps} style={styles.fullscreenMap} />
          <Pressable
            onPress={() => setMapFullscreen(false)}
            style={styles.fullscreenCloseBtn}>
            <Text style={styles.fullscreenCloseBtnText}>✕  Exit Fullscreen</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Step bar */}
      <View style={styles.stepBar}>
        {STEP_LABELS.map((step, index) => {
          const activeIndex = STEP_LABELS.findIndex(s => s.id === displayStep);
          const isDone = index < activeIndex;
          const isCurrent = index === activeIndex;
          return (
            <React.Fragment key={step.id}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                  <Text style={[styles.stepDotText, (isDone || isCurrent) && styles.stepDotTextActive]}>
                    {isDone ? '✓' : index + 1}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}>{step.label}</Text>
              </View>
              {index < STEP_LABELS.length - 1 ? (
                <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Floating call button */}
      <Pressable
        style={styles.callBtn}
        onPress={() => Linking.openURL('tel:8432551414')}>
        <Text style={styles.callBtnIcon}>📞</Text>
      </Pressable>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Map section */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>{activeJob?.jobReference || 'Active Trip'}</Text>
              <Text style={styles.mapSubtitle}>ETA {etaLabel}</Text>
            </View>
            <Pressable onPress={() => setMapFullscreen(true)} style={styles.fullscreenBtn}>
              <Text style={styles.fullscreenBtnIcon}>⛶</Text>
              <Text style={styles.fullscreenBtnText}>Fullscreen</Text>
            </Pressable>
          </View>

          <ActiveJobMap {...mapProps} />

          <View style={styles.mapMetaRow}>
            <Text style={styles.mapMetaText}>
              {distanceLabel === '—' ? '— km remaining' : `${distanceLabel} remaining`}
            </Text>
            <Text style={[styles.mapMetaText, isInTransit && styles.mapMetaLive]}>
              {isInTransit ? '● GPS tracking on' : 'Updated from backend'}
            </Text>
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{etaLabel}</Text>
            <Text style={styles.metricLabel}>ETA</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{distanceLabel}</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{durationLabel}</Text>
            <Text style={styles.metricLabel}>Time Left</Text>
          </View>
        </View>

        {/* Journey card */}
        <Card title="Journey" variant="dark" rightLabel={isInTransit ? 'LIVE' : 'ACTIVE'}>
          <View style={styles.actionRow}>
            <Pressable onPress={onStopTracking} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Finish Trip</Text>
            </Pressable>
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  emptyIcon: {fontSize: 54},
  emptyTitle: {color: colors.navy, fontSize: 24, fontWeight: '900'},
  emptyText: {color: colors.inkSoft, fontSize: 15, lineHeight: 22, textAlign: 'center'},

  stepBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.border, borderBottomWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  stepItem: {alignItems: 'center', gap: 4, width: 64},
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: {backgroundColor: '#18794E'},
  stepDotCurrent: {backgroundColor: colors.accent},
  stepDotText: {color: colors.inkSoft, fontSize: 12, fontWeight: '900'},
  stepDotTextActive: {color: colors.card},
  stepLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textAlign: 'center'},
  stepLabelCurrent: {color: colors.navy},
  stepLine: {flex: 1, height: 3, backgroundColor: '#D5DCE6', marginHorizontal: 4},
  stepLineDone: {backgroundColor: '#18794E'},

  scroll: {flex: 1},
  scrollContent: {padding: spacing.md, paddingBottom: 100, gap: spacing.md},

  mapCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.sm,
  },
  mapTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  mapSubtitle: {color: colors.inkSoft, fontSize: 13, fontWeight: '700', marginTop: 2},
  fullscreenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  fullscreenBtnIcon: {fontSize: 13, color: colors.accent},
  fullscreenBtnText: {color: colors.accent, fontSize: 11, fontWeight: '800'},
  mapMetaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.sm,
  },
  mapMetaText: {color: colors.inkSoft, fontSize: 12, fontWeight: '700'},
  mapMetaLive: {color: '#16a34a'},

  // Fullscreen modal
  fullscreenContainer: {flex: 1, backgroundColor: '#000'},
  fullscreenMap: {
    height: SCREEN_HEIGHT,
    borderRadius: 0,
    marginBottom: 0,
  },
  fullscreenCloseBtn: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.pill, paddingHorizontal: 24, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fullscreenCloseBtnText: {color: '#fff', fontSize: 15, fontWeight: '900'},

  metricsRow: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: colors.card, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  metric: {flex: 1, paddingVertical: spacing.md, alignItems: 'center'},
  metricDivider: {width: 1, backgroundColor: colors.border},
  metricValue: {color: colors.navy, fontSize: 15, fontWeight: '900'},
  metricLabel: {
    color: colors.inkSoft, fontSize: 11, fontWeight: '800',
    marginTop: 4, textTransform: 'uppercase',
  },

  callBtn: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 10,
  },
  callBtnIcon: {fontSize: 24},

  actionRow: {flexDirection: 'row', gap: spacing.sm},
  primaryBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 46, borderRadius: 14, backgroundColor: colors.accent,
  },
  primaryBtnText: {color: colors.navy, fontSize: 13, fontWeight: '900'},
});

export default LiveTrackingScreen;
