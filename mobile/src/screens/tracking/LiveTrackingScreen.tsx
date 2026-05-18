import React, {useEffect, useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import ActiveJobMap from '../../components/map/ActiveJobMap';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

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
  {id: 'load_code', label: 'Load Code'},
  {id: 'handover', label: 'Handover'},
  {id: 'delivery', label: 'Delivery'},
];

const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({
  activeJob,
  trackingEta,
  trackingLiveLocation,
  complianceStatus,
  onUpdateLocation,
  onStopTracking,
  onReportIncident,
}) => {
  const [progress, setProgress] = useState(14);
  const currentStep = resolveStep(complianceStatus, activeJob);
  const isInTransit = currentStep === 'in_transit';

  useEffect(() => {
    if (!isInTransit) return;
    const interval = setInterval(() => {
      setProgress(prev => (prev < 92 ? prev + 1 : 92));
    }, 1500);
    return () => clearInterval(interval);
  }, [isInTransit]);

  const etaValue = trackingEta?.estimatedArrival ?? activeJob?.eta ?? activeJob?.originalEta;
  const distanceValue =
    trackingEta?.distanceRemaining ??
    activeJob?.distanceRemaining ??
    activeJob?.distanceKm ??
    activeJob?.distance;
  const durationValue =
    trackingEta?.estimatedDuration ??
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
      ? {
          latitude: Number(trackingLiveLocation.latitude),
          longitude: Number(trackingLiveLocation.longitude),
        }
      : activeJob?.currentLocation?.latitude != null && activeJob?.currentLocation?.longitude != null
      ? {
          latitude: Number(activeJob.currentLocation.latitude),
          longitude: Number(activeJob.currentLocation.longitude),
        }
      : null;

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stepBar}>
        {STEP_LABELS.map((step, index) => {
          const isDone = index < STEP_LABELS.findIndex(s => s.id === currentStep);
          const isCurrent = step.id === currentStep;
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

      <View style={styles.mapWrap}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>{activeJob?.jobReference || 'Active Trip'}</Text>
          <Text style={styles.mapSubtitle}>ETA {etaLabel}</Text>
        </View>
        <ActiveJobMap
          pickupLocation={String(activeJob?.pickupLocation ?? 'Pickup')}
          dropLocation={String(activeJob?.dropLocation ?? 'Drop-off')}
          pickupCoords={pickupCoords}
          dropCoords={dropCoords}
          currentCoords={liveCoords}
        />
        <View style={styles.mapMetaRow}>
          <Text style={styles.mapMetaText}>
            {distanceLabel === '—' ? '— km remaining' : `${distanceLabel} remaining`}
          </Text>
          <Text style={styles.mapMetaText}>Updated live from backend</Text>
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHandle} />

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

        <Card title="Journey" variant="dark" rightLabel={isInTransit ? 'LIVE' : 'ACTIVE'}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${progress}%`}]} />
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={onReportIncident} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Report Issue</Text>
            </Pressable>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {fontSize: 54},
  emptyTitle: {color: colors.navy, fontSize: 24, fontWeight: '900'},
  emptyText: {color: colors.inkSoft, fontSize: 15, lineHeight: 22, textAlign: 'center'},
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  stepItem: {alignItems: 'center', gap: 4, width: 64},
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {backgroundColor: '#18794E'},
  stepDotCurrent: {backgroundColor: colors.accent},
  stepDotText: {color: colors.inkSoft, fontSize: 12, fontWeight: '900'},
  stepDotTextActive: {color: colors.card},
  stepLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textAlign: 'center'},
  stepLabelCurrent: {color: colors.navy},
  stepLine: {flex: 1, height: 3, backgroundColor: '#D5DCE6', marginHorizontal: 4},
  stepLineDone: {backgroundColor: '#18794E'},
  mapWrap: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mapTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  mapSubtitle: {color: colors.inkSoft, fontSize: 13, fontWeight: '700'},
  mapMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  mapMetaText: {color: colors.inkSoft, fontSize: 12, fontWeight: '700'},
  sheet: {flex: 1},
  sheetContent: {padding: spacing.md, paddingBottom: 100},
  sheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  metric: {flex: 1, paddingVertical: spacing.md, alignItems: 'center'},
  metricDivider: {width: 1, backgroundColor: colors.border},
  metricValue: {color: colors.navy, fontSize: 15, fontWeight: '900'},
  metricLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '800', marginTop: 4, textTransform: 'uppercase'},
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#243447',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  actionRow: {flexDirection: 'row', gap: spacing.sm},
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#E8EEF6',
  },
  secondaryBtnText: {color: colors.navy, fontSize: 13, fontWeight: '900'},
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  primaryBtnText: {color: colors.navy, fontSize: 13, fontWeight: '900'},
});

export default LiveTrackingScreen;
